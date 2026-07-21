export type UserRole = 'reader' | 'author' | 'publisher' | 'moderator' | 'admin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ContentType = 'novel' | 'poem' | 'article' | 'book' | 'author';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type UserStatus = 'active' | 'suspended';

export const CATEGORIES = [
  'African Literature', 'Romance', 'Fantasy', 'Adventure', 'Thriller', 'Mystery',
  'Horror', 'Comedy', 'Crime', 'Action', 'Science Fiction', 'Biography',
  'Autobiography', 'Poetry', 'History', 'Politics', 'Religion', 'Business',
  'Technology', 'Programming', 'Education', 'Children Books', 'Young Adult',
  'Classic Literature', 'Penguin Classics', 'Short Stories', 'Health',
  'Psychology', 'Philosophy', 'Self Help', 'Comics', 'Graphic Novels',
  'Historical Fiction', 'Memoir', 'Political Fiction'
] as const;

export const SUBMISSION_FEE_KES = 50;

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  reader: 1,
  author: 2,
  publisher: 3,
  moderator: 4,
  admin: 5
};

export function isApproved(item: { approvalStatus?: ApprovalStatus } | null | undefined): boolean {
  return !item || item.approvalStatus === 'approved' || item.approvalStatus === undefined;
}

export function publicContentFilter(): { approvalStatus: ApprovalStatus } {
  return { approvalStatus: 'approved' };
}
