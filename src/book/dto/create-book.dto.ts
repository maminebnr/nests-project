import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, Length, Max, Min } from 'class-validator';
import { Trim } from '../../common/transformers';

export class CreateBookDto {
  @ApiProperty({ example: 'Dune' })
  @Trim() @IsString() @Length(1, 200)
  title: string;

  @ApiProperty({ example: 'Frank Herbert' })
  @Trim() @IsString() @Length(1, 120)
  author: string;

  @ApiProperty({ example: 1965 })
  @IsInt() @Min(0) @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({ example: 19.9 })
  @IsNumber() @Min(0)
  price: number;

  @ApiProperty({ example: 10 })
  @IsInt() @Min(0)
  quantity: number;
}
