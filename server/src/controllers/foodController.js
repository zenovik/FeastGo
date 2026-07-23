import mongoose from 'mongoose';
import MenuItem from '../models/MenuItem.js';
import Coupon from '../models/Coupon.js';
import { ApiError } from '../utils/ApiError.js';

const NEW_ARRIVAL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const HEALTHY_PATTERN = /salad|soup|grilled|steamed|healthy/i;

function toFoodItem(doc) {
  const r = doc.restaurant;
  const tags = [];
  if (doc.spiceLevel >= 2) tags.push('spicy');
  if (HEALTHY_PATTERN.test(doc.category)) tags.push('healthy');
  if (doc.createdAt && Date.now() - new Date(doc.createdAt).getTime() < NEW_ARRIVAL_WINDOW_MS) tags.push('new');

  return {
    id: String(doc._id),
    name: doc.name,
    image: doc.image || r.coverImage || '',
    restaurantName: r.name,
    restaurantId: r.slug,
    category: doc.category,
    cuisine: r.cuisines?.[0] || '',
    price: doc.price,
    originalPrice: doc.price,
    rating: doc.rating,
    reviewCount: r.ratingCount || 0,
    deliveryTime: r.deliveryTimeMin,
    veg: doc.isVeg,
    bestseller: doc.isBestseller,
    offer: r.offer || '',
    description: doc.description || '',
    ingredients: [],
    isAvailable: doc.isAvailable,
    tags,
  };
}

export async function listFoodItems(req, res, next) {
  try {
    const {
      q,
      veg,
      nonVeg,
      bestseller,
      spicy,
      healthy,
      fastDelivery,
      under199,
      offers,
      topRated,
      newArrival,
      minRating,
      priceRange,
      sort,
      limit,
      page,
    } = req.query;

    const pipeline = [
      { $match: { isAvailable: true, isHiddenByAdmin: { $ne: true } } },
      { $lookup: { from: 'restaurants', localField: 'restaurant', foreignField: '_id', as: 'restaurant' } },
      { $unwind: '$restaurant' },
      { $match: { 'restaurant.verificationStatus': 'approved', 'restaurant.isSuspended': { $ne: true } } },
    ];

    const match = {};
    if (q) {
      const regex = new RegExp(String(q).trim(), 'i');
      match.$or = [{ name: regex }, { category: regex }, { 'restaurant.name': regex }, { 'restaurant.cuisines': regex }];
    }
    if (veg === 'true') match.isVeg = true;
    if (nonVeg === 'true') match.isVeg = false;
    if (bestseller === 'true') match.isBestseller = true;
    if (spicy === 'true') match.spiceLevel = { $gte: 2 };
    if (healthy === 'true') match.category = HEALTHY_PATTERN;
    if (offers === 'true') {
      // "Offers" means either the restaurant has a manually-set promo blurb,
      // or it currently has a live coupon (restaurant-scoped or platform-wide)
      // in the real Coupon collection — not just the free-text field.
      const now = new Date();
      const activeCoupons = await Coupon.find({
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
        ],
      }).select('restaurant');

      const hasPlatformWideCoupon = activeCoupons.some((c) => !c.restaurant);
      if (!hasPlatformWideCoupon) {
        const couponRestaurantIds = activeCoupons.filter((c) => c.restaurant).map((c) => c.restaurant);
        match.$and = [
          ...(match.$and ?? []),
          {
            $or: [{ 'restaurant.offer': { $exists: true, $ne: '' } }, { 'restaurant._id': { $in: couponRestaurantIds } }],
          },
        ];
      }
      // If a platform-wide coupon is active, every restaurant qualifies — no extra filter needed.
    }

    const ratingFloor = topRated === 'true' ? 4.5 : minRating ? Number(minRating) : null;
    if (ratingFloor) match.rating = { $gte: ratingFloor };

    if (priceRange === 'under199' || under199 === 'true') match.price = { $lt: 199 };
    else if (priceRange === '199-399') match.price = { $gte: 199, $lte: 399 };
    else if (priceRange === '399plus') match.price = { $gt: 399 };

    if (newArrival === 'true') match.createdAt = { $gte: new Date(Date.now() - NEW_ARRIVAL_WINDOW_MS) };
    if (fastDelivery === 'true') match['restaurant.deliveryTimeMin'] = { $lte: 20 };

    if (Object.keys(match).length) pipeline.push({ $match: match });

    const sortMap = {
      rating: { rating: -1 },
      price_low: { price: 1 },
      price_high: { price: -1 },
      fastest: { 'restaurant.deliveryTimeMin': 1 },
      recommended: { isBestseller: -1, rating: -1 },
      popular: { 'restaurant.ratingCount': -1 },
    };
    // Tie-broken by _id so repeated paginated fetches return stable, non-overlapping pages.
    const sortSpec = { ...(sortMap[sort] || sortMap.popular), _id: -1 };
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 60));
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * limitNum;

    pipeline.push({
      $facet: {
        items: [{ $sort: sortSpec }, { $skip: skip }, { $limit: limitNum }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await MenuItem.aggregate(pipeline);
    const items = (result?.items || []).map(toFoodItem);
    const total = result?.totalCount?.[0]?.count || 0;

    res.json({ items, total });
  } catch (err) {
    next(err);
  }
}

export async function getFoodItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(404, 'Item not found');

    const item = await MenuItem.findById(id).populate('restaurant');
    if (
      !item ||
      !item.restaurant ||
      item.restaurant.verificationStatus !== 'approved' ||
      item.restaurant.isSuspended ||
      item.isHiddenByAdmin
    ) {
      throw new ApiError(404, 'Item not found');
    }

    res.json({ item: toFoodItem({ ...item.toObject(), restaurant: item.restaurant.toObject() }) });
  } catch (err) {
    next(err);
  }
}
