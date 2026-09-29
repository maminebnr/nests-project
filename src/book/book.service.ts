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
    const now = new Date();
    const book: Book = {
      id: Math.max(0, ...this.books.map((existingBook) => existingBook.id)) + 1,
      ...createBookDto,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.books.push(book);
    return book;
  }

  findAll() {
    return this.books.filter((book) => book.deletedAt === null);
  }

  findOne(id: number) {
    const book = this.books.find(
      (existingBook) => existingBook.id === id && existingBook.deletedAt === null,
    );
    if (!book) {
      throw new NotFoundException(`Book #${id} not found`);
    }
    return book;
  }

  update(id: number, updateBookDto: UpdateBookDto) {
    const book = this.findOne(id);
    Object.assign(book, updateBookDto, { updatedAt: new Date() });
    return book;
  }

  remove(id: number) {
    const book = this.findOne(id);
    book.deletedAt = new Date();
    return book;
  }
}
