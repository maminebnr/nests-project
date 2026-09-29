import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiIdentity, CurrentUser, Roles } from '../common/auth/auth.decorators';
import type { AuthUser } from '../common/auth/auth.types';
import { ModerateDto, QueueQueryDto } from './dto/actions.dto';
import { ReviewService } from './review.service';

@ApiTags('Review moderation')
@ApiIdentity()
@Roles('librarian', 'admin')
@Controller('admin/reviews')
export class ReviewAdminController {
  constructor(private readonly reviews: ReviewService) {}

  @Get('queue')
  @ApiOperation({ summary: 'Moderation queue (pending + hidden by default), most reported first' })
  queue(@Query() query: QueueQueryDto, @CurrentUser() user: AuthUser) {
    return this.reviews.queue(query, user);
  }

  @Post(':id/moderate')
  @ApiOperation({ summary: 'Approve, reject or hide a review' })
  moderate(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ModerateDto, @CurrentUser() user: AuthUser) {
    return this.reviews.moderate(id, dto, user);
  }

  @Post(':id/dismiss-reports')
  @ApiOperation({ summary: 'Clear reports; un-hides reviews that were auto-hidden' })
  dismiss(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthUser) {
    return this.reviews.dismissReports(id, user);
  }

  @Post(':id/restore')
  @Roles('admin')
  @ApiOperation({ summary: 'Restore a soft-deleted review (admin only)' })
  restore(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthUser) {
    return this.reviews.restore(id, user);
  }
}
