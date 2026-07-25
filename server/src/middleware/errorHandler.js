import { notifyAdmins } from '../utils/notify.js';

// Throttles repeated identical 5xx messages so one flaky endpoint under load
// doesn't flood the admin notification feed with the same alert every request.
const recentlyNotified = new Map();
const SYSTEM_ERROR_THROTTLE_MS = 5 * 60 * 1000;

function notifySystemError(err) {
  const key = err.message || 'Unknown error';
  const last = recentlyNotified.get(key);
  if (last && Date.now() - last < SYSTEM_ERROR_THROTTLE_MS) return;
  recentlyNotified.set(key, Date.now());
  notifyAdmins('system_error', 'System error', key).catch(() => {});
}

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Maps a duplicated unique-index field name to a message a user can act on.
const DUPLICATE_FIELD_MESSAGES = {
  email: 'An account with this email already exists',
  phone: 'An account with this phone number already exists',
  code: 'That code is already in use — try a different one',
  slug: 'That name is already taken — try a slightly different one',
};

function duplicateKeyMessage(err) {
  const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
  return DUPLICATE_FIELD_MESSAGES[field] || 'This value is already in use';
}

export function errorHandler(err, _req, res, _next) {
  // MongoDB unique-index violations arrive as raw driver errors (code 11000), not
  // ApiError — translate them into a clean 409 instead of leaking the Mongo message.
  if (err.code === 11000) {
    return res.status(409).json({ message: duplicateKeyMessage(err) });
  }

  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  if (process.env.NODE_ENV !== 'test' && statusCode >= 500) {
    console.error(err);
    notifySystemError(err);
  }
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
}
