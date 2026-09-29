import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Book, BookRatingSummary } from './entities/book.entity';

const seed = (id: number, year: number, price: number, quantity: number): Book => ({
  id,
  title: `Book ${id}`,
  author: `Author ${id}`,
  year,
  price,
  quantity,
  ratingAverage: 0,
  ratingCount: 0,
  weightedRating: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

@Injectable()
export class BookService {
  private books: Book[] = [seed(1, 2020, 100, 100), seed(2, 2021, 200, 200), seed(3, 2022, 300, 300)];
  private nextId = 4;

  create(dto: CreateBookDto): Book {
    const now = new Date();
    const book: Book = {
      title: dto.title,
      author: dto.author,
      year: dto.year,
      price: dto.price,
      quantity: dto.quantity,
      id: this.nextId++,
      ratingAverage: 0,
      ratingCount: 0,
      weightedRating: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.books.push(book);
    return book;
  }

  findAll(): Book[] {
    return this.books.filter((b) => !b.deletedAt);
  }

  findOne(id: number): Book {
    const book = this.books.find((b) => b.id === id && !b.deletedAt);
    if (!book) throw new NotFoundException(`Book #${id} not found`);
    return book;
  }

  /** Non-throwing lookup used by aggregations. */
  find(id: number): Book | undefined {
    return this.books.find((b) => b.id === id && !b.deletedAt);
  }

  update(id: number, dto: UpdateBookDto): Book {
    const book = this.findOne(id);
    Object.assign(book, dto, { updatedAt: new Date() });
    return book;
  }

  /** Soft delete, in line with the `deletedAt` column. */
  remove(id: number): { id: number; deleted: true } {
    const book = this.findOne(id);
    book.deletedAt = new Date();
    return { id, deleted: true };
  }

  /** Called by the Review module whenever the approved reviews of a book change. */
  setRatingSummary(id: number, summary: BookRatingSummary): void {
    const book = this.find(id);
    if (book) Object.assign(book, summary);
  }
}
