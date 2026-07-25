import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import Review from '../models/Review.js';
import { ApiError } from '../utils/ApiError.js';
import { resolveCoupon } from '../utils/coupon.js';
import { notifySeller } from '../utils/notify.js';

export async function listRestaurants(req, res, next) {
  try {
    const { q, cuisine, sort, veg, maxDeliveryTime, page = 1, limit = 20 } = req.query;
    const filter = { verificationStatus: 'approved', isSuspended: { $ne: true } };

    if (q) filter.$text = { $search: q };
    if (cuisine) filter.cuisines = cuisine;
    if (maxDeliveryTime) filter.deliveryTimeMax = { $lte: Number(maxDeliveryTime) };
    if (veg === 'true') filter.tags = 'Pure Veg';

    const sortMap = {
      rating: { rating: -1 },
      delivery_time: { deliveryTimeMin: 1 },
      cost_low: { priceRange: 1 },
      cost_high: { priceRange: -1 },
      relevance: {},
    };
    const sortSpec = sortMap[sort] || { isPromoted: -1, rating: -1 };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    const [items, total] = await Promise.all([
      Restaurant.find(filter)
        .sort(sortSpec)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Restaurant.countDocuments(filter),
    ]);

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    next(err);
  }
}

export async function getRestaurant(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, verificationStatus: 'approved', isSuspended: { $ne: true } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    res.json({ restaurant });
  } catch (err) {
    next(err);
  }
}

export async function getRestaurantMenu(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, verificationStatus: 'approved', isSuspended: { $ne: true } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    const items = await MenuItem.find({ restaurant: restaurant._id, isAvailable: true, isHiddenByAdmin: { $ne: true } }).sort({
      category: 1,
    });
    const grouped = items.reduce((acc, item) => {
      (acc[item.category] ||= []).push(item);
      return acc;
    }, {});
    res.json({ categories: Object.entries(grouped).map(([category, items]) => ({ category, items })) });
  } catch (err) {
    next(err);
  }
}

export async function getRestaurantReviews(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    const reviews = await Review.find({ restaurant: restaurant._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
}

export async function addReview(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');
    const { rating, comment } = req.body;
    if (!rating) throw new ApiError(400, 'Rating is required');

    const review = await Review.create({
      restaurant: restaurant._id,
      user: req.user._id,
      userName: req.user.name,
      rating,
      comment,
    });

    const stats = await Review.aggregate([
      { $match: { restaurant: restaurant._id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats[0]) {
      restaurant.rating = Math.round(stats[0].avg * 10) / 10;
      restaurant.ratingCount = stats[0].count;
      await restaurant.save();
    }

    await notifySeller(
      restaurant,
      'new_review',
      'New review received',
      `${req.user.name} left a ${rating}-star review${comment ? `: "${comment}"` : ''}`
    );

    res.status(201).json({ review });
  } catch (err) {
    next(err);
  }
}

export async function validateCoupon(req, res, next) {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug, verificationStatus: 'approved', isSuspended: { $ne: true } });
    if (!restaurant) throw new ApiError(404, 'Restaurant not found');

    const subtotal = Number(req.body.subtotal) || 0;
    const { coupon, discount } = await resolveCoupon(restaurant._id, req.body.code, subtotal);
    res.json({ code: coupon.code, discount });
  } catch (err) {
    next(err);
  }
}

export async function listCuisines(_req, res, next) {
  try {
    const cuisines = await Restaurant.distinct('cuisines');
    res.json({ cuisines: cuisines.sort() });
  } catch (err) {
    next(err);
  }
}
