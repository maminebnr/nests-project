import { Injectable } from '@nestjs/common';
import { Review, ReviewReport, ReviewVote } from './entities/review.entity';
import { ReviewStatus } from './enums/review.enums';

/**
 * In-memory store (same approach as BookService today).
 * Swap the internals for TypeORM/Prisma/Mongoose without touching the services:
 * every access to data goes through this class.
 */
@Injectable()
export class ReviewRepository {
  private readonly reviews = new Map<string, Review>();
  private readonly votes = new Map<string, ReviewVote>();
  private readonly reports = new Map<string, ReviewReport[]>();

  // ---- reviews -----------------------------------------------------------
  save(review: Review): Review {
    this.reviews.set(review.id, review);
    return review;
  }

  findById(id: string): Review | undefined {
    return this.reviews.get(id);
  }

  /** Non soft-deleted reviews. */
  active(): Review[] {
    return [...this.reviews.values()].filter((r) => !r.deletedAt);
  }

  approvedByBook(bookId: number): Review[] {
    return this.active().filter((r) => r.bookId === bookId && r.status === ReviewStatus.APPROVED);
  }

  allApproved(): Review[] {
    return this.active().filter((r) => r.status === ReviewStatus.APPROVED);
  }

  findActiveByUserAndBook(userId: string, bookId: number): Review | undefined {
    return this.active().find((r) => r.userId === userId && r.bookId === bookId);
  }

  findActiveByHash(hash: string, excludeId?: string): Review | undefined {
    return this.active().find((r) => r.contentHash === hash && r.id !== excludeId);
  }

  // ---- votes -------------------------------------------------------------
  private voteKey = (reviewId: string, userId: string) => `${reviewId}:${userId}`;

  getVote(reviewId: string, userId: string): ReviewVote | undefined {
    return this.votes.get(this.voteKey(reviewId, userId));
  }

  setVote(vote: ReviewVote): void {
    this.votes.set(this.voteKey(vote.reviewId, vote.userId), vote);
  }

  deleteVote(reviewId: string, userId: string): boolean {
    return this.votes.delete(this.voteKey(reviewId, userId));
  }

  votesFor(reviewId: string): ReviewVote[] {
    return [...this.votes.values()].filter((v) => v.reviewId === reviewId);
  }

  // ---- reports -----------------------------------------------------------
  reportsFor(reviewId: string): ReviewReport[] {
    return this.reports.get(reviewId) ?? [];
  }

  addReport(report: ReviewReport): void {
    this.reports.set(report.reviewId, [...this.reportsFor(report.reviewId), report]);
  }

  clearReports(reviewId: string): void {
    this.reports.delete(reviewId);
  }
}
