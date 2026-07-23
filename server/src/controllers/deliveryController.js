import Order from '../models/Order.js';
import { ApiError } from '../utils/ApiError.js';
import { notifyCustomerOrderStatus } from '../utils/notify.js';

const DELIVERY_ALLOWED_TRANSITIONS = {
  ready_for_pickup: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
};

// Orders ready to be picked up and not yet claimed by another partner.
export async function listAvailableOrders(_req, res, next) {
  try {
    const orders = await Order.find({ status: 'ready_for_pickup', deliveryPartner: null })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function listMyOrders(req, res, next) {
  try {
    const filter = { deliveryPartner: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function acceptOrder(req, res, next) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, 'Order not found');
    if (order.status !== 'ready_for_pickup' || order.deliveryPartner) {
      throw new ApiError(409, 'This order is no longer available');
    }

    order.deliveryPartner = req.user._id;
    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    const order = await Order.findOne({ _id: req.params.id, deliveryPartner: req.user._id });
    if (!order) throw new ApiError(404, 'Order not found');

    const allowed = DELIVERY_ALLOWED_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw new ApiError(400, `Cannot move order from "${order.status}" to "${status}"`);
    }

    order.status = status;
    order.statusHistory.push({ status });
    await order.save();
    await notifyCustomerOrderStatus(order, status);
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

export async function getMyEarnings(req, res, next) {
  try {
    const [summary] = await Order.aggregate([
      { $match: { deliveryPartner: req.user._id, status: 'delivered' } },
      { $group: { _id: null, orderCount: { $sum: 1 }, totalDeliveryFees: { $sum: '$deliveryFee' } } },
    ]);
    res.json({
      orderCount: summary?.orderCount ?? 0,
      totalEarnings: summary?.totalDeliveryFees ?? 0,
    });
  } catch (err) {
    next(err);
  }
}
