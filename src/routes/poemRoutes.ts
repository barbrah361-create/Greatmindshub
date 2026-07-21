import { Router } from 'express';
import { PoemController } from '../controllers/PoemController.js';
import { requireAuth, requireVerified } from '../middleware/authMiddleware.js';
import { submissionLimiter } from '../middleware/securityMiddleware.js';

const router = Router();

router.get('/', PoemController.getPoems);
router.get('/submit', requireAuth, requireVerified, PoemController.getSubmitPoem);
router.post('/submit', requireAuth, requireVerified, submissionLimiter, PoemController.postSubmitPoem);
router.get('/:id', PoemController.getPoemDetails);
router.post('/:id/like', requireAuth, requireVerified, PoemController.postLike);
router.post('/:id/comment', PoemController.postComment);

export default router;
