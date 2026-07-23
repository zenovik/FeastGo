import { Router } from 'express';
import * as deliveryAuth from '../controllers/deliveryAuthController.js';
import * as delivery from '../controllers/deliveryController.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Auth
router.post('/auth/signup', deliveryAuth.signup);
router.post('/auth/login', deliveryAuth.login);
router.post('/auth/logout', deliveryAuth.logout);
router.get('/auth/me', requireRole('delivery', { allowSuspended: true }), deliveryAuth.me);
router.patch('/auth/online', requireRole('delivery'), deliveryAuth.setOnlineStatus);

// Orders
router.get('/orders/available', requireRole('delivery'), delivery.listAvailableOrders);
router.get('/orders', requireRole('delivery'), delivery.listMyOrders);
router.post('/orders/:id/accept', requireRole('delivery'), delivery.acceptOrder);
router.patch('/orders/:id/status', requireRole('delivery'), delivery.updateOrderStatus);

// Earnings
router.get('/earnings', requireRole('delivery'), delivery.getMyEarnings);

export default router;
