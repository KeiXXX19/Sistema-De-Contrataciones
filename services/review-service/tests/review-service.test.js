import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBroker } from '@platform/shared-kernel';
import { InMemoryReviewRepository, SubmitReviewUseCase, GetUserReputationUseCase, ReviewController, } from '../src/index.js';
describe('Review & Rating Service - Hexagonal Unit Tests', () => {
    let repo;
    let broker;
    let submitUseCase;
    let reputationUseCase;
    let controller;
    beforeEach(() => {
        repo = new InMemoryReviewRepository();
        broker = new InMemoryEventBroker();
        submitUseCase = new SubmitReviewUseCase(repo, broker);
        reputationUseCase = new GetUserReputationUseCase(repo);
        controller = new ReviewController(submitUseCase, reputationUseCase);
    });
    it('debe registrar una calificación válida y emitir ReviewSubmittedEvent', async () => {
        const review = await submitUseCase.execute({
            jobId: 'job-100',
            reviewerId: 'client-1',
            reviewedUserId: 'provider-1',
            score: 5,
            comment: 'Excelente calidad de código y entrega a tiempo!',
        });
        expect(review.id).toBeDefined();
        expect(review.score).toBe(5);
        expect(broker.publishedEvents.length).toBe(1);
        expect(broker.publishedEvents[0].eventName).toBe('review.submitted');
    });
    it('no debe permitir calificaciones fuera del rango 1 a 5', async () => {
        await expect(submitUseCase.execute({
            jobId: 'job-101',
            reviewerId: 'client-1',
            reviewedUserId: 'provider-1',
            score: 6, // Fuera de rango
            comment: 'Comentario de prueba',
        })).rejects.toThrow(/entre 1 y 5 estrellas/);
    });
    it('no debe permitir que un usuario se califique a sí mismo', async () => {
        await expect(submitUseCase.execute({
            jobId: 'job-102',
            reviewerId: 'user-same',
            reviewedUserId: 'user-same',
            score: 5,
            comment: 'Me auto-califico bien',
        })).rejects.toThrow(/calificarse a sí mismo/);
    });
    it('debe calcular correctamente el promedio de reputación de un prestador', async () => {
        // Prestador recibe dos reseñas: 5 y 4 estrellas -> promedio 4.5
        await submitUseCase.execute({
            jobId: 'job-1',
            reviewerId: 'client-A',
            reviewedUserId: 'provider-star',
            score: 5,
            comment: 'Trabajo impecable',
        });
        await submitUseCase.execute({
            jobId: 'job-2',
            reviewerId: 'client-B',
            reviewedUserId: 'provider-star',
            score: 4,
            comment: 'Muy buena comunicación',
        });
        const reputation = await reputationUseCase.execute('provider-star');
        expect(reputation.totalReviews).toBe(2);
        expect(reputation.averageScore).toBe(4.5);
        expect(reputation.recentReviews.length).toBe(2);
    });
});
