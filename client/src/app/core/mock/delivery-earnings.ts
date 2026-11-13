import { Order } from '../models/order.model';

type EarningOrder = Pick<
  Order,
  '_id' | 'restaurantName' | 'total' | 'deliveryFee' | 'tip' | 'deliveryStatus' | 'createdAt' | 'deliveredAt' | 'deliveryStatusHistory'
>;

function completedAt(order: EarningOrder): string {
  return (
    order.deliveredAt ??
    [...order.deliveryStatusHistory].reverse().find((entry) => entry.status === 'delivered')?.at ??
    order.createdAt
  );
}

function earningRows(orders: EarningOrder[]) {
  return orders
    .filter((order) => order.deliveryStatus === 'delivered')
    .map((order) => {
      const tip = order.tip ?? 0;
      const baseFee = Math.max(30, order.deliveryFee);
      return {
        _id: order._id,
        order: { _id: order._id, restaurantName: order.restaurantName, total: order.total },
        baseFee,
        tip,
        bonus: 0,
        total: baseFee + tip,
        paid: true,
        createdAt: completedAt(order),
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function localDayStart(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function localWeekStart(date: Date): Date {
  const start = localDayStart(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function sumInPeriod(rows: ReturnType<typeof earningRows>, start: Date, end: Date): number {
  return rows.reduce((total, row) => {
    const time = new Date(row.createdAt).getTime();
    return time >= start.getTime() && time < end.getTime() ? total + row.total : total;
  }, 0);
}

export function calculateDeliveryEarnings(
  orders: EarningOrder[],
  dailyTarget: number,
  now = new Date()
) {
  const rows = earningRows(orders);
  const todayStart = localDayStart(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekStart = localWeekStart(now);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    orderCount: rows.length,
    totalEarnings: rows.reduce((total, row) => total + row.total, 0),
    todayEarnings: sumInPeriod(rows, todayStart, tomorrowStart),
    weeklyEarnings: sumInPeriod(rows, weekStart, nextWeekStart),
    monthlyEarnings: sumInPeriod(rows, monthStart, nextMonthStart),
    tipsReceived: rows.reduce((total, row) => total + row.tip, 0),
    incentives: rows.reduce((total, row) => total + row.bonus, 0),
    pendingPayments: rows.filter((row) => !row.paid).reduce((total, row) => total + row.total, 0),
    dailyTarget: Number.isFinite(dailyTarget) && dailyTarget > 0 ? dailyTarget : 1000,
  };
}

export function deliveryWeeklyPerformance(orders: EarningOrder[], now = new Date()) {
  const rows = earningRows(orders);
  const weekStart = localWeekStart(now);

  return Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(weekStart);
    dayStart.setDate(dayStart.getDate() + index);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return {
      day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      total: sumInPeriod(rows, dayStart, dayEnd),
    };
  });
}

export function deliveryEarningsHistory(orders: EarningOrder[], page: number, limit: number) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1;
  const safeLimit = Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.trunc(limit))) : 20;
  const rows = earningRows(orders);
  const start = (safePage - 1) * safeLimit;

  return {
    earnings: rows.slice(start, start + safeLimit),
    total: rows.length,
    page: safePage,
    limit: safeLimit,
  };
}
