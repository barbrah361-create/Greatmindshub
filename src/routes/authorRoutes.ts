import { Router } from 'express';
import { NovelController } from '../controllers/NovelController.js';

const router = Router();

router.get('/', NovelController.getAuthors);
router.get('/:id', NovelController.getAuthorProfile);
router.post('/:id/follow', NovelController.postFollowAuthor);

export default router;
