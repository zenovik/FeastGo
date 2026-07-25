import bcrypt from 'bcryptjs';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { issueOtp, checkOtp, isPhoneVerified, clearOtp, devOtpField } from '../utils/otpStore.js';
import { assertValidMobile, assertMobileNotTaken, validateMobile } from '../utils/mobileValidation.js';
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

function respondWithToken(res, partner, statusCode = 200) {
  const token = signToken(partner._id.toString(), 'delivery');
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

const PROFILE_FIELDS = ['name', 'vehicleType', 'vehicleNumber', 'photo', 'bankDetails', 'dailyTarget'];

export async function updateProfile(req, res, next) {
  try {
    for (const field of PROFILE_FIELDS) {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    }

    if (req.body.phone !== undefined) {
      const phone = assertValidMobile(req.body.phone);
      if (phone !== req.user.phone) {
        await assertMobileNotTaken(DeliveryPartner, phone, req.user._id);
      }
      req.user.phone = phone;
    }

    if (req.body.emergencyContact !== undefined) {
      const { name, phone: emergencyPhoneRaw } = req.body.emergencyContact ?? {};
      // Optional field — only enforce the format once something is actually entered.
      const emergencyPhone = emergencyPhoneRaw ? assertValidMobile(emergencyPhoneRaw) : '';
      req.user.emergencyContact = { name: name ?? '', phone: emergencyPhone };
    }

    await req.user.save();
    await notifyDeliveryPartner(req.user._id, 'profile_updated', 'Profile updated', 'Your account details have been saved.');
    res.json({ user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function updateDocuments(req, res, next) {
  try {
    const { license, aadhaar, pan, rc } = req.body;
    const docs = req.user.documents ?? {};
    if (license !== undefined) docs.license = license;
    if (aadhaar !== undefined) docs.aadhaar = aadhaar;
    if (pan !== undefined) docs.pan = pan;
    if (rc !== undefined) docs.rc = rc;
    req.user.documents = docs;
    req.user.documentsSubmitted = true;
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
