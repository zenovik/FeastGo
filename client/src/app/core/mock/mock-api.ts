import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { DeliveryStatus, Order, OrderStatus } from '../models/order.model';
import { OrderMessage } from '../models/message.model';
import { Restaurant } from '../models/restaurant.model';
import { Address, User } from '../models/user.model';
import { DemoBanner, DemoCategory, DemoCoupon, DemoReview, getMockState, MockState, persistMockState } from './mock-data';
import { normalizeMobile, validateMobile } from '../../shared/utils/mobile-validation';
import { normalizeName, validateName } from '../../shared/utils/profile-validation';
import { calculateDeliveryEarnings, deliveryEarningsHistory, deliveryWeeklyPerformance } from './delivery-earnings';
import { adminDashboardStats, sellerDashboardStats } from './dashboard-analytics';
import { generateDeliveryOtp, isDeliveryOtpValid, withoutDeliveryOtp } from './delivery-otp';

type JsonRecord = Record<string, unknown>;
type Role = 'customer' | 'seller' | 'delivery' | 'admin';
type CustomerAuthMode = 'login' | 'signup';

const EMPTY_MESSAGE_COUNTS = { count: 0, byOrder: {} };
const DEMO_CUSTOMER_OTP = '123456';
const CUSTOMER_OTP_TTL_MS = 30_000;
const MAX_CUSTOMER_OTP_ATTEMPTS = 5;
const customerOtpSessions = new Map<
  string,
  { code: string; mode: CustomerAuthMode; expiresAt: number; attempts: number; verified: boolean }
>();
const ORDER_STATUSES: OrderStatus[] = [
  'placed',
  'confirmed',
  'rejected',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'failed',
  'returned',
];
const DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'searching',
  'assigned',
  'accepted',
  'reached_restaurant',
  'picked_up',
  'out_for_delivery',
  'reached_customer',
  'delivered',
  'cancelled',
  'failed',
  'returned',
];
const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  'assigned',
  'accepted',
  'reached_restaurant',
  'picked_up',
  'out_for_delivery',
  'reached_customer',
];
const PENDING_PICKUP_STATUSES: DeliveryStatus[] = ['assigned', 'accepted', 'reached_restaurant'];

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function bodyOf(request: HttpRequest<unknown>): JsonRecord {
  return isRecord(request.body) ? request.body : {};
}

function customerPhone(value: unknown): string {
  const phone = normalizeMobile(text(value));
  const validation = validateMobile(phone);
  if (!validation.valid) throw new HttpErrorResponse({ status: 400, error: { message: validation.message } });
  return phone;
}

