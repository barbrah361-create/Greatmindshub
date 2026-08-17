import { Request, Response } from 'express';
import { LiveSessionModel } from '../models/LiveSession.js';
import { PoemModel } from '../models/Poem.js';
import { NovelModel } from '../models/Novel.js';
import { UserModel } from '../models/User.js';
import { NotificationModel } from '../models/Notification.js';
import { GIFT_CATALOG } from '../config/socket.js';

export const LiveController = {
  // 1. Live Recitations Directory
  getLiveDirectory: (req: Request, res: Response) => {
    const activeStreams = LiveSessionModel.findActive().sort({ viewersCount: -1 }).exec();
    const poems = PoemModel.findPublic().sort({ createdAt: -1 }).limit(10).exec();
    res.render('live-directory', {
      title: 'Live Recitation & Reading Rooms',
      activeStreams,
      poems
    });
  },

  // 2. GET Create Live Stream Studio Form
  getCreateLive: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const userPoems = PoemModel.find({ submittedBy: user._id }).exec();
    const allNovels = NovelModel.findPublic().limit(20).exec();

    res.render('live-studio', {
      title: 'Go Live - Poetry & Reading Studio',
      userPoems,
      allNovels
    });
  },

  // 3. POST Create Live Stream Room + Notify Followers
  postCreateLive: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    const { title, type, selectedWorkId, customText } = req.body;
    let workTitle = 'Live Recitation';
    let workContent = customText || '';

    if (type === 'poem' && selectedWorkId) {
      const poem = PoemModel.findById(selectedWorkId);
      if (poem) {
        workTitle = poem.title;
        workContent = poem.content;
      }
    } else if (type === 'novel' && selectedWorkId) {
      const novel = NovelModel.findById(selectedWorkId);
      if (novel) {
        workTitle = novel.title;
        workContent = novel.synopsis || novel.contentPages?.join('\n\n') || '';
      }
    }

    const session = LiveSessionModel.create({
      hostId: user._id,
      hostName: user.username,
      hostAvatar: user.avatar || '/uploads/default-avatar.png',
      title: title || `Live Recitation by ${user.username}`,
      type: (type as any) || 'poem',
      workTitle,
      workContent,
      viewersCount: 1,
      likesCount: 0,
      isLive: true
    });

    // ── Notify all followers that host is LIVE ──
    const followers = user.followers || [];
    followers.forEach((followerId: string) => {
      NotificationModel.notify(
        followerId,
        'live',
        `🔴 ${user.username} is LIVE!`,
        `Now reciting: "${workTitle}" — Tap to join the live stage!`,
        `/live/${session._id}`
      );
    });

    console.log(`[Live] ${user.username} went LIVE. Notified ${followers.length} followers.`);

    req.flash('success', 'You are now LIVE! Your followers have been notified.');
    res.redirect(`/live/${session._id}`);
  },

  // 4. View Real-Time Live Stream Room
  getLiveRoom: (req: Request, res: Response) => {
    const { id } = req.params;
    const session = LiveSessionModel.findById(id);

    if (!session || !session.isLive) {
      req.flash('error', 'The live stream session has ended.');
      return res.redirect('/live');
    }

    const isHost = res.locals.user && String(res.locals.user._id) === String(session.hostId);

    // Build top gifters leaderboard
    const giftMap: Record<string, { username: string; totalPoints: number }> = {};
    (session.gifts || []).forEach((g: any) => {
      if (!giftMap[g.userId]) giftMap[g.userId] = { username: g.username, totalPoints: 0 };
      giftMap[g.userId].totalPoints += g.points;
    });
    const topGifters = Object.values(giftMap)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, 5);

    res.render('live-room', {
      title: `${session.title} - LIVE`,
      session,
      isHost,
      topGifters,
      giftCatalog: GIFT_CATALOG
    });
  },

  // 5. Send Live Stream Like / Heart (HTTP fallback, Socket.io preferred)
  postLikeStream: (req: Request, res: Response) => {
    const { id } = req.params;
    const session = LiveSessionModel.findById(id);
    if (!session) return res.status(404).json({ success: false });

    const newLikes = session.likesCount + 1;
    LiveSessionModel.findByIdAndUpdate(id, { likesCount: newLikes });

    res.json({ success: true, likesCount: newLikes });
  },

  // 6. End Live Stream Room
  postEndStream: (req: Request, res: Response) => {
    const { id } = req.params;
    const user = res.locals.user;
    const session = LiveSessionModel.findById(id);

    if (session && user && String(user._id) === String(session.hostId)) {
      LiveSessionModel.findByIdAndUpdate(id, { isLive: false });

      // Award bonus streak points for completing a live session
      const totalGifts = session.totalGiftPoints || 0;
      if (totalGifts > 0) {
        const bonusStreak = Math.floor(totalGifts / 5);
        const currentStreakPts = user.streakPoints || 0;
        const currentGiftPts = user.giftPoints || 0;
        UserModel.findByIdAndUpdate(user._id, {
          streakPoints: currentStreakPts + bonusStreak,
          viralScore: currentGiftPts + currentStreakPts + bonusStreak
        });
      }

      req.flash('success', `Live session ended! You earned ${session.totalGiftPoints || 0} gift points.`);
    }
    res.redirect('/live');
  }
};
