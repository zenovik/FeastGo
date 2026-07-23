import { Router } from 'express';
import { listFoodItems, getFoodItem } from '../controllers/foodController.js';

const router = Router();

router.get('/', listFoodItems);
router.get('/:id', getFoodItem);

export default router;
