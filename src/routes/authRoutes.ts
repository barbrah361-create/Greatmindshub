import { Router } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { authLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

router.get('/register', AuthController.getRegister);
router.post('/register', authLimiter, AuthController.postRegister);

router.get('/login', AuthController.getLogin);
router.post('/login', authLimiter, AuthController.postLogin);

router.get('/verify-pending', requireAuth, AuthController.getVerifyPending);
router.get('/verify-email', AuthController.getVerifyEmail);
router.post('/resend-verification', requireAuth, AuthController.postResendVerification);

router.get('/forgot-password', AuthController.getForgotPassword);
router.post('/forgot-password', authLimiter, AuthController.postForgotPassword);
router.get('/reset-password', AuthController.getResetPassword);
router.post('/reset-password', authLimiter, AuthController.postResetPassword);

router.get('/logout', requireAuth, AuthController.logout);
router.get('/profile', requireAuth, AuthController.getProfile);
router.post('/profile/update', requireAuth, AuthController.updateProfile);
router.post('/profile/avatar', requireAuth, upload.single('avatar'), AuthController.updateAvatar);
router.post('/profile/password', requireAuth, AuthController.updatePassword);

export default router;
