import bcrypt from 'bcryptjs';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { issueOtp, checkOtp, isPhoneVerified, clearOtp, devOtpField } from '../utils/otpStore.js';
import { assertValidMobile, assertMobileNotTaken, normalizeMobile, validateMobile } from '../utils/mobileValidation.js';
import { createNotification, notifyDeliveryPartner, notifyAdmins } from '../utils/notify.js';

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

function assertValidName(rawName) {
  const name = String(rawName ?? '').trim().replace(/\s+/g, ' ');
  if (!name) throw new ApiError(400, 'Name is required.');
  if (name.length < 3 || name.length > 50) throw new ApiError(400, 'Name must be between 3 and 50 characters.');
  if (!NAME_REGEX.test(name)) throw new ApiError(400, 'Only letters are allowed.');
  return name;
}

function assertValidDob(rawDob) {
  const date = new Date(rawDob);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Enter a valid date of birth.');
  if (date.getTime() > Date.now()) throw new ApiError(400, 'Date of birth cannot be in the future.');
  return date;
}

function respondWithToken(res, partner, statusCode = 200) {
  const token = signToken(partner._id.toString(), 'delivery', { tokenVersion: partner.tokenVersion ?? 0 });
  res.cookie('feastgo_delivery_token', token, COOKIE_OPTIONS);
  res.status(statusCode).json({ token, user: partner.toSafeObject() });
}

// ---- Phone OTP (signup verification) ----

export async function requestOtp(req, res, next) {
  try {
    const phone = assertValidMobile(req.body.phone);
    const code = issueOtp(phone);
    // No SMS provider configured for this demo — the code is returned directly
    // instead of being sent over SMS, same convention as the customer auth flow.
    res.json({ message: `OTP sent to ${phone}`, ...devOtpField(code) });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const phone = validateMobile(req.body.phone).value ?? String(req.body.phone ?? '').trim();
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
    res.json({ verified: true });
  } catch (err) {
    next(err);
  }
}

