import { Router } from 'express';
import { createOrder, listMyOrders, getOrder, cancelOrder, rateDelivery } from '../controllers/orderController.js';
import { listCustomerMessages, sendCustomerMessage } from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/', createOrder);
router.get('/', listMyOrders);
router.get('/:id', getOrder);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/rate-delivery', rateDelivery);
router.get('/:id/messages', listCustomerMessages);
router.post('/:id/messages', sendCustomerMessage);

export default router;
