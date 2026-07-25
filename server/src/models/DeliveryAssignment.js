import mongoose from 'mongoose';

// One document per order-partner assignment attempt — preserves reassignment
// history (who was tried, in what order, and whether they accepted/rejected)
// instead of only keeping the current assignment on the Order itself.
const deliveryAssignmentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true, index: true },
    assignedByRole: { type: String, enum: ['admin', 'auto'], required: true },
    assignedByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['assigned', 'accepted', 'rejected', 'completed', 'reassigned', 'cancelled'], default: 'assigned' },
    respondedAt: { type: Date, default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('DeliveryAssignment', deliveryAssignmentSchema);
