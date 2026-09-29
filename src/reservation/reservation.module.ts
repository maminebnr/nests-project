import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { BookModule } from '../book/book.module';

@Module({
  imports: [BookModule],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule {}
