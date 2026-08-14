import { Router } from 'express';
import { PoemController } from '../controllers/PoemController.js';
import { SocialController } from '../controllers/SocialController.js';
import { requireAuth, requireVerified } from '../middleware/authMiddleware.js';
import { submissionLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

router.get('/', PoemController.getPoems);
router.get('/submit', requireAuth, requireVerified, PoemController.getSubmitPoem);
// Per-upload payment: no global access gate — payment initiated inside the submit handler
router.post('/submit', requireAuth, requireVerified, submissionLimiter, PoemController.postSubmitPoem);
router.get('/payment-status', requireAuth, PoemController.getPaymentStatus);
router.get('/:id', PoemController.getPoemDetails);
router.post('/:id/like', requireAuth, requireVerified, PoemController.postLike);
router.post('/:id/comment', PoemController.postComment);
router.post('/:id/comment/:commentId/reply', PoemController.postCommentReply);
router.post('/:id/repost', requireAuth, requireVerified, SocialController.postRepost);

export default router;
