import { Test, TestingModule } from '@nestjs/testing';
import { ReservationService } from './reservation.service';
import { BookService } from '../book/book.service';
import { ReservationStatus } from './entities/reservation.entity';

describe('ReservationService', () => {
  let service: ReservationService;

  const dto = {
    bookId: 1,
    memberName: 'John Doe',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReservationService, BookService],
    }).compile();

    service = module.get<ReservationService>(ReservationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates an active reservation', () => {
    const reservation = service.create(dto);
    expect(reservation.id).toBe(1);
    expect(reservation.status).toBe(ReservationStatus.ACTIVE);
    expect(service.findAll()).toHaveLength(1);
  });

  it('rejects an unknown book', () => {
    expect(() => service.create({ ...dto, bookId: 999 })).toThrow(
      'Book #999 not found',
    );
  });

  it('rejects endDate before startDate', () => {
    expect(() =>
      service.create({ ...dto, startDate: '2026-10-15', endDate: '2026-10-01' }),
    ).toThrow('endDate must be after startDate');
  });

  it('cancels a reservation only once', () => {
    const { id } = service.create(dto);
    expect(service.cancel(id).status).toBe(ReservationStatus.CANCELLED);
    expect(() => service.cancel(id)).toThrow('already cancelled');
  });

  it('soft-deletes a reservation', () => {
    const { id } = service.create(dto);
    service.remove(id);
    expect(() => service.findOne(id)).toThrow('not found');
  });
});
