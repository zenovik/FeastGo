import type { ExploreCard } from '../models/explore-card.model';
import type { MenuItem } from '../models/menu-item.model';
import type { Order } from '../models/order.model';
import type { OrderMessage } from '../models/message.model';
import type { Restaurant } from '../models/restaurant.model';
import type { AppNotification } from '../models/notification.model';
import type { AdminAccount, DeliveryAccount, SellerAccount } from '../models/role-account.model';
import type { Address, User } from '../models/user.model';
import type { SystemSettings } from '../models/system-settings.model';
import { generateDeliveryOtp } from './delivery-otp';

const STORAGE_KEY = 'feastgo_mock_database_v2';
const now = new Date().toISOString();

function artwork(title: string, emoji: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="#161b36"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><circle cx="520" cy="90" r="130" fill="#fff" opacity=".08"/><text x="320" y="230" text-anchor="middle" font-size="118">${emoji}</text><text x="320" y="390" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="30" font-weight="700">${title}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const CATEGORY_PHOTOS: Record<string, string> = {
  Burgers: 'double-smash-burger',
  Desserts: 'chocolate-fudge-cake',
  Indian: 'butter-chicken-bowl',
  Italian: 'truffle-mushroom-pasta',
  Japanese: 'spicy-tonkotsu-ramen',
  Mexican: 'street-style-chicken-tacos',
  Noodles: 'chilli-garlic-noodles',
  Pizza: 'margherita-pizza',
  Salads: 'grilled-halloumi-salad',
  Tacos: 'street-style-chicken-tacos',
};

function imageSlug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('&', '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function dishPhoto(name: string): string {
  return `/images/food-real/dishes/${imageSlug(name)}.webp`;
}

function restaurantPhoto(slug: string): string {
  return `/images/food-real/restaurants/${slug}.webp`;
}

interface RestaurantSeed {
  name: string;
  slug: string;
  emoji: string;
  color: string;
  cuisines: string[];
  area: string;
  delivery: number;
  priceRange: 1 | 2 | 3;
  offer: string;
  dishes: { name: string; emoji: string; category: string; price: number; veg: boolean; bestseller?: boolean }[];
}

const RESTAURANT_SEEDS: RestaurantSeed[] = [
  {
    name: 'Casa Marino',
    slug: 'casa-marino',
    emoji: '🍝',
    color: '#b8321f',
    cuisines: ['Italian', 'Pasta', 'Pizza'],
    area: 'Harbor District',
    delivery: 35,
    priceRange: 2,
    offer: '20% off up to ₹150',
    dishes: [
      { name: 'Truffle Mushroom Pasta', emoji: '🍝', category: 'Pasta', price: 349, veg: true, bestseller: true },
      { name: 'Margherita Pizza', emoji: '🍕', category: 'Pizza', price: 299, veg: true },
      { name: 'Classic Tiramisu', emoji: '🍰', category: 'Desserts', price: 199, veg: true, bestseller: true },
    ],
  },
  {
    name: 'Sakura Bowl',
    slug: 'sakura-bowl',
    emoji: '🍜',
    color: '#a4133c',
    cuisines: ['Japanese', 'Sushi', 'Ramen'],
    area: 'Midtown',
    delivery: 30,
    priceRange: 3,
    offer: 'Free miso soup on orders above ₹499',
    dishes: [
      { name: 'Spicy Tonkotsu Ramen', emoji: '🍜', category: 'Ramen', price: 429, veg: false, bestseller: true },
      { name: 'Avocado Cucumber Roll', emoji: '🍣', category: 'Sushi', price: 329, veg: true },
      { name: 'Chicken Katsu Don', emoji: '🍱', category: 'Rice Bowls', price: 389, veg: false },
    ],
  },
  {
    name: 'El Fuego',
    slug: 'el-fuego',
    emoji: '🌮',
    color: '#d1495b',
    cuisines: ['Mexican', 'Tacos'],
    area: 'Riverside',
    delivery: 25,
    priceRange: 1,
    offer: 'Free delivery above ₹400',
    dishes: [
      { name: 'Street-Style Chicken Tacos', emoji: '🌮', category: 'Tacos', price: 249, veg: false, bestseller: true },
      { name: 'Loaded Veggie Burrito', emoji: '🌯', category: 'Burritos', price: 279, veg: true },
      { name: 'Churros & Chocolate', emoji: '🍩', category: 'Desserts', price: 169, veg: true },
    ],
  },
  {
    name: 'The Grill House',
    slug: 'the-grill-house',
    emoji: '🍔',
    color: '#8a5a2b',
    cuisines: ['American', 'Burgers', 'BBQ'],
    area: 'Warehouse District',
    delivery: 28,
    priceRange: 2,
    offer: 'Buy 1 burger, get fries free',
    dishes: [
      { name: 'Double Smash Burger', emoji: '🍔', category: 'Burgers', price: 379, veg: false, bestseller: true },
      { name: 'Crispy Chicken Tenders', emoji: '🍗', category: 'Sides', price: 279, veg: false },
      { name: 'Loaded Cheese Fries', emoji: '🍟', category: 'Sides', price: 199, veg: true },
    ],
  },
  {
    name: 'Spice Trail',
    slug: 'spice-trail',
    emoji: '🍛',
    color: '#7a1a1a',
    cuisines: ['Indian', 'Curry', 'Tandoor'],
    area: 'Old Town',
    delivery: 40,
    priceRange: 2,
    offer: '15% off up to ₹120',
    dishes: [
      { name: 'Butter Chicken Bowl', emoji: '🍛', category: 'Curries', price: 329, veg: false, bestseller: true },
      { name: 'Paneer Tikka Masala', emoji: '🧀', category: 'Curries', price: 299, veg: true },
      { name: 'Garlic Naan', emoji: '🫓', category: 'Breads', price: 69, veg: true },
    ],
  },
  {
    name: 'Golden Wok',
    slug: 'golden-wok',
    emoji: '🥡',
    color: '#7b1113',
    cuisines: ['Chinese', 'Noodles'],
    area: 'Chinatown',
    delivery: 25,
    priceRange: 1,
    offer: 'Combo meals from ₹299',
    dishes: [
      { name: 'Chilli Garlic Noodles', emoji: '🍜', category: 'Noodles', price: 249, veg: true, bestseller: true },
      { name: 'Crispy Veg Spring Rolls', emoji: '🥟', category: 'Starters', price: 179, veg: true },
      { name: 'Schezwan Chicken Rice', emoji: '🍚', category: 'Rice Bowls', price: 289, veg: false },
    ],
  },
  {
    name: 'Basil & Thyme',
    slug: 'basil-and-thyme',
    emoji: '🥙',
    color: '#1b4332',
    cuisines: ['Mediterranean', 'Healthy', 'Salads'],
    area: 'Garden Quarter',
    delivery: 30,
    priceRange: 2,
    offer: 'Fresh bowls, 10% off',
    dishes: [
      { name: 'Grilled Halloumi Salad', emoji: '🥗', category: 'Salads', price: 319, veg: true, bestseller: true },
      { name: 'Falafel Hummus Bowl', emoji: '🥙', category: 'Bowls', price: 289, veg: true },
      { name: 'Lemon Herb Chicken', emoji: '🍗', category: 'Grills', price: 379, veg: false },
    ],
  },
  {
    name: 'Sweet Nothings',
    slug: 'sweet-nothings',
    emoji: '🍰',
    color: '#8e3b8e',
    cuisines: ['Desserts', 'Bakery', 'Beverages'],
    area: 'Market Street',
    delivery: 25,
    priceRange: 1,
    offer: 'Free cookie with every shake',
    dishes: [
      { name: 'Chocolate Fudge Cake', emoji: '🍰', category: 'Desserts', price: 229, veg: true, bestseller: true },
      { name: 'Strawberry Cheesecake', emoji: '🍓', category: 'Desserts', price: 249, veg: true },
      { name: 'Vanilla Bean Milkshake', emoji: '🥤', category: 'Beverages', price: 179, veg: true },
    ],
  },
];

export interface DemoCategory {
  _id: string;
  name: string;
  slug: string;
  image: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DemoCoupon {
  _id: string;
  code: string;
  offerType: 'discount' | 'bogo' | 'combo' | 'flash';
  discountType: 'percent' | 'flat';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  timesUsed: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  buyQty: number;
  getQty: number;
  restaurant: string | null;
  comboItems: string[];
  comboPrice: number | null;
  applicableItems: string[];
}

export interface DemoBanner {
  _id: string;
  title: string;
  image: string;
  link: string;
  placement: 'homepage' | 'promotional' | 'carousel';
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  expiresAt: string | null;
}

export interface DemoReview {
  _id: string;
  restaurant: string;
  userName: string;
  rating: number;
  comment: string;
  isHidden: boolean;
  reportCount: number;
  sellerReply: { text: string; at: string | null };
  createdAt: string;
}

export interface MockState {
  restaurants: Restaurant[];
  menuItems: MenuItem[];
  categories: DemoCategory[];
  exploreCards: ExploreCard[];
  users: User[];
  seller: SellerAccount;
  delivery: DeliveryAccount;
  admin: AdminAccount;
  orders: Order[];
  messages: OrderMessage[];
  reviews: DemoReview[];
  coupons: DemoCoupon[];
  banners: DemoBanner[];
  notifications: Record<'customer' | 'seller' | 'delivery' | 'admin', AppNotification[]>;
  settings: SystemSettings;
  active: { customer: User; seller: SellerAccount; delivery: DeliveryAccount; admin: AdminAccount };
}

function makeRestaurants() {
  return RESTAURANT_SEEDS.map((seed, index): Restaurant => {
    const coverImage = restaurantPhoto(seed.slug);
    return {
      _id: `restaurant-${index + 1}`,
      name: seed.name,
      slug: seed.slug,
      description: `${seed.cuisines.join(', ')} favorites, freshly made and delivered to your door.`,
      cuisines: seed.cuisines,
      priceRange: seed.priceRange,
      rating: 4.2 + ((index % 5) * 0.1),
      ratingCount: 124 + index * 37,
      deliveryTimeMin: Math.max(15, seed.delivery - 8),
      deliveryTimeMax: seed.delivery + 8,
      deliveryFee: index % 3 === 0 ? 0 : 39,
      minOrder: 199,
      coverImage,
      logoImage: artwork(seed.name.slice(0, 2), seed.emoji, seed.color),
      images: [coverImage],
      address: { line1: `${12 + index} Main Street`, area: seed.area, city: 'Metro City', state: 'CA', zip: '90210' },
      isOpen: true,
      isFeatured: index < 4,
      isPromoted: index < 3,
      tags: index % 2 === 0 ? ['Trending', 'Popular'] : ['Top Rated'],
      offer: seed.offer,
      verificationStatus: 'approved',
    };
  });
}

function makeMenuItems(): MenuItem[] {
  return RESTAURANT_SEEDS.flatMap((restaurant, restaurantIndex) =>
    restaurant.dishes.map((dish, dishIndex): MenuItem => ({
      _id: `menu-${restaurantIndex + 1}-${dishIndex + 1}`,
      restaurant: `restaurant-${restaurantIndex + 1}`,
      name: dish.name,
      description: `Freshly prepared ${dish.name.toLowerCase()} using quality ingredients.`,
      price: dish.price,
      image: dishPhoto(dish.name),
      images: [dishPhoto(dish.name)],
      category: dish.category,
      isVeg: dish.veg,
      isBestseller: !!dish.bestseller,
      isFeatured: dishIndex === 0,
      isRecommended: dish.bestseller ?? false,
      isAvailable: true,
      spiceLevel: dish.category === 'Curries' ? 2 : 1,
      rating: 4.2 + ((restaurantIndex + dishIndex) % 7) * 0.1,
      stockCount: 30,
      sortOrder: dishIndex,
      createdAt: now,
      updatedAt: now,
    }))
  );
}

function defaultAddress(): Address {
  return {
    _id: 'address-home',
    label: 'Home',
    line1: '221 Baker Street',
    area: 'Downtown',
    city: 'Metro City',
    state: 'CA',
    zip: '90210',
    phone: '+1 555-0100',
    isDefault: true,
    instructions: 'Ring the doorbell',
  };
}

function makeOrder(menuItems: MenuItem[], restaurant: Restaurant, index: number, status: Order['status']): Order {
  const item = menuItems.find((candidate) => candidate.restaurant === restaurant._id)!;
  const subtotal = item.price * (index === 0 ? 2 : 1);
  const placedAt = new Date(Date.now() - index * 45 * 60_000).toISOString();
  return {
    _id: `order-demo-${index + 1}`,
    user: 'user-demo',
    restaurant: restaurant._id,
    restaurantName: restaurant.name,
    deliveryPartner: status === 'confirmed' ? null : 'delivery-demo',
    items: [{ menuItem: item._id, name: item.name, price: item.price, qty: index === 0 ? 2 : 1, isVeg: item.isVeg }],
    subtotal,
    deliveryFee: restaurant.deliveryFee,
    taxes: Math.round(subtotal * 0.05),
    discount: 0,
    total: subtotal + restaurant.deliveryFee + Math.round(subtotal * 0.05),
    status,
    statusHistory: [{ status, at: placedAt }],
    deliveryOtp: status === 'delivered' ? null : generateDeliveryOtp(),
    deliveryOtpVerified: false,
    address: defaultAddress(),
    paymentMethod: index % 2 === 0 ? 'upi' : 'cod',
    etaMinutes: Math.max(10, restaurant.deliveryTimeMax - index * 5),
    deliveryStatus: status === 'delivered' ? 'delivered' : status === 'confirmed' ? 'pending' : 'out_for_delivery',
    deliveryStatusHistory: [{ status: status === 'delivered' ? 'delivered' : status === 'confirmed' ? 'pending' : 'out_for_delivery', at: placedAt }],
    createdAt: placedAt,
    customerName: 'Aarav Sharma',
  };
}

function createInitialState(): MockState {
  const restaurants = makeRestaurants();
  const menuItems = makeMenuItems();
  const user: User = {
    id: 'user-demo',
    name: 'Aarav Sharma',
    email: 'aarav@example.com',
    phone: '9876543210',
    dob: null,
    gender: null,
    photo: null,
    location: { lat: null, lng: null },
    role: 'user',
    addresses: [defaultAddress()],
    favoriteRestaurants: ['restaurant-2', 'restaurant-5'],
    notificationPrefs: { orderUpdates: true, promotional: true, offers: true, email: true, push: false },
    theme: 'light',
    language: 'en',
    savedCards: [],
    savedUpi: [],
    createdAt: now,
  };
  const seller: SellerAccount = {
    id: 'seller-demo',
    name: 'Mia Marino',
    businessName: restaurants[0].name,
    email: 'partner@feastgo.demo',
    phone: '+15550101',
    restaurant: restaurants[0]._id,
    status: 'approved',
    role: 'seller',
    createdAt: now,
  };
  const delivery: DeliveryAccount = {
    id: 'delivery-demo',
    name: 'Rohan Mehta',
    email: 'rider@feastgo.demo',
    phone: '+15550102',
    photo: '',
    dob: null,
    gender: null,
    vehicleType: 'bike',
    vehicleNumber: 'DEMO-1234',
    licenseNumber: 'DEMO-LICENSE',
    aadhaarNumber: 'XXXX-XXXX-1234',
    panNumber: 'ABCDE1234F',
    documents: { license: '', aadhaar: '', pan: '', rc: '', insurance: '' },
    documentsSubmitted: true,
    bankDetails: { accountHolder: 'Rohan Mehta', accountNumber: '0000000000', ifsc: 'DEMO0000001', upiId: 'rohan@upi' },
    emergencyContact: { name: 'Sam Mehta', phone: '+15550103' },
    status: 'approved',
    rejectionReason: '',
    isOnline: true,
    phoneVerified: true,
    orderRejectionCount: 0,
    flaggedForReview: false,
    rating: { average: 4.8, count: 126 },
    dailyTarget: 1000,
    currentOrder: null,
    location: { lat: 37.7749, lng: -122.4194 },
    lastLocationAt: now,
    notificationPrefs: {
      newDeliveryRequest: true,
      orderUpdates: true,
      earnings: true,
      promotional: false,
      email: true,
      push: false,
    },
    theme: 'system',
    language: 'en',
    autoAcceptOrders: false,
    acceptRadiusKm: 5,
    defaultMapsApp: 'google',
    voiceNavigation: true,
    routePreference: 'fastest',
    role: 'delivery',
    createdAt: now,
  };
  const admin: AdminAccount = {
    id: 'admin-demo',
    name: 'FeastGo Admin',
    email: 'admin@feastgo.demo',
    phone: '+15550109',
    role: 'admin',
    adminRole: 'super_admin',
    createdAt: now,
  };
  const categories: DemoCategory[] = [
    'Burgers', 'Desserts', 'Indian', 'Italian', 'Japanese', 'Mexican', 'Noodles', 'Pizza', 'Salads', 'Tacos',
  ].map((name, index) => ({
    _id: `category-${index + 1}`,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    image: dishPhoto(CATEGORY_PHOTOS[name] ?? 'margherita-pizza'),
    isActive: true,
    sortOrder: index,
  }));
  const exploreCards: ExploreCard[] = [
    { title: 'Offers', subtitle: 'Deals made for you', icon: 'percent', badge: 'Save', route: '/restaurants', filters: { offers: true } },
    { title: 'Top Rated', subtitle: 'Loved by local diners', icon: 'star', badge: 'Popular', route: '/restaurants', filters: { topRated: true } },
    { title: 'Healthy Food', subtitle: 'Fresh, feel-good meals', icon: 'leaf', badge: 'Fresh', route: '/restaurants', filters: { healthy: true } },
    { title: 'Desserts', subtitle: 'A little something sweet', icon: 'flame', badge: 'Treats', route: '/restaurants', filters: { q: 'dessert' } },
  ].map((card, index) => ({
    _id: `explore-${index + 1}`,
    gradientFrom: ['#3B5BDB', '#4C6EF5', '#3B5BDB', '#5C6FE0'][index],
    gradientTo: ['#1E2A5E', '#22307A', '#2A3F8F', '#22307A'][index],
    isActive: true,
    sortOrder: index,
    image: '',
    ...card,
  }));
  const orders = [
    makeOrder(menuItems, restaurants[0], 0, 'delivered'),
    makeOrder(menuItems, restaurants[4], 1, 'delivered'),
    makeOrder(menuItems, restaurants[2], 2, 'delivered'),
    makeOrder(menuItems, restaurants[1], 3, 'confirmed'),
  ];
  const reviews: DemoReview[] = [
    { _id: 'review-1', restaurant: restaurants[0]._id, userName: 'Aarav Sharma', rating: 5, comment: 'Fresh, delicious and right on time.', isHidden: false, reportCount: 0, sellerReply: { text: '', at: null }, createdAt: now },
    { _id: 'review-2', restaurant: restaurants[4]._id, userName: 'Priya Kapoor', rating: 4, comment: 'Great flavors and generous portions.', isHidden: false, reportCount: 0, sellerReply: { text: 'Thank you for ordering!', at: now }, createdAt: now },
    { _id: 'review-3', restaurant: restaurants[2]._id, userName: 'Noah Lee', rating: 5, comment: 'The tacos were amazing.', isHidden: false, reportCount: 0, sellerReply: { text: '', at: null }, createdAt: now },
  ];
  const notificationsFor = (role: 'customer' | 'seller' | 'delivery' | 'admin'): AppNotification[] => [
    {
      _id: `notification-${role}-1`,
      type: role === 'seller' ? 'new_order' : role === 'delivery' ? 'new_delivery_order' : 'welcome',
      priority: 'medium',
      title: role === 'customer' ? 'Welcome to FeastGo' : 'Demo workspace ready',
      message: 'This is a local demo notification. Changes are saved in this browser.',
      actionUrl: null,
      isRead: false,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
  const coupon: DemoCoupon = {
    _id: 'coupon-demo',
    code: 'FEAST20',
    offerType: 'discount',
    discountType: 'percent',
    value: 20,
    minOrder: 299,
    maxDiscount: 150,
    usageLimit: null,
    timesUsed: 0,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    buyQty: 0,
    getQty: 0,
    restaurant: null,
    comboItems: [],
    comboPrice: null,
    applicableItems: [],
  };
  const settings: SystemSettings = {
    _id: 'settings-demo',
    appName: 'FeastGo',
    supportEmail: 'support@feastgo.demo',
    maintenanceMode: false,
    commissionPercent: 12,
    defaultDeliveryFee: 39,
    taxPercent: 5,
    maxReassignAttempts: 3,
    maxRejectionsBeforeFlag: 5,
    cancellationGraceMinutes: 5,
    paymentGateway: { provider: 'Demo', apiKey: '', enabled: false },
    email: { smtpHost: '', smtpPort: 0, fromAddress: '', enabled: false },
    sms: { provider: 'Demo OTP', apiKey: '', enabled: false },
  };
  return {
    restaurants,
    menuItems,
    categories,
    exploreCards,
    users: [user],
    seller,
    delivery,
    admin,
    orders,
    messages: [],
    reviews,
    coupons: [coupon],
    banners: [{
      _id: 'banner-demo',
      title: 'Good food, great mood',
      image: artwork('Good food, great mood', '🍜', '#3B5BDB'),
      link: '/restaurants',
      placement: 'homepage',
      isActive: true,
      sortOrder: 0,
      startsAt: null,
      expiresAt: null,
    }],
    notifications: {
      customer: notificationsFor('customer'),
      seller: notificationsFor('seller'),
      delivery: notificationsFor('delivery'),
      admin: notificationsFor('admin'),
    },
    settings,
    active: { customer: user, seller, delivery, admin },
  };
}

let cachedState: MockState | null = null;

function isStoredMockState(value: unknown): value is MockState {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const active = record['active'];
  return (
    Array.isArray(record['restaurants']) &&
    Array.isArray(record['menuItems']) &&
    Array.isArray(record['categories']) &&
    Array.isArray(record['exploreCards']) &&
    Array.isArray(record['users']) &&
    Array.isArray(record['orders']) &&
    Array.isArray(record['messages']) &&
    typeof active === 'object' &&
    active !== null &&
    'customer' in active &&
    'seller' in active &&
    'delivery' in active &&
    'admin' in active
  );
}

function upgradeGeneratedCatalogImages(state: MockState): boolean {
  let changed = false;
  const isArtwork = (image: string) => image.startsWith('data:image/svg+xml');

  RESTAURANT_SEEDS.forEach((seed, restaurantIndex) => {
    const restaurant = state.restaurants.find((item) => item.slug === seed.slug);
    const coverPhoto = restaurantPhoto(seed.slug);
    if (restaurant) {
      if (isArtwork(restaurant.coverImage)) {
        restaurant.coverImage = coverPhoto;
        changed = true;
      }
      if (restaurant.images.some(isArtwork)) {
        restaurant.images = restaurant.images.map((image) => (isArtwork(image) ? coverPhoto : image));
        changed = true;
      }
    }

    seed.dishes.forEach((dish, dishIndex) => {
      const item = state.menuItems.find(
        (candidate) => candidate._id === `menu-${restaurantIndex + 1}-${dishIndex + 1}` && candidate.name === dish.name
      );
      if (!item) return;

      const image = dishPhoto(dish.name);
      if (isArtwork(item.image)) {
        item.image = image;
        changed = true;
      }
      const images = item.images ?? [];
      if (images.some(isArtwork)) {
        item.images = images.map((entry) => (isArtwork(entry) ? image : entry));
        changed = true;
      }
    });
  });

  for (const category of state.categories) {
    const photo = CATEGORY_PHOTOS[category.name];
    if (photo && isArtwork(category.image)) {
      category.image = dishPhoto(photo);
      changed = true;
    }
  }

  return changed;
}

export function getMockState(): MockState {
  if (cachedState) return cachedState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state: unknown = JSON.parse(saved);
      if (isStoredMockState(state)) {
        cachedState = state;
        const catalogChanged = upgradeGeneratedCatalogImages(cachedState);
        const demoPhoneChanged = upgradeDemoCustomerPhone(cachedState);
        const deliveryFixtureChanged = upgradeDemoDeliveryFixture(cachedState);
        const deliveryTargetChanged = upgradeDemoDeliveryTarget(cachedState);
        const deliveryOtpChanged = upgradeMissingDeliveryOtps(cachedState);
        if (catalogChanged || demoPhoneChanged || deliveryFixtureChanged || deliveryTargetChanged || deliveryOtpChanged) persistMockState();
        return cachedState;
      }
      console.warn('Ignoring incomplete FeastGo demo data; restoring the built-in demo catalog.');
    }
  } catch (error) {
    console.warn('Could not load FeastGo demo data; restoring the built-in demo catalog.', error);
  }
  cachedState = createInitialState();
  persistMockState();
  return cachedState;
}

function upgradeDemoCustomerPhone(state: MockState): boolean {
  let changed = false;
  for (const user of state.users) {
    if (user.id === 'user-demo' && user.phone === '+15550100') {
      user.phone = '9876543210';
      changed = true;
    }
  }
  if (state.active.customer.id === 'user-demo' && state.active.customer.phone === '+15550100') {
    state.active.customer.phone = '9876543210';
    changed = true;
  }
  return changed;
}

function upgradeDemoDeliveryFixture(state: MockState): boolean {
  const demoOrder = state.orders.find((order) => order._id === 'order-demo-1');
  let changed = false;
  const activeDeliveryStatuses = ['assigned', 'accepted', 'reached_restaurant', 'picked_up', 'out_for_delivery', 'reached_customer'];
  if (
    demoOrder?.deliveryPartner === 'delivery-demo' &&
    (demoOrder.status === 'out_for_delivery' || activeDeliveryStatuses.includes(demoOrder.deliveryStatus))
  ) {
    const at = new Date().toISOString();
    demoOrder.status = 'delivered';
    demoOrder.deliveryStatus = 'delivered';
    if (!demoOrder.statusHistory.some((entry) => entry.status === 'delivered')) {
      demoOrder.statusHistory.push({ status: 'delivered', at });
    }
    if (!demoOrder.deliveryStatusHistory.some((entry) => entry.status === 'delivered')) {
      demoOrder.deliveryStatusHistory.push({ status: 'delivered', at });
    }
    demoOrder.deliveredAt ??= at;
    changed = true;
  }
  if (state.active.delivery.currentOrder === 'order-demo-1') {
    state.active.delivery.currentOrder = null;
    state.delivery.currentOrder = null;
    changed = true;
  }
  return changed;
}

function upgradeDemoDeliveryTarget(state: MockState): boolean {
  let changed = false;
  for (const delivery of [state.delivery, state.active.delivery]) {
    if (delivery.id === 'delivery-demo' && delivery.dailyTarget === 12) {
      delivery.dailyTarget = 1000;
      changed = true;
    }
  }
  return changed;
}

function upgradeMissingDeliveryOtps(state: MockState): boolean {
  let changed = false;
  for (const order of state.orders) {
    if (!['delivered', 'cancelled', 'failed', 'rejected', 'returned'].includes(order.status) && !order.deliveryOtp) {
      order.deliveryOtp = generateDeliveryOtp();
      order.deliveryOtpVerified = false;
      changed = true;
    }
  }
  return changed;
}

export function persistMockState() {
  if (!cachedState) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
}
