import User from '../models/User.js';
import RestaurantOwner from '../models/RestaurantOwner.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { verifyToken } from './token.js';
import { ApiError } from './ApiError.js';

// Each role's account lives in its own collection, so the JWT's `role` claim
// tells us which model to resolve `sub` against. Shared by the HTTP RBAC
// middleware (rbac.js) and the Socket.IO auth handshake so both authenticate
// identically against the same tokens.
export const MODELS_BY_ROLE = {
  customer: User,
  admin: User,
  seller: RestaurantOwner,
  delivery: DeliveryPartner,
};

export async function resolveActor(token, { allowedRoles = null, allowSuspended = false } = {}) {
  if (!token) throw new ApiError(401, 'Not authenticated');

  const payload = verifyToken(token);
  const role = payload.role || 'customer';
  if (allowedRoles && !allowedRoles.includes(role)) throw new ApiError(403, 'You do not have access to this resource');

  const Model = MODELS_BY_ROLE[role];
  if (!Model) throw new ApiError(401, 'Not authenticated');

  const actor = await Model.findById(payload.sub);
  if (!actor) throw new ApiError(401, 'Account no longer exists');
  if (role === 'admin' && actor.role !== 'admin') throw new ApiError(403, 'You do not have access to this resource');
  // "Logout from all devices" bumps DeliveryPartner.tokenVersion — any token
  // issued before that bump (payload has no claim, or an older number) is
  // rejected here. Untouched for every other role, which have no such field.
  if (role === 'delivery' && typeof actor.tokenVersion === 'number' && (payload.tokenVersion ?? 0) !== actor.tokenVersion) {
    throw new ApiError(401, 'Your session has ended — please sign in again.');
  }
  if (!allowSuspended) {
    if ((role === 'seller' || role === 'delivery') && actor.isSuspended) {
      throw new ApiError(403, 'Your account has been suspended by the admin. Contact support for help.');
    }
    if (role === 'customer' && actor.isBlocked) {
      throw new ApiError(403, 'Your account has been blocked. Contact support for help.');
    }
  }

  return { actor, role };
}
