import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBroker, DomainEvent } from '@platform/shared-kernel';
import {
  InMemoryAuditRepository,
  RegisterAuditEntryUseCase,
  QueryAuditLogUseCase,
  AuditEventProjector,
  AuditController,
} from '../src/index.js';

function eventoPrueba(
  eventName: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  occurredOn = new Date()
): DomainEvent {
  return {
    eventId: `evt-${eventName}-${aggregateId}`,
    eventName,
    aggregateId,
    occurredOn,
    payload,
  };
}

describe('Audit Service - Read Model de Auditoría', () => {
  let repo: InMemoryAuditRepository;
  let broker: InMemoryEventBroker;
  let registerUseCase: RegisterAuditEntryUseCase;
  let queryUseCase: QueryAuditLogUseCase;
  let projector: AuditEventProjector;
  let controller: AuditController;

  beforeEach(async () => {
    repo = new InMemoryAuditRepository();
    broker = new InMemoryEventBroker();
    registerUseCase = new RegisterAuditEntryUseCase(repo);
    queryUseCase = new QueryAuditLogUseCase(repo);
    projector = new AuditEventProjector(broker, registerUseCase);
    controller = new AuditController(queryUseCase);
    await projector.setupSubscriptions();
  });

  it('debe proyectar eventos del broker como entradas de auditoría', async () => {
    const t0 = new Date(Date.now() - 1000);
    const t1 = new Date(Date.now());
    await broker.publish(
      eventoPrueba('user.registered', 'user-1', { userId: 'user-1', email: 'ana@ejemplo.com', role: 'CLIENT' }, t0)
    );
    await broker.publish(
      eventoPrueba('escrow.deposited', 'escrow-1', {
        escrowId: 'escrow-1',
        jobId: 'job-1',
        clientId: 'user-1',
        amountHeld: 515,
      }, t1)
    );

    const log = await queryUseCase.execute();
    expect(log.length).toBe(2);
    expect(log[0].eventName).toBe('escrow.deposited'); // más reciente primero
    expect(log[0].entityType).toBe('CUSTODIA');
    expect(log[0].description).toBe('Depósito retenido en custodia');
    expect(log[0].amount).toBe(515);
    expect(log[1].entityType).toBe('USUARIO');
    expect(log[1].actorId).toBe('user-1');
  });

  it('debe extraer el actor administrativo de eventos de disputa y bloqueo', async () => {
    await broker.publish(
      eventoPrueba('escrow.dispute_resolved', 'escrow-9', {
        escrowId: 'escrow-9',
        jobId: 'job-9',
        adminId: 'admin-1',
        resolution: 'REFUNDED_TO_CLIENT',
      })
    );
    await broker.publish(
      eventoPrueba('user.blocked', 'user-2', {
        userId: 'user-2',
        actorId: 'admin-1',
        reason: 'Fraude',
      })
    );

    const porActor = await queryUseCase.execute({ actorId: 'admin-1' });
    expect(porActor.length).toBe(2);
    expect(porActor.every((e) => e.actorId === 'admin-1')).toBe(true);

    const porDisputa = await queryUseCase.execute({ eventName: 'escrow.dispute_resolved' });
    expect(porDisputa.length).toBe(1);
    expect(porDisputa[0].actorId).toBe('admin-1');
  });

  it('debe filtrar por entidad, fecha y aggregateId relacionado', async () => {
    const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await broker.publish(eventoPrueba('job.created', 'job-1', { jobId: 'job-1', title: 'Web', budget: 500 }, ayer));
    await broker.publish(eventoPrueba('job.assigned', 'job-1', { jobId: 'job-1', providerId: 'prov-1', agreedAmount: 480 }));
    await broker.publish(eventoPrueba('escrow.created', 'escrow-1', { escrowId: 'escrow-1', jobId: 'job-1', totalToDeposit: 494.4 }));

    const trabajos = await queryUseCase.execute({ entityType: 'TRABAJO' });
    expect(trabajos.length).toBe(2);

    const hoy = new Date(Date.now() - 60 * 1000);
    const recientes = await queryUseCase.execute({ from: hoy });
    expect(recientes.length).toBe(2);

    const antiguos = await queryUseCase.execute({ to: hoy });
    expect(antiguos.length).toBe(1);
    expect(antiguos[0].eventName).toBe('job.created');

    // Por aggregateId directo o id relacionado (escrow-1 referencia job-1)
    const deJob1 = await queryUseCase.execute({ aggregateId: 'job-1' });
    expect(deJob1.length).toBe(3);
  });

  it('debe limitar resultados y el controlador responder con estados adecuados', async () => {
    for (let i = 1; i <= 5; i++) {
      await broker.publish(
        eventoPrueba('user.logged_in', `user-${i}`, { userId: `user-${i}`, email: `u${i}@ejemplo.com` })
      );
    }

    const limitados = await queryUseCase.execute({ limit: 2 });
    expect(limitados.length).toBe(2);
    expect(limitados[0].eventName).toBe('user.logged_in');

    const res = await controller.handleGetLog({ limit: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.data?.length).toBe(3);
    expect((await repo.count())).toBe(5);
  });

  it('debe rechazar entradas de auditoría sin descripción', async () => {
    await expect(
      registerUseCase.execute({
        occurredAt: new Date(),
        eventName: 'user.registered',
        entityType: 'USUARIO',
        aggregateId: 'user-1',
        description: '',
        affectedIds: [],
        result: 'EXITOSA',
      })
    ).rejects.toThrow(/descripción/);
  });
});
