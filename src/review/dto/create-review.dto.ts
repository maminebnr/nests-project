import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min, MaxLength,
} from 'class-validator';
import { ToTagList, Trim } from '../../common/transformers';
import { ReadingFormat } from '../enums/review.enums';

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @ApiProperty({ example: 'A masterpiece of pacing' })
  @Trim() @IsString() @Length(3, 120)
  title: string;

  @ApiProperty({ example: 'Could not put it down. The characters feel real and the ending lands perfectly.' })
  @Trim() @IsString() @Length(20, 5000)
  content: string;

  @ApiPropertyOptional({ type: [String], example: ['great pacing'] })
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) @MaxLength(80, { each: true })
  @ToTagList()
  pros?: string[];

  @ApiPropertyOptional({ type: [String], example: ['slow start'] })
  @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true }) @MaxLength(80, { each: true })
  @ToTagList()
  cons?: string[];

  @ApiPropertyOptional({ type: [String], example: ['sci-fi', 'page-turner'] })
  @IsOptional() @IsArray() @ArrayMaxSize(8) @IsString({ each: true }) @Matches(/^[\p{L}\p{N} _-]{2,30}$/u, { each: true })
  @ToTagList()
  tags?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional() @IsBoolean()
  containsSpoilers?: boolean;

  @ApiPropertyOptional({ description: 'Would you recommend this book?', default: true })
  @IsOptional() @IsBoolean()
  recommended?: boolean;

  @ApiPropertyOptional({ enum: ReadingFormat })
  @IsOptional() @IsEnum(ReadingFormat)
  readingFormat?: ReadingFormat;

  @ApiPropertyOptional({ example: 'en', description: 'Language the reader read the book in (ISO code)' })
  @IsOptional() @IsString() @Matches(/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/)
  language?: string;
}
