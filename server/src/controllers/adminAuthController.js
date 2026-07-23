import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function login(req, res, next) {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    if (!email || !password) throw new ApiError(400, 'Email and password are required');

    const admin = await User.findOne({ email, role: 'admin' }).select('+passwordHash');
    if (!admin || !admin.passwordHash) throw new ApiError(401, 'Invalid email or password');

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) throw new ApiError(401, 'Invalid email or password');

    const token = signToken(admin._id.toString(), 'admin');
    res.cookie('feastgo_admin_token', token, COOKIE_OPTIONS);
    AuditLog.create({
      adminId: admin._id,
      adminName: admin.name,
      action: 'admin.login',
      details: `Signed in from ${req.ip ?? 'unknown IP'}`,
    }).catch(() => {});
    res.json({ token, user: admin.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function logout(_req, res) {
  res.clearCookie('feastgo_admin_token');
  res.status(200).json({ message: 'Logged out' });
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}
