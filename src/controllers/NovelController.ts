import { Request, Response } from 'express';
import { NovelModel } from '../models/Novel.js';
import { AuthorModel } from '../models/Author.js';
import { CommentModel } from '../models/Comment.js';
import { UserModel } from '../models/User.js';
import { generateQRCode } from '../utils/qrcode.js';
import { CATEGORIES } from '../types/common.js';
import { sanitizeText } from '../utils/sanitize.js';
import { featuredArticles } from '../config/articles.js';
import { getLocalAuthorPhoto, getWikipediaLink } from '../utils/authorPhoto.js';
import { getLocalNovelCover, getCategoryCover } from '../utils/novelPhoto.js';
import { CATEGORY_DETAILS } from '../config/categoryDetails.js';
import { PoemModel } from '../models/Poem.js';
import { calculateTikTokStyleLikes, formatTikTokMetric } from '../utils/metrics.js';
import { buildReaderSummary, estimateReadingTime } from '../utils/profile.js';
import { hasCompletedAccessPayment } from '../middleware/authMiddleware.js';

export const NovelController = {
  // 1. Landing Page
  getHome: async (req: Request, res: Response) => {
    try {
      const rawNovels = NovelModel.findPublic().sort({ readerCount: -1 }).limit(3).exec();
      const novels = rawNovels.map((n: any) => ({
        ...n,
        coverImage: getLocalNovelCover(n)
      }));
      const rawAuthors = AuthorModel.findPublic().sort({ novelCount: -1 }).limit(4).exec();
      const authors = rawAuthors.map((a: any) => ({
        ...a,
        photo: getLocalAuthorPhoto(a),
        externalLink: getWikipediaLink(a)
      }));
      
      const hostUrl = req.protocol + '://' + req.get('host');
      const shareQRCode = await generateQRCode(hostUrl);

      const categories = [...CATEGORIES];

      res.render('home', {
        title: 'Home',
        featuredNovels: novels,
        featuredAuthors: authors,
        featuredArticles,
        categories,
        shareQRCode
      });
    } catch (error) {
      console.error('Home page error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Internal Server Error' });
    }
  },

  // 2. Discover / Novels Directory (with search, pagination, filter)
  getNovels: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = 6;
      const skip = (page - 1) * limit;

      const search = (req.query.search as string) || '';
      const genre = (req.query.genre as string) || '';
      const authorId = (req.query.authorId as string) || '';
      const sort = (req.query.sort as string) || 'latest';

      const query: any = { approvalStatus: 'approved' };
      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }
      if (genre) {
        query.genre = genre;
      }
      if (authorId) {
        query.authorId = authorId;
      }

      // Build chain
      let queryChain = NovelModel.find(query);

      // Sort logic
      if (sort === 'rating') {
        queryChain = queryChain.sort({ rating: -1 });
      } else if (sort === 'popular') {
        queryChain = queryChain.sort({ readerCount: -1 });
      } else {
        queryChain = queryChain.sort({ createdAt: -1 });
      }

      // Pagination
      const totalNovels = NovelModel.countDocuments(query);
      const rawNovels = queryChain.skip(skip).limit(limit).exec();
      const novels = rawNovels.map((n: any) => ({
        ...n,
        coverImage: getLocalNovelCover(n)
      }));
      const totalPages = Math.ceil(totalNovels / limit);

      const authors = AuthorModel.findPublic().exec();
      const categories = [...CATEGORIES];

      res.render('novels', {
        title: 'Discover Novels',
        novels,
        authors,
        categories,
        filters: { search, genre, authorId, sort },
        currentPage: page,
        totalPages,
        pagination: {
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Discover novels error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load novels directory.' });
    }
  },

  // 3. Novel Details Page
  getNovelDetails: async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const rawNovel = NovelModel.findById(id);
      if (!rawNovel || (rawNovel.approvalStatus !== 'approved' && !UserModel.isAdmin(res.locals.user))) {
        return res.status(404).render('error', { statusCode: 404, message: 'Novel not found.' });
      }
      const novel = {
        ...rawNovel,
        coverImage: getLocalNovelCover(rawNovel)
      };

      let author = AuthorModel.findById(novel.authorId);
      if (author) {
        author = {
          ...author,
          photo: getLocalAuthorPhoto(author),
          externalLink: getWikipediaLink(author)
        };
      }
      const comments = CommentModel.find({ novelId: id }).sort({ createdAt: -1 }).exec();
      const rawRelatedNovels = NovelModel.findPublic({ genre: novel.genre })
        .sort({ readerCount: -1 }).limit(6).exec()
        .filter((n: any) => n._id !== id);
      const relatedNovels = rawRelatedNovels.map((n: any) => ({
        ...n,
        coverImage: getLocalNovelCover(n)
      }));

      const rawAuthorNovels = NovelModel.findPublic({ authorId: novel.authorId })
        .sort({ createdAt: -1 }).limit(6).exec()
        .filter((n: any) => n._id !== id);
      const authorNovels = rawAuthorNovels.map((n: any) => ({
        ...n,
        coverImage: getLocalNovelCover(n)
      }));

      // Generate Reading QR Code
      const hostUrl = req.protocol + '://' + req.get('host');
      const readUrl = `${hostUrl}/novels/${id}/read`;
      const qrCode = await generateQRCode(readUrl);

      // Increment reader count slightly on page view (simulated traffic)
      NovelModel.findByIdAndUpdate(id, { readerCount: novel.readerCount + 1 });

      res.render('novel-details', {
        title: novel.title,
        novel,
        author,
        comments,
        qrCode,
        relatedNovels,
        authorNovels
      });
    } catch (error) {
      console.error('Novel details error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load novel details.' });
    }
  },

  // 4. Read Novel Page
  getReadNovel: async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = res.locals.user;

    try {
      const novel = NovelModel.findById(id);
      if (!novel) {
        return res.status(404).render('error', { statusCode: 404, message: 'Novel not found.' });
      }

      // Page pagination
      let pageIndex = parseInt(req.query.page as string) || 0;
      if (pageIndex < 0) pageIndex = 0;
      if (pageIndex >= novel.contentPages.length) pageIndex = novel.contentPages.length - 1;

      // Update User Reading History & Continue Reading tracker if logged in
      if (user) {
        const updatedHistory = [...(user.readingHistory || [])];
        const existingHistoryIndex = updatedHistory.findIndex((h: any) => String(h.novelId) === String(id));
        
        const historyItem = {
          novelId: id,
          pageIndex,
          lastReadAt: new Date().toISOString()
        };

        if (existingHistoryIndex > -1) {
          updatedHistory[existingHistoryIndex] = historyItem;
        } else {
          updatedHistory.push(historyItem);
        }

        // Update UserModel
        UserModel.findByIdAndUpdate(user._id, { readingHistory: updatedHistory });
      }

      // Calculate progress percentage
      const totalPages = novel.contentPages.length;
      const progressPercent = Math.round(((pageIndex + 1) / totalPages) * 100);

      // Check if bookmarked if logged in
      const isBookmarked = user ? (user.bookmarks || []).some((b: any) => String(b.novelId) === String(id) && b.pageIndex === pageIndex) : false;
      const currentPageText = novel.contentPages[pageIndex] || '';
      const readingTime = estimateReadingTime(currentPageText);
      const readerSummary = buildReaderSummary(currentPageText);

      res.render('read-novel', {
        title: `Reading - ${novel.title}`,
        novel,
        currentPageContent: currentPageText,
        pageIndex,
        totalPages,
        progressPercent,
        isBookmarked,
        readingTime,
        readerSummary
      });
    } catch (error) {
      console.error('Read novel error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not open reading platform.' });
    }
  },

  // 5. Bookmark Page
  postBookmark: (req: Request, res: Response) => {
    const { id } = req.params;
    const pageIndex = parseInt(req.body.pageIndex) || 0;
    const user = res.locals.user;
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    try {
      const updatedBookmarks = [...user.bookmarks];
      const existingIdx = updatedBookmarks.findIndex((b: any) => String(b.novelId) === String(id));

      if (existingIdx > -1) {
        // If bookmark for this novel already exists, update the page index or remove if same page
        if (updatedBookmarks[existingIdx].pageIndex === pageIndex) {
          updatedBookmarks.splice(existingIdx, 1);
          UserModel.findByIdAndUpdate(user._id, { bookmarks: updatedBookmarks });
          req.flash('success', 'Bookmark removed.');
          return res.redirect(`/novels/${id}/read?page=${pageIndex}`);
        } else {
          updatedBookmarks[existingIdx].pageIndex = pageIndex;
          updatedBookmarks[existingIdx].bookmarkedAt = new Date().toISOString();
        }
      } else {
        updatedBookmarks.push({
          novelId: id,
          pageIndex,
          bookmarkedAt: new Date().toISOString()
        });
      }

      UserModel.findByIdAndUpdate(user._id, { bookmarks: updatedBookmarks });
      req.flash('success', 'Page bookmarked successfully.');
      res.redirect(`/novels/${id}/read?page=${pageIndex}`);
    } catch (error) {
      console.error('Bookmark error:', error);
      req.flash('error', 'Could not save bookmark.');
      res.redirect(`/novels/${id}/read?page=${pageIndex}`);
    }
  },

  // 6. Toggle Favorites
  postFavorite: (req: Request, res: Response) => {
    const { id } = req.params;
    const user = res.locals.user;
    if (!user) {
      req.flash('error', 'You must be logged in to save favorites.');
      return res.redirect('/auth/login');
    }

    try {
      const favorites = [...user.favorites];
      const idx = favorites.indexOf(id);
      let isFavorite = false;

      if (idx > -1) {
        favorites.splice(idx, 1);
        req.flash('success', 'Removed from favorites.');
      } else {
        favorites.push(id);
        isFavorite = true;
        req.flash('success', 'Added to favorites!');
      }

      UserModel.findByIdAndUpdate(user._id, { favorites });
      res.redirect(`/novels/${id}`);
    } catch (error) {
      console.error('Favorite error:', error);
      req.flash('error', 'Could not update favorites.');
      res.redirect(`/novels/${id}`);
    }
  },

  // 7. Add Comment / Review
  postComment: (req: Request, res: Response) => {
    const { id } = req.params;
    const { content, rating, guestName } = req.body;
    const user = res.locals.user;

    if (!content) {
      req.flash('error', 'Comment content cannot be empty.');
      return res.redirect(`/novels/${id}`);
    }

    try {
      const starRating = rating ? parseInt(rating) : undefined;
      const userId = user ? user._id : 'guest';
      const username = user ? user.username : sanitizeText(guestName || 'Anonymous Guest', 50);
      const userAvatar = user ? (user.avatar || '/uploads/default-avatar.png') : '/uploads/default-avatar.png';

      CommentModel.create({
        novelId: id,
        userId,
        username,
        userAvatar,
        content: sanitizeText(content, 2000),
        rating: starRating
      });

      // Recalculate average rating of the novel
      const novel = NovelModel.findById(id);
      if (novel && starRating) {
        const totalRatings = novel.ratingCount + 1;
        const newRating = parseFloat(((novel.rating * novel.ratingCount + starRating) / totalRatings).toFixed(1));
        NovelModel.findByIdAndUpdate(id, {
          rating: newRating,
          ratingCount: totalRatings
        });
      }

      req.flash('success', 'Review submitted successfully.');
      res.redirect(`/novels/${id}`);
    } catch (error) {
      console.error('Comment error:', error);
      req.flash('error', 'Could not submit critique.');
      res.redirect(`/novels/${id}`);
    }
  },

  postCommentReply: (req: Request, res: Response) => {
    const { id, commentId } = req.params;
    const { content, guestName } = req.body;
    const user = res.locals.user;

    if (!content) {
      req.flash('error', 'Reply content cannot be empty.');
      return res.redirect(`/novels/${id}`);
    }

    try {
      const parentComment = CommentModel.findById(commentId);
      if (!parentComment) {
        req.flash('error', 'Original comment not found.');
        return res.redirect(`/novels/${id}`);
      }

      const userId = user ? user._id : 'guest';
      const username = user ? user.username : sanitizeText(guestName || 'Anonymous Guest', 50);
      const userAvatar = user ? (user.avatar || '/uploads/default-avatar.png') : '/uploads/default-avatar.png';

      const reply = {
        _id: Math.random().toString(36).substring(2, 15),
        userId,
        username,
        userAvatar,
        content: sanitizeText(content, 2000),
        replies: [],
        createdAt: new Date().toISOString()
      };

      const replies = [...(parentComment.replies || []), reply];
      CommentModel.findByIdAndUpdate(commentId, { replies });

      req.flash('success', 'Reply posted.');
      res.redirect(`/novels/${id}`);
    } catch (error) {
      console.error('Comment reply error:', error);
      req.flash('error', 'Could not post reply.');
      res.redirect(`/novels/${id}`);
    }
  },


  // 9. Report Comment
  postReportComment: (req: Request, res: Response) => {
    const { id, commentId } = req.params;
    try {
      CommentModel.findByIdAndUpdate(commentId, { isReported: true });
      req.flash('success', 'Thank you. Comment has been reported for review.');
      res.redirect(`/novels/${id}`);
    } catch (error) {
      console.error('Report comment error:', error);
      req.flash('error', 'Could not report comment.');
      res.redirect(`/novels/${id}`);
    }
  },

  // 10. Authors List
  getAuthors: (req: Request, res: Response) => {
    try {
      const user = res.locals.user;
      const catalogAuthors = AuthorModel.findPublic().exec().map((a: any) => {
        const likesInfo = calculateTikTokStyleLikes(a._id, a.name);
        const followers = a.followers || [];
        const isFollowing = user ? followers.includes(user._id) : false;
        return {
          ...a,
          photo: getLocalAuthorPhoto(a),
          externalLink: getWikipediaLink(a),
          tiktokLikes: likesInfo.formattedLikes,
          followerCount: followers.length,
          formattedFollowers: formatTikTokMetric(followers.length),
          isFollowing
        };
      });

      // Registered user accounts who write poems/novels
      const registeredUsers = UserModel.find().exec()
        .filter((u: any) => !user || String(u._id) !== String(user._id))
        .map((u: any) => {
          const likesInfo = calculateTikTokStyleLikes(u._id, u.username);
          const followers = u.followers || [];
          const isFollowing = user ? followers.includes(u._id) : false;
          return {
            _id: u._id,
            name: u.username,
            photo: u.avatar || '/uploads/default-avatar.png',
            nationality: u.country || 'Kenyan',
            literaryAchievements: 'Community Creator & Reader',
            famousNovels: u.bio || 'Poems & Stories',
            tiktokLikes: likesInfo.formattedLikes,
            followerCount: followers.length,
            formattedFollowers: formatTikTokMetric(followers.length),
            isFollowing,
            isUserAccount: true
          };
        });

      const authors = [...catalogAuthors, ...registeredUsers];
      res.render('authors', { title: 'Meet Our Authors & Creators', authors });
    } catch (error) {
      console.error('Load authors error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load authors.' });
    }
  },

  // 11. Author Profile Page
  getAuthorProfile: (req: Request, res: Response) => {
    const { id } = req.params;
    const user = res.locals.user;
    try {
      let author = AuthorModel.findById(id);
      let isUserCreator = false;

      if (author) {
        (author as any).photo = getLocalAuthorPhoto(author);
        (author as any).externalLink = getWikipediaLink(author);
      } else {
        const targetUser = UserModel.findById(id);
        if (targetUser) {
          isUserCreator = true;
          author = {
            _id: targetUser._id,
            name: targetUser.username,
            photo: targetUser.avatar || '/uploads/default-avatar.png',
            bio: targetUser.bio || 'Poet & Storyteller on Readers.africa',
            nationality: targetUser.country || 'Kenyan',
            literaryAchievements: 'Published author & contributor.',
            famousNovels: 'Original Works & Verses',
            approvalStatus: 'approved',
            followers: targetUser.followers || [],
            createdAt: targetUser.createdAt
          } as any;
        }
      }

      if (!author) {
        return res.status(404).render('error', { statusCode: 404, message: 'Creator profile not found.' });
      }

      // Books collection written by this author/user
      const rawNovels = NovelModel.findPublic().exec().filter((n: any) =>
        String(n.authorId) === String(id) ||
        String(n.submittedBy) === String(id) ||
        n.authorName?.toLowerCase() === author.name.toLowerCase()
      );
      const novels = rawNovels.map((n: any) => ({
        ...n,
        coverImage: getLocalNovelCover(n)
      }));

      // Poems collection written/submitted by this author/user
      const rawPoems = PoemModel.findPublic().exec().filter((p: any) =>
        String(p.authorId) === String(id) ||
        String(p.submittedBy) === String(id) ||
        p.authorName?.toLowerCase() === author.name.toLowerCase()
      );

      // TikTok-style metrics
      const likesInfo = calculateTikTokStyleLikes(id, author.name);
      const followers = author.followers || [];
      const isFollowing = user ? followers.includes(user._id) : false;

      res.render('author-profile', {
        title: author.name,
        author,
        novels,
        poems: rawPoems,
        tiktokLikes: likesInfo.formattedLikes,
        followerCount: followers.length,
        formattedFollowers: formatTikTokMetric(followers.length),
        isFollowing
      });
    } catch (error) {
      console.error('Author profile error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load creator profile.' });
    }
  },

  // 11b. Toggle Follow Author
  postFollowAuthor: (req: Request, res: Response) => {
    const { id } = req.params;
    const user = res.locals.user;

    if (!user) {
      req.flash('error', 'Please log in to follow creators.');
      return res.redirect('/auth/login');
    }

    try {
      const author = AuthorModel.findById(id);
      const targetUser = UserModel.findById(id);

      if (!author && !targetUser) {
        req.flash('error', 'Creator profile not found.');
        return res.redirect('/authors');
      }

      if (targetUser) {
        const followers = [...(targetUser.followers || [])];
        const userFollowing = [...(user.following || [])];
        const idx = followers.indexOf(user._id);
        let isFollowing = false;

        if (idx > -1) {
          followers.splice(idx, 1);
          const fIdx = userFollowing.indexOf(id);
          if (fIdx > -1) userFollowing.splice(fIdx, 1);
          isFollowing = false;
          req.flash('success', `Unfollowed ${targetUser.username}`);
        } else {
          followers.push(user._id);
          if (!userFollowing.includes(id)) userFollowing.push(id);
          isFollowing = true;
          req.flash('success', `Now following ${targetUser.username}!`);
          try {
            NotificationModel.notify(targetUser._id, 'follow', 'New Follower', `${user.username} started following you!`, `/authors/${targetUser._id}`);
          } catch (err) {}
        }

        UserModel.findByIdAndUpdate(id, { followers });
        UserModel.findByIdAndUpdate(user._id, { following: userFollowing });

        if (req.headers.accept?.includes('json')) {
          return res.json({
            success: true,
            isFollowing,
            followerCount: followers.length,
            formattedFollowers: formatTikTokMetric(followers.length)
          });
        }
        return res.redirect(req.get('Referer') || `/authors/${id}`);
      }

      if (author) {
        const followers = [...(author.followers || [])];
        const userFollowing = [...(user.following || [])];
        const idx = followers.indexOf(user._id);
        let isFollowing = false;

        if (idx > -1) {
          followers.splice(idx, 1);
          const fIdx = userFollowing.indexOf(id);
          if (fIdx > -1) userFollowing.splice(fIdx, 1);
          isFollowing = false;
          req.flash('success', `Unfollowed ${author.name}`);
        } else {
          followers.push(user._id);
          if (!userFollowing.includes(id)) userFollowing.push(id);
          isFollowing = true;
          req.flash('success', `Now following ${author.name}!`);
        }

        AuthorModel.findByIdAndUpdate(id, { followers });
        UserModel.findByIdAndUpdate(user._id, { following: userFollowing });

        if (req.headers.accept?.includes('json')) {
          return res.json({
            success: true,
            isFollowing,
            followerCount: followers.length,
            formattedFollowers: formatTikTokMetric(followers.length)
          });
        }
        return res.redirect(req.get('Referer') || `/authors/${id}`);
      }
    } catch (error) {
      console.error('Follow author error:', error);
      req.flash('error', 'Could not update follow status.');
      res.redirect(req.get('Referer') || `/authors/${id}`);
    }
  },

  // 12. Categories Page
  getCategories: (req: Request, res: Response) => {
    const category = (req.query.category as string) || '';
    const categories = [...CATEGORIES];

    let categoryNovels: any[] = [];
    if (category) {
      const exact = NovelModel.findPublic({ genre: category }).sort({ readerCount: -1 }).limit(12).exec();
      const similar = NovelModel.findPublic().sort({ readerCount: -1 }).limit(50).exec()
        .filter((n: any) => n.genre !== category && (
          n.tags?.includes(category) ||
          n.genre?.toLowerCase().includes(category.toLowerCase().split(' ')[0])
        )).slice(0, 12);
      const recent = NovelModel.findPublic().sort({ createdAt: -1 }).limit(12).exec();
      const seen = new Set<string>();
      categoryNovels = [...exact, ...similar, ...recent].filter(n => {
        if (seen.has(n._id)) return false;
        seen.add(n._id);
        return true;
      }).slice(0, 24);
    }

    res.render('categories', { 
      title: category || 'Explore Genres', 
      categories, 
      category, 
      categoryNovels,
      categoryDetailsMap: CATEGORY_DETAILS
    });
  },

  // 13. GET Public Submit Novel Form
  getSubmitNovel: (req: Request, res: Response) => {
    try {
      const authors = AuthorModel.find().exec();
      const categories = [
        'Romance', 'Mystery', 'Fantasy', 'Historical Fiction', 
        'African Literature', 'Science Fiction', 'Horror', 
        'Thriller', 'Adventure', 'Classics', 'Poetry', 'Drama'
      ];
      const uploadAccessPaid = hasCompletedAccessPayment(res.locals.user, 'upload');
      res.render('submit-novel', { title: 'Submit a New Novel', authors, categories, uploadAccessPaid });
    } catch (error) {
      console.error('Submit novel form load error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not open submission form.' });
    }
  },

  // 14. POST Public Submit Novel Form
  postSubmitNovel: async (req: Request, res: Response) => {
    const user = res.locals.user;
    const { title, authorType, authorId, newAuthorName, newAuthorNationality, newAuthorBio, genre, publicationYear, description, synopsis, contentText } = req.body;

    if (!title || !genre || !publicationYear || !description || !synopsis || !contentText) {
      req.flash('error', 'All core fields are required.');
      return res.redirect('/novels/submit');
    }

    try {
      let finalAuthorId = authorId;
      let finalAuthorName = '';

      if (authorType === 'new') {
        if (!newAuthorName) {
          req.flash('error', 'Author name is required for new profiles.');
          return res.redirect('/novels/submit');
        }
        // Create a new Author profile
        const newAuthor = AuthorModel.create({
          name: sanitizeText(newAuthorName, 100),
          bio: sanitizeText(newAuthorBio || 'Independent Author', 1000),
          nationality: sanitizeText(newAuthorNationality || 'Kenyan', 100),
          photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80',
          literaryAchievements: 'Contributor to the Readers.africa platform.',
          famousNovels: title,
          novelCount: 1,
          approvalStatus: 'approved'
        });
        finalAuthorId = newAuthor._id;
        finalAuthorName = newAuthor.name;
      } else {
        if (!authorId) {
          req.flash('error', 'Please select an existing author profile.');
          return res.redirect('/novels/submit');
        }
        const author = AuthorModel.findById(authorId);
        if (!author) {
          req.flash('error', 'Selected author profile does not exist.');
          return res.redirect('/novels/submit');
        }
        finalAuthorName = author.name;
        AuthorModel.findByIdAndUpdate(authorId, { novelCount: (author.novelCount || 0) + 1 });
      }

      const coverImage = req.file ? `/uploads/${req.file.filename}` : 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600&auto=format&fit=crop&q=80';

      const contentPages = contentText.split('\n\n---PAGE---\n\n').filter((p: string) => p.trim().length > 0);
      if (contentPages.length === 0) {
        contentPages.push(contentText);
      }

      const novel = NovelModel.create({
        title: sanitizeText(title, 200),
        authorId: finalAuthorId,
        authorName: finalAuthorName,
        genre,
        publicationYear: parseInt(publicationYear),
        description: sanitizeText(description, 500),
        synopsis: sanitizeText(synopsis, 2000),
        coverImage,
        rating: 5.0,
        ratingCount: 0,
        readerCount: 0,
        contentPages,
        approvalStatus: 'approved',
        submittedBy: user._id
      });

      req.flash('success', 'Your novel has been published successfully! Welcome to the digital stacks.');
      res.redirect(`/novels/${novel._id}`);
    } catch (error) {
      console.error('Submit novel error:', error);
      req.flash('error', 'Could not publish novel. Please verify parameters.');
      res.redirect('/novels/submit');
    }
  }
};
