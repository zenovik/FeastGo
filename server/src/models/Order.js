import mongoose from 'mongoose';

export const ORDER_STATUSES = [
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

// Finer-grained delivery-partner journey, layered underneath the top-level
// `status` above (which stays the source of truth for seller/admin/customer
// views that already key off it). `status` flips to 'out_for_delivery' the
// moment deliveryStatus reaches 'picked_up', and to 'delivered' together with
// deliveryStatus — everything before that is internal to the delivery flow.
export const DELIVERY_STATUSES = [
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

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    isVeg: { type: Boolean, default: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const deliveryStatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: DELIVERY_STATUSES, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    restaurantName: { type: String, required: true },
    deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', default: null, index: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    taxes: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
    statusHistory: [statusHistorySchema],
    address: {
      label: String,
      line1: String,
      area: String,
      city: String,
      instructions: { type: String, default: '' },
    },
    paymentMethod: { type: String, enum: ['card', 'upi', 'cod'], default: 'cod' },
    etaMinutes: { type: Number, default: 35 },
    sellerNotes: { type: String, default: '' },
    refundStatus: { type: String, enum: ['none', 'requested', 'approved', 'rejected', 'refunded'], default: 'none' },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String, default: '' },

    tip: { type: Number, default: 0 },

    deliveryStatus: { type: String, enum: DELIVERY_STATUSES, default: 'pending' },
    deliveryStatusHistory: [deliveryStatusHistorySchema],
    deliveryOtp: { type: String, default: null },
    deliveryOtpVerified: { type: Boolean, default: false },
    deliveryProofImage: { type: String, default: '' },
    deliveryFailReason: { type: String, default: '' },
    reassignCount: { type: Number, default: 0 },
    pickedUpAt: { type: Date, default: null },
    reachedCustomerAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
