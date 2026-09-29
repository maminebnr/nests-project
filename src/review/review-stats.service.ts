import { Injectable } from '@nestjs/common';
import { Review } from './entities/review.entity';
import { REVIEW_CONFIG } from './review.constants';

export interface RatingBucket {
  count: number;
  percent: number;
}

export interface BookReviewStats {
  bookId: number;
  count: number;
  /** Plain arithmetic mean (2 decimals). */
  average: number;
  /** Bayesian (IMDb-style) rating - resistant to a single 5-star review. */
  weightedRating: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', RatingBucket>;
  recommendedPercent: number;
  verifiedCount: number;
  withSpoilersCount: number;
  topTags: Array<{ tag: string; count: number }>;
  topPros: Array<{ text: string; count: number }>;
  topCons: Array<{ text: string; count: number }>;
  trend: {
    last30Days: { count: number; average: number };
    previous30Days: { count: number; average: number };
    direction: 'up' | 'down' | 'stable' | 'n/a';
  };
  /** Ids of representative reviews; the service expands them into views. */
  highlights: { mostHelpfulId?: string; favorableId?: string; criticalId?: string };
}

const round = (n: number, d = 2) => Number(n.toFixed(d));
const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewStatsService {
  /** Lower bound of the Wilson score interval (95%) - Reddit/Amazon style ranking. */
  wilson(up: number, down: number): number {
    const n = up + down;
    if (n === 0) return 0;
    const z = 1.96;
    const p = up / n;
    const score =
      (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
    return round(Math.max(0, score), 4);
  }

  globalMean(allApproved: Review[]): number {
    if (!allApproved.length) return REVIEW_CONFIG.defaultGlobalMean;
    return allApproved.reduce((s, r) => s + r.rating, 0) / allApproved.length;
  }

  bayesian(sum: number, count: number, globalMean: number): number {
    const c = REVIEW_CONFIG.bayesianPriorWeight;
    return round((c * globalMean + sum) / (c + count));
  }

  compute(bookId: number, reviews: Review[], globalMean: number, now = new Date()): BookReviewStats {
    const count = reviews.length;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>;
    reviews.forEach((r) => (distribution[r.rating] += 1));
    const dist = Object.fromEntries(
      [1, 2, 3, 4, 5].map((s) => [s, { count: distribution[s], percent: count ? round((distribution[s] / count) * 100, 1) : 0 }]),
    ) as BookReviewStats['distribution'];

    const tally = (pick: (r: Review) => string[]) => {
      const map = new Map<string, number>();
      reviews.forEach((r) => pick(r).forEach((t) => map.set(t, (map.get(t) ?? 0) + 1)));
      return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
    };

    const windowStats = (from: number, to: number) => {
      const inRange = reviews.filter((r) => {
        const t = r.createdAt.getTime();
        return t >= from && t < to;
      });
      const avg = inRange.length ? inRange.reduce((s, r) => s + r.rating, 0) / inRange.length : 0;
      return { count: inRange.length, average: round(avg) };
    };
    const t = now.getTime();
    const last30 = windowStats(t - 30 * DAY, t + 1);
    const prev30 = windowStats(t - 60 * DAY, t - 30 * DAY);
    let direction: BookReviewStats['trend']['direction'] = 'n/a';
    if (last30.count && prev30.count) {
      const diff = last30.average - prev30.average;
      direction = diff > 0.25 ? 'up' : diff < -0.25 ? 'down' : 'stable';
    }

    const byHelpful = [...reviews].sort((a, b) => b.helpfulScore - a.helpfulScore || b.helpfulCount - a.helpfulCount);
    const best = (list: Review[]) => list.sort((a, b) => b.helpfulScore - a.helpfulScore || b.createdAt.getTime() - a.createdAt.getTime())[0];

    return {
      bookId,
      count,
      average: count ? round(sum / count) : 0,
      weightedRating: this.bayesian(sum, count, globalMean),
      distribution: dist,
      recommendedPercent: count ? round((reviews.filter((r) => r.recommended).length / count) * 100, 1) : 0,
      verifiedCount: reviews.filter((r) => r.verifiedBorrower).length,
      withSpoilersCount: reviews.filter((r) => r.containsSpoilers).length,
      topTags: tally((r) => r.tags).map(([tag, c]) => ({ tag, count: c })),
      topPros: tally((r) => r.pros).map(([text, c]) => ({ text, count: c })),
      topCons: tally((r) => r.cons).map(([text, c]) => ({ text, count: c })),
      trend: { last30Days: last30, previous30Days: prev30, direction },
      highlights: {
        mostHelpfulId: byHelpful[0]?.helpfulCount ? byHelpful[0].id : undefined,
        favorableId: best(reviews.filter((r) => r.rating >= 4))?.id,
        criticalId: best(reviews.filter((r) => r.rating <= 2))?.id,
      },
    };
  }
}
