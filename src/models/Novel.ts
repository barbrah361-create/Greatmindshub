import { NovelDB } from '../config/db.js';
import type { ApprovalStatus } from '../types/common.js';

export interface Novel {
  _id: string;
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  genre: string;
  tags?: string[];
  description: string;
  coverImage: string;
  publicationYear: number;
  synopsis: string;
  language?: string;
  publisher?: string;
  readingTimeMinutes?: number;
  rating: number;
  ratingCount: number;
  readerCount: number;
  likes?: string[];
  contentPages: string[];
  qrCode?: string;
  approvalStatus: ApprovalStatus;
  submittedBy?: string;
  rejectionReason?: string;
  createdAt: string;
}

export const NovelModel = {
  find: (query?: any) => NovelDB.find(query),
  findOne: (query?: any) => NovelDB.findOne(query),
  findById: (id: string) => NovelDB.findById(id),
  create: (data: Partial<Novel>) => NovelDB.create({
    approvalStatus: 'approved',
    tags: [],
    likes: [],
    language: 'English',
    ...data
  }),
  findByIdAndUpdate: (id: string, update: Partial<Novel>) => NovelDB.findByIdAndUpdate(id, update),
  findByIdAndDelete: (id: string) => NovelDB.findByIdAndDelete(id),
  countDocuments: (query?: any) => NovelDB.countDocuments(query),

  findPublic: (query: any = {}) =>
    NovelDB.find({ ...query, approvalStatus: 'approved' }),

  estimateReadingTime: (contentPages: string[]): number => {
    const words = contentPages.join(' ').split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }
};
