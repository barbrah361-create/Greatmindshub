import { Router } from 'express';
import { MessageController } from '../controllers/MessageController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Apply auth middleware to all messaging routes
router.use(requireAuth);

// Inbox & Requests
router.get('/', MessageController.getInbox);
router.get('/:userId', MessageController.getConversation);
router.post('/:userId', MessageController.sendMessage);

// Request Approvals
router.post('/requests/:userId/accept', MessageController.acceptRequest);
router.post('/requests/:userId/decline', MessageController.declineRequest);

// Privacy & Blocking
router.post('/settings/privacy', MessageController.updatePrivacy);
router.post('/users/:userId/block', MessageController.blockUser);
router.post('/users/:userId/unblock', MessageController.unblockUser);

export default router;
