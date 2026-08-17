import { UserDB } from '../config/db.js';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import type { UserRole, UserStatus } from '../types/common.js';

export interface Bookmark {
  novelId: string;
  pageIndex: number;
  bookmarkedAt: string;
}

export interface ReadingHistoryItem {
  novelId: string;
  pageIndex: number;
  lastReadAt: string;
}

export interface User {
  _id: string;
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole | 'user' | 'admin';
  status: UserStatus;
  avatar?: string;
  coverPhoto?: string;
  bio?: string;
  location?: string;
  nationality?: string;
  occupation?: string;
  writingStyle?: string;
  genres?: string[];
  website?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  verified: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: string;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  rememberMeToken?: string;
  googleId?: string;
  following: string[];
  followers: string[];
  favorites: string[];
  bookmarks: Bookmark[];
  readingHistory: ReadingHistoryItem[];
  reposts: { poemId: string; repostedAt: string }[];
  awards?: string[];
  achievements?: string[];
  currentStreak?: number;
  longestStreak?: number;
  lastActiveDate?: string;
  createdAt: string;
}

function normalizeRole(role: string): UserRole {
  if (role === 'admin') return 'admin';
  if (role === 'user') return 'reader';
  return role as UserRole;
}

export const UserModel = {
  find: (query?: any) => UserDB.find(query),
  findOne: (query?: any) => UserDB.findOne(query),
  findById: (id: string) => UserDB.findById(id),

  create: async (data: {
    username: string;
    email: string;
    password?: string;
    passwordHash?: string;
    role?: UserRole | 'user';
    googleId?: string;
    emailVerified?: boolean;
  }) => {
    let passwordHash = data.passwordHash;
    if (data.password) {
      passwordHash = await bcryptjs.hash(data.password, 10);
    }
    const verificationToken = crypto.randomBytes(32).toString('hex');

    return UserDB.create({
      username: data.username,
      email: data.email,
      passwordHash,
      role: normalizeRole(data.role || 'reader'),
      status: 'active',
      avatar: '/uploads/default-avatar.png',
      coverPhoto: '',
      bio: '',
      location: '',
      nationality: '',
      occupation: '',
      writingStyle: '',
      genres: [],
      website: '',
      twitter: '',
      instagram: '',
      linkedin: '',
      facebook: '',
      verified: false,
      emailVerified: data.emailVerified ?? true,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      googleId: data.googleId || '',
      following: [],
      followers: [],
      favorites: [],
      bookmarks: [],
      readingHistory: [],
      reposts: [],
      awards: [],
      achievements: [],
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: ''
    });
  },

  findByIdAndUpdate: (id: string, update: any) => UserDB.findByIdAndUpdate(id, update),
  findByIdAndDelete: (id: string) => UserDB.findByIdAndDelete(id),

  comparePassword: async (password: string, hash: string): Promise<boolean> =>
    bcryptjs.compare(password, hash),

  hashPassword: async (password: string): Promise<string> =>
    bcryptjs.hash(password, 10),

  generateToken: () => crypto.randomBytes(32).toString('hex'),

  isAdmin: (user: User | null): boolean =>
    !!user && (user.role === 'admin' || (user.role as string) === 'admin'),

  isModerator: (user: User | null): boolean =>
    !!user && ['admin', 'moderator'].includes(user.role as string),

  canAccessProtected: (user: User | null): boolean =>
    !!user && user.status === 'active' && user.emailVerified
};
