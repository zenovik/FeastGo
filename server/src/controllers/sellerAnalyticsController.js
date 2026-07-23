import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { requireOwnRestaurant, withCustomerName } from './sellerController.js';

const REVENUE_STATUSES = { $nin: ['cancelled', 'rejected'] };

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n) {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

async function revenueBetween(restaurantId, from, to) {
  const [row] = await Order.aggregate([
    { $match: { restaurant: restaurantId, status: REVENUE_STATUSES, createdAt: { $gte: from, ...(to ? { $lte: to } : {}) } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return row?.total ?? 0;
}

export async function getDashboardStats(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const today = startOfDay();

    const [
      statusCounts,
      todayOrders,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalCustomers,
      bestSellingAgg,
      recentOrders,
      orderTrend,
    ] = await Promise.all([
      Order.aggregate([{ $match: { restaurant: restaurantId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.countDocuments({ restaurant: restaurantId, createdAt: { $gte: today } }),
      revenueBetween(restaurantId, today),
      revenueBetween(restaurantId, daysAgo(7)),
      revenueBetween(restaurantId, daysAgo(30)),
      Order.distinct('user', { restaurant: restaurantId }),
      Order.aggregate([
        { $match: { restaurant: restaurantId, status: REVENUE_STATUSES } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
        { $sort: { qty: -1 } },
        { $limit: 5 },
      ]),
      Order.find({ restaurant: restaurantId }).sort({ createdAt: -1 }).limit(10).populate('user', 'name').lean(),
      Order.aggregate([
        { $match: { restaurant: restaurantId, createdAt: { $gte: daysAgo(13) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 0, '$total'] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const countByStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));

    res.json({
      todayOrders,
      pendingOrders: countByStatus.placed ?? 0,
      confirmedOrders: countByStatus.confirmed ?? 0,
      preparingOrders: countByStatus.preparing ?? 0,
      readyForPickup: countByStatus.ready_for_pickup ?? 0,
      outForDelivery: countByStatus.out_for_delivery ?? 0,
      deliveredOrders: countByStatus.delivered ?? 0,
      cancelledOrders: (countByStatus.cancelled ?? 0) + (countByStatus.rejected ?? 0),
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      totalCustomers: totalCustomers.length,
      bestSellingItems: bestSellingAgg.map((i) => ({ name: i._id, qty: i.qty, revenue: i.revenue })),
      recentOrders: recentOrders.map(withCustomerName),
      orderTrend: orderTrend.map((d) => ({ date: d._id, count: d.count, revenue: d.revenue })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getRevenueReport(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : daysAgo(29);
    const to = dateTo ? new Date(dateTo) : new Date();

    const daily = await Order.aggregate([
      { $match: { restaurant: restaurantId, createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 0, '$total'] } },
          cancelled: { $sum: { $cond: [{ $in: ['$status', ['cancelled', 'rejected']] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalRevenue = daily.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = daily.reduce((sum, d) => sum + d.orders, 0);

    res.json({
      from,
      to,
      totalRevenue,
      totalOrders,
      daily: daily.map((d) => ({ date: d._id, orders: d.orders, revenue: d.revenue, cancelled: d.cancelled })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getTopItemsReport(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    const items = await Order.aggregate([
      { $match: { restaurant: restaurantId, status: REVENUE_STATUSES } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          qty: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: limit },
    ]);

    res.json({ items: items.map((i) => ({ name: i._id, qty: i.qty, revenue: i.revenue, orders: i.orders })) });
  } catch (err) {
    next(err);
  }
}

export async function getPeakHoursReport(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const hours = await Order.aggregate([
      { $match: { restaurant: restaurantId } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    for (const row of hours) byHour[row._id].count = row.count;

    res.json({ byHour });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerInsights(req, res, next) {
  try {
    const restaurantId = requireOwnRestaurant(req);
    const insights = await Order.aggregate([
      { $match: { restaurant: restaurantId, status: REVENUE_STATUSES } },
      { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
      { $sort: { spent: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', phone: '$user.phone', orders: 1, spent: 1 } },
    ]);

    const [totals] = await Order.aggregate([
      { $match: { restaurant: restaurantId, status: REVENUE_STATUSES } },
      { $group: { _id: '$user', orders: { $sum: 1 } } },
      { $group: { _id: null, count: { $sum: 1 }, repeatCustomers: { $sum: { $cond: [{ $gt: ['$orders', 1] }, 1, 0] } } } },
    ]);

    res.json({
      topCustomers: insights,
      totalCustomers: totals?.count ?? 0,
      repeatCustomers: totals?.repeatCustomers ?? 0,
    });
  } catch (err) {
    next(err);
  }
}
