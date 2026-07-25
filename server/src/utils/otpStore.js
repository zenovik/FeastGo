// In-memory OTP store. FeastGo has no real SMS provider wired up, so OTPs are
// generated and matched here instead of persisted — good enough for a demo, and
// avoids modelling ephemeral, single-use codes as a Mongo collection.
// 30s matches the demo spec exactly: the code expires and "Resend OTP"
// unlocks at the same moment, so the client's resend-cooldown countdown
// doubles as the true validity window instead of two independently-tuned
// numbers drifting apart.
const OTP_TTL_MS = 30 * 1000;
const VERIFIED_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const store = new Map();

// `length` defaults to 4 to match every existing caller (seller/delivery
// signup, profile phone/email change) — only the customer login/signup flow
// asks for 6, per spec ("6-digit OTP input").
function generateCode(length = 4) {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return String(Math.floor(min + Math.random() * (max - min)));
}

export function issueOtp(phone, length = 4) {
  const code = generateCode(length);
  store.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0, verifiedUntil: 0 });
  return code;
}

export function checkOtp(phone, code) {
  const entry = store.get(phone);
  if (!entry) return { ok: false, reason: 'not_found' };
  if (Date.now() > entry.expiresAt) return { ok: false, reason: 'expired' };
  if (entry.attempts >= MAX_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };
  if (entry.code !== code) {
    entry.attempts += 1;
    return { ok: false, reason: 'mismatch' };
  }
  entry.verifiedUntil = Date.now() + VERIFIED_TTL_MS;
  return { ok: true };
}

export function isPhoneVerified(phone) {
  const entry = store.get(phone);
  return !!entry && Date.now() < entry.verifiedUntil;
}

export function clearOtp(phone) {
  store.delete(phone);
}

// The generated code is only echoed back in the API response outside
// production — in a real deployment an SMS/email provider would send it
// instead, and this field simply wouldn't exist. Spread into a response
// object: `res.json({ message, ...devOtpField(code) })`.
export function devOtpField(code) {
  return process.env.NODE_ENV === 'production' ? {} : { devOtp: code };
}
