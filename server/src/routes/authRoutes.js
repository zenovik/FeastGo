import { Router } from 'express';
import {
  requestOtp,
  verifyOtp,
  completeProfile,
  logout,
  me,
  updateProfile,
  addAddress,
  removeAddress,
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/complete-profile', completeProfile);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, updateProfile);
router.post('/me/addresses', requireAuth, addAddress);
router.delete('/me/addresses/:addressId', requireAuth, removeAddress);

export default router;
