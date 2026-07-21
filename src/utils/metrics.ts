import { NovelModel } from '../models/Novel.js';
import { PoemModel } from '../models/Poem.js';

export function formatTikTokMetric(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return String(num);
}

export function calculateTikTokStyleLikes(userIdOrAuthorId: string, usernameOrAuthorName?: string): { totalLikes: number; formattedLikes: string } {
  let totalLikes = 0;

  try {
    const allNovels = NovelModel.find().exec();
    const allPoems = PoemModel.find().exec();

    // 1. Sum exact poem likes received
    const authorPoems = allPoems.filter(p =>
      String(p.authorId) === String(userIdOrAuthorId) ||
      String(p.submittedBy) === String(userIdOrAuthorId) ||
      (usernameOrAuthorName && p.authorName?.toLowerCase() === usernameOrAuthorName.toLowerCase())
    );

    authorPoems.forEach(p => {
      totalLikes += (p.likes ? p.likes.length : 0);
      totalLikes += (p.reactions ? p.reactions.length : 0);
    });

    // 2. Sum exact novel likes received
    const authorNovels = allNovels.filter(n =>
      String(n.authorId) === String(userIdOrAuthorId) ||
      (usernameOrAuthorName && n.authorName?.toLowerCase() === usernameOrAuthorName.toLowerCase())
    );

    authorNovels.forEach(n => {
      totalLikes += (n.likes ? n.likes.length : 0);
      totalLikes += (n.ratingCount || 0);
    });

  } catch (err) {
    totalLikes = 0;
  }

  return {
    totalLikes,
    formattedLikes: formatTikTokMetric(totalLikes)
  };
}
