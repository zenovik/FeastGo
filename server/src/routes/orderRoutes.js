import { Router } from 'express';
import { createOrder, listMyOrders, getOrder, cancelOrder } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/', createOrder);
router.get('/', listMyOrders);
router.get('/:id', getOrder);
router.post('/:id/cancel', cancelOrder);

export default router;
