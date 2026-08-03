import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { issueOtp, checkOtp, clearOtp, devOtpField } from '../utils/otpStore.js';

function findAdminByIdentifier(identifier) {
  return User.findOne({ role: 'admin', $or: [{ email: identifier.toLowerCase() }, { phone: identifier }] });
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function login(req, res, next) {
  try {
    const identifier = String(req.body.identifier ?? req.body.email ?? '').trim();
    const password = String(req.body.password ?? '');
    if (!identifier || !password) throw new ApiError(400, 'Email/mobile number and password are required');

    const admin = await findAdminByIdentifier(identifier).select('+passwordHash');
    if (!admin || !admin.passwordHash) throw new ApiError(401, 'Invalid credentials');

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) throw new ApiError(401, 'Invalid credentials');

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

// ---- Forgot password (email or mobile number + OTP) ----

export async function requestPasswordReset(req, res, next) {
  try {
    const identifier = String(req.body.identifier ?? '').trim();
    if (!identifier) throw new ApiError(400, 'Enter your email or mobile number');

    const admin = await findAdminByIdentifier(identifier);
    if (!admin) throw new ApiError(404, 'No admin account found with this email or mobile number');

    const code = issueOtp(`admin-reset:${identifier}`);
    res.json({ message: `OTP sent to ${identifier}`, ...devOtpField(code) });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const identifier = String(req.body.identifier ?? '').trim();
    const code = String(req.body.code ?? '');
    const newPassword = String(req.body.newPassword ?? '');
    if (!identifier || !code) throw new ApiError(400, 'Identifier and code are required');
    if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

    const result = checkOtp(`admin-reset:${identifier}`, code);
    if (!result.ok) {
      const messages = {
        not_found: 'Request a new OTP first',
        expired: 'This OTP has expired — request a new one',
        too_many_attempts: 'Too many incorrect attempts — request a new OTP',
        mismatch: 'Incorrect OTP',
      };
      throw new ApiError(400, messages[result.reason] ?? 'Invalid OTP');
    }

    const admin = await findAdminByIdentifier(identifier);
    if (!admin) throw new ApiError(404, 'No admin account found with this email or mobile number');

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();
    clearOtp(`admin-reset:${identifier}`);
    res.json({ message: 'Password reset — you can now sign in' });
  } catch (err) {
    next(err);
  }
}
