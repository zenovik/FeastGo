import { Router } from 'express';
import * as sellerAuth from '../controllers/sellerAuthController.js';
import * as seller from '../controllers/sellerController.js';
import * as analytics from '../controllers/sellerAnalyticsController.js';
import * as notifications from '../controllers/notificationController.js';
import { listSellerMessages, sendSellerMessage } from '../controllers/messageController.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Auth
router.post('/auth/signup', sellerAuth.signup);
router.post('/auth/login', sellerAuth.login);
router.post('/auth/logout', sellerAuth.logout);
router.get('/auth/me', requireRole('seller', { allowSuspended: true }), sellerAuth.me);
router.post('/auth/change-password', requireRole('seller'), sellerAuth.changePassword);
router.patch('/auth/profile', requireRole('seller'), sellerAuth.updateMyProfile);

// Restaurant registration + settings
router.get('/restaurant', requireRole('seller'), seller.getMyRestaurant);
router.post('/restaurant', requireRole('seller'), sellerAuth.registerRestaurant);
router.patch('/restaurant', requireRole('seller'), seller.updateMyRestaurant);
router.patch('/restaurant/category-order', requireRole('seller'), seller.updateCategoryOrder);

// Menu
router.get('/menu', requireRole('seller'), seller.listMyMenu);
router.post('/menu', requireRole('seller'), seller.createMenuItem);
router.patch('/menu/reorder', requireRole('seller'), seller.reorderMenuItems);
router.patch('/menu/:id', requireRole('seller'), seller.updateMenuItem);
router.delete('/menu/:id', requireRole('seller'), seller.deleteMenuItem);
router.post('/menu/:id/duplicate', requireRole('seller'), seller.duplicateMenuItem);

// Orders
router.get('/orders', requireRole('seller'), seller.listMyOrders);
router.get('/orders/:id', requireRole('seller'), seller.getOrderDetail);
router.patch('/orders/:id/status', requireRole('seller'), seller.updateOrderStatus);
router.patch('/orders/:id/notes', requireRole('seller'), seller.updateOrderNotes);
router.post('/orders/bulk-status', requireRole('seller'), seller.bulkUpdateOrderStatus);
router.get('/orders/:id/messages', requireRole('seller'), listSellerMessages);
router.post('/orders/:id/messages', requireRole('seller'), sendSellerMessage);
router.post('/orders/:id/report-issue', requireRole('seller'), seller.reportDeliveryIssue);

// Coupons
router.get('/coupons', requireRole('seller'), seller.listMyCoupons);
router.post('/coupons', requireRole('seller'), seller.createMyCoupon);
router.patch('/coupons/:id', requireRole('seller'), seller.updateMyCoupon);
router.delete('/coupons/:id', requireRole('seller'), seller.deleteMyCoupon);

// Reviews
router.get('/reviews', requireRole('seller'), seller.listMyReviews);
router.get('/reviews/analytics', requireRole('seller'), seller.reviewAnalytics);
router.post('/reviews/:id/reply', requireRole('seller'), seller.replyToReview);

// Earnings
router.get('/earnings', requireRole('seller'), seller.getMyEarnings);

// Analytics / reports
router.get('/dashboard/stats', requireRole('seller'), analytics.getDashboardStats);
router.get('/reports/revenue', requireRole('seller'), analytics.getRevenueReport);
router.get('/reports/top-items', requireRole('seller'), analytics.getTopItemsReport);
router.get('/reports/peak-hours', requireRole('seller'), analytics.getPeakHoursReport);
router.get('/reports/customers', requireRole('seller'), analytics.getCustomerInsights);

// Notifications
router.get('/notifications', requireRole('seller'), notifications.listMyNotifications);
router.patch('/notifications/:id/read', requireRole('seller'), notifications.markNotificationRead);
router.patch('/notifications/read-all', requireRole('seller'), notifications.markAllNotificationsRead);
router.patch('/notifications/bulk', requireRole('seller'), notifications.bulkNotificationAction);
router.patch('/notifications/:id/archive', requireRole('seller'), notifications.archiveNotification);
router.patch('/notifications/:id/restore', requireRole('seller'), notifications.restoreNotification);
router.delete('/notifications/clear-all', requireRole('seller'), notifications.clearAllNotifications);
router.delete('/notifications/:id', requireRole('seller'), notifications.deleteNotification);

export default router;
