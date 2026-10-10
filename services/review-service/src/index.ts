import { AggregateRoot, DomainEvent, UniqueEntityID, IEventBroker } from '@platform/shared-kernel';

// ==========================================
// 1. DOMINIO: VALUE OBJECTS & ENTIDAD
// ==========================================
export class RatingScore {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new Error(`La calificación debe ser un número entero entre 1 y 5 estrellas. Recibido: ${value}`);
    }
    this._value = value;
  }

  get value(): number {
    return this._value;
  }
}

export interface ReviewProps {
  jobId: string;
  reviewerId: string;
  reviewedUserId: string;
  score: RatingScore;
  comment: string;
  createdAt: Date;
}

export class ReviewSubmittedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'review.submitted';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      reviewId: string;
      jobId: string;
      reviewerId: string;
      reviewedUserId: string;
      score: number;
    }
  ) {}
}

export class Review extends AggregateRoot<ReviewProps> {
  private constructor(props: ReviewProps, id?: UniqueEntityID) {
    super(props, id);
  }

  static create(
    props: {
      jobId: string;
      reviewerId: string;
      reviewedUserId: string;
      score: number;
      comment: string;
    },
    id?: UniqueEntityID
  ): Review {
    if (!props.jobId) throw new Error('El ID del trabajo es requerido');
    if (!props.reviewerId) throw new Error('El ID del revisor es requerido');
    if (!props.reviewedUserId) throw new Error('El ID del usuario evaluado es requerido');
    if (props.reviewerId === props.reviewedUserId) {
      throw new Error('Un usuario no puede calificarse a sí mismo');
    }
    if (!props.comment || props.comment.trim().length < 5) {
      throw new Error('El comentario debe contener al menos 5 caracteres');
    }

    const rating = new RatingScore(props.score);
    const review = new Review(
      {
        jobId: props.jobId,
        reviewerId: props.reviewerId,
        reviewedUserId: props.reviewedUserId,
        score: rating,
        comment: props.comment.trim(),
        createdAt: new Date(),
      },
      id
    );

    review.addDomainEvent(
      new ReviewSubmittedEvent(review.id.toString(), {
        reviewId: review.id.toString(),
        jobId: review.props.jobId,
        reviewerId: review.props.reviewerId,
        reviewedUserId: review.props.reviewedUserId,
        score: review.props.score.value,
      })
    );

    return review;
  }

  get jobId(): string {
    return this.props.jobId;
  }

  get reviewerId(): string {
    return this.props.reviewerId;
  }

  get reviewedUserId(): string {
    return this.props.reviewedUserId;
  }

  get score(): RatingScore {
    return this.props.score;
  }

  get comment(): string {
    return this.props.comment;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

// ==========================================
// 2. PUERTOS (IN & OUT)
// ==========================================
export interface IReviewRepository {
  save(review: Review): Promise<void>;
  findById(id: string): Promise<Review | null>;
  findByJobAndReviewer(jobId: string, reviewerId: string): Promise<Review | null>;
  findByReviewedUser(reviewedUserId: string): Promise<Review[]>;
}

export interface SubmitReviewDTO {
  jobId: string;
  reviewerId: string;
  reviewedUserId: string;
  score: number;
  comment: string;
}

export interface ReputationSummaryDTO {
  userId: string;
  averageScore: number;
  totalReviews: number;
  recentReviews: Array<{
    jobId: string;
    reviewerId: string;
    score: number;
    comment: string;
    createdAt: Date;
  }>;
}

// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class SubmitReviewUseCase {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: SubmitReviewDTO): Promise<{ id: string; score: number; comment: string }> {
    const existing = await this.reviewRepo.findByJobAndReviewer(dto.jobId, dto.reviewerId);
    if (existing) {
      throw new Error('Ya has emitido una reseña para este trabajo');
    }

    const review = Review.create(dto);
    await this.reviewRepo.save(review);
    await this.eventBroker.publishAll(review.domainEvents);
    review.clearDomainEvents();

    return {
      id: review.id.toString(),
      score: review.score.value,
      comment: review.comment,
    };
  }
}

export class GetUserReputationUseCase {
  constructor(private readonly reviewRepo: IReviewRepository) {}

  async execute(userId: string): Promise<ReputationSummaryDTO> {
    const reviews = await this.reviewRepo.findByReviewedUser(userId);
    if (reviews.length === 0) {
      return {
        userId,
        averageScore: 0,
        totalReviews: 0,
        recentReviews: [],
      };
    }

    const totalScore = reviews.reduce((sum, r) => sum + r.score.value, 0);
    const averageScore = Number((totalScore / reviews.length).toFixed(2));

    return {
      userId,
      averageScore,
      totalReviews: reviews.length,
      recentReviews: reviews.slice(-5).map((r) => ({
        jobId: r.jobId,
        reviewerId: r.reviewerId,
        score: r.score.value,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
    };
  }
}

// ==========================================
// 4. ADAPTADORES (INFRASTRUCTURE LAYER)
// ==========================================
export class InMemoryReviewRepository implements IReviewRepository {
  private reviews = new Map<string, Review>();

  async save(review: Review): Promise<void> {
    this.reviews.set(review.id.toString(), review);
  }

  async findById(id: string): Promise<Review | null> {
    return this.reviews.get(id) || null;
  }

  async findByJobAndReviewer(jobId: string, reviewerId: string): Promise<Review | null> {
    for (const r of this.reviews.values()) {
      if (r.jobId === jobId && r.reviewerId === reviewerId) {
        return r;
      }
    }
    return null;
  }

  async findByReviewedUser(reviewedUserId: string): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter((r) => r.reviewedUserId === reviewedUserId);
  }

  clear(): void {
    this.reviews.clear();
  }
}

export class ReviewController {
  constructor(
    private readonly submitReviewUseCase: SubmitReviewUseCase,
    private readonly getReputationUseCase: GetUserReputationUseCase
  ) {}

  async handleSubmit(body: SubmitReviewDTO) {
    try {
      const data = await this.submitReviewUseCase.execute(body);
      return { statusCode: 201, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleGetReputation(userId: string) {
    try {
      const data = await this.getReputationUseCase.execute(userId);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }
}
