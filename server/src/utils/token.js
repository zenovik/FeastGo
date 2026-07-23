import jwt from 'jsonwebtoken';

// `role` distinguishes which collection the token's subject lives in, since
// sellers/delivery partners/admins are separate documents, not just a field
// on the same User record. Existing customer call sites that don't pass a
// role keep working — they default to 'customer', matching prior behavior.
export function signToken(userId, role = 'customer') {
  return jwt.sign({ sub: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
