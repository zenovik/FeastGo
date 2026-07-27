export interface FieldValidationResult {
  valid: boolean;
  message: string;
}

const NAME_REGEX = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

// Trims + collapses internal whitespace before checking shape, mirroring the
// server's assertValidName exactly — normalize spacing silently, only reject
// genuine non-letter characters.
export function normalizeName(raw: string): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ');
}

export function validateName(raw: string): FieldValidationResult {
  const name = normalizeName(raw);
  if (!name) return { valid: false, message: 'Name is required.' };
  if (name.length < 3 || name.length > 50) return { valid: false, message: 'Name must be between 3 and 50 characters.' };
  if (!NAME_REGEX.test(name)) return { valid: false, message: 'Only letters are allowed.' };
  return { valid: true, message: '' };
}

function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function validateDob(raw: string): FieldValidationResult {
  if (!raw) return { valid: false, message: 'Date of birth is required.' };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { valid: false, message: 'Enter a valid date of birth.' };
  if (date.getTime() > Date.now()) return { valid: false, message: 'Date of birth cannot be in the future.' };
  if (calculateAge(date) < 18) return { valid: false, message: 'You must be at least 18 years old.' };
  return { valid: true, message: '' };
}

export function validateEmail(raw: string): FieldValidationResult {
  const email = (raw ?? '').trim();
  if (!email) return { valid: false, message: 'Email is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { valid: false, message: 'Enter a valid email address.' };
  return { valid: true, message: '' };
}

export function validateGender(raw: string): FieldValidationResult {
  if (!raw) return { valid: false, message: 'Gender is required.' };
  return { valid: true, message: '' };
}

export function validatePincode(raw: string): FieldValidationResult {
  const zip = (raw ?? '').trim();
  if (!zip) return { valid: false, message: 'Pincode is required.' };
  if (!/^\d{6}$/.test(zip)) return { valid: false, message: 'Pincode must be exactly 6 digits.' };
  return { valid: true, message: '' };
}

export function validateRequired(raw: string, fieldLabel: string): FieldValidationResult {
  if (!(raw ?? '').trim()) return { valid: false, message: `${fieldLabel} is required.` };
  return { valid: true, message: '' };
}
