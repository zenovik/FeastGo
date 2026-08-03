import { Router } from 'express';
import * as adminAuth from '../controllers/adminAuthController.js';
import * as admin from '../controllers/adminController.js';
import * as analytics from '../controllers/adminAnalyticsController.js';
import * as settings from '../controllers/adminSettingsController.js';
import * as security from '../controllers/adminSecurityController.js';
import * as notifications from '../controllers/notificationController.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

// Auth
router.post('/auth/login', adminAuth.login);
router.post('/auth/logout', adminAuth.logout);
router.get('/auth/me', requireRole('admin'), adminAuth.me);
router.post('/auth/request-password-reset', adminAuth.requestPasswordReset);
router.post('/auth/reset-password', adminAuth.resetPassword);

const adminOnly = requireRole('admin');

// Dashboard / reports
router.get('/dashboard/stats', adminOnly, analytics.getDashboardStats);
router.get('/reports', adminOnly, admin.getReports);
router.get('/reports/sales', adminOnly, analytics.getSalesReport);
router.get('/reports/customers', adminOnly, analytics.getCustomerReport);
router.get('/reports/restaurants', adminOnly, analytics.getRestaurantReport);
router.get('/reports/sellers', adminOnly, analytics.getSellerReport);
router.get('/reports/delivery', adminOnly, analytics.getDeliveryReport);
router.get('/reports/delivery-analytics', adminOnly, analytics.getDeliveryAnalytics);
router.get('/reports/revenue-breakdown', adminOnly, analytics.getRevenueBreakdown);

// Users
router.get('/users', adminOnly, admin.listUsers);
router.get('/users/:id', adminOnly, admin.getUserDetail);
router.patch('/users/:id', adminOnly, admin.updateUser);
router.patch('/users/:id/block', adminOnly, admin.setUserBlocked);
router.delete('/users/:id', adminOnly, admin.deleteUser);

// Restaurant owners (sellers)
router.get('/restaurant-owners', adminOnly, admin.listRestaurantOwners);
router.patch('/restaurant-owners/:id/status', adminOnly, admin.setRestaurantOwnerStatus);
router.patch('/restaurant-owners/:id/suspend', adminOnly, admin.setRestaurantOwnerSuspension);
router.get('/restaurant-owners/:id/earnings', adminOnly, admin.getSellerEarnings);
router.delete('/restaurant-owners/:id', adminOnly, admin.deleteRestaurantOwner);

// Delivery partners
router.get('/delivery-partners', adminOnly, admin.listDeliveryPartners);
router.patch('/delivery-partners/:id/status', adminOnly, admin.setDeliveryPartnerStatus);
router.patch('/delivery-partners/:id/suspend', adminOnly, admin.setDeliveryPartnerSuspension);
router.get('/delivery-partners/:id/performance', adminOnly, admin.getDeliveryPerformance);
router.get('/deliveries/live', adminOnly, admin.listLiveDeliveries);
router.get('/delivery-issues', adminOnly, admin.listDeliveryIssues);
router.patch('/delivery-issues/:id/resolve', adminOnly, admin.resolveDeliveryIssue);

// Restaurants
router.get('/restaurants', adminOnly, admin.listRestaurantsAdmin);
router.patch('/restaurants/:id/status', adminOnly, admin.setRestaurantStatus);
router.patch('/restaurants/:id/suspend', adminOnly, admin.setRestaurantSuspension);
router.patch('/restaurants/:id', adminOnly, admin.updateRestaurantAdmin);
router.get('/restaurants/:id/performance', adminOnly, admin.getRestaurantPerformance);
router.delete('/restaurants/:id', adminOnly, admin.deleteRestaurantAdmin);

// Foods
router.get('/foods', adminOnly, admin.listFoodsAdmin);
router.get('/foods/trending', adminOnly, admin.listTrendingFoods);
router.patch('/foods/:id', adminOnly, admin.updateFoodAdmin);
router.patch('/foods/:id/hide', adminOnly, admin.setFoodHidden);
router.delete('/foods/:id', adminOnly, admin.deleteFoodAdmin);

// Orders
router.get('/orders', adminOnly, admin.listOrdersAdmin);
router.patch('/orders/:id/status', adminOnly, admin.updateOrderStatusAdmin);
router.post('/orders/:id/cancel', adminOnly, admin.cancelOrderAdmin);
router.post('/orders/:id/assign-delivery', adminOnly, admin.assignDeliveryPartner);
router.get('/refunds', adminOnly, admin.listRefundRequests);
router.patch('/orders/:id/refund', adminOnly, admin.updateRefundStatus);

// Reviews
router.get('/reviews', adminOnly, admin.listReviewsAdmin);
router.patch('/reviews/:id/hide', adminOnly, admin.setReviewHidden);
router.delete('/reviews/:id', adminOnly, admin.deleteReviewAdmin);

// Categories
router.get('/categories', adminOnly, admin.listCategories);
router.post('/categories', adminOnly, admin.createCategory);
router.patch('/categories/reorder', adminOnly, admin.reorderCategories);
router.patch('/categories/:id', adminOnly, admin.updateCategory);
router.delete('/categories/:id', adminOnly, admin.deleteCategory);

router.get('/explore-cards', adminOnly, admin.listExploreCardsAdmin);
router.post('/explore-cards', adminOnly, admin.createExploreCard);
router.patch('/explore-cards/reorder', adminOnly, admin.reorderExploreCards);
router.patch('/explore-cards/:id', adminOnly, admin.updateExploreCard);
router.delete('/explore-cards/:id', adminOnly, admin.deleteExploreCard);

// Coupons
router.get('/coupons', adminOnly, admin.listCouponsAdmin);
router.post('/coupons', adminOnly, admin.createCoupon);
router.patch('/coupons/:id', adminOnly, admin.updateCoupon);
router.delete('/coupons/:id', adminOnly, admin.deleteCoupon);

// Banners
router.get('/banners', adminOnly, admin.listBannersAdmin);
router.post('/banners', adminOnly, admin.createBanner);
router.patch('/banners/:id', adminOnly, admin.updateBanner);
router.delete('/banners/:id', adminOnly, admin.deleteBanner);

// Notifications
router.get('/notifications', adminOnly, notifications.listMyNotifications);
router.patch('/notifications/:id/read', adminOnly, notifications.markNotificationRead);
router.patch('/notifications/read-all', adminOnly, notifications.markAllNotificationsRead);
router.patch('/notifications/bulk', adminOnly, notifications.bulkNotificationAction);
router.patch('/notifications/:id/archive', adminOnly, notifications.archiveNotification);
router.patch('/notifications/:id/restore', adminOnly, notifications.restoreNotification);
router.delete('/notifications/clear-all', adminOnly, notifications.clearAllNotifications);
router.delete('/notifications/:id', adminOnly, notifications.deleteNotification);
router.post('/notifications/broadcast', adminOnly, notifications.broadcastNotification);
router.get('/notifications/search-recipients', adminOnly, notifications.searchRecipients);

// System settings
router.get('/settings', adminOnly, settings.getSettings);
router.patch('/settings', adminOnly, settings.updateSettings);

// Security
router.get('/admins', adminOnly, security.listAdmins);
router.patch('/admins/:id/role', adminOnly, security.setAdminRole);
router.get('/audit-logs', adminOnly, security.listAuditLogs);
router.get('/login-history', adminOnly, security.listLoginHistory);

export default router;
