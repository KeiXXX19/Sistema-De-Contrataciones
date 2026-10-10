import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBroker } from '@platform/shared-kernel';
import { InMemoryJobFeedRepository, PublishToFeedUseCase, QueryJobFeedUseCase, CloseFeedItemUseCase, } from '../src/index.js';
describe('Job Feed Service - Filtros, Proyecciones y CQRS', () => {
    let repo;
    let broker;
    let publishUseCase;
    let queryUseCase;
    let closeUseCase;
    beforeEach(async () => {
        repo = new InMemoryJobFeedRepository();
        broker = new InMemoryEventBroker();
        publishUseCase = new PublishToFeedUseCase(repo, broker);
        queryUseCase = new QueryJobFeedUseCase(repo);
        closeUseCase = new CloseFeedItemUseCase(repo);
        // Seed de trabajos de ejemplo
        await publishUseCase.execute({
            jobId: 'job-1',
            title: 'API REST con NestJS y Hexagonal Architecture',
            description: 'Backend con TypeScript, NestJS, PostgreSQL y RabbitMQ.',
            category: 'Backend & Cloud',
            modalidad: 'REMOTO',
            clientId: 'client-1',
            clientName: 'Tech Ventures Inc',
            budgetMin: 400,
            budgetMax: 800,
            tags: ['typescript', 'nestjs', 'hexagonal'],
        });
        await publishUseCase.execute({
            jobId: 'job-2',
            title: 'Diseño de Identidad Visual y Logo Corporativo',
            description: 'Diseño vectorial para startup fintech.',
            category: 'Diseño Gráfico',
            modalidad: 'REMOTO',
            clientId: 'client-2',
            clientName: 'Fintech Latam SRL',
            budgetMin: 150,
            budgetMax: 350,
            tags: ['branding', 'illustrator', 'figma'],
        });
        await publishUseCase.execute({
            jobId: 'job-3',
            title: 'Instalación Eléctrica de Obra Residencial',
            description: 'Trabajo presencial en edificio de 4 pisos.',
            category: 'Obras & Remodelación',
            modalidad: 'PRESENCIAL',
            clientId: 'client-3',
            clientName: 'Constructora Bolivar',
            budgetMin: 1000,
            budgetMax: 2500,
            tags: ['electricidad', 'obra', 'presencial'],
        });
    });
    it('debe publicar un ítem en el feed y emitir JobFeedItemProjectedEvent', async () => {
        const item = await publishUseCase.execute({
            jobId: 'job-new',
            title: 'Auditoría de Seguridad en GCP',
            description: 'Revisión completa de configuraciones y IAM.',
            category: 'Ciberseguridad',
            modalidad: 'REMOTO',
            clientId: 'client-new',
            clientName: 'SecureCloud Co',
            budgetMin: 600,
            budgetMax: 1200,
        });
        expect(item.id).toBeDefined();
        expect(item.isOpen).toBe(true);
        const event = broker.publishedEvents.find((e) => e.eventName === 'jobfeed.item_projected' && e.payload.jobId === 'job-new');
        expect(event).toBeDefined();
        expect(event?.payload.title).toBe('Auditoría de Seguridad en GCP');
    });
    it('no debe permitir publicar el mismo jobId dos veces en el feed', async () => {
        await expect(publishUseCase.execute({
            jobId: 'job-1',
            title: 'Duplicado intento',
            description: 'No debería poder crearse.',
            category: 'Backend & Cloud',
            modalidad: 'REMOTO',
            clientId: 'client-1',
            clientName: 'Tech Ventures',
            budgetMin: 100,
            budgetMax: 200,
        })).rejects.toThrow(/ya está publicado/);
    });
    it('debe retornar todos los trabajos abiertos sin filtros', async () => {
        const results = await queryUseCase.execute({});
        expect(results.length).toBe(3);
        expect(results.every((r) => r.isOpen)).toBe(true);
    });
    it('debe filtrar por categoría correctamente', async () => {
        const results = await queryUseCase.execute({ category: 'Diseño' });
        expect(results.length).toBe(1);
        expect(results[0].category).toBe('Diseño Gráfico');
    });
    it('debe filtrar por modalidad PRESENCIAL', async () => {
        const results = await queryUseCase.execute({ modalidad: 'PRESENCIAL' });
        expect(results.length).toBe(1);
        expect(results[0].jobId).toBe('job-3');
    });
    it('debe filtrar por rango de presupuesto correctamente', async () => {
        // Solo trabajos que se solapen con el rango $300 - $600
        const results = await queryUseCase.execute({ budgetMin: 300, budgetMax: 600 });
        expect(results.length).toBe(2); // job-1 (400-800) y job-2 (150-350)
    });
    it('debe buscar por texto en título, descripción y tags', async () => {
        const results = await queryUseCase.execute({ searchText: 'hexagonal' });
        expect(results.length).toBe(1);
        expect(results[0].jobId).toBe('job-1');
    });
    it('debe cerrar un ítem del feed cuando el trabajo es asignado', async () => {
        await closeUseCase.execute('job-2');
        const openItems = await queryUseCase.execute({ onlyOpen: true });
        expect(openItems.some((i) => i.jobId === 'job-2')).toBe(false);
    });
    it('debe filtrar por ubicación en Colombia y por fuente de empleo', async () => {
        await publishUseCase.execute({
            jobId: 'co-job-1',
            title: 'Desarrollador React en Medellín',
            description: 'Trabajo híbrido en Antioquia.',
            category: 'Tecnología',
            modalidad: 'HIBRIDO',
            clientId: 'empresa-1',
            clientName: 'Tech Medellín',
            budgetMin: 5000000,
            budgetMax: 7000000,
            location: 'Medellín, Antioquia',
            source: 'COMPUTRABAJO',
        });
        const medellin = await queryUseCase.execute({ location: 'Medellín' });
        expect(medellin.length).toBe(1);
        expect(medellin[0].source).toBe('COMPUTRABAJO');
        expect(medellin[0].location).toBe('Medellín, Antioquia');
        const computrabajo = await queryUseCase.execute({ source: 'COMPUTRABAJO' });
        expect(computrabajo.length).toBe(1);
    });
});
