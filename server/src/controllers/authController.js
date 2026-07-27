import mongoose from 'mongoose';
import User from '../models/User.js';
import Restaurant from '../models/Restaurant.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
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

const NAME_REGEX = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

// Trims + collapses internal whitespace before validating shape, so spacing
// issues are silently normalized rather than rejected — only genuine
// non-letter characters produce a validation error.
function assertValidName(rawName) {
  const name = String(rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!name) throw new ApiError(400, 'Name is required.');
  if (name.length < 3 || name.length > 50) throw new ApiError(400, 'Name must be between 3 and 50 characters.');
  if (!NAME_REGEX.test(name)) throw new ApiError(400, 'Only letters are allowed.');
  return name;
}

function calculateAge(dob) {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

function assertValidDob(rawDob) {
  const date = new Date(rawDob);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Enter a valid date of birth.');
  if (date.getTime() > Date.now()) throw new ApiError(400, 'Date of birth cannot be in the future.');
  if (calculateAge(date) < 18) throw new ApiError(400, 'You must be at least 18 years old.');
  return date;
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
    const isExplicitProfileEdit = req.body.name !== undefined || req.body.gender !== undefined || req.body.photo !== undefined || req.body.dob !== undefined;
    let nameChanged = false;
    if (req.body.name !== undefined) {
      const name = assertValidName(req.body.name);
      nameChanged = name !== req.user.name;
      req.user.name = name;
    }
    if (req.body.gender !== undefined) {
      const gender = req.body.gender || null;
      if (gender !== null && !['male', 'female', 'other', 'prefer_not_to_say'].includes(gender)) {
        throw new ApiError(400, 'Invalid gender value');
      }
      req.user.gender = gender;
    }
    if (req.body.dob !== undefined) {
      req.user.dob = req.body.dob === null ? null : assertValidDob(req.body.dob);
    }
    if (req.body.photo !== undefined) {
      const photo = req.body.photo || null;
      // JPG/JPEG/PNG/WEBP only, matching the client's own accept/validation —
      // deliberately narrower than other upload sites in this app that also
      // permit gif.
      if (photo && !/^data:image\/(png|jpe?g|webp);base64,/.test(photo)) {
        throw new ApiError(400, 'Please upload a valid image.');
      }
      // ~5MB raw file, allowing for base64's ~4/3 size inflation plus the data-URI prefix.
      if (photo && photo.length > 7_000_000) {
        throw new ApiError(400, 'Image size must not exceed 5 MB.');
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
    if (req.body.notificationPrefs !== undefined) {
      const prefs = req.body.notificationPrefs ?? {};
      for (const key of ['orderUpdates', 'promotional', 'offers', 'email', 'push']) {
        if (prefs[key] !== undefined) req.user.notificationPrefs[key] = !!prefs[key];
      }
    }
    if (req.body.theme !== undefined) {
      if (!['light', 'dark', 'system'].includes(req.body.theme)) throw new ApiError(400, 'Invalid theme value');
      req.user.theme = req.body.theme;
    }
    if (req.body.language !== undefined) {
      const language = String(req.body.language ?? '').trim();
      if (!language) throw new ApiError(400, 'Language is required.');
      req.user.language = language;
    }
    await req.user.save();
    // Reviews store a name snapshot at write time (see Review.userName) rather
    // than live-populating the author on every read — keep past reviews in
    // sync so a rename shows up there too instead of going stale.
    if (nameChanged) {
      await Review.updateMany({ user: req.user._id }, { userName: req.user.name });
    }
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
    if (taken) throw new ApiError(409, 'Mobile number already exists.');

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
    if (taken) throw new ApiError(409, 'Mobile number already exists.');

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

    const taken = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (taken) throw new ApiError(409, 'Email already exists.');

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

    const taken = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (taken) throw new ApiError(409, 'Email already exists.');

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

function validateAddressInput(body) {
  const label = String(body.label ?? '').trim();
  const line1 = String(body.line1 ?? '').trim();
  const area = String(body.area ?? '').trim();
  const landmark = String(body.landmark ?? '').trim();
  const city = String(body.city ?? '').trim();
  const state = String(body.state ?? '').trim();
  const zip = String(body.zip ?? '').trim();
  const phone = assertValidMobile(body.phone);
  const { lat, lng, isDefault } = body;

  if (!label) throw new ApiError(400, 'Address type is required.');
  if (!line1) throw new ApiError(400, 'Address line is required.');
  if (!landmark) throw new ApiError(400, 'Landmark is required.');
  if (!city) throw new ApiError(400, 'City is required.');
  if (!state) throw new ApiError(400, 'State is required.');
  if (!/^\d{6}$/.test(zip)) throw new ApiError(400, 'Pincode must be exactly 6 digits.');

  return { label, line1, area, landmark, city, state, zip, phone, lat, lng, isDefault };
}

export async function addAddress(req, res, next) {
  try {
    const { label, line1, area, landmark, city, state, zip, phone, lat, lng, isDefault } = validateAddressInput(req.body);

    const isDuplicate = req.user.addresses.some(
      (a) =>
        a.line1.trim().toLowerCase() === line1.toLowerCase() &&
        a.city.trim().toLowerCase() === city.toLowerCase() &&
        (a.zip ?? '').trim() === zip
    );
    if (isDuplicate) throw new ApiError(409, 'This address already exists in your saved addresses.');

    if (isDefault) {
      req.user.addresses.forEach((a) => (a.isDefault = false));
    }
    req.user.addresses.push({ label, line1, area, landmark, city, state, zip, phone, lat, lng, isDefault });
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

export async function updateAddress(req, res, next) {
  try {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) throw new ApiError(404, 'Address not found');

    const { label, line1, area, landmark, city, state, zip, phone, lat, lng, isDefault } = validateAddressInput(req.body);

    const isDuplicate = req.user.addresses.some(
      (a) =>
        a._id.toString() !== req.params.addressId &&
        a.line1.trim().toLowerCase() === line1.toLowerCase() &&
        a.city.trim().toLowerCase() === city.toLowerCase() &&
        (a.zip ?? '').trim() === zip
    );
    if (isDuplicate) throw new ApiError(409, 'This address already exists in your saved addresses.');

    if (isDefault) {
      req.user.addresses.forEach((a) => (a.isDefault = false));
    }
    Object.assign(address, { label, line1, area, landmark, city, state, zip, phone, lat, lng, isDefault: !!isDefault });
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function setDefaultAddress(req, res, next) {
  try {
    const address = req.user.addresses.id(req.params.addressId);
    if (!address) throw new ApiError(404, 'Address not found');
    req.user.addresses.forEach((a) => (a.isDefault = a._id.toString() === req.params.addressId));
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

const CARD_BRANDS = ['visa', 'mastercard', 'rupay', 'amex', 'discover', 'other'];

// Never accepts a full card number or CVV — only the last 4 digits, mirroring
// how a real gateway integration would tokenize the card and hand back just
// enough to display it, never the sensitive part.
export async function addSavedCard(req, res, next) {
  try {
    const label = String(req.body.label ?? '').trim();
    const brand = String(req.body.brand ?? '').trim().toLowerCase();
    const last4 = String(req.body.last4 ?? '').trim();
    const expiryMonth = Number(req.body.expiryMonth);
    const expiryYear = Number(req.body.expiryYear);

    if (!/^\d{4}$/.test(last4)) throw new ApiError(400, 'Enter the last 4 digits of the card.');
    if (!CARD_BRANDS.includes(brand)) throw new ApiError(400, 'Select a card network.');
    if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) throw new ApiError(400, 'Enter a valid expiry month.');
    const now = new Date();
    if (!Number.isInteger(expiryYear) || expiryYear < now.getFullYear() || (expiryYear === now.getFullYear() && expiryMonth < now.getMonth() + 1)) {
      throw new ApiError(400, 'This card has already expired.');
    }

    req.user.savedCards.push({ label, brand, last4, expiryMonth, expiryYear });
    await req.user.save();
    res.status(201).json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function removeSavedCard(req, res, next) {
  try {
    req.user.savedCards = req.user.savedCards.filter((c) => c._id.toString() !== req.params.cardId);
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

const UPI_REGEX = /^[\w.-]{2,256}@[a-zA-Z][a-zA-Z0-9]{2,64}$/;

export async function addSavedUpi(req, res, next) {
  try {
    const label = String(req.body.label ?? '').trim();
    const upiId = String(req.body.upiId ?? '').trim();
    if (!UPI_REGEX.test(upiId)) throw new ApiError(400, 'Enter a valid UPI ID (e.g. name@bank).');

    const isDuplicate = req.user.savedUpi.some((u) => u.upiId.toLowerCase() === upiId.toLowerCase());
    if (isDuplicate) throw new ApiError(409, 'This UPI ID is already saved.');

    req.user.savedUpi.push({ label, upiId });
    await req.user.save();
    res.status(201).json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function removeSavedUpi(req, res, next) {
  try {
    req.user.savedUpi = req.user.savedUpi.filter((u) => u._id.toString() !== req.params.upiId);
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function exportMyData(req, res, next) {
  try {
    const [orders, reviews] = await Promise.all([
      Order.find({ user: req.user._id }).lean(),
      Review.find({ user: req.user._id }).lean(),
    ]);
    res.json({
      exportedAt: new Date().toISOString(),
      profile: req.user.toSafeObject(),
      orders,
      reviews,
    });
  } catch (err) {
    next(err);
  }
}

// Soft-deletes: PII is wiped and the account is blocked from logging back in,
// but the document itself stays so historical Orders/Reviews (which reference
// it by id, and always live-populate name — see the profile-rename sync
// above) keep resolving instead of pointing at a dangling id.
export async function deleteAccount(req, res, next) {
  try {
    const confirmation = String(req.body.confirmation ?? '');
    if (confirmation !== 'DELETE') throw new ApiError(400, 'Type DELETE to confirm account deletion.');

    req.user.name = 'Deleted User';
    // Assigning undefined (not null) so these are genuinely absent afterward —
    // both fields carry a sparse unique index, and an explicit null would
    // collide with every other deleted account under it.
    req.user.email = undefined;
    req.user.phone = undefined;
    req.user.photo = null;
    req.user.dob = null;
    req.user.gender = null;
    req.user.addresses = [];
    req.user.savedCards = [];
    req.user.savedUpi = [];
    req.user.favoriteRestaurants = [];
    req.user.isBlocked = true;
    req.user.deletedAt = new Date();
    await req.user.save();

    res.clearCookie('feastgo_token');
    res.json({ message: 'Your account has been deleted.' });
  } catch (err) {
    next(err);
  }
}

export async function submitSupportRequest(req, res, next) {
  try {
    const subject = String(req.body.subject ?? '').trim();
    const message = String(req.body.message ?? '').trim();
    if (!subject) throw new ApiError(400, 'Subject is required.');
    if (!message) throw new ApiError(400, 'Message is required.');

    await notifyAdmins(
      'user_report',
      `Support request: ${subject}`,
      `${req.user.name} (${req.user.phone || req.user.email}) wrote: ${message}`
    );
    res.status(201).json({ message: 'Your message has been sent to our support team.' });
  } catch (err) {
    next(err);
  }
}
