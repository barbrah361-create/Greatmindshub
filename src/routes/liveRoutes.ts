import { Router } from 'express';
import { LiveController } from '../controllers/LiveController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', LiveController.getLiveDirectory);
router.get('/create', requireAuth, LiveController.getCreateLive);
router.post('/create', requireAuth, LiveController.postCreateLive);
router.get('/:id', LiveController.getLiveRoom);
router.post('/:id/like', LiveController.postLikeStream);
router.post('/:id/end', requireAuth, LiveController.postEndStream);

export default router;
