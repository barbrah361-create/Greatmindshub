import { Request, Response } from 'express';
import { PoemModel } from '../models/Poem.js';
import { PaymentModel } from '../models/Payment.js';
import { UserModel } from '../models/User.js';
import { NotificationModel } from '../models/Notification.js';
import { EmailService } from '../services/emailService.js';
import { MpesaService } from '../services/mpesaService.js';
import { sanitizeText } from '../utils/sanitize.js';

export const PoemController = {
  getPoems: (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    const sort = (req.query.sort as string) || 'latest';

    let chain = PoemModel.findPublic();
    if (sort === 'popular') chain = chain.sort({ viewCount: -1 });
    else if (sort === 'liked') chain = chain.sort({ likes: -1 });
    else chain = chain.sort({ createdAt: -1 });

    const total = PoemModel.countDocuments({ approvalStatus: 'approved' });
    const poems = chain.skip(skip).limit(limit).exec();

    res.render('poems', {
      title: 'Poetry Community',
      poems,
      page,
      totalPages: Math.ceil(total / limit),
      sort
    });
  },

  getPoemDetails: (req: Request, res: Response) => {
    const poem = PoemModel.findById(req.params.id);
    if (!poem || (poem.approvalStatus !== 'approved' && !UserModel.isAdmin(res.locals.user))) {
      return res.status(404).render('error', { status: 404, message: 'Poem not found.' });
    }
    PoemModel.findByIdAndUpdate(poem._id, { viewCount: (poem.viewCount || 0) + 1 });
    res.render('poem-details', { title: poem.title, poem });
  },

  getSubmitPoem: (req: Request, res: Response) => {
    res.render('submit-poem', { title: 'Publish a Poem', fee: MpesaService.SUBMISSION_FEE });
  },

  postSubmitPoem: async (req: Request, res: Response) => {
    const user = res.locals.user;
    const { title, content, genre, tags } = req.body;

    if (!title || !content) {
      req.flash('error', 'Title and content are required.');
      return res.redirect('/poems/submit');
    }

    try {
      const poem = PoemModel.create({
        title: sanitizeText(title, 200),
        content: sanitizeText(content, 10000),
        authorId: user._id,
        authorName: user.username,
        genre: genre || 'Poetry',
        tags: (tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        submittedBy: user._id,
        approvalStatus: 'approved'
      });

      try {
        await EmailService.sendUploadReceived(user.email, user.username, 'poem', poem.title);
      } catch (err) {
        console.warn('Email send warning:', err);
      }
      
      req.flash('success', 'Your poem has been published successfully!');
      return res.redirect(`/poems/${poem._id}`);
    } catch (error) {
      console.error('Poem submit error:', error);
      req.flash('error', 'Could not publish poem.');
      res.redirect('/poems/submit');
    }
  },

  postLike: (req: Request, res: Response) => {
    const user = res.locals.user;
    const poem = PoemModel.findById(req.params.id);
    if (!poem) return res.redirect('/poems');

    const likes = poem.likes || [];
    const idx = likes.indexOf(user._id);
    if (idx >= 0) likes.splice(idx, 1);
    else likes.push(user._id);

    PoemModel.findByIdAndUpdate(poem._id, { likes });
    res.redirect(`/poems/${poem._id}`);
  },

  postComment: (req: Request, res: Response) => {
    const user = res.locals.user;
    const { content, guestName } = req.body;
    const poem = PoemModel.findById(req.params.id);
    if (!poem) return res.redirect('/poems');

    const sanitizedContent = sanitizeText(content || '', 2000);
    if (!sanitizedContent) {
      req.flash('error', 'Comment cannot be empty.');
      return res.redirect(`/poems/${poem._id}`);
    }

    const userId = user ? user._id : 'guest';
    const username = user ? user.username : sanitizeText(guestName || 'Anonymous Guest', 50);
    const userAvatar = user ? user.avatar : undefined;

    const comment = {
      _id: Math.random().toString(36).substring(2, 15),
      userId,
      username,
      userAvatar,
      content: sanitizedContent,
      replies: [],
      createdAt: new Date().toISOString()
    };

    PoemModel.findByIdAndUpdate(poem._id, { comments: [...(poem.comments || []), comment] });

    if (poem.submittedBy && poem.submittedBy !== userId) {
      const author = UserModel.findById(poem.submittedBy);
      if (author) {
        try {
          NotificationModel.notify(author._id, 'comment', 'New comment on your poem', `${username} commented on "${poem.title}"`, `/poems/${poem._id}`);
          EmailService.sendCommentNotification(author.email, author.username, username, poem.title, `/poems/${poem._id}`);
        } catch (err) {
          console.warn('Notification/Email send error:', err);
        }
      }
    }

    req.flash('success', 'Comment added.');
    res.redirect(`/poems/${poem._id}`);
  },

  postCommentReply: (req: Request, res: Response) => {
    const user = res.locals.user;
    const { content, guestName } = req.body;
    const { id, commentId } = req.params;
    const poem = PoemModel.findById(id);
    if (!poem) return res.redirect('/poems');

    const sanitizedContent = sanitizeText(content || '', 2000);
    if (!sanitizedContent) {
      req.flash('error', 'Reply cannot be empty.');
      return res.redirect(`/poems/${poem._id}`);
    }

    const userId = user ? user._id : 'guest';
    const username = user ? user.username : sanitizeText(guestName || 'Anonymous Guest', 50);
    const userAvatar = user ? user.avatar : undefined;

    const reply = {
      _id: Math.random().toString(36).substring(2, 15),
      userId,
      username,
      userAvatar,
      content: sanitizedContent,
      replies: [],
      createdAt: new Date().toISOString()
    };

    const comments = [...(poem.comments || [])];
    const targetComment = comments.find(c => c._id === commentId);
    if (targetComment) {
      targetComment.replies = targetComment.replies || [];
      targetComment.replies.push(reply);
      PoemModel.findByIdAndUpdate(poem._id, { comments });

      if (targetComment.userId && targetComment.userId !== userId && targetComment.userId !== 'guest') {
        try {
          NotificationModel.notify(targetComment.userId, 'comment', 'Reply to your comment', `${username} replied to your comment on "${poem.title}"`, `/poems/${poem._id}`);
        } catch (err) {}
      }

      req.flash('success', 'Reply submitted.');
    } else {
      req.flash('error', 'Original comment not found.');
    }

    res.redirect(`/poems/${poem._id}`);
  }
};
