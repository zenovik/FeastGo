import { Router } from 'express';
import * as deliveryAuth from '../controllers/deliveryAuthController.js';
import * as delivery from '../controllers/deliveryController.js';
import * as notifications from '../controllers/notificationController.js';
import { listDeliveryMessages, sendDeliveryMessage } from '../controllers/messageController.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Auth
router.post('/auth/request-otp', deliveryAuth.requestOtp);
router.post('/auth/verify-otp', deliveryAuth.verifyOtp);
router.post('/auth/signup', deliveryAuth.signup);
router.post('/auth/login', deliveryAuth.login);
router.post('/auth/logout', deliveryAuth.logout);
router.get('/auth/me', requireRole('delivery', { allowSuspended: true }), deliveryAuth.me);
router.patch('/auth/online', requireRole('delivery'), deliveryAuth.setOnlineStatus);
router.patch('/auth/profile', requireRole('delivery'), deliveryAuth.updateProfile);
router.patch('/auth/documents', requireRole('delivery'), deliveryAuth.updateDocuments);
router.post('/auth/change-password', requireRole('delivery'), deliveryAuth.changePassword);
router.post('/auth/forgot-password/request', deliveryAuth.requestPasswordReset);
router.post('/auth/forgot-password/reset', deliveryAuth.resetPassword);

// Orders
router.get('/orders/available', requireRole('delivery'), delivery.listAvailableOrders);
router.get('/orders', requireRole('delivery'), delivery.listMyOrders);
router.get('/orders/:id', requireRole('delivery'), delivery.getOrderDetail);
router.post('/orders/:id/accept', requireRole('delivery'), delivery.acceptOrder);
router.post('/orders/:id/reject', requireRole('delivery'), delivery.rejectOrder);
router.patch('/orders/:id/status', requireRole('delivery'), delivery.updateDeliveryStatus);
router.get('/orders/:id/messages', requireRole('delivery'), listDeliveryMessages);
router.post('/orders/:id/messages', requireRole('delivery'), sendDeliveryMessage);

// Location
router.patch('/location', requireRole('delivery'), delivery.updateLocation);

// Earnings + dashboard
router.get('/earnings', requireRole('delivery'), delivery.getMyEarnings);
router.get('/dashboard/stats', requireRole('delivery'), delivery.getDashboardStats);

// Notifications
router.get('/notifications', requireRole('delivery'), notifications.listMyNotifications);
router.patch('/notifications/:id/read', requireRole('delivery'), notifications.markNotificationRead);
router.patch('/notifications/read-all', requireRole('delivery'), notifications.markAllNotificationsRead);
router.patch('/notifications/bulk', requireRole('delivery'), notifications.bulkNotificationAction);
router.patch('/notifications/:id/archive', requireRole('delivery'), notifications.archiveNotification);
router.patch('/notifications/:id/restore', requireRole('delivery'), notifications.restoreNotification);
router.delete('/notifications/clear-all', requireRole('delivery'), notifications.clearAllNotifications);
router.delete('/notifications/:id', requireRole('delivery'), notifications.deleteNotification);

export default router;
