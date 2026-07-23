import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { extractToken } from '../utils/extractToken.js';

export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new ApiError(401, 'Not authenticated');
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, 'User no longer exists');
    if (user.isBlocked) throw new ApiError(403, 'Your account has been blocked. Contact support for help.');
    req.user = user;
    req.role = 'customer';
    next();
  } catch (err) {
    // A blocked account is a real, safe-to-disclose state — surface it as-is.
    // Anything else (bad/expired token, deleted user) stays a generic 401.
    next(err instanceof ApiError && err.statusCode === 403 ? err : new ApiError(401, 'Not authenticated'));
  }
}

export async function attachUserIfPresent(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) return next();
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}
