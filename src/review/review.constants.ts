export const REVIEW_CONFIG = {
  /** Distinct reports before a review is auto-hidden for moderation. */
  autoHideReportThreshold: 3,
  /** Max pinned ("featured") reviews per book. */
  maxFeaturedPerBook: 3,
  /** Max edit-history snapshots kept per review. */
  maxEditHistory: 10,
  /** Write throttle: max create/update actions per user per window. */
  writeLimit: 10,
  writeWindowMs: 10 * 60 * 1000,
  /** Bayesian prior strength (like "C" phantom reviews at the global mean). */
  bayesianPriorWeight: 5,
  defaultGlobalMean: 3.5,
  /** Moderation score at/above which a review waits for staff approval. */
  pendingScoreThreshold: 2,
} as const;

/** DI token - plug the Loan/Borrow module in here to award "Verified borrower". */
export const BORROW_VERIFIER = Symbol('BORROW_VERIFIER');

export interface BorrowVerifier {
  hasBorrowed(userId: string, bookId: number): Promise<boolean>;
}
