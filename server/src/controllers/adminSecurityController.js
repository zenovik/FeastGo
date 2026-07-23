import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { ApiError } from '../utils/ApiError.js';
import { logAdminAction } from '../utils/auditLog.js';

// ---- Admin accounts / roles ----
export async function listAdmins(_req, res, next) {
  try {
    const admins = await User.find({ role: 'admin' }).sort({ createdAt: -1 });
    res.json({ admins: admins.map((a) => a.toSafeObject()) });
  } catch (err) {
    next(err);
  }
}

export async function setAdminRole(req, res, next) {
  try {
    if (req.user.adminRole && req.user.adminRole !== 'super_admin') {
      throw new ApiError(403, 'Only a super admin can manage admin roles');
    }
    const { adminRole } = req.body;
    if (!['super_admin', 'manager', 'support'].includes(adminRole)) throw new ApiError(400, 'Invalid admin role');

    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== 'admin') throw new ApiError(404, 'Admin account not found');

    admin.adminRole = adminRole;
    await admin.save();
    await logAdminAction(req, 'admin.set_role', { targetType: 'User', targetId: admin._id, details: adminRole });
    res.json({ admin: admin.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

// ---- Audit / activity / login logs ----
export async function listAuditLogs(req, res, next) {
  try {
    const { action, adminId } = req.query;
    const filter = {};
    if (action) filter.action = new RegExp(action, 'i');
    if (adminId) filter.adminId = adminId;
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}

export async function listLoginHistory(_req, res, next) {
  try {
    const logs = await AuditLog.find({ action: 'admin.login' }).sort({ createdAt: -1 }).limit(200);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
}
