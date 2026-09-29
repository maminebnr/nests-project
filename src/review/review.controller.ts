import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiIdentity, CurrentUser, Public, Roles } from '../common/auth/auth.decorators';
import type { AuthUser } from '../common/auth/auth.types';
import { PaginationQueryDto } from '../common/dto/pagination';
import { LeaderboardQueryDto, ReplyDto, ReportDto, VoteDto } from './dto/actions.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewService } from './review.service';

const uuid = new ParseUUIDPipe();

@ApiTags('Reviews')
@ApiIdentity()
@Controller()
export class ReviewController {
  constructor(private readonly reviews: ReviewService) {}

  // ---- per book ----------------------------------------------------------
  @Post('book/:bookId/reviews')
  @ApiOperation({ summary: 'Write a review (one per user per book)' })
  create(@Param('bookId', ParseIntPipe) bookId: number, @Body() dto: CreateReviewDto, @CurrentUser() user: AuthUser) {
    return this.reviews.create(bookId, dto, user);
  }

  @Get('book/:bookId/reviews')
  @Public()
  @ApiOperation({ summary: 'List approved reviews with filters, search, sorting and pagination' })
  list(@Param('bookId', ParseIntPipe) bookId: number, @Query() query: ListReviewsQueryDto, @CurrentUser() user?: AuthUser) {
    return this.reviews.listForBook(bookId, query, user);
  }

  @Get('book/:bookId/reviews/stats')
  @Public()
  @ApiOperation({ summary: 'Rating summary: average, weighted score, distribution, trend, top pros/cons, highlights' })
  stats(@Param('bookId', ParseIntPipe) bookId: number, @CurrentUser() user?: AuthUser) {
    return this.reviews.bookStats(bookId, user);
  }

  // ---- global (declared before :id) -----------------------------------------
  @Get('reviews/leaderboard')
  @Public()
  @ApiOperation({ summary: 'Top rated books (Bayesian weighted)' })
  leaderboard(@Query() query: LeaderboardQueryDto) {
    return this.reviews.leaderboard(query);
  }

  @Get('reviews/me')
  @ApiOperation({ summary: 'My reviews (any status)' })
  mine(@Query() query: PaginationQueryDto, @CurrentUser() user: AuthUser) {
    return this.reviews.mine(user, query.page, query.limit);
  }

  // ---- single review -----------------------------------------------------
  @Get('reviews/:id')
  @Public()
  findOne(@Param('id', uuid) id: string, @CurrentUser() user?: AuthUser) {
    return this.reviews.findOne(id, user);
  }

  @Patch('reviews/:id')
  @ApiOperation({ summary: 'Edit my review (history is kept, moderation re-runs)' })
  update(@Param('id', uuid) id: string, @Body() dto: UpdateReviewDto, @CurrentUser() user: AuthUser) {
    return this.reviews.update(id, dto, user);
  }

  @Delete('reviews/:id')
  @ApiOperation({ summary: 'Soft delete (author or staff)' })
  remove(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.reviews.remove(id, user);
  }

  // ---- community ---------------------------------------------------------
  @Put('reviews/:id/vote')
  @ApiOperation({ summary: 'Mark a review helpful / not helpful (changeable)' })
  vote(@Param('id', uuid) id: string, @Body() dto: VoteDto, @CurrentUser() user: AuthUser) {
    return this.reviews.vote(id, dto.value, user);
  }

  @Delete('reviews/:id/vote')
  unvote(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.reviews.unvote(id, user);
  }

  @Post('reviews/:id/report')
  @HttpCode(201)
  @ApiOperation({ summary: 'Report a review; auto-hidden after enough distinct reports' })
  report(@Param('id', uuid) id: string, @Body() dto: ReportDto, @CurrentUser() user: AuthUser) {
    return this.reviews.report(id, dto, user);
  }

  // ---- staff -------------------------------------------------------------
  @Put('reviews/:id/reply')
  @Roles('librarian', 'admin')
  @ApiOperation({ summary: 'Official librarian reply' })
  reply(@Param('id', uuid) id: string, @Body() dto: ReplyDto, @CurrentUser() user: AuthUser) {
    return this.reviews.setReply(id, dto.text, user);
  }

  @Delete('reviews/:id/reply')
  @Roles('librarian', 'admin')
  removeReply(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.reviews.removeReply(id, user);
  }

  @Put('reviews/:id/feature')
  @Roles('librarian', 'admin')
  @ApiOperation({ summary: 'Pin a review on top of its book (max 3)' })
  feature(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.reviews.setFeatured(id, true, user);
  }

  @Delete('reviews/:id/feature')
  @Roles('librarian', 'admin')
  unfeature(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.reviews.setFeatured(id, false, user);
  }
}
