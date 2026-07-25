import mongoose from 'mongoose';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { issueOtp, checkOtp, isPhoneVerified, clearOtp, devOtpField } from '../utils/otpStore.js';
import { assertValidMobile, normalizeMobile } from '../utils/mobileValidation.js';
import { createNotification, notifyAdmins } from '../utils/notify.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function respondWithToken(res, user, statusCode = 200) {
  const token = signToken(user._id.toString());
  res.cookie('feastgo_token', token, COOKIE_OPTIONS);
  res.status(statusCode).json({ token, user: user.toSafeObject() });
}

// Login/signup verifies identity via either a mobile number or an email
// address, chosen by the client as `method`. This normalizes+validates
// whichever one was sent and returns the canonical stored form.
function normalizeIdentity(method, rawValue) {
  if (method === 'phone') return assertValidMobile(rawValue);
  if (method === 'email') {
    const email = String(rawValue ?? '').trim().toLowerCase();
    if (!isValidEmail(email)) throw new ApiError(400, 'Enter a valid email address');
    return email;
  }
  throw new ApiError(400, 'method must be "phone" or "email"');
}

// Namespaced so a phone OTP and an email OTP can never collide, and so this
// never clashes with the separate profile phone/email-change OTP keys
// (`chphone:`/`chemail:`) or other roles' signup OTP keys.
function identityOtpKey(method, value) {
  return `identity:${method}:${value}`;
}

const IDENTITY_LABEL = { phone: 'mobile number', email: 'email address' };

// `mode` ('login' | 'signup') lets the client fail fast — before the user
// even types an OTP — with the exact messaging the spec asks for, instead of
// only discovering the mismatch after verifying.
export async function requestOtp(req, res, next) {
  try {
    const { method, mode } = req.body;
    const value = normalizeIdentity(method, req.body.value);

    if (mode === 'login' || mode === 'signup') {
      const existing = await User.findOne({ [method]: value });
      if (mode === 'login' && !existing) throw new ApiError(404, 'Account not found. Please sign up first.');
      if (mode === 'signup' && existing) {
        throw new ApiError(409, `An account already exists with this ${IDENTITY_LABEL[method]} — please log in instead.`);
      }
    }

    const code = issueOtp(identityOtpKey(method, value), 6);
    res.json({ message: `OTP sent to ${value}`, ...devOtpField(code) });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const { method, mode } = req.body;
    const value = normalizeIdentity(method, req.body.value);
    const code = String(req.body.code ?? '');
    if (!code) throw new ApiError(400, 'Enter the OTP code');

    const result = checkOtp(identityOtpKey(method, value), code);
    if (!result.ok) throw new ApiError(400, otpErrorMessage(result.reason));

    const existing = await User.findOne({ [method]: value });

    if (mode === 'signup') {
      if (existing) throw new ApiError(409, `An account already exists with this ${IDENTITY_LABEL[method]} — please log in instead.`);
      return res.json({ verified: true, method, value });
    }

    if (!existing) throw new ApiError(404, 'Account not found. Please sign up first.');
    if (existing.isBlocked) {
      await notifyAdmins('security_alert', 'Blocked account login attempt', `${existing.name} attempted to log in while blocked`);
      throw new ApiError(403, 'Your account has been blocked. Contact support for help.');
    }
    clearOtp(identityOtpKey(method, value));
    respondWithToken(res, existing);
  } catch (err) {
    next(err);
  }
}

