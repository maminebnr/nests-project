export class Book {
  id: number;
  title: string;
  author: string;
  year: number;
  price: number;
  quantity: number;
  /** Denormalised review summary - maintained by the Review module. */
  ratingAverage: number;
  ratingCount: number;
  /** Bayesian rating, best value to sort a catalogue by. */
  weightedRating: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface BookRatingSummary {
  ratingAverage: number;
  ratingCount: number;
  weightedRating: number;
}
