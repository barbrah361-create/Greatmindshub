import { DBModel } from '../config/db.js';
import type { ApprovalStatus } from '../types/common.js';

export interface PoemReaction {
  userId: string;
  type: 'like' | 'love' | 'celebrate';
  createdAt: string;
}

export interface PoemComment {
  _id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string;
  replies: PoemComment[];
  createdAt: string;
}

export interface Poem {
  _id: string;
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  tags?: string[];
  genre?: string;
  likes: string[];
  reactions: PoemReaction[];
  comments: PoemComment[];
  bookmarks: string[];
  viewCount: number;
  approvalStatus: ApprovalStatus;
  submittedBy: string;
  paymentId?: string;
  rejectionReason?: string;
  createdAt: string;
}

export const PoemDB = new DBModel<Poem>('poems');

export const PoemModel = {
  find: (query?: any) => PoemDB.find(query),
  findOne: (query?: any) => PoemDB.findOne(query),
  findById: (id: string) => PoemDB.findById(id),
  create: (data: Partial<Poem>) => PoemDB.create({
    likes: [],
    reactions: [],
    comments: [],
    bookmarks: [],
    viewCount: 0,
    approvalStatus: 'pending',
    tags: [],
    ...data
  }),
  findByIdAndUpdate: (id: string, update: Partial<Poem>) => PoemDB.findByIdAndUpdate(id, update),
  findByIdAndDelete: (id: string) => PoemDB.findByIdAndDelete(id),
  countDocuments: (query?: any) => PoemDB.countDocuments(query),
  findPublic: (query: any = {}) => PoemDB.find({ ...query, approvalStatus: 'approved' })
};
