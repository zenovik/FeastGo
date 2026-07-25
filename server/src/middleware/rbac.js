import { ApiError } from '../utils/ApiError.js';
import { extractToken } from '../utils/extractToken.js';
import { resolveActor } from '../utils/resolveActor.js';

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
      const { actor, role } = await resolveActor(token, { allowedRoles: roles, allowSuspended: options.allowSuspended });
      req.user = actor;
      req.role = role;
      next();
    } catch (err) {
      next(err instanceof ApiError ? err : new ApiError(401, 'Not authenticated'));
    }
  };
}
