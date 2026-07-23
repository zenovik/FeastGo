import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    adminName: { type: String, required: true },
    action: { type: String, required: true }, // e.g. "restaurant.approve", "user.block"
    targetType: { type: String, default: '' }, // e.g. "Restaurant", "User"
    targetId: { type: String, default: '' },
    details: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
