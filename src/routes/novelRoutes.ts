import { Router } from 'express';
import { NovelController } from '../controllers/NovelController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Guest/Public routes
router.get('/', NovelController.getNovels);
router.get('/categories', NovelController.getCategories);
router.get('/submit', requireAuth, NovelController.getSubmitNovel);
// Per-upload payment: no global access gate — payment initiated inside the submit handler
router.post('/submit', requireAuth, upload.single('coverImage'), NovelController.postSubmitNovel);
router.get('/payment-status', requireAuth, NovelController.getPaymentStatus);
router.get('/:id', NovelController.getNovelDetails);

// Auth required routes for interactive operations
router.get('/:id/read', NovelController.getReadNovel);
router.post('/:id/like', requireAuth, NovelController.postLike);
router.post('/:id/bookmark', requireAuth, NovelController.postBookmark);
router.post('/:id/favorite', requireAuth, NovelController.postFavorite);
router.post('/:id/comment', NovelController.postComment);
router.post('/:id/comments', NovelController.postComment);
router.post('/:id/comment/:commentId/reply', requireAuth, NovelController.postCommentReply);
router.post('/:id/comment/:commentId/report', requireAuth, NovelController.postReportComment);
router.post('/:id/comments/report/:commentId', requireAuth, NovelController.postReportComment);

export default router;
