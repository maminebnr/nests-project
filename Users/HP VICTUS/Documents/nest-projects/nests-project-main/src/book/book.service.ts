import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book } from './entities/book.entity';

@Injectable()
export class BookService {
  private books: Book[] = [
    { id: 1, title: 'Book 1', author: 'Author 1', year: 2020, price: 100, quantity: 100, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
    { id: 2, title: 'Book 2', author: 'Author 2', year: 2021, price: 200, quantity: 200, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
    { id: 3, title: 'Book 3', author: 'Author 3', year: 2022, price: 300, quantity: 300, createdAt: new Date(), updatedAt: new Date(), deletedAt: null },
  ];

  create(createBookDto: CreateBookDto) {
    const newBook: Book = {
      id: this.books.length ? Math.max(...this.books.map((b) => b.id)) + 1 : 1,
      ...createBookDto,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };
    this.books.push(newBook);
    return newBook;
  }

  findAll() {
    return this.books.filter((b) => b.deletedAt === null);
  }

  findOne(id: number) {
    const book = this.books.find((b) => b.id === id && b.deletedAt === null);
    if (!book) {
      throw new NotFoundException(`Book #${id} not found`);
    }
    return book;
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    const book = this.books.find((b) => b.id === id && b.deletedAt === null);
    if (!book) {
      throw new NotFoundException(`Book #${id} not found`);
    }
    Object.assign(book, updateBookDto, { updatedAt: new Date() });
    return book;
  }

  remove(id: number) {
    const book = this.findOne(id);
    book.deletedAt = new Date();
    return { message: `Book #${id} deleted` };
  }
}