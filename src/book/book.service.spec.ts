import { Test, TestingModule } from '@nestjs/testing';
import { BookService } from './book.service';

describe('BookService', () => {
  let service: BookService;
  const createBookDto = {
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    year: 1937,
    price: 19.99,
    quantity: 10,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookService],
    }).compile();

    service = module.get<BookService>(BookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a book in the in-memory collection', () => {
    const book = service.create(createBookDto);

    expect(book).toMatchObject({ id: 4, ...createBookDto, deletedAt: null });
    expect(book.createdAt).toBeInstanceOf(Date);
    expect(book.updatedAt).toBeInstanceOf(Date);
    expect(service.findOne(book.id)).toBe(book);
  });

  it('finds an existing book and rejects missing or deleted books', () => {
    expect(service.findOne(1)).toMatchObject({ id: 1, title: 'Book 1' });
    expect(() => service.findOne(999)).toThrow('Book #999 not found');

    service.remove(1);
    expect(() => service.findOne(1)).toThrow('Book #1 not found');
  });

  it('updates a book and refreshes its updatedAt timestamp', () => {
    const originalUpdatedAt = service.findOne(1).updatedAt;

    const book = service.update(1, { title: 'Updated title', quantity: 25 });

    expect(book).toMatchObject({ id: 1, title: 'Updated title', quantity: 25 });
    expect(book.updatedAt.getTime()).toBeGreaterThanOrEqual(
      originalUpdatedAt.getTime(),
    );
  });

  it('soft-deletes a book without removing it from storage', () => {
    const book = service.remove(1);

    expect(book.deletedAt).toBeInstanceOf(Date);
    expect(service.findAll().some((existingBook) => existingBook.id === 1)).toBe(
      false,
    );
    expect(() => service.remove(1)).toThrow('Book #1 not found');
  });
});
