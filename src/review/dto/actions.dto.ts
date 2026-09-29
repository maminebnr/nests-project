import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination';
import { Trim } from '../../common/transformers';
import { ModerationAction, ReportReason, ReviewStatus, VoteValue } from '../enums/review.enums';

export class VoteDto {
  @ApiProperty({ enum: VoteValue })
  @IsEnum(VoteValue)
  value: VoteValue;
}

export class ReportDto {
  @ApiProperty({ enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional() @Trim() @IsString() @MaxLength(500)
  details?: string;
}

export class ReplyDto {
  @ApiProperty({ minLength: 2, maxLength: 1500 })
  @Trim() @IsString() @Length(2, 1500)
  text: string;
}

export class ModerateDto {
  @ApiProperty({ enum: ModerationAction })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiPropertyOptional({ description: 'Required when rejecting or hiding' })
  @ValidateIf((o: ModerateDto) => o.action !== ModerationAction.APPROVE || o.note !== undefined)
  @Trim() @IsString() @Length(3, 500)
  note?: string;
}

export class QueueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReviewStatus, description: 'Default: pending + hidden' })
  @IsOptional() @IsEnum(ReviewStatus)
  status?: ReviewStatus;
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({ default: 1, description: 'Minimum approved reviews to qualify' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  minReviews: number = 1;
}
