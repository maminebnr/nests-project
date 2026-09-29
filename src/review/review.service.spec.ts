import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookService } from '../book/book.service';
import type { AuthUser } from '../common/auth/auth.types';
import { ListReviewsQueryDto } from './dto/list-reviews.dto';
import { ModerationAction, ReportReason, ReviewSort, ReviewStatus, VoteValue } from './enums/review.enums';
import { ReviewModerationService } from './review-moderation.service';
import { ReviewStatsService } from './review-stats.service';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';

const user = (id: string, role: AuthUser['role'] = 'member'): AuthUser => ({ id, name: id, role });
const alice = user('alice');
const bob = user('bob');
const staff = user('lib', 'librarian');

let seq = 0;
const WORDS = ['amber', 'basalt', 'cobalt', 'dune', 'ember', 'fjord', 'garnet', 'harbor', 'indigo', 'juniper'];
const body = (over: Record<string, unknown> = {}) => ({
  rating: 5,
  title: 'Great book',
  content: `A genuinely wonderful read, number ${WORDS[seq % 10]} ${WORDS[Math.floor(seq / 10) % 10]} ${seq++} with memorable characters and pacing.`,
  ...over,
});

function build(verified = false) {
  const books = new BookService();
  const service = new ReviewService(
    new ReviewRepository(),
    books,
    new ReviewModerationService(),
    new ReviewStatsService(),
    { hasBorrowed: () => Promise.resolve(verified) },
  );
  return { service, books };
}

const query = (over: Partial<ListReviewsQueryDto> = {}) => Object.assign(new ListReviewsQueryDto(), over);

