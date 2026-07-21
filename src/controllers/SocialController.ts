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
