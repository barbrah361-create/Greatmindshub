import { Request, Response } from 'express';
import { UserModel } from '../models/User.js';
import { NotificationModel } from '../models/Notification.js';
import { EmailService } from '../services/emailService.js';
import { PoemModel } from '../models/Poem.js';
import { NovelModel } from '../models/Novel.js';

export const SocialController = {
  postFollow: async (req: Request, res: Response) => {
    const user = res.locals.user;
    const targetId = req.params.id;
    const target = UserModel.findById(targetId);

    if (!target || target._id === user._id) {
      return res.redirect('back' in req ? (req.get('Referer') || '/authors') : '/authors');
    }

    const following = user.following || [];
    const followers = target.followers || [];
    const isFollowing = following.includes(targetId);

    if (isFollowing) {
      UserModel.findByIdAndUpdate(user._id, { following: following.filter((id: string) => id !== targetId) });
      UserModel.findByIdAndUpdate(targetId, { followers: followers.filter((id: string) => id !== user._id) });
    } else {
      UserModel.findByIdAndUpdate(user._id, { following: [...following, targetId] });
      UserModel.findByIdAndUpdate(targetId, { followers: [...followers, user._id] });
      NotificationModel.notify(targetId, 'follow', 'New follower', `${user.username} started following you`, `/authors/${targetId}`);
      await EmailService.sendNewFollower(target.email, target.username, user.username);
    }

    const redirect = req.get('Referer') || `/authors/${targetId}`;
    res.redirect(redirect);
  },

  postRepost: (req: Request, res: Response) => {
    const user = res.locals.user;
    const poemId = req.params.id;
    const poem = PoemModel.findById(poemId);
    if (!poem) {
      req.flash('error', 'Poem not found.');
      return res.redirect('/poems');
    }

    const reposts: { poemId: string; repostedAt: string }[] = user.reposts || [];
    const alreadyReposted = reposts.some((r: any) => r.poemId === poemId);

    if (alreadyReposted) {
      // Toggle off — remove repost
      UserModel.findByIdAndUpdate(user._id, {
        reposts: reposts.filter((r: any) => r.poemId !== poemId)
      });
      req.flash('success', 'Repost removed.');
    } else {
      // Add repost
      UserModel.findByIdAndUpdate(user._id, {
        reposts: [...reposts, { poemId, repostedAt: new Date().toISOString() }]
      });
      // Notify original poet
      if (poem.submittedBy && poem.submittedBy !== user._id) {
        try {
          NotificationModel.notify(
            poem.submittedBy,
            'repost',
            'Your poem was reposted',
            `${user.username} reposted your poem "${poem.title}"`,
            `/poems/${poemId}`
          );
        } catch (err) {}
      }
      req.flash('success', `"${poem.title}" added to your reposts.`);
    }

    const redirect = req.get('Referer') || `/poems/${poemId}`;
    res.redirect(redirect);
  },

  getNotifications: (req: Request, res: Response) => {
    const user = res.locals.user;
    const notifications = NotificationModel.find({ userId: user._id })
      .sort({ createdAt: -1 }).limit(50).exec();

    notifications.filter(n => !n.read).forEach(n => {
      NotificationModel.findByIdAndUpdate(n._id, { read: true });
    });

    res.render('notifications', { title: 'Notifications', notifications });
  },

  getFeed: (req: Request, res: Response) => {
    const user = res.locals.user;
    const following = user.following || [];

    const feedPoems = PoemModel.findPublic().sort({ createdAt: -1 }).limit(50).exec()
      .filter((p: any) => following.includes(p.authorId));
    const trendingPoems = PoemModel.findPublic().sort({ viewCount: -1 }).limit(10).exec();
    const popularNovels = NovelModel.findPublic().sort({ readerCount: -1 }).limit(6).exec();

    res.render('feed', {
      title: 'Reading Feed',
      feedPoems,
      trendingPoems,
      popularNovels
    });
  }
};
