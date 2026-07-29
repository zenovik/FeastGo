import { Router } from 'express';
import { createOrder, listMyOrders, getOrder, cancelOrder, getCancellationPolicy, rateDelivery } from '../controllers/orderController.js';
import { listCustomerMessages, sendCustomerMessage, getCustomerUnreadMessageCount } from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/', createOrder);
router.get('/', listMyOrders);
// Must come before the '/:id' wildcard below or it'd be swallowed as an id.
router.get('/cancellation-policy', getCancellationPolicy);
router.get('/messages/unread-count', getCustomerUnreadMessageCount);
router.get('/:id', getOrder);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/rate-delivery', rateDelivery);
router.get('/:id/messages', listCustomerMessages);
router.post('/:id/messages', sendCustomerMessage);

export default router;
