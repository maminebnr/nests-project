import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookModule } from './book/book.module';
import { IdentityGuard } from './common/auth/identity.guard';
import { ReviewModule } from './review/review.module';

@Module({
  imports: [BookModule, ReviewModule],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: IdentityGuard }],
})
export class AppModule {}
