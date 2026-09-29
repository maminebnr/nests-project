import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { ReviewModule } from './review/review.module';

@Module({
  imports: [BookModule, ReviewModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
