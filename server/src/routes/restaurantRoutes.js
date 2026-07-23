import { Router } from 'express';
import {
  listRestaurants,
  getRestaurant,
  getRestaurantMenu,
  getRestaurantReviews,
  addReview,
  listCuisines,
  validateCoupon,
} from '../controllers/restaurantController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', listRestaurants);
router.get('/cuisines', listCuisines);
router.get('/:slug', getRestaurant);
router.get('/:slug/menu', getRestaurantMenu);
router.get('/:slug/reviews', getRestaurantReviews);
router.post('/:slug/reviews', requireAuth, addReview);
router.post('/:slug/coupons/validate', requireAuth, validateCoupon);

export default router;
