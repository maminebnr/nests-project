import {
  BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BookService } from '../book/book.service';
import { AuthUser, isStaff } from '../common/auth/auth.types';
import { Paginated, paginate } from '../common/dto/pagination';
import { LeaderboardQueryDto, ModerateDto, QueueQueryDto, ReportDto } from './dto/actions.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';
import { ModerationAction, ReviewSort, ReviewStatus, VoteValue } from './enums/review.enums';
import { BORROW_VERIFIER, REVIEW_CONFIG } from './review.constants';
import type { BorrowVerifier } from './review.constants';
import { ReviewModerationService } from './review-moderation.service';
import { ReviewRepository } from './review.repository';
import { BookReviewStats, ReviewStatsService } from './review-stats.service';

export interface ReviewView {
  id: string;
  bookId: number;
  author: { id: string; name: string };
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  tags: string[];
  containsSpoilers: boolean;
  recommended: boolean;
  readingFormat: string | null;
  language: string | null;
  verifiedBorrower: boolean;
  featured: boolean;
  status: ReviewStatus;
  helpful: { yes: number; no: number; score: number };
  reply: Review['reply'];
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
  viewer: { isMine: boolean; vote: VoteValue | null; reported: boolean };
  /** Only for the author and staff. */
  moderation?: Review['moderation'];
  /** Only for staff. */
  staff?: { reportCount: number; reports: Array<{ userId: string; reason: string; details?: string; at: Date }>; editHistory: Review['editHistory'] };
}

@Injectable()
export class ReviewService {
  private readonly writeLog = new Map<string, number[]>();

  constructor(
    private readonly repo: ReviewRepository,
    private readonly books: BookService,
    private readonly moderation: ReviewModerationService,
    private readonly stats: ReviewStatsService,
    @Inject(BORROW_VERIFIER) private readonly borrowVerifier: BorrowVerifier,
  ) {}

