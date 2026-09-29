import { Injectable } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './entities/book.entity';
@Injectable()
export class BookService {
  private books:Book[]=[
    {id:1,title:'Book 1',author:'Author 1',year:2020,price:100,quantity:100,createdAt:new Date(),updatedAt:new Date(),deletedAt:null},
    {id:2,title:'Book 2',author:'Author 2',year:2021,price:200,quantity:200,createdAt:new Date(),updatedAt:new Date(),deletedAt:null},
    {id:3,title:'Book 3',author:'Author 3',year:2022,price:300,quantity:300,createdAt:new Date(),updatedAt:new Date(),deletedAt:null},
  ]
  create(createBookDto: CreateBookDto) {
    return 'This action adds a new book';
  }

  findAll() {
    return this.books;
  }

  findOne(id: number) {
    return `This action returns a #${id} book`;
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    return `This action updates a #${id} book`;
  }

  remove(id: number) {
    return `This action removes a #${id} book`;
  }
}
