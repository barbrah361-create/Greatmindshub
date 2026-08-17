import { Router } from 'express';
import { PoemController } from '../controllers/PoemController.js';
import { SocialController } from '../controllers/SocialController.js';
import { requireAuth, requireVerified } from '../middleware/authMiddleware.js';
import { submissionLimiter } from '../middleware/securityMiddleware.js';
import { uploadPoemFiles } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', PoemController.getPoems);
router.get('/submit', requireAuth, requireVerified, PoemController.getSubmitPoem);

// Handle file uploads on poem submission
router.post(
  '/submit',
  requireAuth,
  requireVerified,
  submissionLimiter,
  uploadPoemFiles.fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'backgroundAudio', maxCount: 1 }
  ]),
  PoemController.postSubmitPoem
);

router.get('/payment-status', requireAuth, PoemController.getPaymentStatus);
router.get('/:id', PoemController.getPoemDetails);
router.post('/:id/like', requireAuth, requireVerified, PoemController.postLike);
router.post('/:id/comment', PoemController.postComment);
router.post('/:id/comment/:commentId/reply', PoemController.postCommentReply);
router.post('/:id/repost', requireAuth, requireVerified, SocialController.postRepost);

// Resume / Complete payment for a pending poem
router.post('/:id/complete-payment', requireAuth, requireVerified, PoemController.postRetryPayment);

// Author Edit routes
router.get('/:id/edit', requireAuth, requireVerified, PoemController.getEditPoem);
router.post(
  '/:id/edit',
  requireAuth,
  requireVerified,
  uploadPoemFiles.fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'backgroundAudio', maxCount: 1 }
  ]),
  PoemController.postEditPoem
);

router.post('/:id/delete', requireAuth, requireVerified, PoemController.postDeletePoem);

export default router;
