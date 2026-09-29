import { ModerationAction, ReadingFormat, ReportReason, ReviewStatus, VoteValue } from '../enums/review.enums';

export interface ReviewReply {
  text: string;
  byUserId: string;
  byName: string;
  at: Date;
}

export interface ReviewModerationInfo {
  flags: string[];
  score: number;
  decision?: { action: ModerationAction; by: string; note?: string; at: Date };
}

export interface ReviewEditSnapshot {
  at: Date;
  rating: number;
  title: string;
  content: string;
}

export class Review {
  id: string;
  bookId: number;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  tags: string[];
  containsSpoilers: boolean;
  recommended: boolean;
  readingFormat: ReadingFormat | null;
  language: string | null;
  verifiedBorrower: boolean;
  status: ReviewStatus;
  moderation: ReviewModerationInfo;
  contentHash: string;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulScore: number;
  featured: boolean;
  reply: ReviewReply | null;
  editHistory: ReviewEditSnapshot[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ReviewVote {
  reviewId: string;
  userId: string;
  value: VoteValue;
  at: Date;
}

export interface ReviewReport {
  reviewId: string;
  userId: string;
  reason: ReportReason;
  details?: string;
  at: Date;
}
