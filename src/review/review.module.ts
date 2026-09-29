import { Module } from '@nestjs/common';
import { BookModule } from '../book/book.module';
import { NoopBorrowVerifier } from './providers/noop-borrow-verifier';
import { ReviewAdminController } from './review-admin.controller';
import { ReviewModerationService } from './review-moderation.service';
import { ReviewStatsService } from './review-stats.service';
import { BORROW_VERIFIER } from './review.constants';
import { ReviewController } from './review.controller';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';

@Module({
  imports: [BookModule],
  controllers: [ReviewController, ReviewAdminController],
  providers: [
    ReviewService,
    ReviewRepository,
    ReviewModerationService,
    ReviewStatsService,
    // Swap for a real implementation backed by your loans module.
    { provide: BORROW_VERIFIER, useClass: NoopBorrowVerifier },
  ],
  exports: [ReviewService],
})
export class ReviewModule {}
