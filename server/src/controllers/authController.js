import User from '../models/User.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { issueOtp, checkOtp, isPhoneVerified, clearOtp } from '../utils/otpStore.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function normalizePhone(phone) {
  return String(phone ?? '').replace(/[^\d+]/g, '');
}

function isValidPhone(phone) {
  return /^\+?\d{7,15}$/.test(phone);
}

function respondWithToken(res, user, statusCode = 200) {
  const token = signToken(user._id.toString());
  res.cookie('feastgo_token', token, COOKIE_OPTIONS);
  res.status(statusCode).json({ token, user: user.toSafeObject() });
}

export async function requestOtp(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!isValidPhone(phone)) throw new ApiError(400, 'Enter a valid phone number');

    const code = issueOtp(phone);
    // No SMS provider is configured for this demo, so the code is returned directly
    // instead of being sent over SMS. A real deployment would call a provider here
    // and drop the `devOtp` field from the response.
    res.json({ message: `OTP sent to ${phone}`, devOtp: code });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code ?? '');
    if (!phone || !code) throw new ApiError(400, 'Phone and code are required');

    const result = checkOtp(phone, code);
    if (!result.ok) {
      const messages = {
        not_found: 'Request a new OTP first',
        expired: 'This OTP has expired — request a new one',
        too_many_attempts: 'Too many incorrect attempts — request a new OTP',
        mismatch: 'Incorrect OTP',
      };
      throw new ApiError(400, messages[result.reason] ?? 'Invalid OTP');
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      clearOtp(phone);
      return respondWithToken(res, existing);
    }

    res.json({ newUser: true, phone });
  } catch (err) {
    next(err);
  }
}

export async function completeProfile(req, res, next) {
  try {
    const phone = normalizePhone(req.body.phone);
    const name = String(req.body.name ?? '').trim();
    const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;

    if (!isPhoneVerified(phone)) throw new ApiError(400, 'Verify your phone number first');
    if (!name) throw new ApiError(400, 'Name is required');

    const existing = await User.findOne({ phone });
    if (existing) {
      clearOtp(phone);
      return respondWithToken(res, existing);
    }

    const user = await User.create({ name, phone, email });
    clearOtp(phone);
    respondWithToken(res, user, 201);
  } catch (err) {
    next(err);
  }
}

export async function logout(_req, res) {
  res.clearCookie('feastgo_token');
  res.status(200).json({ message: 'Logged out' });
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

export async function updateProfile(req, res, next) {
  try {
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) throw new ApiError(400, 'Name is required');
      req.user.name = name;
    }
    if (req.body.email !== undefined) {
      const email = req.body.email ? String(req.body.email).trim().toLowerCase() : null;
      req.user.email = email;
    }
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function addAddress(req, res, next) {
  try {
    const { label, line1, area, city, state, zip, lat, lng, isDefault } = req.body;
    if (!line1 || !city) throw new ApiError(400, 'line1 and city are required');

    if (isDefault) {
      req.user.addresses.forEach((a) => (a.isDefault = false));
    }
    req.user.addresses.push({ label, line1, area, city, state, zip, lat, lng, isDefault });
    await req.user.save();
    res.status(201).json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function removeAddress(req, res, next) {
  try {
    req.user.addresses = req.user.addresses.filter((a) => a._id.toString() !== req.params.addressId);
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}
