import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.feastgo_token) return req.cookies.feastgo_token;
  return null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new ApiError(401, 'Not authenticated');
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, 'User no longer exists');
    req.user = user;
    next();
  } catch {
    next(new ApiError(401, 'Not authenticated'));
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
