import { Router } from 'express';
import { PoemController } from '../controllers/PoemController.js';
import { requireAuth, requireVerified, requireAccessPayment } from '../middleware/authMiddleware.js';
import { submissionLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

router.get('/', PoemController.getPoems);
router.get('/submit', requireAuth, requireVerified, PoemController.getSubmitPoem);
router.post('/submit', requireAuth, requireVerified, requireAccessPayment('upload'), submissionLimiter, PoemController.postSubmitPoem);
router.get('/:id', PoemController.getPoemDetails);
router.post('/:id/like', requireAuth, requireVerified, PoemController.postLike);
router.post('/:id/comment', PoemController.postComment);
router.post('/:id/comment/:commentId/reply', PoemController.postCommentReply);

export default router;
