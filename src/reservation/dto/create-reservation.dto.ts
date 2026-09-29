import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ example: 1 })
  bookId: number;

  @ApiProperty({ example: 'John Doe' })
  memberName: string;

  @ApiProperty({ example: '2026-10-01' })
  startDate: string;

  @ApiProperty({ example: '2026-10-15' })
  endDate: string;
}
