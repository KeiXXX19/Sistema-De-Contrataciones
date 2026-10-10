import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBroker } from '@platform/shared-kernel';
import {
  InMemoryJobRepository,
  CreateJobUseCase,
  AssignJobUseCase,
  SubmitDeliverableUseCase,
  ApproveJobUseCase,
  JobController,
} from '../src/index.js';

describe('Job Service - Hexagonal Unit Tests & State Machine', () => {
  let jobRepo: InMemoryJobRepository;
  let eventBroker: InMemoryEventBroker;
  let createJobUseCase: CreateJobUseCase;
  let assignJobUseCase: AssignJobUseCase;
  let submitDeliverableUseCase: SubmitDeliverableUseCase;
  let approveJobUseCase: ApproveJobUseCase;
  let controller: JobController;

  beforeEach(() => {
    jobRepo = new InMemoryJobRepository();
    eventBroker = new InMemoryEventBroker();
    createJobUseCase = new CreateJobUseCase(jobRepo, eventBroker);
    assignJobUseCase = new AssignJobUseCase(jobRepo, eventBroker);
    submitDeliverableUseCase = new SubmitDeliverableUseCase(jobRepo, eventBroker);
    approveJobUseCase = new ApproveJobUseCase(jobRepo, eventBroker);
    controller = new JobController(
      createJobUseCase,
      assignJobUseCase,
      submitDeliverableUseCase,
      approveJobUseCase,
      jobRepo
    );
  });

  it('debe crear un trabajo en estado OPEN y emitir JobCreatedEvent', async () => {
    const job = await createJobUseCase.execute({
      title: 'Desarrollo de API con NestJS',
      description: 'Construcción de arquitectura hexagonal para pasarelas',
      category: 'Desarrollo de Software',
      clientId: 'client-123',
      budgetAmount: 500.0,
    });

    expect(job.status).toBe('OPEN');
    expect(job.budgetAmount).toBe(500.0);
    expect(eventBroker.publishedEvents.length).toBe(1);
    expect(eventBroker.publishedEvents[0].eventName).toBe('job.created');
  });

  it('debe asignar el trabajo y pasar a ASSIGNED_PENDING_ESCROW', async () => {
    const job = await createJobUseCase.execute({
      title: 'Diseño de Logo e Identidad',
      description: 'Diseño vectorial y manual de marca corporativo',
      category: 'Diseño Gráfico',
      clientId: 'client-123',
      budgetAmount: 250.0,
    });

    const assigned = await assignJobUseCase.execute(job.id, 'provider-456', 200.0);

    expect(assigned.status).toBe('ASSIGNED_PENDING_ESCROW');
    expect(assigned.assignedProviderId).toBe('provider-456');
    expect(assigned.budgetAmount).toBe(200.0);

    const assignedEvent = eventBroker.publishedEvents.find((e) => e.eventName === 'job.assigned');
    expect(assignedEvent).toBeDefined();
    expect(assignedEvent?.payload.providerId).toBe('provider-456');
  });

  it('no debe permitir entregar un trabajo que no esté EN PROGRESO', async () => {
    const job = await createJobUseCase.execute({
      title: 'Auditoría de Seguridad Cloud',
      description: 'Revisión exhaustiva de configuraciones y buckets',
      category: 'Ciberseguridad',
      clientId: 'client-123',
      budgetAmount: 1000.0,
    });

    // En estado OPEN todavía no se puede entregar
    await expect(
      submitDeliverableUseCase.execute(job.id, 'https://github.com/entrega')
    ).rejects.toThrow(/EN PROGRESO/);
  });

  it('debe completar el ciclo de entrega y aprobación correctamente', async () => {
    const job = await createJobUseCase.execute({
      title: 'Landing Page Corporativa',
      description: 'Página web responsive con formulario de contacto',
      category: 'Web',
      clientId: 'client-123',
      budgetAmount: 300.0,
    });

    await assignJobUseCase.execute(job.id, 'provider-789', 300.0);

    // Simulamos la llegada del evento de Escrow confirmado activando el trabajo
    const domainJob = await jobRepo.findById(job.id);
    domainJob!.confirmEscrowFunded();
    await jobRepo.save(domainJob!);

    expect(domainJob?.status).toBe('IN_PROGRESS');

    // Proveedor entrega
    const delivered = await submitDeliverableUseCase.execute(
      job.id,
      'https://demo.app/preview',
      'Listo para revisión del cliente'
    );
    expect(delivered.status).toBe('UNDER_REVIEW');
    expect(delivered.deliverableUrl).toBe('https://demo.app/preview');

    // Cliente aprueba
    const approved = await approveJobUseCase.execute(job.id);
    expect(approved.status).toBe('COMPLETED');

    const approvedEvent = eventBroker.publishedEvents.find((e) => e.eventName === 'job.approved');
    expect(approvedEvent).toBeDefined();
  });
});