describe('ReviewService', () => {
  it('creates a review, syncs the book summary and marks verified borrowers', async () => {
    const { service, books } = build(true);
    const view = await service.create(1, body({ rating: 4 }), alice);
    expect(view.status).toBe(ReviewStatus.APPROVED);
    expect(view.verifiedBorrower).toBe(true);
    expect(books.findOne(1)).toMatchObject({ ratingAverage: 4, ratingCount: 1 });
  });

  it('allows one review per user per book and rejects copy-pasted content', async () => {
    const { service } = build();
    const first = body();
    await service.create(1, first, alice);
    await expect(service.create(1, body(), alice)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.create(1, first, bob)).rejects.toBeInstanceOf(ConflictException);
  });

  it('sends suspicious content to the pending queue and hides it from public lists', async () => {
    const { service } = build();
    const v = await service.create(1, body({ content: 'Visit http://spam.example.com now for free stuff!!' }), alice);
    expect(v.status).toBe(ReviewStatus.PENDING);
    expect(service.listForBook(1, query()).meta.total).toBe(0);
    expect(service.findOne(v.id, alice).id).toBe(v.id);
    expect(() => service.findOne(v.id, bob)).toThrow(NotFoundException);
    expect(service.findOne(v.id, staff).id).toBe(v.id);
  });

  it('only lets the author edit, keeps history and recomputes the rating', async () => {
    const { service, books } = build();
    const v = await service.create(1, body({ rating: 5 }), alice);
    expect(() => service.update(v.id, { rating: 1 }, bob)).toThrow(ForbiddenException);
    const edited = service.update(v.id, { rating: 3 }, alice);
    expect(edited.edited).toBe(true);
    expect(books.findOne(1).ratingAverage).toBe(3);
  });

  it('handles votes: no self vote, changeable, retractable', async () => {
    const { service } = build();
    const v = await service.create(1, body(), alice);
    expect(() => service.vote(v.id, VoteValue.HELPFUL, alice)).toThrow(ForbiddenException);
    expect(service.vote(v.id, VoteValue.HELPFUL, bob).helpful.yes).toBe(1);
    expect(service.vote(v.id, VoteValue.NOT_HELPFUL, bob).helpful).toMatchObject({ yes: 0, no: 1 });
    expect(service.unvote(v.id, bob).helpful).toMatchObject({ yes: 0, no: 0 });
  });

  it('auto-hides after enough distinct reports and staff can dismiss them', async () => {
    const { service, books } = build();
    const v = await service.create(1, body(), alice);
    const dto = { reason: ReportReason.SPAM };
    service.report(v.id, dto, user('u1'));
    expect(() => service.report(v.id, dto, user('u1'))).toThrow(ConflictException);
    service.report(v.id, dto, user('u2'));
    expect(service.report(v.id, dto, user('u3')).autoHidden).toBe(true);
    expect(books.findOne(1).ratingCount).toBe(0);
    expect(service.dismissReports(v.id, staff).status).toBe(ReviewStatus.APPROVED);
    expect(books.findOne(1).ratingCount).toBe(1);
  });

  it('moderation decisions update visibility and require a note to reject', async () => {
    const { service } = build();
    const v = await service.create(1, body(), alice);
    expect(() => service.moderate(v.id, { action: ModerationAction.REJECT }, staff)).toThrow();
    const rejected = service.moderate(v.id, { action: ModerationAction.REJECT, note: 'off topic' }, staff);
    expect(rejected.status).toBe(ReviewStatus.REJECTED);
    expect(service.listForBook(1, query()).meta.total).toBe(0);
  });

  it('caps featured reviews per book and pins them first', async () => {
    const { service } = build();
    const ids: string[] = [];
    for (const name of ['a', 'b', 'c', 'd']) ids.push((await service.create(1, body(), user(name))).id);
    ids.slice(0, 3).forEach((id) => service.setFeatured(id, true, staff));
    expect(() => service.setFeatured(ids[3], true, staff)).toThrow(ConflictException);
    expect(service.listForBook(1, query({ limit: 10 })).data[0].featured).toBe(true);
  });

  it('filters and sorts', async () => {
    const { service } = build();
    await service.create(1, body({ rating: 5, tags: ['sci-fi'] }), user('a'));
    await service.create(1, body({ rating: 2, containsSpoilers: true }), user('b'));
    expect(service.listForBook(1, query({ excludeSpoilers: true })).meta.total).toBe(1);
    expect(service.listForBook(1, query({ tag: 'sci-fi' })).meta.total).toBe(1);
    expect(service.listForBook(1, query({ sort: ReviewSort.LOWEST })).data[0].rating).toBe(2);
  });

  it('soft deletes and lets an admin restore', async () => {
    const { service, books } = build();
    const v = await service.create(1, body(), alice);
    service.remove(v.id, alice);
    expect(books.findOne(1).ratingCount).toBe(0);
    expect(service.restore(v.id, user('root', 'admin')).id).toBe(v.id);
    expect(books.findOne(1).ratingCount).toBe(1);
  });
});

describe('ReviewStatsService', () => {
  const stats = new ReviewStatsService();
  it('wilson score rewards volume', () => {
    expect(stats.wilson(0, 0)).toBe(0);
    expect(stats.wilson(50, 5)).toBeGreaterThan(stats.wilson(5, 0));
  });
  it('bayesian rating pulls small samples toward the global mean', () => {
    expect(stats.bayesian(5, 1, 3.5)).toBeLessThan(4);
    expect(stats.bayesian(500, 100, 3.5)).toBeGreaterThan(4.7);
  });
});

describe('ReviewModerationService', () => {
  const m = new ReviewModerationService();
  it('flags profanity (incl. leetspeak), links and contact info', () => {
    expect(m.analyse('this is sh1t').flags).toContain('profanity');
    expect(m.analyse('see www.foo.com').flags).toContain('contains_link');
    expect(m.analyse('mail me a@b.io').needsReview).toBe(true);
    expect(m.analyse('call 555 123 4567 today').flags).toContain('contains_contact_info');
    // decimals, ratings and ISBNs are not phone numbers
    expect(m.analyse('rated 4.7583920174 overall, ISBN 978-3-16-148410-0, read in 2024').flags).toEqual([]);
  });
  it('passes clean content', () => {
    expect(m.analyse('A lovely, thoughtful novel.').needsReview).toBe(false);
  });
});
