import { AuthorDB } from '../config/db.js';
import type { ApprovalStatus } from '../types/common.js';

export interface Author {
  _id: string;
  id: string;
  name: string;
  photo: string;
  coverPhoto?: string;
  bio: string;
  nationality: string;
  occupation?: string;
  writingStyle?: string;
  genres?: string[];
  literaryAchievements: string;
  famousNovels: string;
  novelCount: number;
  externalLink?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  wikipedia?: string;
  openLibraryKey?: string;
  wikidataId?: string;
  isDirectoryAuthor?: boolean;
  verified?: boolean;
  approvalStatus: ApprovalStatus;
  awards?: string[];
  relatedAuthorIds?: string[];
  createdAt: string;
}

export const AuthorModel = {
  find: (query?: any) => AuthorDB.find(query),
  findOne: (query?: any) => AuthorDB.findOne(query),
  findById: (id: string) => AuthorDB.findById(id),
  create: (data: Partial<Author>) => AuthorDB.create({
    approvalStatus: 'approved',
    isDirectoryAuthor: false,
    verified: false,
    genres: [],
    awards: [],
    ...data
  }),
  findByIdAndUpdate: (id: string, update: Partial<Author>) => AuthorDB.findByIdAndUpdate(id, update),
  findByIdAndDelete: (id: string) => AuthorDB.findByIdAndDelete(id),
  countDocuments: (query?: any) => AuthorDB.countDocuments(query),

  findPublic: (query: any = {}) =>
    AuthorDB.find({ ...query, approvalStatus: 'approved' })
};
