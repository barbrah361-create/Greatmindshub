import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/dashboard', requireAuth, DashboardController.getDashboard);
router.get('/history', requireAuth, DashboardController.getHistory);
router.get('/favorites', requireAuth, DashboardController.getFavorites);
router.get('/leaderboard', requireAuth, (req, res) => res.render('leaderboard', { title: 'Community Leaderboard', entries: [] }));
router.get('/notifications', requireAuth, (req, res) => res.render('notifications', { title: 'Notifications', notifications: [] }));

export default router;
