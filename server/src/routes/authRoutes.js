import { Router } from 'express';
import {
  requestOtp,
  verifyOtp,
  completeSignup,
  refreshToken,
  logout,
  me,
  updateProfile,
  requestPhoneChangeOtp,
  verifyPhoneChangeOtp,
  requestEmailChangeOtp,
  verifyEmailChangeOtp,
  toggleFavorite,
  getFavorites,
  addAddress,
  removeAddress,
  updateAddress,
  setDefaultAddress,
  addSavedCard,
  removeSavedCard,
  addSavedUpi,
  removeSavedUpi,
  exportMyData,
  deleteAccount,
  submitSupportRequest,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  archiveNotification,
  restoreNotification,
  bulkNotificationAction,
} from '../controllers/notificationController.js';

const router = Router();

router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/complete-signup', completeSignup);
router.post('/refresh-token', requireAuth, refreshToken);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateProfile);
router.post('/me/phone/request-otp', requireAuth, requestPhoneChangeOtp);
router.post('/me/phone/verify-otp', requireAuth, verifyPhoneChangeOtp);
router.post('/me/email/request-otp', requireAuth, requestEmailChangeOtp);
router.post('/me/email/verify-otp', requireAuth, verifyEmailChangeOtp);
router.get('/me/favorites', requireAuth, getFavorites);
router.post('/me/favorites/:restaurantId', requireAuth, toggleFavorite);
router.post('/me/addresses', requireAuth, addAddress);
router.patch('/me/addresses/:addressId', requireAuth, updateAddress);
router.delete('/me/addresses/:addressId', requireAuth, removeAddress);
router.patch('/me/addresses/:addressId/default', requireAuth, setDefaultAddress);
router.post('/me/cards', requireAuth, addSavedCard);
router.delete('/me/cards/:cardId', requireAuth, removeSavedCard);
router.post('/me/upi', requireAuth, addSavedUpi);
router.delete('/me/upi/:upiId', requireAuth, removeSavedUpi);
router.get('/me/export-data', requireAuth, exportMyData);
router.post('/me/delete-account', requireAuth, deleteAccount);
router.post('/me/support-request', requireAuth, submitSupportRequest);
router.get('/me/notifications', requireAuth, listMyNotifications);
router.patch('/me/notifications/:id/read', requireAuth, markNotificationRead);
router.patch('/me/notifications/read-all', requireAuth, markAllNotificationsRead);
router.patch('/me/notifications/bulk', requireAuth, bulkNotificationAction);
router.patch('/me/notifications/:id/archive', requireAuth, archiveNotification);
router.patch('/me/notifications/:id/restore', requireAuth, restoreNotification);
router.delete('/me/notifications/clear-all', requireAuth, clearAllNotifications);
router.delete('/me/notifications/:id', requireAuth, deleteNotification);

export default router;