  // ======================================================================
  // Create / update / delete
  // ======================================================================
  async create(bookId: number, dto: CreateReviewDto, user: AuthUser): Promise<ReviewView> {
    this.books.findOne(bookId);
    this.throttle(user.id);
    if (this.repo.findActiveByUserAndBook(user.id, bookId)) {
      throw new ConflictException('You already reviewed this book - edit your existing review instead');
    }

    const hash = this.moderation.fingerprint(dto.content);
    if (this.repo.findActiveByHash(hash)) {
      throw new ConflictException('Duplicate review content detected');
    }
    const mod = this.moderation.analyse(dto.title, dto.content, ...(dto.pros ?? []), ...(dto.cons ?? []));
    const now = new Date();

    const review: Review = {
      id: randomUUID(),
      bookId,
      userId: user.id,
      userName: user.name,
      rating: dto.rating,
      title: dto.title,
      content: dto.content,
      pros: dto.pros ?? [],
      cons: dto.cons ?? [],
      tags: dto.tags ?? [],
      containsSpoilers: dto.containsSpoilers ?? false,
      recommended: dto.recommended ?? dto.rating >= 3,
      readingFormat: dto.readingFormat ?? null,
      language: dto.language ?? null,
      verifiedBorrower: await this.borrowVerifier.hasBorrowed(user.id, bookId),
      status: mod.needsReview ? ReviewStatus.PENDING : ReviewStatus.APPROVED,
      moderation: { flags: mod.flags, score: mod.score },
      contentHash: hash,
      helpfulCount: 0,
      notHelpfulCount: 0,
      helpfulScore: 0,
      featured: false,
      reply: null,
      editHistory: [],
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.repo.save(review);
    this.refreshBookSummary(bookId);
    return this.toView(review, user);
  }

  update(id: string, dto: UpdateReviewDto, user: AuthUser): ReviewView {
    const review = this.getActiveOrFail(id);
    if (review.userId !== user.id) throw new ForbiddenException('Only the author can edit a review');
    if (!Object.keys(dto).length) throw new BadRequestException('Nothing to update');
    this.throttle(user.id);

    const next: Review = Object.assign({}, review, this.definedOnly(dto));
    const hash = this.moderation.fingerprint(next.content);
    if (this.repo.findActiveByHash(hash, review.id)) throw new ConflictException('Duplicate review content detected');

    review.editHistory = [
      ...review.editHistory,
      { at: new Date(), rating: review.rating, title: review.title, content: review.content },
    ].slice(-REVIEW_CONFIG.maxEditHistory);

    const mod = this.moderation.analyse(next.title, next.content, ...next.pros, ...next.cons);
    const wasBlocked = review.status === ReviewStatus.REJECTED || review.status === ReviewStatus.HIDDEN;
    Object.assign(review, this.definedOnly(dto), {
      contentHash: hash,
      moderation: { flags: mod.flags, score: mod.score },
      // A staff-blocked review must be re-approved after the author fixes it.
      status: mod.needsReview || wasBlocked ? ReviewStatus.PENDING : ReviewStatus.APPROVED,
      featured: false,
      updatedAt: new Date(),
    });
    this.repo.save(review);
    this.refreshBookSummary(review.bookId);
    return this.toView(review, user);
  }

  remove(id: string, user: AuthUser): { id: string; deleted: true } {
    const review = this.getActiveOrFail(id);
    if (review.userId !== user.id && !isStaff(user)) throw new ForbiddenException('Not allowed to delete this review');
    review.deletedAt = new Date();
    review.featured = false;
    this.repo.save(review);
    this.refreshBookSummary(review.bookId);
    return { id, deleted: true };
  }

  /** Admin: bring back a soft-deleted review. */
  restore(id: string, user: AuthUser): ReviewView {
    const review = this.repo.findById(id);
    if (!review || !review.deletedAt) throw new NotFoundException('Deleted review not found');
    if (this.repo.findActiveByUserAndBook(review.userId, review.bookId)) {
      throw new ConflictException('The author already has an active review for this book');
    }
    review.deletedAt = null;
    review.updatedAt = new Date();
    this.repo.save(review);
    this.refreshBookSummary(review.bookId);
    return this.toView(review, user);
  }

  // ======================================================================
  // Reading
  // ======================================================================
  findOne(id: string, viewer?: AuthUser): ReviewView {
    const review = this.getActiveOrFail(id);
    if (!this.canSee(review, viewer)) throw new NotFoundException('Review not found');
    return this.toView(review, viewer);
  }

  listForBook(bookId: number, q: ListReviewsQueryDto, viewer?: AuthUser): Paginated<ReviewView> {
    this.books.findOne(bookId);
    const needle = q.q?.toLowerCase();
    const tag = q.tag?.toLowerCase();

    let items = this.repo.approvedByBook(bookId).filter((r) => {
      if (q.rating !== undefined && r.rating !== q.rating) return false;
      if (q.minRating !== undefined && r.rating < q.minRating) return false;
      if (q.maxRating !== undefined && r.rating > q.maxRating) return false;
      if (q.verified !== undefined && r.verifiedBorrower !== q.verified) return false;
      if (q.recommended !== undefined && r.recommended !== q.recommended) return false;
      if (q.excludeSpoilers && r.containsSpoilers) return false;
      if (q.hasReply !== undefined && Boolean(r.reply) !== q.hasReply) return false;
      if (q.format && r.readingFormat !== q.format) return false;
      if (q.language && r.language !== q.language) return false;
      if (tag && !r.tags.includes(tag)) return false;
      if (needle) {
        const hay = [r.title, r.content, ...r.pros, ...r.cons, ...r.tags].join(' ').toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    items = items.sort((a, b) => Number(b.featured) - Number(a.featured) || this.compare(q.sort, a, b));
    const page = paginate(items, q.page, q.limit);
    return { ...page, data: page.data.map((r) => this.toView(r, viewer)) };
  }

  mine(viewer: AuthUser, page: number, limit: number): Paginated<ReviewView> {
    const items = this.repo
      .active()
      .filter((r) => r.userId === viewer.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const p = paginate(items, page, limit);
    return { ...p, data: p.data.map((r) => this.toView(r, viewer)) };
  }

  bookStats(bookId: number, viewer?: AuthUser): BookReviewStats & { highlightReviews: Record<string, ReviewView | undefined> } {
    this.books.findOne(bookId);
    const stats = this.computeStats(bookId);
    const view = (id?: string) => {
      const r = id ? this.repo.findById(id) : undefined;
      return r ? this.toView(r, viewer) : undefined;
    };
    return {
      ...stats,
      highlightReviews: {
        mostHelpful: view(stats.highlights.mostHelpfulId),
        favorable: view(stats.highlights.favorableId),
        critical: view(stats.highlights.criticalId),
      },
    };
  }

  leaderboard(q: LeaderboardQueryDto) {
    const approved = this.repo.allApproved();
    const mean = this.stats.globalMean(approved);
    const byBook = new Map<number, Review[]>();
    approved.forEach((r) => byBook.set(r.bookId, [...(byBook.get(r.bookId) ?? []), r]));

    return [...byBook.entries()]
      .filter(([bookId, list]) => list.length >= q.minReviews && this.books.find(bookId))
      .map(([bookId, list]) => {
        const book = this.books.find(bookId)!;
        const s = this.stats.compute(bookId, list, mean);
        return {
          book: { id: book.id, title: book.title, author: book.author },
          reviewCount: s.count,
          average: s.average,
          weightedRating: s.weightedRating,
          recommendedPercent: s.recommendedPercent,
        };
      })
      .sort((a, b) => b.weightedRating - a.weightedRating || b.reviewCount - a.reviewCount)
      .slice(0, q.limit)
      .map((row, i) => ({ rank: i + 1, ...row }));
  }

  // ======================================================================
  // Community: votes & reports
  // ======================================================================
  vote(id: string, value: VoteValue, user: AuthUser) {
    const review = this.getActiveOrFail(id);
    if (review.status !== ReviewStatus.APPROVED) throw new NotFoundException('Review not found');
    if (review.userId === user.id) throw new ForbiddenException('You cannot vote on your own review');
    this.repo.setVote({ reviewId: id, userId: user.id, value, at: new Date() });
    return this.recountVotes(review, user.id);
  }

  unvote(id: string, user: AuthUser) {
    const review = this.getActiveOrFail(id);
    if (!this.repo.deleteVote(id, user.id)) throw new NotFoundException('You have not voted on this review');
    return this.recountVotes(review, user.id);
  }

  report(id: string, dto: ReportDto, user: AuthUser) {
    const review = this.getActiveOrFail(id);
    if (review.status !== ReviewStatus.APPROVED) throw new NotFoundException('Review not found');
    if (review.userId === user.id) throw new ForbiddenException('You cannot report your own review');
    if (this.repo.reportsFor(id).some((r) => r.userId === user.id)) {
      throw new ConflictException('You already reported this review');
    }
    this.repo.addReport({ reviewId: id, userId: user.id, reason: dto.reason, details: dto.details, at: new Date() });

    const autoHidden = this.repo.reportsFor(id).length >= REVIEW_CONFIG.autoHideReportThreshold;
    if (autoHidden) {
      review.status = ReviewStatus.HIDDEN;
      review.featured = false;
      review.moderation.flags = [...new Set([...review.moderation.flags, 'auto_hidden_by_reports'])];
      this.repo.save(review);
      this.refreshBookSummary(review.bookId);
    }
    return { reported: true, autoHidden };
  }

  // ======================================================================
  // Staff: reply, feature, moderation
  // ======================================================================
  setReply(id: string, text: string, user: AuthUser): ReviewView {
    const review = this.getActiveOrFail(id);
    if (review.status !== ReviewStatus.APPROVED) throw new BadRequestException('Only approved reviews can be answered');
    review.reply = { text, byUserId: user.id, byName: user.name, at: new Date() };
    this.repo.save(review);
    return this.toView(review, user);
  }

  removeReply(id: string, user: AuthUser): ReviewView {
    const review = this.getActiveOrFail(id);
    if (!review.reply) throw new NotFoundException('This review has no reply');
    review.reply = null;
    this.repo.save(review);
    return this.toView(review, user);
  }

  setFeatured(id: string, featured: boolean, user: AuthUser): ReviewView {
    const review = this.getActiveOrFail(id);
    if (review.status !== ReviewStatus.APPROVED) throw new BadRequestException('Only approved reviews can be featured');
    if (featured && !review.featured) {
      const count = this.repo.approvedByBook(review.bookId).filter((r) => r.featured).length;
      if (count >= REVIEW_CONFIG.maxFeaturedPerBook) {
        throw new ConflictException(`A book can have at most ${REVIEW_CONFIG.maxFeaturedPerBook} featured reviews`);
      }
    }
    review.featured = featured;
    this.repo.save(review);
    return this.toView(review, user);
  }

  queue(q: QueueQueryDto, user: AuthUser): Paginated<ReviewView> {
    const wanted = q.status ? [q.status] : [ReviewStatus.PENDING, ReviewStatus.HIDDEN];
    const items = this.repo
      .active()
      .filter((r) => wanted.includes(r.status))
      .sort(
        (a, b) =>
          this.repo.reportsFor(b.id).length - this.repo.reportsFor(a.id).length ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      );
    const p = paginate(items, q.page, q.limit);
    return { ...p, data: p.data.map((r) => this.toView(r, user)) };
  }

  moderate(id: string, dto: ModerateDto, user: AuthUser): ReviewView {
    const review = this.getActiveOrFail(id);
    if (dto.action !== ModerationAction.APPROVE && !dto.note) {
      throw new BadRequestException('A note is required when rejecting or hiding a review');
    }
    review.status = {
      [ModerationAction.APPROVE]: ReviewStatus.APPROVED,
      [ModerationAction.REJECT]: ReviewStatus.REJECTED,
      [ModerationAction.HIDE]: ReviewStatus.HIDDEN,
    }[dto.action];
    if (review.status !== ReviewStatus.APPROVED) review.featured = false;
    review.moderation.decision = { action: dto.action, by: user.id, note: dto.note, at: new Date() };
    if (dto.action === ModerationAction.APPROVE) this.repo.clearReports(id);
    review.updatedAt = new Date();
    this.repo.save(review);
    this.refreshBookSummary(review.bookId);
    return this.toView(review, user);
  }

  dismissReports(id: string, user: AuthUser): ReviewView {
    const review = this.getActiveOrFail(id);
    this.repo.clearReports(id);
    if (review.status === ReviewStatus.HIDDEN && review.moderation.flags.includes('auto_hidden_by_reports')) {
      review.status = ReviewStatus.APPROVED;
      review.moderation.flags = review.moderation.flags.filter((f) => f !== 'auto_hidden_by_reports');
      this.repo.save(review);
      this.refreshBookSummary(review.bookId);
    }
    return this.toView(review, user);
  }

  // ======================================================================
  // Internals
  // ======================================================================
  private getActiveOrFail(id: string): Review {
    const review = this.repo.findById(id);
    if (!review || review.deletedAt) throw new NotFoundException('Review not found');
    return review;
  }

  private canSee(review: Review, viewer?: AuthUser): boolean {
    return review.status === ReviewStatus.APPROVED || isStaff(viewer) || review.userId === viewer?.id;
  }

  private definedOnly<T extends object>(obj: T): Partial<T> {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
  }

  private throttle(userId: string): void {
    const now = Date.now();
    const recent = (this.writeLog.get(userId) ?? []).filter((t) => now - t < REVIEW_CONFIG.writeWindowMs);
    if (recent.length >= REVIEW_CONFIG.writeLimit) {
      throw new HttpException('Too many review submissions, please slow down', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.writeLog.set(userId, [...recent, now]);
  }

  private recountVotes(review: Review, viewerId: string) {
    const votes = this.repo.votesFor(review.id);
    review.helpfulCount = votes.filter((v) => v.value === VoteValue.HELPFUL).length;
    review.notHelpfulCount = votes.length - review.helpfulCount;
    review.helpfulScore = this.stats.wilson(review.helpfulCount, review.notHelpfulCount);
    this.repo.save(review);
    return {
      helpful: { yes: review.helpfulCount, no: review.notHelpfulCount, score: review.helpfulScore },
      myVote: this.repo.getVote(review.id, viewerId)?.value ?? null,
    };
  }

  private computeStats(bookId: number): BookReviewStats {
    const mean = this.stats.globalMean(this.repo.allApproved());
    return this.stats.compute(bookId, this.repo.approvedByBook(bookId), mean);
  }

  /** Keeps Book.ratingAverage / ratingCount / weightedRating in sync. */
  private refreshBookSummary(bookId: number): void {
    const s = this.computeStats(bookId);
    this.books.setRatingSummary(bookId, {
      ratingAverage: s.average,
      ratingCount: s.count,
      weightedRating: s.weightedRating,
    });
  }

  private compare(sort: ReviewSort, a: Review, b: Review): number {
    const byDate = b.createdAt.getTime() - a.createdAt.getTime();
    switch (sort) {
      case ReviewSort.NEWEST: return byDate;
      case ReviewSort.OLDEST: return -byDate;
      case ReviewSort.HIGHEST: return b.rating - a.rating || byDate;
      case ReviewSort.LOWEST: return a.rating - b.rating || byDate;
      case ReviewSort.CONTROVERSIAL: {
        const c = (r: Review) => {
          const total = r.helpfulCount + r.notHelpfulCount;
          return total ? total * (Math.min(r.helpfulCount, r.notHelpfulCount) / Math.max(r.helpfulCount, r.notHelpfulCount)) : 0;
        };
        return c(b) - c(a) || byDate;
      }
      case ReviewSort.HELPFUL:
      default:
        return b.helpfulScore - a.helpfulScore || b.helpfulCount - a.helpfulCount || byDate;
    }
  }

  toView(r: Review, viewer?: AuthUser): ReviewView {
    const staff = isStaff(viewer);
    const mine = r.userId === viewer?.id;
    const reports = this.repo.reportsFor(r.id);
    return {
      id: r.id,
      bookId: r.bookId,
      author: { id: r.userId, name: r.userName },
      rating: r.rating,
      title: r.title,
      content: r.content,
      pros: r.pros,
      cons: r.cons,
      tags: r.tags,
      containsSpoilers: r.containsSpoilers,
      recommended: r.recommended,
      readingFormat: r.readingFormat,
      language: r.language,
      verifiedBorrower: r.verifiedBorrower,
      featured: r.featured,
      status: r.status,
      helpful: { yes: r.helpfulCount, no: r.notHelpfulCount, score: r.helpfulScore },
      reply: r.reply,
      edited: r.editHistory.length > 0,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      viewer: {
        isMine: mine,
        vote: viewer ? (this.repo.getVote(r.id, viewer.id)?.value ?? null) : null,
        reported: viewer ? reports.some((x) => x.userId === viewer.id) : false,
      },
      ...(staff || mine ? { moderation: r.moderation } : {}),
      ...(staff
        ? {
            staff: {
              reportCount: reports.length,
              reports: reports.map(({ userId, reason, details, at }) => ({ userId, reason, details, at })),
              editHistory: r.editHistory,
            },
          }
        : {}),
    };
  }
}
