import { Router } from 'express';
import { LiveController } from '../controllers/LiveController.js';
import { requireAuth, requireAccessPayment } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', LiveController.getLiveDirectory);
router.get('/create', requireAuth, requireAccessPayment('live'), LiveController.getCreateLive);
router.post('/create', requireAuth, requireAccessPayment('live'), LiveController.postCreateLive);
router.get('/:id', requireAccessPayment('live'), LiveController.getLiveRoom);
router.post('/:id/like', LiveController.postLikeStream);
router.post('/:id/end', requireAuth, LiveController.postEndStream);

export default router;
