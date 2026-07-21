// In-memory OTP store. FeastGo has no real SMS provider wired up, so OTPs are
// generated and matched here instead of persisted — good enough for a demo, and
// avoids modelling ephemeral, single-use codes as a Mongo collection.
const OTP_TTL_MS = 5 * 60 * 1000;
const VERIFIED_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const store = new Map();

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function issueOtp(phone) {
  const code = generateCode();
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
