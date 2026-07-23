import Coupon from '../models/Coupon.js';
import { ApiError } from './ApiError.js';

// Shared by the checkout "apply coupon" preview and order creation, so both
// paths enforce exactly the same rules (restaurant scope, dates, usage limit,
// minimum order) and can never drift out of sync.
export async function resolveCoupon(restaurantId, code, subtotal) {
  const normalized = String(code ?? '').trim().toUpperCase();
  if (!normalized) throw new ApiError(400, 'Enter a coupon code');

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon || !coupon.isActive) throw new ApiError(404, 'Invalid coupon code');

  if (coupon.restaurant && coupon.restaurant.toString() !== restaurantId.toString()) {
    throw new ApiError(400, 'This coupon is not valid for this restaurant');
  }

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) throw new ApiError(400, 'This coupon is not active yet');
  if (coupon.expiresAt && now > coupon.expiresAt) throw new ApiError(400, 'This coupon has expired');
  if (coupon.usageLimit != null && coupon.timesUsed >= coupon.usageLimit) {
    throw new ApiError(400, 'This coupon has reached its usage limit');
  }
  if (subtotal < coupon.minOrder) {
    throw new ApiError(400, `Minimum order of ₹${coupon.minOrder} required for this coupon`);
  }
  if (!['discount', 'flash'].includes(coupon.offerType)) {
    throw new ApiError(400, 'This offer applies automatically and cannot be redeemed with a code');
  }

  let discount = coupon.discountType === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.max(0, Math.min(discount, subtotal));

  return { coupon, discount };
}
