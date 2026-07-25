export interface MobileValidationResult {
  valid: boolean;
  message: string;
}

function stripSpaces(input: string): string {
  return (input ?? '').replace(/\s+/g, '');
}

export function normalizeMobile(input: string): string {
  return stripSpaces(input).replace(/\D/g, '');
}

// Single source of truth for the mobile-number rules on the client, mirroring
// `server/src/utils/mobileValidation.js` exactly so a number that passes here
// never gets rejected by the server (or vice versa).
export function validateMobile(input: string): MobileValidationResult {
  const withoutSpaces = stripSpaces(input);
  if (!withoutSpaces) return { valid: false, message: 'Mobile number is required' };
  if (!/^\d+$/.test(withoutSpaces)) return { valid: false, message: 'Only numeric digits are allowed' };
  if (withoutSpaces.length !== 10) return { valid: false, message: 'Mobile number must contain exactly 10 digits' };
  if (!/^[6-9]/.test(withoutSpaces)) return { valid: false, message: 'Mobile number must start with 6, 7, 8, or 9' };
  return { valid: true, message: '' };
}

// Strips everything except digits and caps at 10 — used on every keystroke/paste
// so invalid characters can never actually be typed into the field at all.
export function sanitizeMobileInput(raw: string): string {
  return (raw ?? '').replace(/\D/g, '').slice(0, 10);
}
