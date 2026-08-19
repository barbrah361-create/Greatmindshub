import { Router } from 'express';
import { NovelController } from '../controllers/NovelController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', NovelController.getAuthors);

// Signature Wall Guestbook routes
router.get('/signature-wall', NovelController.getSignatureWall);
router.post('/signature-wall', requireAuth, upload.single('signatureImage'), NovelController.postSignature);
router.post('/signature-wall/delete', requireAuth, NovelController.deleteSignature);

router.get('/:id', NovelController.getAuthorProfile);
router.get('/:id/network', NovelController.getAuthorNetwork);
router.post('/:id/follow', NovelController.postFollowAuthor);

export default router;
