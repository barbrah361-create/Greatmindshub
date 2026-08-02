import { Router } from 'express';
import { NovelController } from '../controllers/NovelController.js';
import { requireAuth, requireAccessPayment } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Guest/Public routes
router.get('/', NovelController.getNovels);
router.get('/categories', NovelController.getCategories);
router.get('/submit', requireAuth, requireAccessPayment('upload'), NovelController.getSubmitNovel);
router.post('/submit', requireAuth, requireAccessPayment('upload'), upload.single('coverImage'), NovelController.postSubmitNovel);
router.get('/:id', NovelController.getNovelDetails);

// Auth required routes for interactive operations
router.get('/:id/read', requireAccessPayment('read'), NovelController.getReadNovel);
router.post('/:id/bookmark', requireAuth, NovelController.postBookmark);
router.post('/:id/favorite', requireAuth, NovelController.postFavorite);
router.post('/:id/comment', NovelController.postComment);
router.post('/:id/comments', NovelController.postComment);
router.post('/:id/comment/:commentId/reply', requireAuth, NovelController.postCommentReply);
router.post('/:id/comment/:commentId/report', requireAuth, NovelController.postReportComment);
router.post('/:id/comments/report/:commentId', requireAuth, NovelController.postReportComment);

export default router;
