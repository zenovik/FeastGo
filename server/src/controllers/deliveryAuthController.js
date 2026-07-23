import bcrypt from 'bcryptjs';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function respondWithToken(res, partner, statusCode = 200) {
  const token = signToken(partner._id.toString(), 'delivery');
  res.cookie('feastgo_delivery_token', token, COOKIE_OPTIONS);
  res.status(statusCode).json({ token, user: partner.toSafeObject() });
}

export async function signup(req, res, next) {
  try {
    const name = String(req.body.name ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const phone = String(req.body.phone ?? '').trim();
    const password = String(req.body.password ?? '');
    const vehicleType = req.body.vehicleType || 'bike';

    if (!name) throw new ApiError(400, 'Name is required');
    if (!isValidEmail(email)) throw new ApiError(400, 'Enter a valid email address');
    if (!/^\+?\d{7,15}$/.test(phone)) throw new ApiError(400, 'Enter a valid phone number');
    if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

    const existing = await DeliveryPartner.findOne({ email });
    if (existing) throw new ApiError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const partner = await DeliveryPartner.create({ name, email, phone, passwordHash, vehicleType });
    respondWithToken(res, partner, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    if (!email || !password) throw new ApiError(400, 'Email and password are required');

    const partner = await DeliveryPartner.findOne({ email }).select('+passwordHash');
    if (!partner) throw new ApiError(401, 'Invalid email or password');

    const match = await bcrypt.compare(password, partner.passwordHash);
    if (!match) throw new ApiError(401, 'Invalid email or password');

    respondWithToken(res, partner);
  } catch (err) {
    next(err);
  }
}

export async function logout(_req, res) {
  res.clearCookie('feastgo_delivery_token');
  res.status(200).json({ message: 'Logged out' });
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

export async function setOnlineStatus(req, res, next) {
  try {
    req.user.isOnline = !!req.body.isOnline;
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}