function customerByPhone(state: MockState, phone: string): User | undefined {
  return state.users.find((user) => normalizeMobile(user.phone ?? '') === phone);
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numeric(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function save(state: MockState) {
  persistMockState();
  return state;
}

function recordOrderStatus(order: Order, value: unknown) {
  const status = ORDER_STATUSES.find((candidate) => candidate === value);
  if (!status) throw new HttpErrorResponse({ status: 400, error: { message: 'Invalid order status' } });
  if (order.status === status) return;
  order.status = status;
  order.statusHistory.push({ status, at: new Date().toISOString() });
}

function recordDeliveryStatus(order: Order, value: unknown) {
  const status = DELIVERY_STATUSES.find((candidate) => candidate === value);
  if (!status) throw new HttpErrorResponse({ status: 400, error: { message: 'Invalid delivery status' } });
  if (order.deliveryStatus === status) return;
  order.deliveryStatus = status;
  order.deliveryStatusHistory.push({ status, at: new Date().toISOString() });
}

function deliveryPartnerId(order: Order): string | null {
  const partner = order.deliveryPartner;
  return typeof partner === 'string' ? partner : partner?._id ?? null;
}

function deliveryOrdersFor(state: MockState, partnerId = state.active.delivery.id): Order[] {
  return state.orders
    .filter((order) => deliveryPartnerId(order) === partnerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 200)
    .map(withoutDeliveryOtp);
}

function deliveryCompletedAt(order: Order): string | null {
  return (
    order.deliveredAt ??
    [...order.deliveryStatusHistory].reverse().find((entry) => entry.status === 'delivered')?.at ??
    null
  );
}

function deliveryDashboardStats(state: MockState) {
  const orders = deliveryOrdersFor(state);
  const delivered = orders.filter((order) => order.deliveryStatus === 'delivered');
  const cancelled = orders.filter((order) => order.deliveryStatus === 'cancelled').length;
  const failed = orders.filter((order) => order.deliveryStatus === 'failed').length;
  const finished = delivered.length + cancelled + failed;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const recentDeliveries = [...delivered]
    .sort((a, b) => new Date(deliveryCompletedAt(b) ?? 0).getTime() - new Date(deliveryCompletedAt(a) ?? 0).getTime())
    .slice(0, 5);

  return {
    todayDeliveries: delivered.filter((order) => {
      const completedAt = deliveryCompletedAt(order);
      return completedAt !== null && new Date(completedAt).getTime() >= today.getTime();
    }).length,
    pendingPickups: orders.filter((order) => PENDING_PICKUP_STATUSES.includes(order.deliveryStatus)).length,
    activeDeliveries: orders.filter((order) => ACTIVE_DELIVERY_STATUSES.includes(order.deliveryStatus)).length,
    completedDeliveries: delivered.length,
    cancelledDeliveries: cancelled + failed,
    failedDeliveries: failed,
    successRate: finished ? Math.round((delivered.length / finished) * 1000) / 10 : 0,
    rating: state.active.delivery.rating,
    recentDeliveries,
  };
}

function hasActiveDelivery(state: MockState, partnerId: string, exceptOrderId?: string): boolean {
  return state.orders.some(
    (order) =>
      order._id !== exceptOrderId &&
      deliveryPartnerId(order) === partnerId &&
      ACTIVE_DELIVERY_STATUSES.includes(order.deliveryStatus)
  );
}

function autoAssignDeliveryPartner(state: MockState, order: Order): boolean {
  const partner = state.active.delivery;
  if (
    order.deliveryPartner ||
    partner.status !== 'approved' ||
    partner.isSuspended ||
    !partner.isOnline ||
    hasActiveDelivery(state, partner.id, order._id)
  ) {
    return false;
  }
  const initialStatus: DeliveryStatus = partner.autoAcceptOrders ? 'accepted' : 'assigned';
  order.deliveryPartner = partner.id;
  recordDeliveryStatus(order, initialStatus);
  partner.currentOrder = order._id;
  state.delivery = partner;
  return true;
}

function restaurantForSlug(state: MockState, slug: string): Restaurant | undefined {
  return state.restaurants.find((restaurant) => restaurant.slug === slug || restaurant._id === slug);
}

function menuForRestaurant(state: MockState, restaurantId: string) {
  return state.menuItems.filter((item) => item.restaurant === restaurantId && item.isAvailable && !item.isHiddenByAdmin);
}

function foodItems(state: MockState) {
  return state.menuItems.map((item) => {
    const restaurant = state.restaurants.find((candidate) => candidate._id === item.restaurant);
    return {
      id: item._id,
      name: item.name,
      image: item.image,
      restaurantName: restaurant?.name ?? 'FeastGo Kitchen',
      restaurantId: item.restaurant,
      category: item.category,
      cuisine: restaurant?.cuisines[0] ?? 'Local',
      price: item.price,
      originalPrice: Math.round(item.price * 1.15),
      rating: item.rating,
      reviewCount: 48 + Number(item._id.slice(-1)) * 11,
      deliveryTime: restaurant?.deliveryTimeMax ?? 35,
      calories: 280 + item.price % 260,
      veg: item.isVeg,
      bestseller: item.isBestseller,
      offer: restaurant?.offer ?? '',
      description: item.description,
      ingredients: ['Fresh ingredients', 'House-made seasoning'],
      isAvailable: item.isAvailable && !item.isHiddenByAdmin,
      tags: item.category === 'Salads' ? ['healthy'] : item.isBestseller ? ['new'] : [],
    };
  }).filter((item) => item.isAvailable);
}

function pageOf<T>(items: T[], url: URL, defaultLimit = 20) {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.max(1, Number(url.searchParams.get('limit')) || defaultLimit);
  const start = (page - 1) * limit;
  return { items: items.slice(start, start + limit), total: items.length, page, pages: Math.max(1, Math.ceil(items.length / limit)) };
}

function orderById(state: MockState, orderId: string) {
  return state.orders.find((order) => order._id === orderId);
}

function addMessage(state: MockState, orderId: string, thread: OrderMessage['thread'], role: OrderMessage['senderRole'], messageText: string) {
  const sender = role === 'customer'
    ? { id: state.active.customer.id, name: state.active.customer.name }
    : role === 'seller'
      ? { id: state.active.seller.id, name: state.active.seller.name }
      : { id: state.active.delivery.id, name: state.active.delivery.name };
  const recipientRole: OrderMessage['recipientRole'] = role === 'customer' ? 'delivery' : role === 'delivery' ? (thread === 'customer-delivery' ? 'customer' : 'seller') : 'delivery';
  const message: OrderMessage = {
    _id: id('message'),
    order: orderId,
    thread,
    senderId: sender.id,
    senderRole: role,
    senderName: sender.name,
    recipientId: recipientRole === 'customer' ? state.active.customer.id : recipientRole === 'seller' ? state.active.seller.id : state.active.delivery.id,
    recipientRole,
    text: messageText,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
  state.messages.push(message);
  save(state);
  return message;
}

function messagesForOrder(state: MockState, orderId: string, thread: OrderMessage['thread']) {
  return state.messages.filter((message) => message.order === orderId && message.thread === thread);
}

function createOrder(state: MockState, payload: JsonRecord): Order {
  const restaurant = restaurantForSlug(state, text(payload['restaurantSlug']));
  if (!restaurant) throw new HttpErrorResponse({ status: 404, error: { message: 'Restaurant not found' } });
  const items = Array.isArray(payload['items']) ? payload['items'].filter(isRecord) : [];
  const orderItems = items.flatMap((entry) => {
    const item = state.menuItems.find((candidate) => candidate._id === text(entry['menuItemId']));
    if (!item) return [];
    return [{
      menuItem: item._id,
      name: item.name,
      price: item.price,
      qty: Math.max(1, numeric(entry['qty'], 1)),
      isVeg: item.isVeg,
    }];
  });
  if (!orderItems.length) throw new HttpErrorResponse({ status: 400, error: { message: 'Add an item before placing the order' } });
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discount = text(payload['couponCode']).toUpperCase() === 'FEAST20' ? Math.min(150, Math.round(subtotal * 0.2)) : 0;
  const createdAt = new Date().toISOString();
  const order: Order = {
    _id: id('order'),
    user: state.active.customer.id,
    restaurant: restaurant._id,
    restaurantName: restaurant.name,
    deliveryPartner: null,
    items: orderItems,
    subtotal,
    deliveryFee: restaurant.deliveryFee,
    taxes: Math.round(subtotal * 0.05),
    discount,
    couponCode: text(payload['couponCode']) || null,
    total: subtotal + restaurant.deliveryFee + Math.round(subtotal * 0.05) - discount,
    status: 'placed',
    statusHistory: [{ status: 'placed', at: createdAt }],
    address: (isRecord(payload['address']) ? payload['address'] : state.active.customer.addresses[0]) as Order['address'],
    paymentMethod: payload['paymentMethod'] === 'card' || payload['paymentMethod'] === 'upi' ? payload['paymentMethod'] : 'cod',
    etaMinutes: restaurant.deliveryTimeMax,
    deliveryStatus: 'pending',
    deliveryStatusHistory: [{ status: 'pending', at: createdAt }],
    deliveryOtp: generateDeliveryOtp(),
    deliveryOtpVerified: false,
    createdAt,
    customerName: state.active.customer.name,
  };
  state.orders.unshift(order);
  save(state);
  return order;
}

function authResponse(state: MockState, role: Role, body: JsonRecord) {
  const identity = text(body['identifier'], text(body['email'], text(body['phone'], text(body['value']))));
  const defaultName = role === 'customer'
    ? state.active.customer.name
    : role === 'seller'
      ? state.active.seller.name
      : role === 'delivery'
        ? state.active.delivery.name
        : state.active.admin.name;
  const displayName = text(body['name'], defaultName);
  if (role === 'customer') {
    const user: User = {
      ...state.active.customer,
      name: displayName,
      email: identity.includes('@') ? identity : state.active.customer.email,
      phone: identity.includes('@') ? state.active.customer.phone : identity,
    };
    state.active.customer = user;
    state.users = [user, ...state.users.filter((candidate) => candidate.id !== user.id)];
  } else if (role === 'seller') {
    state.active.seller = { ...state.active.seller, name: displayName, email: identity || state.active.seller.email };
    state.seller = state.active.seller;
  } else if (role === 'delivery') {
    state.active.delivery = { ...state.active.delivery, name: displayName, email: identity.includes('@') ? identity : state.active.delivery.email, phone: identity.includes('@') ? state.active.delivery.phone : identity };
    state.delivery = state.active.delivery;
  }
  save(state);
  return { token: `demo-${role}-token`, user: state.active[role] };
}

function updateUser(state: MockState, patch: JsonRecord) {
  state.active.customer = { ...state.active.customer, ...patch };
  state.users = state.users.map((user) => user.id === state.active.customer.id ? state.active.customer : user);
  save(state);
  return state.active.customer;
}

function notificationsForPath(state: MockState, path: string[], method: string, url: URL, body: JsonRecord) {
  if (path[0] === 'admin' && path[2] === 'notifications' && ['broadcast', 'search-recipients'].includes(path[3] ?? '')) {
    return undefined;
  }
  const role: Role = path.includes('seller') ? 'seller' : path.includes('delivery') ? 'delivery' : path.includes('admin') ? 'admin' : 'customer';
  const notifications = state.notifications[role];
  const action = path[path.indexOf('notifications') + 1];
  if (method === 'GET') {
    let rows = notifications.filter((notification) => !!notification.isArchived === (url.searchParams.get('archived') === 'true'));
    if (url.searchParams.get('unreadOnly') === 'true') rows = rows.filter((notification) => !notification.isRead);
    const query = url.searchParams.get('q')?.toLowerCase();
    if (query) rows = rows.filter((notification) => `${notification.title} ${notification.message}`.toLowerCase().includes(query));
    const unreadCount = notifications.filter((notification) => !notification.isRead && !notification.isArchived).length;
    const page = pageOf(rows, url);
    return { notifications: page.items, unreadCount, total: rows.length, page: page.page, limit: Number(url.searchParams.get('limit')) || 20, hasMore: page.page < page.pages };
  }
  const targetId = action;
  const ids = Array.isArray(body['ids']) ? body['ids'].filter((value): value is string => typeof value === 'string') : [targetId];
  if (action === 'read-all') {
    state.notifications[role] = notifications.map((notification) => ({ ...notification, isRead: true }));
  } else if (action === 'clear-all') {
    state.notifications[role] = [];
  } else if (action === 'bulk') {
    const selected = new Set(ids);
    const bulkAction = text(body['action']);
    state.notifications[role] = notifications.map((notification) => {
      if (!selected.has(notification._id)) return notification;
      if (bulkAction === 'delete' || bulkAction === 'archive') return { ...notification, isArchived: true };
      return { ...notification, isRead: bulkAction === 'read' };
    });
  } else if (targetId) {
    state.notifications[role] = notifications.map((notification) => {
      if (notification._id !== targetId) return notification;
      if (action === 'read') return { ...notification, isRead: true };
      if (action === 'archive') return { ...notification, isArchived: true };
      if (action === 'restore') return { ...notification, isArchived: false };
      return notification;
    }).filter((notification) => method !== 'DELETE' || notification._id !== targetId);
  }
  save(state);
  return { message: 'Notification updated' };
}

function publicRoutes(state: MockState, method: string, path: string[], url: URL, body: JsonRecord) {
  if (path[0] === 'categories' && method === 'GET') {
    return { categories: state.categories.filter((category) => category.isActive).map(({ _id, name, slug, image, isActive }) => ({ _id, name, slug, image, isActive })) };
  }
  if (path[0] === 'explore-cards' && method === 'GET') return { cards: state.exploreCards.filter((card) => card.isActive) };
  if (path[0] === 'food-items') {
    const allItems = foodItems(state);
    if (method === 'GET' && !path[1]) {
      let items = allItems;
      const q = url.searchParams.get('q')?.toLowerCase();
      if (q) items = items.filter((item) => `${item.name} ${item.restaurantName} ${item.category} ${item.cuisine}`.toLowerCase().includes(q));
      for (const [key, predicate] of Object.entries({
        veg: (item: (typeof items)[number]) => item.veg,
        nonVeg: (item: (typeof items)[number]) => !item.veg,
        bestseller: (item: (typeof items)[number]) => item.bestseller,
        healthy: (item: (typeof items)[number]) => item.tags?.includes('healthy') ?? false,
        offers: (item: (typeof items)[number]) => !!item.offer,
        featured: (item: (typeof items)[number]) => item.bestseller,
        topRated: (item: (typeof items)[number]) => item.rating >= 4.5,
      })) {
        if (url.searchParams.get(key) === 'true') items = items.filter(predicate);
      }
      const sort = url.searchParams.get('sort');
      if (sort === 'price_low') items = [...items].sort((a, b) => a.price - b.price);
      if (sort === 'price_high') items = [...items].sort((a, b) => b.price - a.price);
      if (sort === 'rating' || sort === 'popular') items = [...items].sort((a, b) => b.rating - a.rating);
      const limit = Number(url.searchParams.get('limit')) || 24;
      const page = pageOf(items, url, limit);
      return { items: page.items, total: page.total };
    }
    if (method === 'GET' && path[1]) {
      const item = allItems.find((candidate) => candidate.id === path[1]);
      if (item) return { item };
    }
  }
  if (path[0] === 'restaurants') {
    if (path.length === 1 && method === 'GET') {
      let restaurants = state.restaurants.filter((restaurant) => !restaurant.isSuspended);
      const q = url.searchParams.get('q')?.toLowerCase();
      const cuisine = url.searchParams.get('cuisine')?.toLowerCase();
      if (q) restaurants = restaurants.filter((restaurant) => `${restaurant.name} ${restaurant.cuisines.join(' ')} ${restaurant.address.area}`.toLowerCase().includes(q));
      if (cuisine) restaurants = restaurants.filter((restaurant) => restaurant.cuisines.some((item) => item.toLowerCase().includes(cuisine)));
      if (url.searchParams.get('veg') === 'true') restaurants = restaurants.filter((restaurant) => menuForRestaurant(state, restaurant._id).some((item) => item.isVeg));
      const sort = url.searchParams.get('sort');
      if (sort === 'rating') restaurants = [...restaurants].sort((a, b) => b.rating - a.rating);
      if (sort === 'delivery_time') restaurants = [...restaurants].sort((a, b) => a.deliveryTimeMax - b.deliveryTimeMax);
      return pageOf(restaurants, url, 24);
    }
    if (path[1] === 'cuisines' && method === 'GET') {
      return { cuisines: [...new Set(state.restaurants.flatMap((restaurant) => restaurant.cuisines))].sort() };
    }
    const restaurant = restaurantForSlug(state, path[1] ?? '');
    if (!restaurant) return undefined;
    if (path.length === 2 && method === 'GET') return { restaurant };
    if (path[2] === 'menu' && method === 'GET') {
      const items = menuForRestaurant(state, restaurant._id);
      const categories = [...new Set(items.map((item) => item.category))].map((category) => ({
        category,
        items: items.filter((item) => item.category === category),
      }));
      return { categories };
    }
    if (path[2] === 'reviews' && method === 'GET') {
      return { reviews: state.reviews.filter((review) => review.restaurant === restaurant._id && !review.isHidden) };
    }
    if (path[2] === 'reviews' && method === 'POST') {
      const review: DemoReview = {
        _id: id('review'),
        restaurant: restaurant._id,
        userName: state.active.customer.name,
        rating: numeric(body['rating'], 5),
        comment: text(body['comment']),
        isHidden: false,
        reportCount: 0,
        sellerReply: { text: '', at: null },
        createdAt: new Date().toISOString(),
      };
      state.reviews.unshift(review);
      save(state);
      return { review };
    }
    if (path[2] === 'coupons' && path[3] === 'validate' && method === 'POST') {
      const code = text(body['code']).toUpperCase();
      const coupon = state.coupons.find((candidate) => candidate.code === code && candidate.isActive);
      if (!coupon || numeric(body['subtotal']) < coupon.minOrder) {
        throw new HttpErrorResponse({ status: 400, error: { message: 'Coupon is invalid or the order does not meet its minimum.' } });
      }
      return { code: coupon.code, discount: Math.min(coupon.maxDiscount ?? Infinity, numeric(body['subtotal']) * coupon.value / 100) };
    }
  }
  return undefined;
}

function customerAuth(state: MockState, method: string, path: string[], body: JsonRecord) {
  if (path[1] === 'otp' && path[2] === 'request' && method === 'POST') {
    if (body['method'] !== 'phone') {
      throw new HttpErrorResponse({ status: 400, error: { message: 'Sign in with your mobile number.' } });
    }
    const phone = customerPhone(body['value']);
    const mode = body['mode'];
    if (mode !== 'login' && mode !== 'signup') {
      throw new HttpErrorResponse({ status: 400, error: { message: 'Choose login or sign up to continue.' } });
    }
    const existing = customerByPhone(state, phone);
    if (mode === 'login' && !existing) {
      throw new HttpErrorResponse({ status: 404, error: { message: 'Account not found. Please sign up first.' } });
    }
    if (mode === 'signup' && existing) {
      throw new HttpErrorResponse({ status: 409, error: { message: 'An account already exists with this mobile number. Please log in instead.' } });
    }
    customerOtpSessions.set(phone, {
      code: DEMO_CUSTOMER_OTP,
      mode,
      expiresAt: Date.now() + CUSTOMER_OTP_TTL_MS,
      attempts: 0,
      verified: false,
    });
    return { message: 'Your demo verification code is ready.', devOtp: DEMO_CUSTOMER_OTP };
  }
  if (path[1] === 'otp' && path[2] === 'verify' && method === 'POST') {
    if (body['method'] !== 'phone') {
      throw new HttpErrorResponse({ status: 400, error: { message: 'Sign in with your mobile number.' } });
    }
    const phone = customerPhone(body['value']);
    const mode = body['mode'];
    if (mode !== 'login' && mode !== 'signup') {
      throw new HttpErrorResponse({ status: 400, error: { message: 'Choose login or sign up to continue.' } });
    }
    const otpSession = customerOtpSessions.get(phone);
    if (!otpSession || otpSession.mode !== mode) {
      throw new HttpErrorResponse({ status: 400, error: { message: 'Request a new verification code first.' } });
    }
    if (otpSession.expiresAt <= Date.now()) {
      customerOtpSessions.delete(phone);
      throw new HttpErrorResponse({ status: 400, error: { message: 'This code has expired. Request a new one.' } });
    }
    const code = String(body['code'] ?? '');
    if (!/^\d{6}$/.test(code) || code !== otpSession.code) {
      otpSession.attempts += 1;
      if (otpSession.attempts >= MAX_CUSTOMER_OTP_ATTEMPTS) {
        customerOtpSessions.delete(phone);
        throw new HttpErrorResponse({ status: 400, error: { message: 'Too many incorrect attempts. Request a new OTP.' } });
      }
      throw new HttpErrorResponse({ status: 400, error: { message: 'Incorrect OTP. Please try again.' } });
    }
    if (mode === 'signup') {
      if (customerByPhone(state, phone)) {
        customerOtpSessions.delete(phone);
        throw new HttpErrorResponse({ status: 409, error: { message: 'An account already exists with this mobile number. Please log in instead.' } });
      }
      otpSession.verified = true;
      return { verified: true };
    }
    const user = customerByPhone(state, phone);
    if (!user) {
      customerOtpSessions.delete(phone);
      throw new HttpErrorResponse({ status: 404, error: { message: 'Account not found. Please sign up first.' } });
    }
    if (user.isBlocked) {
      customerOtpSessions.delete(phone);
      throw new HttpErrorResponse({ status: 403, error: { message: 'Your account has been blocked. Contact support for help.' } });
    }
    customerOtpSessions.delete(phone);
    state.active.customer = user;
    return authResponse(state, 'customer', { ...body, value: phone });
  }
  if (path[1] === 'complete-signup' && method === 'POST') {
    if (body['method'] !== 'phone') {
      throw new HttpErrorResponse({ status: 400, error: { message: 'Sign up with your mobile number.' } });
    }
    const phone = customerPhone(body['value']);
    const otpSession = customerOtpSessions.get(phone);
    if (!otpSession || otpSession.mode !== 'signup' || !otpSession.verified || otpSession.expiresAt <= Date.now()) {
      customerOtpSessions.delete(phone);
      throw new HttpErrorResponse({ status: 400, error: { message: 'Verify your mobile number before creating an account.' } });
    }
    const name = normalizeName(text(body['name']));
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      throw new HttpErrorResponse({ status: 400, error: { message: nameValidation.message } });
    }
    if (body['termsAccepted'] !== true) {
      throw new HttpErrorResponse({ status: 400, error: { message: 'You must accept the Terms & Conditions to continue.' } });
    }
    if (customerByPhone(state, phone)) {
      customerOtpSessions.delete(phone);
      throw new HttpErrorResponse({ status: 409, error: { message: 'An account already exists with this mobile number. Please log in instead.' } });
    }
    const user: User = {
      ...state.active.customer,
      id: id('user'),
      name,
      email: null,
      phone,
      dob: null,
      gender: null,
      photo: null,
      location: { lat: null, lng: null },
      addresses: [],
      favoriteRestaurants: [],
      isBlocked: false,
      savedCards: [],
      savedUpi: [],
      createdAt: new Date().toISOString(),
    };
    state.active.customer = user;
    state.users.unshift(user);
    customerOtpSessions.delete(phone);
    save(state);
    return { token: 'demo-customer-token', user };
  }
  if (path[1] === 'refresh-token' && method === 'POST') return { token: 'demo-customer-token', user: state.active.customer };
  if (path[1] === 'logout' && method === 'POST') return { message: 'Signed out' };
  if (path[1] !== 'me') return undefined;
  if (path.length === 2 && method === 'GET') return { user: state.active.customer };
  if (path.length === 2 && method === 'PATCH') return { user: updateUser(state, body) };
  if (path[2] === 'favorites' && path.length === 3 && method === 'GET') {
    const favorites = new Set(state.active.customer.favoriteRestaurants);
    return { restaurants: state.restaurants.filter((restaurant) => favorites.has(restaurant._id)) };
  }
  if (path[2] === 'favorites' && path[3] && method === 'POST') {
    const favorites = new Set(state.active.customer.favoriteRestaurants);
    if (favorites.has(path[3])) favorites.delete(path[3]);
    else favorites.add(path[3]);
    return { user: updateUser(state, { favoriteRestaurants: [...favorites] }) };
  }
  if (path[2] === 'phone' && path[3] === 'request-otp' && method === 'POST') {
    return { message: 'Your demo verification code is ready.', devOtp: '123456' };
  }
  if (path[2] === 'phone' && path[3] === 'verify-otp' && method === 'POST') {
    return { user: updateUser(state, { phone: text(body['phone'], state.active.customer.phone ?? '') }) };
  }
  if (path[2] === 'email' && path[3] === 'request-otp' && method === 'POST') {
    return { message: 'Your demo verification code is ready.', devOtp: '123456' };
  }
  if (path[2] === 'email' && path[3] === 'verify-otp' && method === 'POST') {
    return { user: updateUser(state, { email: text(body['email'], state.active.customer.email ?? '') }) };
  }
  if (path[2] === 'addresses' && method === 'POST') {
    const address: Address = {
      _id: id('address'),
      label: text(body['label'], 'Home'),
      line1: text(body['line1']),
      area: text(body['area']),
      landmark: text(body['landmark']),
      city: text(body['city']),
      state: text(body['state']),
      zip: text(body['zip']),
      phone: text(body['phone']),
      isDefault: state.active.customer.addresses.length === 0,
    };
    return { user: updateUser(state, { addresses: [...state.active.customer.addresses, address] }) };
  }
  if (path[2] === 'addresses' && path[3]) {
    const addresses = state.active.customer.addresses;
    if (method === 'DELETE') return { user: updateUser(state, { addresses: addresses.filter((address) => address._id !== path[3]) }) };
    if (method === 'PATCH' && path[4] === 'default') {
      return { user: updateUser(state, { addresses: addresses.map((address) => ({ ...address, isDefault: address._id === path[3] })) }) };
    }
    if (method === 'PATCH') {
      return { user: updateUser(state, { addresses: addresses.map((address) => address._id === path[3] ? { ...address, ...body } : address) }) };
    }
  }
  if (path[2] === 'cards' && method === 'POST') {
    const savedCards: User['savedCards'] = [
      ...state.active.customer.savedCards,
      {
        _id: id('card'),
        label: text(body['label'], 'My card'),
        brand: text(body['brand'], 'Visa'),
        last4: text(body['last4'], '4242'),
        expiryMonth: numeric(body['expiryMonth'], 12),
        expiryYear: numeric(body['expiryYear'], new Date().getFullYear() + 2),
      },
    ];
    return { user: updateUser(state, { savedCards }) };
  }
  if (path[2] === 'cards' && path[3] && method === 'DELETE') {
    return { user: updateUser(state, { savedCards: state.active.customer.savedCards.filter((card) => card._id !== path[3]) }) };
  }
  if (path[2] === 'upi' && method === 'POST') {
    const savedUpi: User['savedUpi'] = [
      ...state.active.customer.savedUpi,
      { _id: id('upi'), label: text(body['label'], 'My UPI'), upiId: text(body['upiId']) },
    ];
    return { user: updateUser(state, { savedUpi }) };
  }
  if (path[2] === 'upi' && path[3] && method === 'DELETE') {
    return { user: updateUser(state, { savedUpi: state.active.customer.savedUpi.filter((upi) => upi._id !== path[3]) }) };
  }
  if (path[2] === 'export-data' && method === 'GET') {
    return {
      exportedAt: new Date().toISOString(),
      profile: state.active.customer,
      orders: state.orders.filter((order) => order.user === state.active.customer.id),
      reviews: state.reviews,
    };
  }
  if (path[2] === 'delete-account' && method === 'POST') return { message: 'Demo account data cleared.' };
  if (path[2] === 'support-request' && method === 'POST') return { message: 'Demo support request saved locally.' };
  return undefined;
}

function customerOrders(state: MockState, method: string, path: string[], body: JsonRecord) {
  if (path.length === 1 && method === 'GET') {
    return { orders: state.orders.filter((order) => order.user === state.active.customer.id) };
  }
  if (path.length === 1 && method === 'POST') return { order: createOrder(state, body) };
  if (path[1] === 'cancellation-policy' && method === 'GET') return { graceMinutes: 5 };
  if (path[1] === 'messages' && path[2] === 'unread-count') return EMPTY_MESSAGE_COUNTS;
  const order = state.orders.find((candidate) => candidate._id === path[1] && candidate.user === state.active.customer.id);
  if (!order) throw new HttpErrorResponse({ status: 404, error: { message: 'Order not found' } });
  if (path.length === 2 && method === 'GET') return { order };
  if (path[2] === 'cancel' && method === 'POST') {
    recordOrderStatus(order, 'cancelled');
    Object.assign(order, { cancellationReason: text(body['reason']) });
    save(state);
    return { order };
  }
  if (path[2] === 'rate-delivery' && method === 'POST') return { message: 'Thanks for your feedback!' };
  if (path[2] === 'messages') {
    if (method === 'GET') return { messages: messagesForOrder(state, order._id, 'customer-delivery') };
    if (method === 'POST') return { message: addMessage(state, order._id, 'customer-delivery', 'customer', text(body['text'])) };
  }
  return undefined;
}

function accountRoutes(state: MockState, role: 'seller' | 'delivery' | 'admin', method: string, path: string[], body: JsonRecord) {
  const [section, action, field] = path;
  const active = state.active[role];
  if (section === 'auth') {
    if (action === 'login' && method === 'POST') return authResponse(state, role, body);
    if ((action === 'signup' || action === 'verify-otp' || action === 'logout-all-devices') && method === 'POST') {
      if (action === 'verify-otp') return { verified: true };
      return authResponse(state, role, body);
    }
    if (action === 'logout' && method === 'POST') return { message: 'Signed out' };
    if (action === 'me' && method === 'GET') return { user: active };
    if (action === 'me' && method === 'PATCH') {
      if (role === 'seller') state.active.seller = { ...state.active.seller, ...body };
      if (role === 'delivery') {
        state.active.delivery = { ...state.active.delivery, ...body };
        state.delivery = state.active.delivery;
      }
      save(state);
      return { user: state.active[role] };
    }
    if (action === 'profile' && method === 'PATCH') {
      if (role === 'seller') state.active.seller = { ...state.active.seller, ...body };
      if (role === 'delivery') {
        state.active.delivery = { ...state.active.delivery, ...body };
        state.delivery = state.active.delivery;
      }
      save(state);
      return { user: state.active[role] };
    }
    if (action === 'change-phone' && path[2] === 'verify' && method === 'POST' && role === 'delivery') {
      state.active.delivery = { ...state.active.delivery, phone: text(body['phone'], state.active.delivery.phone) };
      state.delivery = state.active.delivery;
      save(state);
      return { user: state.active.delivery };
    }
    if (action === 'change-email' && path[2] === 'verify' && method === 'POST' && role === 'delivery') {
      state.active.delivery = { ...state.active.delivery, email: text(body['email'], state.active.delivery.email) };
      state.delivery = state.active.delivery;
      save(state);
      return { user: state.active.delivery };
    }
    if (action === 'request-otp' || action === 'forgot-password' || action === 'change-password' || action === 'change-phone' || action === 'change-email' || action === 'support-request') {
      if (method === 'POST' && (action.includes('otp') || action === 'request-otp' || action === 'forgot-password' || action === 'change-phone' || action === 'change-email')) {
        return { message: 'Demo verification code is ready.', devOtp: '123456' };
      }
      if (method === 'POST') return { message: 'Saved in this demo.' };
    }
    if (action === 'online' && method === 'PATCH' && role === 'delivery') {
      state.active.delivery = { ...state.active.delivery, isOnline: body['isOnline'] === true };
      state.delivery = state.active.delivery;
      save(state);
      return { user: state.active.delivery };
    }
    if (action === 'documents' && method === 'PATCH' && role === 'delivery') {
      state.active.delivery = { ...state.active.delivery, documents: { ...state.active.delivery.documents, ...body } };
      save(state);
      return { user: state.active.delivery };
    }
    if (action === 'documents' && field && method === 'DELETE' && role === 'delivery') {
      state.active.delivery = { ...state.active.delivery, documents: { ...state.active.delivery.documents, [field]: '' } };
      save(state);
      return { user: state.active.delivery };
    }
    return undefined;
  }
  return undefined;
}

function sellerRoutes(state: MockState, method: string, path: string[], body: JsonRecord, url: URL) {
  if (path[0] === 'auth') return accountRoutes(state, 'seller', method, path, body);
  const restaurantId = state.active.seller.restaurant ?? state.restaurants[0]._id;
  const restaurant = state.restaurants.find((item) => item._id === restaurantId) ?? state.restaurants[0];
  const sellerOrders = () => state.orders.filter((order) => order.restaurant === restaurantId);
  const sellerOrderById = (orderId: string) => sellerOrders().find((order) => order._id === orderId);
  const updateSellerOrderStatus = (order: Order, nextStatus: string) => {
    const allowedTransitions: Record<string, string[]> = {
      placed: ['confirmed', 'rejected'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready_for_pickup', 'cancelled'],
      ready_for_pickup: ['cancelled'],
    };
    if (!allowedTransitions[order.status]?.includes(nextStatus)) {
      throw new HttpErrorResponse({ status: 400, error: { message: `Cannot change order from ${order.status} to ${nextStatus}.` } });
    }

    const previousStatus = order.status;
    recordOrderStatus(order, nextStatus);
    if (nextStatus === 'rejected' || nextStatus === 'cancelled') {
      Object.assign(order, {
        cancelledBy: state.active.seller.id,
        cancelledByRole: 'seller',
        cancelledAt: new Date().toISOString(),
        cancelledFromStatus: previousStatus,
        cancellationReason: nextStatus === 'rejected' ? 'Rejected by restaurant' : order.cancellationReason,
      });
    }
    if (nextStatus === 'ready_for_pickup') autoAssignDeliveryPartner(state, order);
  };
  if (path[0] === 'restaurant') {
    if (path.length === 1 && method === 'GET') return { restaurant };
    if (path.length === 1 && (method === 'PATCH' || method === 'POST')) {
      Object.assign(restaurant, body);
      save(state);
      return { restaurant };
    }
    if (path[1] === 'category-order') return { categoryOrder: Array.isArray(body['categoryOrder']) ? body['categoryOrder'] : [] };
  }
  if (path[0] === 'menu') {
    if (path.length === 1 && method === 'GET') return { items: state.menuItems.filter((item) => item.restaurant === restaurantId) };
    if (path.length === 1 && method === 'POST') {
      const item = {
        _id: id('menu'),
        restaurant: restaurantId,
        name: text(body['name'], 'New menu item'),
        description: text(body['description']),
        price: numeric(body['price']),
        image: text(body['image']),
        category: text(body['category'], 'Mains'),
        isVeg: body['isVeg'] === true,
        isBestseller: body['isBestseller'] === true,
        isAvailable: body['isAvailable'] !== false,
        rating: 4.5,
        createdAt: new Date().toISOString(),
      };
      state.menuItems.unshift(item);
      save(state);
      return { item };
    }
    if (path[1] === 'reorder') return { message: 'Menu order saved.' };
    const item = state.menuItems.find((candidate) => candidate._id === path[1] && candidate.restaurant === restaurantId);
    if (item && method === 'PATCH') {
      Object.assign(item, body);
      save(state);
      return { item };
    }
    if (item && method === 'POST' && path[2] === 'duplicate') {
      const duplicate = { ...item, _id: id('menu'), name: `${item.name} (copy)` };
      state.menuItems.unshift(duplicate);
      save(state);
      return { item: duplicate };
    }
    if (item && method === 'DELETE') {
      state.menuItems = state.menuItems.filter((candidate) => candidate._id !== item._id);
      save(state);
      return { message: 'Menu item removed.' };
    }
  }
  if (path[0] === 'orders') {
    if (path.length === 1 && method === 'GET') {
      let orders = sellerOrders();
      const status = url.searchParams.get('status');
      const paymentMethod = url.searchParams.get('paymentMethod');
      const query = url.searchParams.get('q')?.trim().toLowerCase();
      const dateFromValue = url.searchParams.get('dateFrom');
      const dateToValue = url.searchParams.get('dateTo');
      const dateFrom = dateFromValue ? new Date(`${dateFromValue}T00:00:00`) : null;
      const dateTo = dateToValue ? new Date(`${dateToValue}T00:00:00`) : null;
      if ((dateFrom && !Number.isFinite(dateFrom.getTime())) || (dateTo && !Number.isFinite(dateTo.getTime()))) {
        throw new HttpErrorResponse({ status: 400, error: { message: 'Enter a valid order date range.' } });
      }
      if (dateFrom && dateTo && dateFrom > dateTo) {
        throw new HttpErrorResponse({ status: 400, error: { message: 'The start date must be before the end date.' } });
      }
      if (status) orders = orders.filter((order) => order.status === status);
      if (paymentMethod) orders = orders.filter((order) => order.paymentMethod === paymentMethod);
      if (dateFrom) orders = orders.filter((order) => new Date(order.createdAt) >= dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        orders = orders.filter((order) => new Date(order.createdAt) < end);
      }
      if (query) {
        orders = orders.filter((order) =>
          `${order._id} ${order.address.line1} ${order.address.area ?? ''} ${order.address.city} ${order.address.zip ?? ''}`
            .toLowerCase()
            .includes(query)
        );
      }
      return { orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(withoutDeliveryOtp) };
    }
    if (path[1] === 'bulk-status' && method === 'POST') {
      const status = text(body['status']);
      if (status !== 'confirmed' && status !== 'rejected') {
        throw new HttpErrorResponse({ status: 400, error: { message: 'Bulk actions can only accept or reject new orders.' } });
      }
      const requestedIds = Array.isArray(body['orderIds'])
        ? [...new Set(body['orderIds'].filter((value): value is string => typeof value === 'string'))]
        : [];
      const updated: string[] = [];
      const skipped: string[] = [];
      for (const orderId of requestedIds) {
        const order = sellerOrderById(orderId);
        if (!order || order.status !== 'placed') {
          skipped.push(orderId);
          continue;
        }
        updateSellerOrderStatus(order, status);
        updated.push(orderId);
      }
      if (updated.length) save(state);
      return { updated, skipped };
    }
    const order = sellerOrderById(path[1] ?? '');
    if (!order) throw new HttpErrorResponse({ status: 404, error: { message: 'Order not found.' } });
    if (path[2] === 'messages') {
      const thread = 'seller-delivery';
      return method === 'GET'
        ? { messages: messagesForOrder(state, order._id, thread) }
        : { message: addMessage(state, order._id, thread, 'seller', text(body['text'])) };
    }
    if (path[2] === 'report-issue') return { issue: { _id: id('issue'), status: 'open', reason: text(body['reason']) } };
    if (path.length === 2 && method === 'GET') {
      return { order: { ...withoutDeliveryOtp(order), user: { _id: order.user, name: order.customerName ?? 'Guest', phone: '+15550100', email: 'guest@example.com' } } };
    }
    if (path[2] === 'status') updateSellerOrderStatus(order, text(body['status']));
    if (path[2] === 'notes') Object.assign(order, { sellerNotes: body['notes'] });
    if (path[2] === 'cancel') {
      if (!['confirmed', 'preparing', 'ready_for_pickup'].includes(order.status)) {
        throw new HttpErrorResponse({ status: 400, error: { message: 'This order can no longer be cancelled by the restaurant.' } });
      }
      order.cancellationReason = text(body['reason']);
      updateSellerOrderStatus(order, 'cancelled');
    }
    if (path[2] && method !== 'GET') {
      save(state);
      return { order: withoutDeliveryOtp(order) };
    }
  }
  if (path[0] === 'coupons') {
    if (path.length === 1 && method === 'GET') return { coupons: state.coupons };
    if (path.length === 1 && method === 'POST') {
      const coupon = { ...state.coupons[0], ...body, _id: id('coupon') } as DemoCoupon;
      state.coupons.unshift(coupon);
      save(state);
      return { coupon };
    }
    const coupon = state.coupons.find((item) => item._id === path[1]);
    if (coupon && method === 'PATCH') Object.assign(coupon, body);
    if (coupon && method === 'DELETE') state.coupons = state.coupons.filter((item) => item._id !== coupon._id);
    save(state);
    return { coupon: coupon ?? null };
  }
  if (path[0] === 'reviews') {
    const reviews = state.reviews.filter((review) => review.restaurant === restaurantId);
    if (path[1] === 'analytics') {
      const byStar = Object.fromEntries([1, 2, 3, 4, 5].map((star) => [star, reviews.filter((review) => review.rating === star).length]));
      return {
        byStar,
        total: reviews.length,
        average: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0,
      };
    }
    if (path.length === 1 && method === 'GET') return { reviews: reviews.map((review) => ({ ...review, sellerReply: review.sellerReply })) };
    const review = reviews.find((item) => item._id === path[1]);
    if (review && method === 'POST') {
      review.sellerReply = { text: text(body['text']), at: new Date().toISOString() };
      save(state);
      return { review };
    }
  }
  if (path[0] === 'earnings') return { totalEarnings: 26840, orderCount: state.orders.length };
  if (path[0] === 'dashboard') {
    const stats = sellerDashboardStats(state.orders, state.active.seller.restaurant);
    return { ...stats, recentOrders: stats.recentOrders.map(withoutDeliveryOtp) };
  }
  if (path[0] === 'reports' && path[1] === 'revenue') return { from: '', to: '', totalRevenue: 126000, totalOrders: state.orders.length, daily: [] };
  if (path[0] === 'reports' && path[1] === 'top-items') return { items: [{ name: 'Truffle Mushroom Pasta', qty: 42, revenue: 14658, orders: 36 }] };
  if (path[0] === 'reports' && path[1] === 'peak-hours') return { byHour: Array.from({ length: 8 }, (_, index) => ({ hour: index + 11, count: index + 3 })) };
  if (path[0] === 'reports' && path[1] === 'customers') return { topCustomers: [{ name: 'Aarav Sharma', phone: '+15550100', orders: 8, spent: 6420 }], totalCustomers: 184, repeatCustomers: 52 };
  if (path[0] === 'messages' && path[1] === 'unread-count') return EMPTY_MESSAGE_COUNTS;
  return undefined;
}

function deliveryRoutes(state: MockState, method: string, path: string[], body: JsonRecord, url: URL) {
  if (path[0] === 'auth') return accountRoutes(state, 'delivery', method, path, body);
  if (path[0] === 'orders' && path[1] === 'available') {
    return {
      orders: state.orders.filter(
        (order) =>
          order.status === 'ready_for_pickup' &&
          !order.deliveryPartner &&
          (order.deliveryStatus === 'pending' || order.deliveryStatus === 'searching')
      ).map(withoutDeliveryOtp),
    };
  }
  if (path[0] === 'orders' && path.length === 1) {
    let orders = deliveryOrdersFor(state);
    const status = url.searchParams.get('status');
    const deliveryStatus = url.searchParams.get('deliveryStatus');
    if (status) orders = orders.filter((order) => order.status === status);
    if (deliveryStatus) orders = orders.filter((order) => order.deliveryStatus === deliveryStatus);
    return { orders };
  }
  if (path[0] === 'orders' && path[1]) {
    const order = orderById(state, path[1]);
    if (!order) throw new HttpErrorResponse({ status: 404, error: { message: 'Order not found' } });
    const assignedToCurrentPartner = deliveryPartnerId(order) === state.active.delivery.id;
    const availableForAssignment =
      order.status === 'ready_for_pickup' &&
      !order.deliveryPartner &&
      (order.deliveryStatus === 'pending' || order.deliveryStatus === 'searching');
    if (!assignedToCurrentPartner && !availableForAssignment) {
      throw new HttpErrorResponse({ status: 404, error: { message: 'Order not found' } });
    }
    if (path.length === 2 && method === 'GET') {
      const restaurant = state.restaurants.find((candidate) => candidate._id === order.restaurant) ?? state.restaurants[0];
      return { order: { ...withoutDeliveryOtp(order), user: { _id: order.user, name: order.customerName ?? 'Guest', phone: '+15550100' }, restaurant: { _id: restaurant._id, name: restaurant.name, address: restaurant.address, location: { lat: 37.7749, lng: -122.4194 } } }, sellerPhone: '+15550101' };
    }
    if (path[2] === 'messages') {
      if (!assignedToCurrentPartner) {
        throw new HttpErrorResponse({ status: 404, error: { message: 'Order not found' } });
      }
      const thread = url.searchParams.get('with') === 'seller' ? 'seller-delivery' : 'customer-delivery';
      return method === 'GET'
        ? { messages: messagesForOrder(state, order._id, thread) }
        : { message: addMessage(state, order._id, thread, 'delivery', text(body['text'])) };
    }
    if (path[2] === 'accept' && method === 'POST') {
      const ownAssignment = deliveryPartnerId(order) === state.active.delivery.id && order.deliveryStatus === 'assigned';
      if (!ownAssignment) {
        if (hasActiveDelivery(state, state.active.delivery.id, order._id)) {
          throw new HttpErrorResponse({ status: 409, error: { message: 'You already have an active delivery in progress' } });
        }
        if (order.status !== 'ready_for_pickup' || order.deliveryPartner) {
          throw new HttpErrorResponse({ status: 409, error: { message: 'This order is not ready for pickup or is no longer available' } });
        }
        order.deliveryPartner = state.active.delivery.id;
      }
      recordDeliveryStatus(order, 'accepted');
      state.active.delivery.currentOrder = order._id;
      state.delivery = state.active.delivery;
    }
    if (path[2] === 'reject' && method === 'POST') {
      if (order.deliveryPartner !== state.active.delivery.id || order.deliveryStatus !== 'assigned') {
        throw new HttpErrorResponse({ status: 400, error: { message: 'This delivery cannot be rejected at this stage' } });
      }
      order.deliveryPartner = null;
      order.reassignCount = (order.reassignCount ?? 0) + 1;
      recordDeliveryStatus(order, 'searching');
      if (state.active.delivery.currentOrder === order._id) state.active.delivery.currentOrder = null;
      state.delivery = state.active.delivery;
    }
    if (path[2] === 'status' && method === 'PATCH') {
      if (!assignedToCurrentPartner) {
        throw new HttpErrorResponse({ status: 403, error: { message: 'This order is not assigned to you' } });
      }
      if (body['status'] === 'cancelled') {
        if (order.deliveryStatus !== 'accepted' && order.deliveryStatus !== 'reached_restaurant') {
          throw new HttpErrorResponse({ status: 400, error: { message: 'This delivery can no longer be cancelled at this stage.' } });
        }
        if (!text(body['reason']).trim()) {
          throw new HttpErrorResponse({ status: 400, error: { message: 'A cancellation reason is required' } });
        }
        order.deliveryFailReason = text(body['reason']).trim();
        order.deliveryPartner = null;
        order.reassignCount = (order.reassignCount ?? 0) + 1;
        recordDeliveryStatus(order, 'pending');
        if (state.active.delivery.currentOrder === order._id) state.active.delivery.currentOrder = null;
      } else {
        const nextStatus = text(body['status']);
        const allowedTransitions: Record<string, string[]> = {
          accepted: ['reached_restaurant'],
          reached_restaurant: ['picked_up'],
          picked_up: ['out_for_delivery', 'failed'],
          out_for_delivery: ['reached_customer', 'failed'],
          reached_customer: ['delivered', 'failed'],
        };
        if (!allowedTransitions[order.deliveryStatus]?.includes(nextStatus)) {
          throw new HttpErrorResponse({ status: 400, error: { message: `Cannot change delivery from ${order.deliveryStatus} to ${nextStatus}.` } });
        }
        if (nextStatus === 'delivered') {
          if (!isDeliveryOtpValid(order, body['otp'])) {
            throw new HttpErrorResponse({ status: 400, error: { message: 'The delivery OTP is incorrect.' } });
          }
          order.deliveryOtpVerified = true;
        }
        recordDeliveryStatus(order, nextStatus);
        if (nextStatus === 'picked_up') {
          recordOrderStatus(order, 'out_for_delivery');
          order.pickedUpAt = new Date().toISOString();
        }
        if (nextStatus === 'delivered') {
          recordOrderStatus(order, 'delivered');
          order.deliveredAt = new Date().toISOString();
          state.active.delivery.currentOrder = null;
        }
        if (nextStatus === 'failed') {
          recordOrderStatus(order, 'failed');
          order.deliveryFailReason = text(body['reason']);
          state.active.delivery.currentOrder = null;
        }
      }
      state.delivery = state.active.delivery;
    }
    save(state);
    return { order: withoutDeliveryOtp(order) };
  }
  if (path[0] === 'location' && method === 'PATCH') {
    state.active.delivery = { ...state.active.delivery, location: { lat: numeric(body['lat']), lng: numeric(body['lng']) }, lastLocationAt: new Date().toISOString() };
    save(state);
    return { location: state.active.delivery.location };
  }
  if (path[0] === 'earnings' && path[1] === 'history') {
    return deliveryEarningsHistory(
      deliveryOrdersFor(state),
      Number(url.searchParams.get('page')) || 1,
      Number(url.searchParams.get('limit')) || 20
    );
  }
  if (path[0] === 'earnings') return calculateDeliveryEarnings(deliveryOrdersFor(state), state.active.delivery.dailyTarget);
  if (path[0] === 'dashboard' && path[1] === 'weekly-performance') {
    return { days: deliveryWeeklyPerformance(deliveryOrdersFor(state)) };
  }
  if (path[0] === 'dashboard') return deliveryDashboardStats(state);
  if (path[0] === 'messages' && path[1] === 'unread-count') return EMPTY_MESSAGE_COUNTS;
  return undefined;
}

function adminRoutes(state: MockState, method: string, path: string[], body: JsonRecord, url: URL) {
  if (path[0] === 'auth') {
    if (path[1] === 'login' && method === 'POST') return authResponse(state, 'admin', body);
    if (path[1] === 'me' && method === 'GET') return { user: state.active.admin };
    if (method === 'POST') return { message: 'Demo admin request completed.', devOtp: '123456' };
  }
  if (path[0] === 'dashboard') {
    return adminDashboardStats(
      state.orders,
      state.users.length,
      state.restaurants,
      state.seller ? 1 : 0,
      state.delivery ? 1 : 0
    );
  }
  if (path[0] === 'users') {
    if (path.length === 1 && method === 'GET') {
      const q = url.searchParams.get('q')?.toLowerCase();
      return { users: state.users.filter((user) => !q || `${user.name} ${user.email} ${user.phone}`.toLowerCase().includes(q)) };
    }
    const user = state.users.find((candidate) => candidate.id === path[1]);
    if (path.length === 2 && method === 'GET') return { user: user ?? state.active.customer, orders: state.orders };
    if (path[2] === 'block' && user) Object.assign(user, { isBlocked: body['isBlocked'] === true });
    else if (user && method === 'PATCH') Object.assign(user, body);
    else if (user && method === 'DELETE') state.users = state.users.filter((candidate) => candidate.id !== user.id);
    save(state);
    return { user: user ?? state.active.customer };
  }
  if (path[0] === 'restaurant-owners') {
    if (path.length === 1) return { owners: [state.seller] };
    if (path[2] === 'earnings') return { totalEarnings: 126000, orderCount: state.orders.length, monthlyEarnings: 42000 };
    if (path[2] === 'status') state.seller = { ...state.seller, status: text(body['status'], state.seller.status) as typeof state.seller.status };
    if (path[2] === 'suspend') state.seller = { ...state.seller, isSuspended: body['isSuspended'] === true };
    save(state);
    return { owner: state.seller };
  }
  if (path[0] === 'delivery-partners') {
    if (path.length === 1) return { partners: [state.delivery] };
    if (path[2] === 'performance') return { deliveriesCompleted: 76, totalEarnings: 42800, cancelledCount: 2 };
    if (path[2] === 'status') {
      state.delivery = { ...state.delivery, status: text(body['status'], state.delivery.status) as typeof state.delivery.status };
      state.active.delivery = state.delivery;
    }
    if (path[2] === 'suspend') {
      state.delivery = { ...state.delivery, isSuspended: body['isSuspended'] === true };
      state.active.delivery = state.delivery;
    }
    save(state);
    return { partner: state.delivery };
  }
  if (path[0] === 'deliveries' && path[1] === 'live') return { orders: state.orders.filter((order) => order.deliveryStatus !== 'delivered') };
  if (path[0] === 'delivery-issues') return path.length === 1 ? { issues: [] } : { issue: { _id: path[1], status: 'resolved', resolution: text(body['resolution']) } };
  if (path[0] === 'restaurants') {
    if (path.length === 1 && method === 'GET') {
      const q = url.searchParams.get('q')?.toLowerCase();
      return { restaurants: state.restaurants.filter((restaurant) => !q || restaurant.name.toLowerCase().includes(q)) };
    }
    const restaurant = state.restaurants.find((candidate) => candidate._id === path[1]);
    if (!restaurant) return { restaurant: state.restaurants[0] };
    if (path[2] === 'performance') return { totalRevenue: 126000, deliveredOrders: 142, ordersByStatus: [], topItems: [] };
    if (path[2] === 'status') Object.assign(restaurant, { verificationStatus: body['status'] });
    else if (path[2] === 'suspend') Object.assign(restaurant, { isSuspended: body['isSuspended'] === true });
    else if (method === 'PATCH') Object.assign(restaurant, body);
    else if (method === 'DELETE') state.restaurants = state.restaurants.filter((candidate) => candidate._id !== restaurant._id);
    save(state);
    return { restaurant };
  }
  if (path[0] === 'foods') {
    const items = state.menuItems.map((item) => ({ ...item, restaurant: state.restaurants.find((restaurant) => restaurant._id === item.restaurant) ?? item.restaurant }));
    if (path[1] === 'trending') return { items: items.filter((item) => item.isBestseller).map((item) => ({ name: item.name, qty: 42 })) };
    if (path.length === 1) return { items };
    const item = state.menuItems.find((candidate) => candidate._id === path[1]);
    if (item && path[2] === 'hide') Object.assign(item, { isHiddenByAdmin: body['isHiddenByAdmin'] === true });
    else if (item && method === 'PATCH') Object.assign(item, body);
    else if (item && method === 'DELETE') state.menuItems = state.menuItems.filter((candidate) => candidate._id !== item._id);
    save(state);
    return { item: item ?? state.menuItems[0] };
  }
  if (path[0] === 'orders') {
    if (path.length === 1) return { orders: state.orders };
    const order = orderById(state, path[1] ?? '');
    if (path[2] === 'assign-delivery' && order) {
      if (order.status !== 'ready_for_pickup' && order.status !== 'out_for_delivery') {
        throw new HttpErrorResponse({ status: 400, error: { message: 'Order is not ready for delivery assignment yet' } });
      }
      const partnerId = text(body['partnerId']);
      if (!partnerId) throw new HttpErrorResponse({ status: 400, error: { message: 'Choose a delivery partner' } });
      const partner = state.delivery;
      if (partner.id !== partnerId || partner.status !== 'approved' || partner.isSuspended || !partner.isOnline) {
        throw new HttpErrorResponse({ status: 400, error: { message: 'Delivery partner is not available' } });
      }
      if (hasActiveDelivery(state, partnerId, order._id)) {
        throw new HttpErrorResponse({ status: 400, error: { message: 'This partner already has an active delivery' } });
      }
      order.deliveryPartner = partnerId;
      recordDeliveryStatus(order, 'assigned');
      partner.currentOrder = order._id;
      state.active.delivery = partner;
    } else if (path[2] === 'status' && order) recordOrderStatus(order, body['status']);
    else if (path[2] === 'cancel' && order) {
      recordOrderStatus(order, 'cancelled');
      Object.assign(order, { cancellationReason: text(body['reason']) });
    }
    else if (path[2] === 'refund' && order) Object.assign(order, body);
    save(state);
    return { order: order ?? state.orders[0] };
  }
  if (path[0] === 'refunds') return { orders: state.orders.filter((order) => order.refundStatus && order.refundStatus !== 'none') };
  if (path[0] === 'reviews') {
    if (path.length === 1) return { reviews: state.reviews };
    const review = state.reviews.find((candidate) => candidate._id === path[1]);
    if (review && path[2] === 'hide') Object.assign(review, { isHidden: body['isHidden'] === true });
    if (review && method === 'DELETE') state.reviews = state.reviews.filter((candidate) => candidate._id !== review._id);
    save(state);
    return { review: review ?? state.reviews[0] };
  }
  if (path[0] === 'categories') {
    if (path.length === 1 && method === 'GET') return { categories: state.categories };
    if (path[1] === 'reorder') return { message: 'Category order saved.' };
    const category = state.categories.find((candidate) => candidate._id === path[1]);
    if (path.length === 1 && method === 'POST') {
      const created: DemoCategory = { _id: id('category'), name: text(body['name'], 'New category'), slug: text(body['name'], 'new-category').toLowerCase().replaceAll(' ', '-'), image: text(body['image']), isActive: true, sortOrder: state.categories.length };
      state.categories.push(created);
      save(state);
      return { category: created };
    }
    if (category && method === 'PATCH') Object.assign(category, body);
    if (category && method === 'DELETE') state.categories = state.categories.filter((candidate) => candidate._id !== category._id);
    save(state);
    return { category: category ?? state.categories[0] };
  }
  if (path[0] === 'explore-cards') {
    if (path.length === 1 && method === 'GET') return { cards: state.exploreCards };
    if (path[1] === 'reorder') return { message: 'Explore card order saved.' };
    const card = state.exploreCards.find((candidate) => candidate._id === path[1]);
    if (path.length === 1 && method === 'POST') {
      const created = { ...state.exploreCards[0], ...body, _id: id('explore') };
      state.exploreCards.push(created);
      save(state);
      return { card: created };
    }
    if (card && method === 'PATCH') Object.assign(card, body);
    if (card && method === 'DELETE') state.exploreCards = state.exploreCards.filter((candidate) => candidate._id !== card._id);
    save(state);
    return { card: card ?? state.exploreCards[0] };
  }
  if (path[0] === 'coupons') {
    if (path.length === 1 && method === 'GET') return { coupons: state.coupons };
    const coupon = state.coupons.find((candidate) => candidate._id === path[1]);
    if (path.length === 1 && method === 'POST') {
      const created = { ...state.coupons[0], ...body, _id: id('coupon') };
      state.coupons.push(created);
      save(state);
      return { coupon: created };
    }
    if (coupon && method === 'PATCH') Object.assign(coupon, body);
    if (coupon && method === 'DELETE') state.coupons = state.coupons.filter((candidate) => candidate._id !== coupon._id);
    save(state);
    return { coupon: coupon ?? state.coupons[0] };
  }
  if (path[0] === 'banners') {
    if (path.length === 1 && method === 'GET') return { banners: state.banners };
    const banner = state.banners.find((candidate) => candidate._id === path[1]);
    if (path.length === 1 && method === 'POST') {
      const created = { ...state.banners[0], ...body, _id: id('banner') } as DemoBanner;
      state.banners.push(created);
      save(state);
      return { banner: created };
    }
    if (banner && method === 'PATCH') Object.assign(banner, body);
    if (banner && method === 'DELETE') state.banners = state.banners.filter((candidate) => candidate._id !== banner._id);
    save(state);
    return { banner: banner ?? state.banners[0] };
  }
  if (path[0] === 'reports') {
    if (path[1] === 'sales') return { from: '', to: '', totalRevenue: 284500, totalOrders: state.orders.length, daily: [] };
    if (path[1] === 'customers') return { topCustomers: [{ name: 'Aarav Sharma', phone: '+15550100', orders: 8, spent: 6420 }], totalCustomers: state.users.length, repeatCustomers: 1 };
    if (path[1] === 'restaurants') return { restaurants: state.restaurants.map((restaurant) => ({ id: restaurant._id, name: restaurant.name, revenue: 28400, orders: 42 })) };
    if (path[1] === 'sellers') return { sellers: [{ id: state.seller.id, businessName: state.seller.businessName, status: state.seller.status, revenue: 126000, orders: state.orders.length }] };
    if (path[1] === 'delivery') return { partners: [{ id: state.delivery.id, name: state.delivery.name, status: state.delivery.status, isOnline: state.delivery.isOnline, rating: state.delivery.rating.average, deliveries: 76, earnings: 42800 }] };
    if (path[1] === 'delivery-analytics') return { dailyDeliveries: [], monthlyDeliveries: [], failedDeliveries: 2, totalDeliveryEarnings: 42800, avgDeliveryMinutes: 28 };
    if (path[1] === 'revenue-breakdown') return { byPaymentMethod: [{ method: 'UPI', total: 148000, count: 74 }, { method: 'Card', total: 90500, count: 42 }], totals: { subtotal: 256000, deliveryFees: 21000, taxes: 12800, discounts: 5300, total: 284500 } };
    return { totalOrders: state.orders.length, totalRevenue: 284500, totalUsers: state.users.length, totalRestaurants: state.restaurants.length, totalDeliveryPartners: 1, ordersByStatus: [] };
  }
  if (path[0] === 'settings') {
    if (method === 'PATCH') Object.assign(state.settings, body);
    save(state);
    return { settings: state.settings };
  }
  if (path[0] === 'admins') {
    if (path.length === 1) return { admins: [state.admin] };
    return { admin: state.admin };
  }
  if (path[0] === 'audit-logs' || path[0] === 'login-history') return { logs: [] };
  if (path[0] === 'notifications' && path[1] === 'broadcast') return { message: 'Demo notification saved.', recipientCount: 12, scheduled: !!body['scheduledFor'] };
  if (path[0] === 'notifications' && path[1] === 'search-recipients') return { accounts: state.users.filter((user) => `${user.name} ${user.email ?? ''}`.toLowerCase().includes((url.searchParams.get('q') ?? '').toLowerCase())).map((user) => ({ id: user.id, name: user.name, email: user.email ?? undefined, phone: user.phone ?? undefined })) };
  return undefined;
}

export function mockResponse(request: HttpRequest<unknown>) {
  const url = new URL(request.urlWithParams, 'http://feastgo.local');
  const path = url.pathname.replace(/^\/mock-api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const method = request.method.toUpperCase();
  const body = bodyOf(request);
  const state = getMockState();
  let result: unknown;

  const adminNotificationAction = path[0] === 'admin' && path[1] === 'notifications' && ['broadcast', 'search-recipients'].includes(path[2] ?? '');
  if (path.includes('notifications') && !adminNotificationAction) {
    result = notificationsForPath(state, path, method, url, body);
  } else if (path[0] === 'auth') {
    result = customerAuth(state, method, path, body);
  } else if (path[0] === 'orders') {
    result = customerOrders(state, method, path, body);
  } else if (path[0] === 'seller') {
    result = sellerRoutes(state, method, path.slice(1), body, url);
  } else if (path[0] === 'delivery') {
    result = deliveryRoutes(state, method, path.slice(1), body, url);
  } else if (path[0] === 'admin') {
    result = adminRoutes(state, method, path.slice(1), body, url);
  } else {
    result = publicRoutes(state, method, path, url, body);
  }

  if (result === undefined) {
    throw new HttpErrorResponse({
      status: 501,
      statusText: 'Demo API endpoint is not implemented',
      url: request.urlWithParams,
      error: { message: `No local demo handler for ${method} ${url.pathname}` },
    });
  }
  return result;
}
