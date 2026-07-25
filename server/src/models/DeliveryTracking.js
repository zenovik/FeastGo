import mongoose from 'mongoose';

// Location pings written by the delivery partner's app (polling, not sockets —
// this stack has no real-time transport). Customer/seller/admin tracking views
// just read the latest ping for an order.
const deliveryTrackingSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true, index: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    recordedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

deliveryTrackingSchema.index({ order: 1, recordedAt: -1 });

export default mongoose.model('DeliveryTracking', deliveryTrackingSchema);
