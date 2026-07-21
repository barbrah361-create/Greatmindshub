import { Router } from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

// Apply requireAdmin middleware to all routes in this router
router.use(requireAdmin);

// Dashboard main
router.get('/', AdminController.getDashboard);

// Manage Novels
router.get('/novels', AdminController.getManageNovels);
router.get('/novels/add', AdminController.getAddNovel);
router.post('/novels/add', upload.single('coverImage'), AdminController.postAddNovel);
router.get('/novels/edit/:id', AdminController.getEditNovel);
router.post('/novels/edit/:id', upload.single('coverImage'), AdminController.postEditNovel);
router.post('/novels/delete/:id', AdminController.postDeleteNovel);

// Manage Authors
router.get('/authors', AdminController.getManageAuthors);
router.get('/authors/add', AdminController.getAddAuthor);
router.post('/authors/add', upload.single('photo'), AdminController.postAddAuthor);
router.get('/authors/edit/:id', AdminController.getEditAuthor);
router.post('/admin/authors/edit/:id', upload.single('photo'), AdminController.postEditAuthor); // fallback/alias
router.post('/authors/edit/:id', upload.single('photo'), AdminController.postEditAuthor);
router.post('/authors/delete/:id', AdminController.postDeleteAuthor);

// Manage Users
router.get('/users', AdminController.getManageUsers);
router.post('/users/toggle-role/:id', AdminController.postToggleUserRole);
router.post('/users/role/:id', AdminController.postToggleUserRole);
router.post('/users/suspend/:id', AdminController.postSuspendUser);

// Manage Reported Comments
router.post('/comments/dismiss/:id', AdminController.postDismissComment);
router.post('/comments/delete/:id', AdminController.postDeleteComment);

// Approval Queue
router.get('/approvals', AdminController.getApprovals);
router.post('/novels/approve/:id', AdminController.postApproveNovel);
router.post('/novels/reject/:id', AdminController.postRejectNovel);
router.post('/authors/approve/:id', AdminController.postApproveAuthor);
router.post('/authors/reject/:id', AdminController.postRejectAuthor);
router.post('/poems/approve/:id', AdminController.postApprovePoem);
router.post('/poems/reject/:id', AdminController.postRejectPoem);

export default router;
