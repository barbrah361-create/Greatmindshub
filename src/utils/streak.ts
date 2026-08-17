import { UserModel } from '../models/User.js';
import { PoemModel } from '../models/Poem.js';
import { NovelModel } from '../models/Novel.js';

/**
 * Checks and updates the author's daily writing activity streak.
 * If the user's last activity was yesterday, the current streak increments.
 * If active today, the streak remains the same (no duplicates).
 * If last active was before yesterday, the streak resets to 1.
 */
export function updateAuthorStreak(userId: string): void {
  const user = UserModel.findById(userId);
  if (!user) return;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // We split at T to get just the YYYY-MM-DD date representation
  const lastActiveStr = user.lastActiveDate ? user.lastActiveDate.split('T')[0] : '';

  if (lastActiveStr === todayStr) {
    // Already registered activity today, do not increment or reset
    return;
  }

  let newStreak = 1;

  if (lastActiveStr) {
    const lastActive = new Date(user.lastActiveDate!);
    // Reset hours to midnight for date-based comparisons
    const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d2 = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
    
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day! Increment streak
      newStreak = (user.currentStreak || 0) + 1;
    }
  }

  const longestStreak = Math.max(newStreak, user.longestStreak || 0);

  UserModel.findByIdAndUpdate(userId, {
    currentStreak: newStreak,
    longestStreak,
    lastActiveDate: new Date().toISOString()
  });

  // Award achievements based on new state
  checkAndAwardAchievements(userId);
}

/**
 * Scans the author's publications and streaks to grant relevant platform achievements.
 */
export function checkAndAwardAchievements(userId: string): void {
  const user = UserModel.findById(userId);
  if (!user) return;

  const achievements = new Set<string>(user.achievements || []);

  const currentStreak = user.currentStreak || 0;
  const longestStreak = user.longestStreak || 0;

  // Streak milestones
  if (currentStreak >= 3) achievements.add('🔥 3-day streak');
  if (currentStreak >= 7) achievements.add('🔥 7-day streak');
  if (currentStreak >= 30) achievements.add('🔥 30-day streak');

  // Find all approved works by this author
  const poems = PoemModel.find({ submittedBy: userId, approvalStatus: 'approved' }).exec();
  const novels = NovelModel.find({ submittedBy: userId, approvalStatus: 'approved' }).exec();

  const totalWorks = poems.length + novels.length;

  if (poems.length >= 1) achievements.add('✍️ First Published Poem');
  if (novels.length >= 1) achievements.add('📚 First Published Novel');
  if (totalWorks >= 10) achievements.add('🌟 10 Published Works');
  if (longestStreak >= 15) achievements.add('🏆 Consistent Author');

  UserModel.findByIdAndUpdate(userId, {
    achievements: Array.from(achievements)
  });
}
