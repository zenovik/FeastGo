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
  }
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
}
