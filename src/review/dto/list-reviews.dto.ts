import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination';
import { ToBoolean, Trim } from '../../common/transformers';
import { ReadingFormat, ReviewSort } from '../enums/review.enums';

export class ListReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReviewSort, default: ReviewSort.HELPFUL })
  @IsOptional() @IsEnum(ReviewSort)
  sort: ReviewSort = ReviewSort.HELPFUL;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, description: 'Exact star rating' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  maxRating?: number;

  @ApiPropertyOptional({ description: 'Only verified borrowers' })
  @IsOptional() @ToBoolean()
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Filter by recommended yes/no' })
  @IsOptional() @ToBoolean()
  recommended?: boolean;

  @ApiPropertyOptional({ description: 'Set true to hide reviews that contain spoilers' })
  @IsOptional() @ToBoolean()
  excludeSpoilers?: boolean;

  @ApiPropertyOptional({ description: 'Only reviews with an official reply' })
  @IsOptional() @ToBoolean()
  hasReply?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsEnum(ReadingFormat)
  format?: ReadingFormat;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)
  language?: string;

  @ApiPropertyOptional() @IsOptional() @Trim() @IsString() @MaxLength(30)
  tag?: string;

  @ApiPropertyOptional({ description: 'Keyword search in title, content, pros, cons, tags' })
  @IsOptional() @Trim() @IsString() @MaxLength(100)
  q?: string;
}
