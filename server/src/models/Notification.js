import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    recipientRole: { type: String, enum: ['customer', 'seller', 'delivery', 'admin'], required: true },
    type: { type: String, enum: ['new_order', 'cancelled_order', 'payment', 'low_stock', 'general'], default: 'general' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
