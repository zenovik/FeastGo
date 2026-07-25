import { ApiError } from './ApiError.js';

// Single source of truth for mobile-number rules across every role (customer,
// seller, delivery partner) — Indian 10-digit mobile numbers starting 6-9.
// Every controller that accepts a phone number should route through this
// instead of hand-rolling its own regex, so the rules can't drift apart again.
const MOBILE_REGEX = /^[6-9]\d{9}$/;

// Strips only whitespace (leading/trailing/internal) — used to check for
// non-digit characters without treating spaces as "invalid characters" on
// their own, since those get silently trimmed rather than rejected.
function stripSpaces(input) {
  return String(input ?? '').replace(/\s+/g, '');
}

export function normalizeMobile(input) {
  return stripSpaces(input).replace(/\D/g, '');
}

export function validateMobile(input) {
  const withoutSpaces = stripSpaces(input);
  if (!withoutSpaces) return { ok: false, message: 'Mobile number is required' };
  if (!/^\d+$/.test(withoutSpaces)) return { ok: false, message: 'Only numeric digits are allowed' };
  if (withoutSpaces.length !== 10) return { ok: false, message: 'Mobile number must contain exactly 10 digits' };
  if (!MOBILE_REGEX.test(withoutSpaces)) return { ok: false, message: 'Mobile number must start with 6, 7, 8, or 9' };
  return { ok: true, value: withoutSpaces };
}

// Throws a 400 ApiError with the specific reason if invalid, otherwise returns
// the normalized 10-digit string.
export function assertValidMobile(input) {
  const result = validateMobile(input);
  if (!result.ok) throw new ApiError(400, result.message);
  return result.value;
}

// Throws a 409 ApiError if another document in `Model` already has this phone.
// Pass `excludeId` when checking during a profile edit so the user's own
// current number doesn't trip the check.
export async function assertMobileNotTaken(Model, phone, excludeId = null) {
  const filter = { phone };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await Model.findOne(filter).select('_id');
  if (existing) throw new ApiError(409, 'This mobile number is already registered');
}
