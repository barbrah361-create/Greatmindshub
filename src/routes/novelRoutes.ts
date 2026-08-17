import { Router } from 'express';
import { NovelController } from '../controllers/NovelController.js';
import { requireAuth, requireVerified } from '../middleware/authMiddleware.js';
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

// Complete payment for a pending novel
router.post('/:id/complete-payment', requireAuth, NovelController.postRetryPayment);

// Owner edit routes
router.get('/:id/edit', requireAuth, NovelController.getEditNovel);
router.post('/:id/edit', requireAuth, upload.single('coverImage'), NovelController.postEditNovel);
router.post('/:id/delete', requireAuth, NovelController.postDeleteNovel);

export default router;
