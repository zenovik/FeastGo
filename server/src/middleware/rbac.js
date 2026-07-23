import User from '../models/User.js';
import RestaurantOwner from '../models/RestaurantOwner.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { extractToken } from '../utils/extractToken.js';

// Each role's account lives in its own collection (per the spec), so the
// JWT's `role` claim tells us which model to resolve `sub` against.
const MODELS_BY_ROLE = {
  customer: User,
  admin: User,
  seller: RestaurantOwner,
  delivery: DeliveryPartner,
};

/**
 * requireRole('seller') / requireRole('seller', 'admin') — resolves the JWT
 * to its actor document (req.user) and rejects unless its role is allowed.
 * Also sets req.role so downstream handlers/logs can see which kind of
 * account this is without re-decoding the token.
 *
 * Pass `{ allowSuspended: true }` as a trailing argument for the rare route
 * a suspended/blocked account must still reach — e.g. "who am I" — so the
 * client can find out *why* it's locked out instead of just losing its
 * session and looking like an expired-login failure.
 */
export function requireRole(...args) {
  const options = typeof args[args.length - 1] === 'object' ? args.pop() : {};
  const roles = args;

  return async (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) throw new ApiError(401, 'Not authenticated');

      const payload = verifyToken(token);
      const role = payload.role || 'customer';
      if (!roles.includes(role)) throw new ApiError(403, 'You do not have access to this resource');

      const Model = MODELS_BY_ROLE[role];
      if (!Model) throw new ApiError(401, 'Not authenticated');

      const actor = await Model.findById(payload.sub);
      if (!actor) throw new ApiError(401, 'Account no longer exists');
      if (role === 'admin' && actor.role !== 'admin') throw new ApiError(403, 'You do not have access to this resource');
      if (!options.allowSuspended) {
        if ((role === 'seller' || role === 'delivery') && actor.isSuspended) {
          throw new ApiError(403, 'Your account has been suspended by the admin. Contact support for help.');
        }
        if (role === 'customer' && actor.isBlocked) {
          throw new ApiError(403, 'Your account has been blocked. Contact support for help.');
        }
      }

      req.user = actor;
      req.role = role;
      next();
    } catch (err) {
      next(err instanceof ApiError ? err : new ApiError(401, 'Not authenticated'));
    }
  };
}
