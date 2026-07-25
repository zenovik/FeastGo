import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import RestaurantOwner from '../models/RestaurantOwner.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import DeliveryEarning from '../models/DeliveryEarning.js';
import Order from '../models/Order.js';

const ACTIVE_STATUSES = ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'];
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

async function revenueBetween(from, to) {
  const [row] = await Order.aggregate([
    { $match: { status: REVENUE_STATUSES, createdAt: { $gte: from, ...(to ? { $lte: to } : {}) } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return row?.total ?? 0;
}

export async function getDashboardStats(_req, res, next) {
  try {
    const today = startOfDay();
    const last30Start = daysAgo(29);
    const prev30Start = daysAgo(59);
    const prev30End = daysAgo(30);

    const [
      totalUsers,
      totalRestaurants,
      totalSellers,
      totalDeliveryPartners,
      totalOrders,
      statusCounts,
      totalRevenueAgg,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      last30Revenue,
      prev30Revenue,
      bestSellingAgg,
      topRestaurantsAgg,
      recentOrders,
      orderTrend,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Restaurant.countDocuments(),
      RestaurantOwner.countDocuments(),
      DeliveryPartner.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { status: REVENUE_STATUSES } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      revenueBetween(today),
      revenueBetween(daysAgo(7)),
      revenueBetween(daysAgo(30)),
      revenueBetween(last30Start),
      revenueBetween(prev30Start, prev30End),
      Order.aggregate([
        { $match: { status: REVENUE_STATUSES } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
        { $sort: { qty: -1 } },
        { $limit: 8 },
      ]),
      Order.aggregate([
        { $match: { status: REVENUE_STATUSES } },
        { $group: { _id: '$restaurant', name: { $first: '$restaurantName' }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name'),
      Order.aggregate([
        { $match: { createdAt: { $gte: daysAgo(13) } } },
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
    const activeOrders = ACTIVE_STATUSES.reduce((sum, s) => sum + (countByStatus[s] ?? 0), 0);
    const growthPercent = prev30Revenue > 0 ? Number((((last30Revenue - prev30Revenue) / prev30Revenue) * 100).toFixed(1)) : null;

    res.json({
      totalUsers,
      totalRestaurants,
      totalSellers,
      totalDeliveryPartners,
      totalOrders,
      activeOrders,
      completedOrders: countByStatus.delivered ?? 0,
      cancelledOrders: (countByStatus.cancelled ?? 0) + (countByStatus.rejected ?? 0),
      totalRevenue: totalRevenueAgg[0]?.total ?? 0,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      growthPercent,
      bestSellingFoods: bestSellingAgg.map((i) => ({ name: i._id, qty: i.qty, revenue: i.revenue })),
      topRestaurants: topRestaurantsAgg.map((r) => ({ id: r._id, name: r.name, revenue: r.revenue, orders: r.orders })),
      recentOrders: recentOrders.map((o) => ({ ...o.toObject(), customerName: o.user?.name ?? 'Customer', user: o.user?._id })),
      orderTrend: orderTrend.map((d) => ({ date: d._id, count: d.count, revenue: d.revenue })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getSalesReport(req, res, next) {
  try {
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? new Date(dateFrom) : daysAgo(29);
    const to = dateTo ? new Date(dateTo) : new Date();

    const daily = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
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

    res.json({
      from,
      to,
      totalRevenue: daily.reduce((s, d) => s + d.revenue, 0),
      totalOrders: daily.reduce((s, d) => s + d.orders, 0),
      daily: daily.map((d) => ({ date: d._id, orders: d.orders, revenue: d.revenue, cancelled: d.cancelled })),
    });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerReport(_req, res, next) {
  try {
    const topCustomers = await Order.aggregate([
      { $match: { status: REVENUE_STATUSES } },
      { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
      { $sort: { spent: -1 } },
      { $limit: 25 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', phone: '$user.phone', orders: 1, spent: 1 } },
    ]);

    const [totals] = await Order.aggregate([
      { $match: { status: REVENUE_STATUSES } },
      { $group: { _id: '$user', orders: { $sum: 1 } } },
      { $group: { _id: null, count: { $sum: 1 }, repeatCustomers: { $sum: { $cond: [{ $gt: ['$orders', 1] }, 1, 0] } } } },
    ]);

    res.json({ topCustomers, totalCustomers: totals?.count ?? 0, repeatCustomers: totals?.repeatCustomers ?? 0 });
  } catch (err) {
    next(err);
  }
}

export async function getRestaurantReport(_req, res, next) {
  try {
    const restaurants = await Order.aggregate([
      { $match: { status: REVENUE_STATUSES } },
      { $group: { _id: '$restaurant', name: { $first: '$restaurantName' }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 25 },
    ]);
    res.json({ restaurants: restaurants.map((r) => ({ id: r._id, name: r.name, revenue: r.revenue, orders: r.orders })) });
  } catch (err) {
    next(err);
  }
}

export async function getSellerReport(_req, res, next) {
  try {
    const owners = await RestaurantOwner.find({ restaurant: { $ne: null } }).select('name businessName restaurant status');
    const restaurantIds = owners.map((o) => o.restaurant);
    const revenueByRestaurant = await Order.aggregate([
      { $match: { restaurant: { $in: restaurantIds }, status: REVENUE_STATUSES } },
      { $group: { _id: '$restaurant', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]);
    const revenueMap = new Map(revenueByRestaurant.map((r) => [r._id.toString(), r]));

    const sellers = owners.map((o) => {
      const rev = revenueMap.get(o.restaurant?.toString());
      return {
        id: o._id,
        businessName: o.businessName,
        status: o.status,
        revenue: rev?.revenue ?? 0,
        orders: rev?.orders ?? 0,
      };
    });
    sellers.sort((a, b) => b.revenue - a.revenue);

    res.json({ sellers });
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryReport(_req, res, next) {
  try {
    const partners = await DeliveryPartner.find().select('name status isOnline rating');
    const partnerIds = partners.map((p) => p._id);
    const deliveryStats = await Order.aggregate([
      { $match: { deliveryPartner: { $in: partnerIds }, status: 'delivered' } },
      { $group: { _id: '$deliveryPartner', deliveries: { $sum: 1 }, earnings: { $sum: '$deliveryFee' } } },
    ]);
    const statsMap = new Map(deliveryStats.map((d) => [d._id.toString(), d]));

    const partnerReport = partners.map((p) => {
      const stat = statsMap.get(p._id.toString());
      return {
        id: p._id,
        name: p.name,
        status: p.status,
        isOnline: p.isOnline,
        rating: p.rating?.average ?? 0,
        deliveries: stat?.deliveries ?? 0,
        earnings: stat?.earnings ?? 0,
      };
    });
    partnerReport.sort((a, b) => b.deliveries - a.deliveries);

    res.json({ partners: partnerReport });
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryAnalytics(_req, res, next) {
  try {
    const [dailyAgg, monthlyAgg, failedCount, earningsAgg, avgTimeAgg] = await Promise.all([
      Order.aggregate([
        { $match: { deliveryPartner: { $ne: null }, deliveredAt: { $gte: daysAgo(13) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { deliveryPartner: { $ne: null }, deliveredAt: { $gte: daysAgo(180) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$deliveredAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.countDocuments({ deliveryStatus: 'failed' }),
      DeliveryEarning.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.aggregate([
        { $match: { pickedUpAt: { $ne: null }, deliveredAt: { $ne: null } } },
        { $project: { minutes: { $divide: [{ $subtract: ['$deliveredAt', '$pickedUpAt'] }, 60000] } } },
        { $group: { _id: null, avgMinutes: { $avg: '$minutes' } } },
      ]),
    ]);

    res.json({
      dailyDeliveries: dailyAgg.map((d) => ({ date: d._id, count: d.count })),
      monthlyDeliveries: monthlyAgg.map((d) => ({ month: d._id, count: d.count })),
      failedDeliveries: failedCount,
      totalDeliveryEarnings: earningsAgg[0]?.total ?? 0,
      avgDeliveryMinutes: avgTimeAgg[0]?.avgMinutes ? Math.round(avgTimeAgg[0].avgMinutes) : 0,
    });
  } catch (err) {
    next(err);
  }
}

export async function getRevenueBreakdown(_req, res, next) {
  try {
    const byPaymentMethod = await Order.aggregate([
      { $match: { status: REVENUE_STATUSES } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);
    const [totals] = await Order.aggregate([
      { $match: { status: REVENUE_STATUSES } },
      {
        $group: {
          _id: null,
          subtotal: { $sum: '$subtotal' },
          deliveryFees: { $sum: '$deliveryFee' },
          taxes: { $sum: '$taxes' },
          discounts: { $sum: '$discount' },
          total: { $sum: '$total' },
        },
      },
    ]);

    res.json({
      byPaymentMethod: byPaymentMethod.map((p) => ({ method: p._id, total: p.total, count: p.count })),
      totals: totals ?? { subtotal: 0, deliveryFees: 0, taxes: 0, discounts: 0, total: 0 },
    });
  } catch (err) {
    next(err);
  }
}
