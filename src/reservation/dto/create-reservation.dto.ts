import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  bookId: number;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  memberName: string;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  endDate: string;
}
