import mongoose from 'mongoose';

// A seller-reported problem with a delivery (wrong items handed to the wrong
// rider, rider unresponsive, damaged handover, etc.) that an admin reviews
// and resolves — the lightweight dispute-resolution trail the spec asks for.
const deliveryIssueSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantOwner', required: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', default: null },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    resolution: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('DeliveryIssue', deliveryIssueSchema);
