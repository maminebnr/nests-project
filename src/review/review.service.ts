import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './entities/review.entity';

@Injectable()
export class ReviewService {
  private reviews: Review[] = [
    { id: 1, content: 'Super livre', rating: 5, bookId: 1 },
  ];

  create(createReviewDto: CreateReviewDto) {
    const newReview = { id: Date.now(), ...createReviewDto };
    this.reviews.push(newReview);
    return newReview;
  }

  findAll() {
    return this.reviews;
  }

  findOne(id: number) {
    const review = this.reviews.find((r) => r.id === id);
    if (!review) throw new NotFoundException(`Avis #${id} non trouvé`);
    return review;
  }

  remove(id: number) {
    const index = this.reviews.findIndex((r) => r.id === id);
    if (index === -1) throw new NotFoundException(`Avis #${id} non trouvé`);
    const [deleted] = this.reviews.splice(index, 1);
    return { message: `Avis #${id} supprimé avec succès`, deleted };
  }
}