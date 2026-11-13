import { Order } from '../models/order.model';
import { Restaurant } from '../models/restaurant.model';

const TERMINAL_STATUSES = new Set(['delivered', 'cancelled', 'failed', 'rejected', 'returned']);
const CANCELLED_STATUSES = new Set(['cancelled', 'failed', 'rejected', 'returned']);

function dayStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function weekStart(date: Date): Date {
  const start = dayStart(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function completedAt(order: Order): string {
  return (
    order.deliveredAt ??
    [...order.statusHistory].reverse().find((entry) => entry.status === 'delivered')?.at ??
    order.createdAt
  );
}

function isInRange(value: string, start: Date, end: Date): boolean {
  const time = new Date(value).getTime();
  return time >= start.getTime() && time < end.getTime();
}

function revenueInRange(orders: Order[], start: Date, end: Date): number {
  return orders.reduce(
    (sum, order) => (order.status === 'delivered' && isInRange(completedAt(order), start, end) ? sum + order.total : sum),
    0
  );
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function orderTrend(orders: Order[], now: Date) {
  const firstDay = dayStart(now);
  firstDay.setDate(firstDay.getDate() - 13);
  return Array.from({ length: 14 }, (_, index) => {
    const start = new Date(firstDay);
    start.setDate(start.getDate() + index);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      date: dateKey(start),
      count: orders.filter((order) => isInRange(order.createdAt, start, end)).length,
      revenue: revenueInRange(orders, start, end),
    };
  });
}

function bestSellingItems(orders: Order[]) {
  const items = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of orders) {
    if (order.status !== 'delivered') continue;
    for (const item of order.items) {
      const current = items.get(item.name) ?? { name: item.name, qty: 0, revenue: 0 };
      current.qty += item.qty;
      current.revenue += item.price * item.qty;
      items.set(item.name, current);
    }
  }
  return [...items.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5);
}

export function sellerDashboardStats(allOrders: Order[], restaurantId: string | null, now = new Date()) {
  const orders = restaurantId ? allOrders.filter((order) => order.restaurant === restaurantId) : [];
  const todayStart = dayStart(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const startOfWeek = weekStart(now);
  const nextWeekStart = new Date(startOfWeek);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const completed = orders.filter((order) => order.status === 'delivered');

  return {
    todayOrders: orders.filter((order) => isInRange(order.createdAt, todayStart, tomorrowStart)).length,
    pendingOrders: orders.filter((order) => order.status === 'placed').length,
    confirmedOrders: orders.filter((order) => order.status === 'confirmed').length,
    preparingOrders: orders.filter((order) => order.status === 'preparing').length,
    readyForPickup: orders.filter((order) => order.status === 'ready_for_pickup').length,
    outForDelivery: orders.filter((order) => order.status === 'out_for_delivery').length,
    deliveredOrders: completed.length,
    cancelledOrders: orders.filter((order) => CANCELLED_STATUSES.has(order.status)).length,
    todayRevenue: revenueInRange(completed, todayStart, tomorrowStart),
    weeklyRevenue: revenueInRange(completed, startOfWeek, nextWeekStart),
    monthlyRevenue: revenueInRange(completed, monthStart, nextMonthStart),
    totalRevenue: completed.reduce((sum, order) => sum + order.total, 0),
    totalCustomers: new Set(orders.map((order) => order.user)).size,
    bestSellingItems: bestSellingItems(completed),
    recentOrders: [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    orderTrend: orderTrend(orders, now),
  };
}

export function adminDashboardStats(
  orders: Order[],
  totalUsers: number,
  restaurants: Pick<Restaurant, '_id' | 'name'>[],
  totalSellers: number,
  totalDeliveryPartners: number,
  now = new Date()
) {
  const todayStart = dayStart(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const startOfWeek = weekStart(now);
  const nextWeekStart = new Date(startOfWeek);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const completed = orders.filter((order) => order.status === 'delivered');
  const currentPeriodStart = new Date(todayStart);
  currentPeriodStart.setDate(currentPeriodStart.getDate() - 29);
  const previousPeriodStart = new Date(currentPeriodStart);
  previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
  const currentPeriodRevenue = revenueInRange(completed, currentPeriodStart, tomorrowStart);
  const previousPeriodRevenue = revenueInRange(completed, previousPeriodStart, currentPeriodStart);
  const restaurantSales = new Map<string, { revenue: number; orders: number }>();

  for (const order of completed) {
    const sales = restaurantSales.get(order.restaurant) ?? { revenue: 0, orders: 0 };
    sales.revenue += order.total;
    sales.orders += 1;
    restaurantSales.set(order.restaurant, sales);
  }

  return {
    totalUsers,
    totalRestaurants: restaurants.length,
    totalSellers,
    totalDeliveryPartners,
    totalOrders: orders.length,
    activeOrders: orders.filter((order) => !TERMINAL_STATUSES.has(order.status)).length,
    completedOrders: completed.length,
    cancelledOrders: orders.filter((order) => CANCELLED_STATUSES.has(order.status)).length,
    totalRevenue: completed.reduce((sum, order) => sum + order.total, 0),
    todayRevenue: revenueInRange(completed, todayStart, tomorrowStart),
    weeklyRevenue: revenueInRange(completed, startOfWeek, nextWeekStart),
    monthlyRevenue: revenueInRange(completed, monthStart, nextMonthStart),
    growthPercent: previousPeriodRevenue
      ? Math.round(((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 1000) / 10
      : null,
    bestSellingFoods: bestSellingItems(completed),
    topRestaurants: [...restaurantSales.entries()]
      .map(([id, sales]) => ({
        id,
        name: restaurants.find((restaurant) => restaurant._id === id)?.name ?? 'Restaurant',
        ...sales,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    recentOrders: [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    orderTrend: orderTrend(orders, now),
  };
}