export async function signup(req, res, next) {
  try {
    const name = String(req.body.name ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const phone = assertValidMobile(req.body.phone);
    const password = String(req.body.password ?? '');
    const vehicleType = req.body.vehicleType || 'bike';
    const vehicleNumber = req.body.vehicleNumber || '';

    if (!name) throw new ApiError(400, 'Name is required');
    if (!isValidEmail(email)) throw new ApiError(400, 'Enter a valid email address');
    if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
    if (!isPhoneVerified(phone)) throw new ApiError(400, 'Verify your phone number first');

    const existing = await DeliveryPartner.findOne({ email });
    if (existing) throw new ApiError(409, 'An account with this email already exists');
    await assertMobileNotTaken(DeliveryPartner, phone);

    const passwordHash = await bcrypt.hash(password, 10);
    const partner = await DeliveryPartner.create({
      name,
      email,
      phone,
      passwordHash,
      vehicleType,
      vehicleNumber,
      phoneVerified: true,
    });
    clearOtp(phone);
    await createNotification({
      recipientId: partner._id,
      recipientRole: 'delivery',
      type: 'welcome',
      title: 'Welcome to FeastGo!',
      message: `Hi ${partner.name.split(' ')[0]}, your delivery partner account is set up and awaiting admin approval.`,
    });
    await notifyAdmins('new_delivery_registration', 'New delivery partner registered', `${partner.name} (${partner.phone}) signed up and is awaiting review`);
    respondWithToken(res, partner, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const identifier = String(req.body.identifier ?? req.body.email ?? '').trim();
    const password = String(req.body.password ?? '');
    if (!identifier || !password) throw new ApiError(400, 'Email/mobile number and password are required');

    const partner = await DeliveryPartner.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    }).select('+passwordHash');
    if (!partner) throw new ApiError(401, 'Invalid credentials');

    const match = await bcrypt.compare(password, partner.passwordHash);
    if (!match) throw new ApiError(401, 'Invalid credentials');

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
    const isOnline = !!req.body.isOnline;
    if (isOnline && req.user.status !== 'approved') {
      throw new ApiError(403, 'Your account is awaiting admin approval');
    }
    req.user.isOnline = isOnline;
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

const PROFILE_FIELDS = ['vehicleType', 'vehicleNumber', 'photo', 'bankDetails', 'dailyTarget'];
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^\d{12}$/;
const LICENSE_REGEX = /^[A-Za-z0-9-]{5,20}$/;
const GENDER_VALUES = ['male', 'female', 'other', 'prefer_not_to_say'];
const MAPS_APPS = ['google', 'apple', 'waze'];
const ROUTE_PREFERENCES = ['fastest', 'shortest', 'avoid_tolls'];
const NOTIFICATION_PREF_KEYS = ['newDeliveryRequest', 'orderUpdates', 'earnings', 'promotional', 'email', 'push'];

// Phone/email are deliberately absent here — they only change through the
// OTP-verified flows below, same split as the customer profile endpoint.
export async function updateProfile(req, res, next) {
  try {
    if (req.body.name !== undefined) {
      req.user.name = assertValidName(req.body.name);
    }
    for (const field of PROFILE_FIELDS) {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    }

    if (req.body.dob !== undefined) {
      req.user.dob = req.body.dob === null ? null : assertValidDob(req.body.dob);
    }
    if (req.body.gender !== undefined) {
      const gender = req.body.gender || null;
      if (gender !== null && !GENDER_VALUES.includes(gender)) throw new ApiError(400, 'Invalid gender value');
      req.user.gender = gender;
    }

    if (req.body.emergencyContact !== undefined) {
      const { name, phone: emergencyPhoneRaw } = req.body.emergencyContact ?? {};
      // Optional field — only enforce the format once something is actually entered.
      const emergencyPhone = emergencyPhoneRaw ? assertValidMobile(emergencyPhoneRaw) : '';
      req.user.emergencyContact = { name: name ?? '', phone: emergencyPhone };
    }

    if (req.body.notificationPrefs !== undefined) {
      const prefs = req.body.notificationPrefs ?? {};
      for (const key of NOTIFICATION_PREF_KEYS) {
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
    if (req.body.autoAcceptOrders !== undefined) req.user.autoAcceptOrders = !!req.body.autoAcceptOrders;
    if (req.body.acceptRadiusKm !== undefined) {
      const radius = Number(req.body.acceptRadiusKm);
      if (!Number.isFinite(radius) || radius <= 0) throw new ApiError(400, 'Enter a valid radius in km.');
      req.user.acceptRadiusKm = radius;
    }
    if (req.body.defaultMapsApp !== undefined) {
      if (!MAPS_APPS.includes(req.body.defaultMapsApp)) throw new ApiError(400, 'Invalid maps app');
      req.user.defaultMapsApp = req.body.defaultMapsApp;
    }
    if (req.body.voiceNavigation !== undefined) req.user.voiceNavigation = !!req.body.voiceNavigation;
    if (req.body.routePreference !== undefined) {
      if (!ROUTE_PREFERENCES.includes(req.body.routePreference)) throw new ApiError(400, 'Invalid route preference');
      req.user.routePreference = req.body.routePreference;
    }

    if (req.body.licenseNumber !== undefined) {
      const value = String(req.body.licenseNumber ?? '').trim().toUpperCase();
      if (value && !LICENSE_REGEX.test(value)) throw new ApiError(400, 'Enter a valid license number.');
      req.user.licenseNumber = value;
    }
    if (req.body.aadhaarNumber !== undefined) {
      const value = String(req.body.aadhaarNumber ?? '').trim();
      if (value && !AADHAAR_REGEX.test(value)) throw new ApiError(400, 'Aadhaar number must be exactly 12 digits.');
      req.user.aadhaarNumber = value;
    }
    if (req.body.panNumber !== undefined) {
      const value = String(req.body.panNumber ?? '').trim().toUpperCase();
      if (value && !PAN_REGEX.test(value)) throw new ApiError(400, 'Enter a valid PAN (e.g. ABCDE1234F).');
      req.user.panNumber = value;
    }

    await req.user.save();
    await notifyDeliveryPartner(req.user._id, 'profile_updated', 'Profile updated', 'Your account details have been saved.');
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
    await assertMobileNotTaken(DeliveryPartner, phone, req.user._id);

    const code = issueOtp(`delivery-chphone:${phone}`);
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

    const result = checkOtp(`delivery-chphone:${phone}`, code);
    if (!result.ok) throw new ApiError(400, otpErrorMessage(result.reason));

    await assertMobileNotTaken(DeliveryPartner, phone, req.user._id);

    req.user.phone = phone;
    await req.user.save();
    clearOtp(`delivery-chphone:${phone}`);
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

    const taken = await DeliveryPartner.findOne({ email, _id: { $ne: req.user._id } });
    if (taken) throw new ApiError(409, 'Email already exists.');

    const code = issueOtp(`delivery-chemail:${email}`);
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

    const result = checkOtp(`delivery-chemail:${email}`, code);
    if (!result.ok) throw new ApiError(400, otpErrorMessage(result.reason));

    const taken = await DeliveryPartner.findOne({ email, _id: { $ne: req.user._id } });
    if (taken) throw new ApiError(409, 'Email already exists.');

    req.user.email = email;
    await req.user.save();
    clearOtp(`delivery-chemail:${email}`);
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

// Bumps tokenVersion so every OTHER device's existing token fails
// resolveActor's check on its next request, then re-issues a fresh token for
// THIS session (the one that just asked to sign everyone else out) so the
// user isn't immediately logged out of the page they're using.
export async function logoutAllDevices(req, res, next) {
  try {
    req.user.tokenVersion = (req.user.tokenVersion ?? 0) + 1;
    await req.user.save();
    respondWithToken(res, req.user);
  } catch (err) {
    next(err);
  }
}

export async function updateDocuments(req, res, next) {
  try {
    const { license, aadhaar, pan, rc, insurance } = req.body;
    const docs = req.user.documents ?? {};
    if (license !== undefined) docs.license = license;
    if (aadhaar !== undefined) docs.aadhaar = aadhaar;
    if (pan !== undefined) docs.pan = pan;
    if (rc !== undefined) docs.rc = rc;
    if (insurance !== undefined) docs.insurance = insurance;
    req.user.documents = docs;
    req.user.documentsSubmitted = true;
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const { field } = req.params;
    if (!['license', 'aadhaar', 'pan', 'rc', 'insurance'].includes(field)) {
      throw new ApiError(400, 'Unknown document type');
    }
    req.user.documents[field] = '';
    await req.user.save();
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new ApiError(400, 'Current and new password are required');
    if (String(newPassword).length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

    const partner = await DeliveryPartner.findById(req.user._id).select('+passwordHash');
    const match = await bcrypt.compare(currentPassword, partner.passwordHash);
    if (!match) throw new ApiError(400, 'Current password is incorrect');

    partner.passwordHash = await bcrypt.hash(newPassword, 10);
    await partner.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

// ---- Forgot password (email + OTP) ----

export async function requestPasswordReset(req, res, next) {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    if (!isValidEmail(email)) throw new ApiError(400, 'Enter a valid email address');

    const partner = await DeliveryPartner.findOne({ email });
    if (!partner) throw new ApiError(404, 'No delivery partner account found with this email');

    const code = issueOtp(`delivery-reset:${email}`);
    res.json({ message: `OTP sent to ${email}`, ...devOtpField(code) });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const code = String(req.body.code ?? '');
    const newPassword = String(req.body.newPassword ?? '');
    if (!email || !code) throw new ApiError(400, 'Email and code are required');
    if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

    const result = checkOtp(`delivery-reset:${email}`, code);
    if (!result.ok) {
      const messages = {
        not_found: 'Request a new OTP first',
        expired: 'This OTP has expired — request a new one',
        too_many_attempts: 'Too many incorrect attempts — request a new OTP',
        mismatch: 'Incorrect OTP',
      };
      throw new ApiError(400, messages[result.reason] ?? 'Invalid OTP');
    }

    const partner = await DeliveryPartner.findOne({ email });
    if (!partner) throw new ApiError(404, 'No delivery partner account found with this email');

    partner.passwordHash = await bcrypt.hash(newPassword, 10);
    await partner.save();
    clearOtp(`delivery-reset:${email}`);
    res.json({ message: 'Password reset — you can now sign in' });
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
      `Delivery partner support request: ${subject}`,
      `${req.user.name} (${req.user.phone || req.user.email}) wrote: ${message}`
    );
    res.status(201).json({ message: 'Your message has been sent to our support team.' });
  } catch (err) {
    next(err);
  }
}
