import { Request, Response } from 'express';
import { PoemModel } from '../models/Poem.js';
import { PaymentModel } from '../models/Payment.js';
import { UserModel } from '../models/User.js';
import { NotificationModel } from '../models/Notification.js';
import { EmailService } from '../services/emailService.js';
import { MpesaService } from '../services/mpesaService.js';
import { sanitizeText, sanitizeRichText } from '../utils/sanitize.js';
import { POETRY_CATEGORIES } from '../types/common.js';

export const PoemController = {
  getPoems: (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    const sort = (req.query.sort as string) || 'latest';
    const category = (req.query.category as string) || '';
    const search = (req.query.search as string || '').trim();

    const filter: any = { approvalStatus: 'approved' };
    if (category) {
      filter.category = category;
    }

    let chain = PoemModel.find(filter);
    if (sort === 'popular') chain = chain.sort({ viewCount: -1 });
    else if (sort === 'liked') chain = chain.sort({ likes: -1 });
    else chain = chain.sort({ createdAt: -1 });

    let poems = chain.exec();

    // Map authors to attach viral streaks
    const allUsers = UserModel.find().exec();
    const userMap = new Map(allUsers.map((u: any) => [String(u._id), u]));

    const enrichedPoems = poems.map((p: any) => {
      const authorUser = p.submittedBy ? userMap.get(String(p.submittedBy)) : null;
      const viralScore = authorUser?.viralScore || 0;
      const streakPoints = authorUser?.streakPoints || 0;
      return {
        ...p,
        authorViralScore: viralScore,
        authorStreak: streakPoints,
        isViral: viralScore > 0 || streakPoints > 0
      };
    });

    let finalPoems = enrichedPoems;

    if (search) {
      const lq = search.toLowerCase();
      finalPoems = finalPoems.filter((p: any) =>
        (p.title || '').toLowerCase().includes(lq) ||
        (p.content || '').toLowerCase().includes(lq) ||
        (p.authorName || '').toLowerCase().includes(lq) ||
        (p.genre || '').toLowerCase().includes(lq)
      );
    }

    if (sort === 'viral') {
      finalPoems = finalPoems.sort((a: any, b: any) => (b.authorViralScore || 0) - (a.authorViralScore || 0));
    }

    const total = finalPoems.length;
    const paginatedPoems = finalPoems.slice(skip, skip + limit);

    res.render('poems', {
      title: 'Poetry Community',
      poems: paginatedPoems,
      page,
      totalPages: Math.ceil(total / limit),
      sort,
      category,
      search,
      categories: POETRY_CATEGORIES
    });
  },

  getPoemDetails: (req: Request, res: Response) => {
    const poem = PoemModel.findById(req.params.id);
    const user = res.locals.user;
    if (!poem || (poem.approvalStatus !== 'approved' && !UserModel.isAdmin(user) && String(poem.submittedBy) !== String(user?._id))) {
      return res.status(404).render('error', { status: 404, message: 'Poem not found.' });
    }
    PoemModel.findByIdAndUpdate(poem._id, { viewCount: (poem.viewCount || 0) + 1 });
    res.render('poem-details', { title: poem.title, poem, user });
  },

  getSubmitPoem: (req: Request, res: Response) => {
    res.render('submit-poem', { title: 'Publish a Poem', fee: MpesaService.SUBMISSION_FEE, categories: POETRY_CATEGORIES });
  },

  // Step 1: Create poem pending payment, initiate STK push
  postSubmitPoem: async (req: Request, res: Response) => {
    const user = res.locals.user;
    const { title, content, genre, tags, phoneNumber, backgroundPosition, backgroundSize, backgroundOverlay } = req.body;

    if (!title || !content) {
      req.flash('error', 'Title and content are required.');
      return res.redirect('/poems/submit');
    }

    if (!phoneNumber) {
      req.flash('error', 'M-Pesa phone number is required to publish.');
      return res.redirect('/poems/submit');
    }

    const kenyanPhoneRegex = /^(?:\+254|254|0)?([71]\d{8})$/;
    if (!kenyanPhoneRegex.test(phoneNumber.trim())) {
      req.flash('error', 'Please provide a valid Kenyan M-Pesa phone number.');
      return res.redirect('/poems/submit');
    }

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const backgroundImage = files?.backgroundImage?.[0] ? `/uploads/${files.backgroundImage[0].filename}` : undefined;
      const backgroundAudio = files?.backgroundAudio?.[0] ? `/uploads/${files.backgroundAudio[0].filename}` : undefined;

      // Create poem in pending state first
      const poem = PoemModel.create({
        title: sanitizeText(title, 200),
        content: content.includes('<') ? sanitizeRichText(content, 15000) : sanitizeText(content, 15000),
        authorId: user._id,
        authorName: user.username,
        genre: genre || 'Free Verse',
        category: genre || 'Free Verse',
        tags: (tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        submittedBy: user._id,
        backgroundImage,
        backgroundAudio,
        backgroundPosition: backgroundPosition || 'center',
        backgroundSize: backgroundSize || 'cover',
        backgroundOverlay: backgroundOverlay ? parseFloat(backgroundOverlay) : 0.4,
        approvalStatus: 'pending'
      });

      // Initiate STK push for KES 100
      const result = await MpesaService.initiateStkPush(
        phoneNumber.trim(),
        `POEM-${poem._id.slice(0, 8)}`,
        'Poem Upload - KES 100'
      );

      if (!result.success) {
        // DO NOT delete the pending poem! Save it in pending payment status.
        req.flash('success', 'Poem saved as "Pending Payment". Complete payment from your dashboard to publish.');
        return res.redirect('/profile');
      }

      // Record the payment linked to this poem
      PaymentModel.create({
        userId: user._id,
        feature: 'upload',
        contentType: 'poem',
        contentId: poem._id,
        contentTitle: poem.title,
        amount: MpesaService.SUBMISSION_FEE,
        phoneNumber: phoneNumber.trim(),
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
        invoiceNumber: `INV-POEM-${Date.now()}`
      });

      // Redirect to a status page with the poem & checkout IDs
      return res.redirect(`/poems/payment-status?poemId=${poem._id}&checkoutRequestId=${encodeURIComponent(result.checkoutRequestId!)}`);
    } catch (error) {
      console.error('Poem submit error:', error);
      req.flash('error', 'Could not submit poem. Please try again.');
      res.redirect('/poems/submit');
    }
  },

  postRetryPayment: async (req: Request, res: Response) => {
    const user = res.locals.user;
    const { id } = req.params;
    const { phoneNumber } = req.body;

    const poem = PoemModel.findById(id);
    if (!poem) {
      req.flash('error', 'Poem not found.');
      return res.redirect('/profile');
    }

    if (String(poem.submittedBy) !== String(user._id)) {
      req.flash('error', 'Unauthorized.');
      return res.redirect('/profile');
    }

    if (!phoneNumber) {
      req.flash('error', 'M-Pesa phone number is required.');
      return res.redirect(`/poems/${poem._id}`);
    }

    const kenyanPhoneRegex = /^(?:\+254|254|0)?([71]\d{8})$/;
    if (!kenyanPhoneRegex.test(phoneNumber.trim())) {
      req.flash('error', 'Please provide a valid Kenyan M-Pesa phone number.');
      return res.redirect(`/poems/${poem._id}`);
    }

    try {
      const result = await MpesaService.initiateStkPush(
        phoneNumber.trim(),
        `POEM-${poem._id.slice(0, 8)}`,
        'Poem Upload - KES 100'
      );

      if (!result.success) {
        req.flash('error', result.error || 'Payment could not be started. Please try again.');
        return res.redirect(`/poems/${poem._id}`);
      }

      PaymentModel.create({
        userId: user._id,
        feature: 'upload',
        contentType: 'poem',
        contentId: poem._id,
        contentTitle: poem.title,
        amount: MpesaService.SUBMISSION_FEE,
        phoneNumber: phoneNumber.trim(),
        checkoutRequestId: result.checkoutRequestId,
        merchantRequestId: result.merchantRequestId,
        invoiceNumber: `INV-POEM-RETRY-${Date.now()}`
      });

      return res.redirect(`/poems/payment-status?poemId=${poem._id}&checkoutRequestId=${encodeURIComponent(result.checkoutRequestId!)}`);
    } catch (error) {
      console.error('Poem payment retry error:', error);
      req.flash('error', 'Could not start payment flow.');
      res.redirect(`/poems/${poem._id}`);
    }
  },

  getEditPoem: (req: Request, res: Response) => {
    const user = res.locals.user;
    const poem = PoemModel.findById(req.params.id);
    if (!poem) {
      req.flash('error', 'Poem not found.');
      return res.redirect('/profile');
    }
    if (String(poem.submittedBy) !== String(user._id)) {
      req.flash('error', 'Unauthorized.');
      return res.redirect('/profile');
    }
    res.render('edit-poem', { title: 'Edit Poem', poem, categories: POETRY_CATEGORIES });
  },

  postEditPoem: async (req: Request, res: Response) => {
    const user = res.locals.user;
    const { id } = req.params;
    const { title, content, genre, tags, backgroundPosition, backgroundSize, backgroundOverlay } = req.body;

    const poem = PoemModel.findById(id);
    if (!poem) {
      req.flash('error', 'Poem not found.');
      return res.redirect('/profile');
    }

    if (String(poem.submittedBy) !== String(user._id)) {
      req.flash('error', 'Unauthorized.');
      return res.redirect('/profile');
    }

    if (!title || !content) {
      req.flash('error', 'Title and content are required.');
      return res.redirect(`/poems/${id}/edit`);
    }

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const updateData: any = {
        title: sanitizeText(title, 200),
        content: content.includes('<') ? sanitizeRichText(content, 15000) : sanitizeText(content, 15000),
        genre: genre || 'Free Verse',
        category: genre || 'Free Verse',
        tags: (tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
        backgroundPosition: backgroundPosition || 'center',
        backgroundSize: backgroundSize || 'cover',
        backgroundOverlay: backgroundOverlay ? parseFloat(backgroundOverlay) : 0.4
      };

      if (files?.backgroundImage?.[0]) {
        updateData.backgroundImage = `/uploads/${files.backgroundImage[0].filename}`;
      }
      if (files?.backgroundAudio?.[0]) {
        updateData.backgroundAudio = `/uploads/${files.backgroundAudio[0].filename}`;
      }

      if (req.body.removeBackgroundImage === 'true') {
        updateData.backgroundImage = '';
      }
      if (req.body.removeBackgroundAudio === 'true') {
        updateData.backgroundAudio = '';
      }

      PoemModel.findByIdAndUpdate(id, updateData);
      req.flash('success', 'Poem updated successfully.');
      res.redirect(`/poems/${id}`);
    } catch (err) {
      console.error('Poem edit error:', err);
      req.flash('error', 'Could not update poem.');
      res.redirect(`/poems/${id}/edit`);
    }
  },

  getPaymentStatus: (req: Request, res: Response) => {
    const { poemId, checkoutRequestId } = req.query as { poemId: string; checkoutRequestId: string };
    const poem = poemId ? PoemModel.findById(poemId) : null;
    res.render('poem-payment-status', {
      title: 'Processing Payment',
      poem,
      checkoutRequestId,
      fee: MpesaService.SUBMISSION_FEE
    });
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
    const { content, guestName, stickerUrl, gifUrl } = req.body;
    const poem = PoemModel.findById(req.params.id);
    if (!poem) return res.redirect('/poems');

    const sanitizedContent = sanitizeText(content || '', 2000);
    if (!sanitizedContent && !stickerUrl && !gifUrl) {
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
      stickerUrl,
      gifUrl,
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
    const { content, guestName, stickerUrl, gifUrl } = req.body;
    const { id, commentId } = req.params;
    const poem = PoemModel.findById(id);
    if (!poem) return res.redirect('/poems');

    const sanitizedContent = sanitizeText(content || '', 2000);
    if (!sanitizedContent && !stickerUrl && !gifUrl) {
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
      stickerUrl,
      gifUrl,
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
  },

  postDeletePoem: (req: Request, res: Response) => {
    const user = res.locals.user;
    const { id } = req.params;

    const poem = PoemModel.findById(id);
    if (!poem) {
      req.flash('error', 'Poem not found.');
      return res.redirect('/profile');
    }

    if (String(poem.submittedBy) !== String(user._id) && !UserModel.isAdmin(user)) {
      req.flash('error', 'Unauthorized.');
      return res.redirect('/profile');
    }

    try {
      PoemModel.findByIdAndDelete(id);
      req.flash('success', 'Poem deleted successfully.');
    } catch (err) {
      console.error('Poem delete error:', err);
      req.flash('error', 'Could not delete poem.');
    }

    res.redirect('/profile');
  }
};
