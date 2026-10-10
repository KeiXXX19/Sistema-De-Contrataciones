import { AggregateRoot } from '@platform/shared-kernel';
// ==========================================
// 1. DOMINIO: VALUE OBJECTS & ENTIDAD
// ==========================================
export class RatingScore {
    _value;
    constructor(value) {
        if (!Number.isInteger(value) || value < 1 || value > 5) {
            throw new Error(`La calificación debe ser un número entero entre 1 y 5 estrellas. Recibido: ${value}`);
        }
        this._value = value;
    }
    get value() {
        return this._value;
    }
}
export class ReviewSubmittedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'review.submitted';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class Review extends AggregateRoot {
    constructor(props, id) {
        super(props, id);
    }
    static create(props, id) {
        if (!props.jobId)
            throw new Error('El ID del trabajo es requerido');
        if (!props.reviewerId)
            throw new Error('El ID del revisor es requerido');
        if (!props.reviewedUserId)
            throw new Error('El ID del usuario evaluado es requerido');
        if (props.reviewerId === props.reviewedUserId) {
            throw new Error('Un usuario no puede calificarse a sí mismo');
        }
        if (!props.comment || props.comment.trim().length < 5) {
            throw new Error('El comentario debe contener al menos 5 caracteres');
        }
        const rating = new RatingScore(props.score);
        const review = new Review({
            jobId: props.jobId,
            reviewerId: props.reviewerId,
            reviewedUserId: props.reviewedUserId,
            score: rating,
            comment: props.comment.trim(),
            createdAt: new Date(),
        }, id);
        review.addDomainEvent(new ReviewSubmittedEvent(review.id.toString(), {
            reviewId: review.id.toString(),
            jobId: review.props.jobId,
            reviewerId: review.props.reviewerId,
            reviewedUserId: review.props.reviewedUserId,
            score: review.props.score.value,
        }));
        return review;
    }
    get jobId() {
        return this.props.jobId;
    }
    get reviewerId() {
        return this.props.reviewerId;
    }
    get reviewedUserId() {
        return this.props.reviewedUserId;
    }
    get score() {
        return this.props.score;
    }
    get comment() {
        return this.props.comment;
    }
    get createdAt() {
        return this.props.createdAt;
    }
}
// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class SubmitReviewUseCase {
    reviewRepo;
    eventBroker;
    constructor(reviewRepo, eventBroker) {
        this.reviewRepo = reviewRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
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
    reviewRepo;
    constructor(reviewRepo) {
        this.reviewRepo = reviewRepo;
    }
    async execute(userId) {
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
export class InMemoryReviewRepository {
    reviews = new Map();
    async save(review) {
        this.reviews.set(review.id.toString(), review);
    }
    async findById(id) {
        return this.reviews.get(id) || null;
    }
    async findByJobAndReviewer(jobId, reviewerId) {
        for (const r of this.reviews.values()) {
            if (r.jobId === jobId && r.reviewerId === reviewerId) {
                return r;
            }
        }
        return null;
    }
    async findByReviewedUser(reviewedUserId) {
        return Array.from(this.reviews.values()).filter((r) => r.reviewedUserId === reviewedUserId);
    }
    clear() {
        this.reviews.clear();
    }
}
export class ReviewController {
    submitReviewUseCase;
    getReputationUseCase;
    constructor(submitReviewUseCase, getReputationUseCase) {
        this.submitReviewUseCase = submitReviewUseCase;
        this.getReputationUseCase = getReputationUseCase;
    }
    async handleSubmit(body) {
        try {
            const data = await this.submitReviewUseCase.execute(body);
            return { statusCode: 201, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleGetReputation(userId) {
        try {
            const data = await this.getReputationUseCase.execute(userId);
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
}
