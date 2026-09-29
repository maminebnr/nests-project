import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { ReservationModule } from './reservation/reservation.module';

@Module({
  imports: [BookModule, ReservationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
