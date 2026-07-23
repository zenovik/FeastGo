import AuditLog from '../models/AuditLog.js';

export async function logAdminAction(req, action, { targetType = '', targetId = '', details = '' } = {}) {
  try {
    await AuditLog.create({
      adminId: req.user._id,
      adminName: req.user.name,
      action,
      targetType,
      targetId: String(targetId ?? ''),
      details,
    });
  } catch {
    // Audit logging must never break the actual admin action it's recording.
  }
}
