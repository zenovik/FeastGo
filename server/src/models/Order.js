import mongoose from 'mongoose';

export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
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

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    restaurantName: { type: String, required: true },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    taxes: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed' },
    statusHistory: [statusHistorySchema],
    address: {
      label: String,
      line1: String,
      area: String,
      city: String,
    },
    paymentMethod: { type: String, enum: ['card', 'upi', 'cod'], default: 'cod' },
    etaMinutes: { type: Number, default: 35 },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
