import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateBookDto {
	@ApiProperty({ example: 'The Hobbit' })
	@IsString()
	@IsNotEmpty()
	title: string;

	@ApiProperty({ example: 'J.R.R. Tolkien' })
	@IsString()
	@IsNotEmpty()
	author: string;

	@ApiProperty({ example: 1937 })
	@IsInt()
	@Min(0)
	year: number;

	@ApiProperty({ example: 19.99 })
	@IsNumber()
	@Min(0)
	price: number;

	@ApiProperty({ example: 10 })
	@IsInt()
	@Min(0)
	quantity: number;
}