export async function completeSignup(req, res, next) {
  try {
    const { method, termsAccepted } = req.body;
    const value = normalizeIdentity(method, req.body.value);
    const name = String(req.body.name ?? '').trim();

    if (!isPhoneVerified(identityOtpKey(method, value))) {
      throw new ApiError(400, `Verify your ${IDENTITY_LABEL[method]} first`);
    }
    if (name.length < 3 || name.length > 50) throw new ApiError(400, 'Name must be between 3 and 50 characters');
    if (!termsAccepted) throw new ApiError(400, 'You must accept the Terms & Conditions to continue');

    const existing = await User.findOne({ [method]: value });
    if (existing) {
      // Verified-but-someone-beat-them-to-it race — log them in rather than
      // erroring, since their identity really is verified at this point.
      if (existing.isBlocked) throw new ApiError(403, 'Your account has been blocked. Contact support for help.');
      clearOtp(identityOtpKey(method, value));
      return respondWithToken(res, existing);
    }

    const user = await User.create({ name, [method]: value, termsAcceptedAt: new Date() });
    clearOtp(identityOtpKey(method, value));
    await createNotification({
      recipientId: user._id,
      recipientRole: 'customer',
      type: 'welcome',
      title: 'Welcome to FeastGo!',
      message: `Hi ${user.name.split(' ')[0]}, thanks for joining — explore restaurants near you and get your first order delivered.`,
    });
    await notifyAdmins('new_user_registration', 'New customer registered', `${user.name} (${method === 'phone' ? user.phone : user.email}) just signed up`);
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

// Sliding-session refresh: requireAuth already proved the current token is
// valid and unexpired, so this just reissues a fresh one with a full new
// expiry window. There's no separate refresh-token/rotation store — the
// access token doubles as its own refresh credential, which is enough to
// keep an active session alive without forcing a re-login.
export async function refreshToken(req, res) {
  respondWithToken(res, req.user);
}

export async function updateProfile(req, res, next) {
  try {
    const isExplicitProfileEdit = req.body.name !== undefined || req.body.gender !== undefined || req.body.photo !== undefined;
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) throw new ApiError(400, 'Name is required');
      req.user.name = name;
    }
    if (req.body.gender !== undefined) {
      const gender = req.body.gender || null;
      if (gender !== null && !['male', 'female', 'other'].includes(gender)) {
        throw new ApiError(400, 'Invalid gender value');
      }
      req.user.gender = gender;
    }
    if (req.body.photo !== undefined) {
      const photo = req.body.photo || null;
      if (photo && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(photo)) {
        throw new ApiError(400, 'Invalid photo format');
      }
      if (photo && photo.length > 3_000_000) {
        throw new ApiError(400, 'Photo is too large');
      }
      req.user.photo = photo;
    }
    if (req.body.location !== undefined) {
      const loc = req.body.location;
      if (loc === null) {
        req.user.location = { lat: null, lng: null };
      } else {
        const lat = Number(loc?.lat);
        const lng = Number(loc?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new ApiError(400, 'Invalid location coordinates');
        }
        req.user.location = { lat, lng };
      }
    }
    await req.user.save();
    if (isExplicitProfileEdit) {
      await createNotification({
        recipientId: req.user._id,
        recipientRole: 'customer',
        type: 'profile_updated',
        title: 'Profile updated',
        message: 'Your profile changes have been saved.',
      });
    }
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

function otpErrorMessage(reason) {
  const messages = {
    not_found: 'Request a new code first',
    expired: 'This code has expired — request a new one',
    too_many_attempts: 'Too many incorrect attempts — request a new code',
    mismatch: 'Incorrect code',
  };
  return messages[reason] ?? 'Invalid code';
}

export async function requestPhoneChangeOtp(req, res, next) {
  try {
    const phone = assertValidMobile(req.body.phone);
    if (phone === req.user.phone) throw new ApiError(400, 'That is already your phone number');

    const taken = await User.findOne({ phone, _id: { $ne: req.user._id } });
    if (taken) throw new ApiError(409, 'This phone number is already in use');

    const code = issueOtp(`chphone:${phone}`);
    res.json({ message: `OTP sent to ${phone}`, ...devOtpField(code) });
  } catch (err) {
    next(err);
  }
}

export async function verifyPhoneChangeOtp(req, res, next) {
  try {
    const phone = normalizeMobile(req.body.phone);
    const code = String(req.body.code ?? '');
    if (!phone || !code) throw new ApiError(400, 'Phone and code are required');

    const result = checkOtp(`chphone:${phone}`, code);
    if (!result.ok) throw new ApiError(400, otpErrorMessage(result.reason));

    const taken = await User.findOne({ phone, _id: { $ne: req.user._id } });
    if (taken) throw new ApiError(409, 'This phone number is already in use');

    req.user.phone = phone;
    await req.user.save();
    clearOtp(`chphone:${phone}`);
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function requestEmailChangeOtp(req, res, next) {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!isValidEmail(email)) throw new ApiError(400, 'Enter a valid email address');
    if (email === req.user.email) throw new ApiError(400, 'That is already your email address');

    const code = issueOtp(`chemail:${email}`);
    res.json({ message: `OTP sent to ${email}`, ...devOtpField(code) });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailChangeOtp(req, res, next) {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const code = String(req.body.code ?? '');
    if (!email || !code) throw new ApiError(400, 'Email and code are required');

    const result = checkOtp(`chemail:${email}`, code);
    if (!result.ok) throw new ApiError(400, otpErrorMessage(result.reason));

    req.user.email = email;
    await req.user.save();
    clearOtp(`chemail:${email}`);
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function toggleFavorite(req, res, next) {
  try {
    const { restaurantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) throw new ApiError(400, 'Invalid restaurant id');

    const restaurant = await Restaurant.findById(restaurantId).select('_id');
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    const idx = req.user.favoriteRestaurants.findIndex((id) => id.toString() === restaurantId);
    if (idx >= 0) {
      req.user.favoriteRestaurants.splice(idx, 1);
    } else {
      req.user.favoriteRestaurants.push(restaurantId);
    }
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function getFavorites(req, res, next) {
  try {
    await req.user.populate('favoriteRestaurants');
    res.json({ restaurants: req.user.favoriteRestaurants });
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
    await createNotification({
      recipientId: req.user._id,
      recipientRole: 'customer',
      type: 'address_added',
      title: 'Address added',
      message: `${label ? `${label} — ` : ''}${line1}, ${city} was added to your saved addresses.`,
    });
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
