import { Request, Response } from 'express';
import { LiveSessionModel } from '../models/LiveSession.js';
import { PoemModel } from '../models/Poem.js';
import { NovelModel } from '../models/Novel.js';

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

  // 3. POST Create Live Stream Room
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
      viewersCount: Math.floor(Math.random() * 12) + 5,
      likesCount: Math.floor(Math.random() * 50) + 10,
      isLive: true
    });

    req.flash('success', 'You are now LIVE! Share your stream with your followers.');
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

    // Increment viewers count on entry
    LiveSessionModel.findByIdAndUpdate(id, { viewersCount: session.viewersCount + 1 });

    const isHost = res.locals.user && String(res.locals.user._id) === String(session.hostId);

    res.render('live-room', {
      title: `${session.title} - LIVE Stream`,
      session,
      isHost
    });
  },

  // 5. Send Live Stream Like / Heart
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
      req.flash('success', 'Your live recitation stream has ended successfully.');
    }
    res.redirect('/live');
  }
};
