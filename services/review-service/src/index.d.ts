import { AggregateRoot, DomainEvent, UniqueEntityID, IEventBroker } from '@platform/shared-kernel';
export declare class RatingScore {
    private readonly _value;
    constructor(value: number);
    get value(): number;
}
export interface ReviewProps {
    jobId: string;
    reviewerId: string;
    reviewedUserId: string;
    score: RatingScore;
    comment: string;
    createdAt: Date;
}
export declare class ReviewSubmittedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        reviewId: string;
        jobId: string;
        reviewerId: string;
        reviewedUserId: string;
        score: number;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "review.submitted";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        reviewId: string;
        jobId: string;
        reviewerId: string;
        reviewedUserId: string;
        score: number;
    });
}
export declare class Review extends AggregateRoot<ReviewProps> {
    private constructor();
    static create(props: {
        jobId: string;
        reviewerId: string;
        reviewedUserId: string;
        score: number;
        comment: string;
    }, id?: UniqueEntityID): Review;
    get jobId(): string;
    get reviewerId(): string;
    get reviewedUserId(): string;
    get score(): RatingScore;
    get comment(): string;
    get createdAt(): Date;
}
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
export declare class SubmitReviewUseCase {
    private readonly reviewRepo;
    private readonly eventBroker;
    constructor(reviewRepo: IReviewRepository, eventBroker: IEventBroker);
    execute(dto: SubmitReviewDTO): Promise<{
        id: string;
        score: number;
        comment: string;
    }>;
}
export declare class GetUserReputationUseCase {
    private readonly reviewRepo;
    constructor(reviewRepo: IReviewRepository);
    execute(userId: string): Promise<ReputationSummaryDTO>;
}
export declare class InMemoryReviewRepository implements IReviewRepository {
    private reviews;
    save(review: Review): Promise<void>;
    findById(id: string): Promise<Review | null>;
    findByJobAndReviewer(jobId: string, reviewerId: string): Promise<Review | null>;
    findByReviewedUser(reviewedUserId: string): Promise<Review[]>;
    clear(): void;
}
export declare class ReviewController {
    private readonly submitReviewUseCase;
    private readonly getReputationUseCase;
    constructor(submitReviewUseCase: SubmitReviewUseCase, getReputationUseCase: GetUserReputationUseCase);
    handleSubmit(body: SubmitReviewDTO): Promise<{
        statusCode: number;
        data: {
            id: string;
            score: number;
            comment: string;
        };
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleGetReputation(userId: string): Promise<{
        statusCode: number;
        data: ReputationSummaryDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
}
