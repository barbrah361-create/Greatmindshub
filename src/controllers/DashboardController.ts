import { Request, Response } from 'express';
import { NovelModel } from '../models/Novel.js';
import { UserModel } from '../models/User.js';
import { getLocalNovelCover } from '../utils/novelPhoto.js';
import { buildRecommendationSet, calculateReadingStreak, summarizeText } from '../utils/ecosystem.js';
import { calculateProfileCompletion } from '../utils/profile.js';
import { PoemModel } from '../models/Poem.js';
import { SignatureModel } from '../models/Signature.js';

export const DashboardController = {
  // User Dashboard
  getDashboard: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) {
      req.flash('error', 'You must be logged in to view your dashboard.');
      return res.redirect('/auth/login');
    }

    try {
      // 1. Compile Reading History with novel data
      const historyItems = (user.readingHistory || []).map((h: any) => {
        const rawNovel = NovelModel.findById(h.novelId);
        if (rawNovel) {
          const novel = {
            ...rawNovel,
            coverImage: getLocalNovelCover(rawNovel)
          };
          const progressPercent = Math.round(((h.pageIndex + 1) / novel.contentPages.length) * 100);
          return {
            ...h,
            novel,
            progressPercent
          };
        }
        return null;
      }).filter(Boolean);

      // Sort reading history by lastReadAt descending
      historyItems.sort((a: any, b: any) => {
        return new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime();
      });

      // 2. Compile Favorites with novel data
      const favoriteNovels = (user.favorites || []).map((favId: string) => {
        const rawNovel = NovelModel.findById(favId);
        if (rawNovel) {
          return {
            ...rawNovel,
            coverImage: getLocalNovelCover(rawNovel)
          };
        }
        return null;
      }).filter(Boolean);

      // 3. Compile Bookmarks with novel data
      const bookmarkItems = (user.bookmarks || []).map((b: any) => {
        const rawNovel = NovelModel.findById(b.novelId);
        if (rawNovel) {
          const novel = {
            ...rawNovel,
            coverImage: getLocalNovelCover(rawNovel)
          };
          return {
            ...b,
            novel
          };
        }
        return null;
      }).filter(Boolean);

      const allNovels = NovelModel.find().exec();
      const readNovelIds = new Set((user.readingHistory || []).map((h: any) => String(h.novelId)));
      const recommendedNovels = buildRecommendationSet(
        allNovels
          .filter((novel: any) => !readNovelIds.has(String(novel._id)))
          .map((n: any) => ({ title: n.title, genre: n.genre || 'General' }))
          .slice(0, 8),
        user.genres || ['African Literature', 'Fantasy', 'Romance']
      ).map((item: any) => {
        const novel = allNovels.find((candidate: any) => candidate.title === item.title);
        return novel ? { ...novel, coverImage: getLocalNovelCover(novel), summary: summarizeText(novel.synopsis || novel.description || '') } : item;
      });

      const streak = calculateReadingStreak(user.readingHistory || []);
      const profileCompletion = calculateProfileCompletion({
        avatar: user.avatar,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        country: user.nationality,
        languages: user.writingStyle,
        website: user.website,
        favoriteGenres: user.genres || [],
        favoriteAuthors: user.awards || [],
        twitter: user.twitter,
        instagram: user.instagram,
        linkedin: user.linkedin,
        facebook: user.facebook
      });
      const persistentAchievements = user.achievements || [];
      const calculatedAchievements = [
        streak >= 3 ? 'Consistency Champion' : 'New Reader',
        (user.bookmarks || []).length > 0 ? 'Bookmark Curator' : 'Explorer',
        (user.followers || []).length > 0 ? 'Community Voice' : 'Rising Star'
      ];
      const achievementsList = Array.from(new Set([...calculatedAchievements, ...persistentAchievements]));

      const userPoems = PoemModel.find({ submittedBy: user._id }).sort({ createdAt: -1 }).exec();
      const userNovels = NovelModel.find({ submittedBy: user._id }).sort({ createdAt: -1 }).exec();
      const hasSignature = !!SignatureModel.findOne({ authorId: user._id });

      res.render('dashboard', {
        title: 'Reader Dashboard',
        historyItems,
        favoriteNovels,
        bookmarkItems,
        recommendedNovels,
        streak,
        achievements: achievementsList,
        profileCompletion,
        premiumStatus: user.role === 'admin' ? 'Editorial Access' : 'Member',
        userPoems,
        userNovels,
        authorStreak: user.currentStreak || 0,
        longestAuthorStreak: user.longestStreak || 0,
        hasSignature
      });
    } catch (error) {
      console.error('Dashboard load error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load your dashboard.' });
    }
  },

  // Reading History Page (Full)
  getHistory: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    try {
      const historyItems = (user.readingHistory || []).map((h: any) => {
        const rawNovel = NovelModel.findById(h.novelId);
        if (rawNovel) {
          const novel = {
            ...rawNovel,
            coverImage: getLocalNovelCover(rawNovel)
          };
          const progressPercent = Math.round(((h.pageIndex + 1) / novel.contentPages.length) * 100);
          return {
            ...h,
            novel,
            progressPercent
          };
        }
        return null;
      }).filter(Boolean);

      historyItems.sort((a: any, b: any) => new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime());

      res.render('reading-history', {
        title: 'My Reading History',
        historyItems
      });
    } catch (error) {
      console.error('History load error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load history.' });
    }
  },

  // Favorites Page (Full)
  getFavorites: (req: Request, res: Response) => {
    const user = res.locals.user;
    if (!user) return res.redirect('/auth/login');

    try {
      const favoriteNovels = (user.favorites || []).map((favId: string) => {
        const rawNovel = NovelModel.findById(favId);
        if (rawNovel) {
          return {
            ...rawNovel,
            coverImage: getLocalNovelCover(rawNovel)
          };
        }
        return null;
      }).filter(Boolean);

      res.render('favorites', {
        title: 'My Favorite Books',
        favoriteNovels
      });
    } catch (error) {
      console.error('Favorites load error:', error);
      res.status(500).render('error', { statusCode: 500, message: 'Could not load favorites.' });
    }
  }
};
