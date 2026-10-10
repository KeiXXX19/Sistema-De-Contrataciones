import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBroker } from '@platform/shared-kernel';
import {
  InMemoryEscrowRepository,
  MockEscrowPaymentGateway,
  CreateEscrowUseCase,
  DepositEscrowUseCase,
  ReleaseEscrowUseCase,
  OpenEscrowDisputeUseCase,
  ResolveEscrowDisputeUseCase,
  CancelEscrowUseCase,
  ListEscrowsUseCase,
  Escrow,
} from '../src/index.js';

describe('Escrow & Payment Service - Hexagonal Unit Tests', () => {
  let repo: InMemoryEscrowRepository;
  let broker: InMemoryEventBroker;
  let gateway: MockEscrowPaymentGateway;
  let createUseCase: CreateEscrowUseCase;
  let depositUseCase: DepositEscrowUseCase;
  let releaseUseCase: ReleaseEscrowUseCase;

  beforeEach(() => {
    repo = new InMemoryEscrowRepository();
    broker = new InMemoryEventBroker();
    gateway = new MockEscrowPaymentGateway();
    createUseCase = new CreateEscrowUseCase(repo, broker);
    depositUseCase = new DepositEscrowUseCase(repo, gateway, broker);
    releaseUseCase = new ReleaseEscrowUseCase(repo, gateway, broker);
  });

  it('debe calcular matemáticamente las comisiones de forma exacta', () => {
    // Trabajo de $500:
    // Tarifa cliente 3% = $15 -> Cliente paga $515
    // Comisión prestador 10% = $50 -> Prestador recibe $450
    // Ganancia de la plataforma = $15 + $50 = $65
    const fees = Escrow.calculateFees(500.0, 3, 10);

    expect(fees.baseAmount.toDecimal).toBe(500.0);
    expect(fees.clientFeeAmount.toDecimal).toBe(15.0);
    expect(fees.totalClientPaid.toDecimal).toBe(515.0);
    expect(fees.providerCommissionAmount.toDecimal).toBe(50.0);
    expect(fees.netProviderPayout.toDecimal).toBe(450.0);
    expect(fees.platformProfit.toDecimal).toBe(65.0);
  });

  it('debe crear el contrato de custodia en estado PENDING_DEPOSIT', async () => {
    const escrow = await createUseCase.execute({
      jobId: 'job-999',
      clientId: 'client-1',
      providerId: 'provider-1',
      agreedAmountDecimal: 1000.0,
    });

    expect(escrow.status).toBe('PENDING_DEPOSIT');
    expect(escrow.baseAmount).toBe(1000.0);
    expect(escrow.totalClientPaid).toBe(1030.0); // 1000 + 3%
    expect(escrow.netProviderPayout).toBe(900.0); // 1000 - 10%
    expect(escrow.platformProfit).toBe(130.0); // 30 + 100

    expect(broker.publishedEvents[0].eventName).toBe('escrow.created');
  });

  it('debe retener los fondos en custodia mediante la pasarela de pagos', async () => {
    const created = await createUseCase.execute({
      jobId: 'job-555',
      clientId: 'client-1',
      providerId: 'provider-1',
      agreedAmountDecimal: 200.0,
    });

    const deposited = await depositUseCase.execute(created.id, 'pm_card_visa_123');

    expect(deposited.status).toBe('FUNDS_HELD');
    expect(deposited.paymentTransactionId).toBeDefined();
    expect(gateway.capturedDeposits.length).toBe(1);
    expect(gateway.capturedDeposits[0].amount.toDecimal).toBe(206.0); // 200 + 3%

    const depositedEvent = broker.publishedEvents.find((e) => e.eventName === 'escrow.deposited');
    expect(depositedEvent).toBeDefined();
  });

  it('debe liberar los fondos netos al prestador reteniendo la comisión de la plataforma', async () => {
    const created = await createUseCase.execute({
      jobId: 'job-777',
      clientId: 'client-1',
      providerId: 'provider-1',
      agreedAmountDecimal: 1000.0,
    });

    await depositUseCase.execute(created.id, 'pm_card_mastercard_456');

    const released = await releaseUseCase.execute(created.id, 'acct_stripe_provider_789');

    expect(released.status).toBe('RELEASED');
    expect(released.payoutTransactionId).toBeDefined();

    expect(gateway.payouts.length).toBe(1);
    expect(gateway.payouts[0].netAmount.toDecimal).toBe(900.0);
    expect(gateway.payouts[0].providerAccountId).toBe('acct_stripe_provider_789');

    const releasedEvent = broker.publishedEvents.find((e) => e.eventName === 'escrow.released');
    expect(releasedEvent).toBeDefined();
    expect(releasedEvent?.payload.netPayoutAmount).toBe(900.0);
    expect(releasedEvent?.payload.platformFeeRetained).toBe(130.0);
  });

  it('no debe permitir liberar fondos si no han sido depositados previamente', async () => {
    const created = await createUseCase.execute({
      jobId: 'job-fail',
      clientId: 'client-1',
      providerId: 'provider-1',
      agreedAmountDecimal: 100.0,
    });

    await expect(
      releaseUseCase.execute(created.id, 'acct_stripe_provider_123')
    ).rejects.toThrow(/fondos actualmente retenidos/);
  });
});

describe('Escrow & Payment Service - Disputas y acciones administrativas', () => {
  let repo: InMemoryEscrowRepository;
  let broker: InMemoryEventBroker;
  let gateway: MockEscrowPaymentGateway;
  let createUseCase: CreateEscrowUseCase;
  let depositUseCase: DepositEscrowUseCase;
  let openDisputeUseCase: OpenEscrowDisputeUseCase;
  let resolveDisputeUseCase: ResolveEscrowDisputeUseCase;
  let cancelUseCase: CancelEscrowUseCase;
  let listUseCase: ListEscrowsUseCase;

  const depositar = async (jobId: string, monto = 500.0) => {
    const created = await createUseCase.execute({
      jobId,
      clientId: 'client-1',
      providerId: 'provider-1',
      agreedAmountDecimal: monto,
    });
    await depositUseCase.execute(created.id, 'pm_card_visa_123');
    return created.id;
  };

  beforeEach(() => {
    repo = new InMemoryEscrowRepository();
    broker = new InMemoryEventBroker();
    gateway = new MockEscrowPaymentGateway();
    createUseCase = new CreateEscrowUseCase(repo, broker);
    depositUseCase = new DepositEscrowUseCase(repo, gateway, broker);
    openDisputeUseCase = new OpenEscrowDisputeUseCase(repo, broker);
    resolveDisputeUseCase = new ResolveEscrowDisputeUseCase(repo, gateway, broker);
    cancelUseCase = new CancelEscrowUseCase(repo, broker);
    listUseCase = new ListEscrowsUseCase(repo);
  });

  it('debe abrir una disputa sobre fondos retenidos y emitir escrow.dispute_opened', async () => {
    const escrowId = await depositar('job-disputa-1');

    const disputado = await openDisputeUseCase.execute({
      escrowId,
      openedBy: 'client-1',
      reason: 'El prestador no entregó el trabajo acordado',
    });

    expect(disputado.status).toBe('DISPUTED');
    expect(disputado.disputeReason).toBe('El prestador no entregó el trabajo acordado');
    expect(disputado.disputeOpenedBy).toBe('client-1');

    const evento = broker.publishedEvents.find((e) => e.eventName === 'escrow.dispute_opened');
    expect(evento).toBeDefined();
    expect(evento?.payload.openedBy).toBe('client-1');
    expect(evento?.payload.amountHeld).toBe(515.0); // 500 + 3%
  });

  it('debe resolver la disputa a favor del prestador liberando el pago neto', async () => {
    const escrowId = await depositar('job-disputa-2');

    await openDisputeUseCase.execute({
      escrowId,
      openedBy: 'client-1',
      reason: 'El prestador entregó parcialmente el trabajo',
    });

    const resuelto = await resolveDisputeUseCase.execute({
      escrowId,
      adminId: 'admin-1',
      resolution: 'RELEASED_TO_PROVIDER',
    });

    expect(resuelto.status).toBe('RELEASED');
    expect(resuelto.payoutTransactionId).toBeDefined();
    expect(resuelto.disputeResolvedBy).toBe('admin-1');
    expect(resuelto.disputeResolution).toBe('RELEASED_TO_PROVIDER');

    expect(gateway.payouts.length).toBe(1);
    expect(gateway.payouts[0].netAmount.toDecimal).toBe(450.0); // 500 - 10%
    expect(gateway.payouts[0].providerAccountId).toBe('acct_prov_provider-1');

    expect(broker.publishedEvents.some((e) => e.eventName === 'escrow.released')).toBe(true);
    const resueltoEvento = broker.publishedEvents.find(
      (e) => e.eventName === 'escrow.dispute_resolved'
    );
    expect(resueltoEvento?.payload.adminId).toBe('admin-1');
    expect(resueltoEvento?.payload.resolution).toBe('RELEASED_TO_PROVIDER');
  });

  it('debe resolver la disputa a favor del cliente reembolsando el total pagado', async () => {
    const escrowId = await depositar('job-disputa-3');

    await openDisputeUseCase.execute({
      escrowId,
      openedBy: 'provider-1',
      reason: 'El cliente afirma que nunca recibió la entrega final',
    });

    const reembolsado = await resolveDisputeUseCase.execute({
      escrowId,
      adminId: 'admin-1',
      resolution: 'REFUNDED_TO_CLIENT',
    });

    expect(reembolsado.status).toBe('REFUNDED');
    expect(reembolsado.refundTransactionId).toBeDefined();
    expect(reembolsado.disputeResolution).toBe('REFUNDED_TO_CLIENT');

    expect(gateway.refunds.length).toBe(1);
    expect(gateway.refunds[0].amount.toDecimal).toBe(515.0); // total pagado por el cliente

    expect(broker.publishedEvents.some((e) => e.eventName === 'escrow.refunded')).toBe(true);
    expect(broker.publishedEvents.some((e) => e.eventName === 'escrow.dispute_resolved')).toBe(true);
  });

  it('no debe permitir disputar una custodia sin fondos retenidos', async () => {
    const created = await createUseCase.execute({
      jobId: 'job-sin-fondos',
      clientId: 'client-1',
      providerId: 'provider-1',
      agreedAmountDecimal: 100.0,
    });

    await expect(
      openDisputeUseCase.execute({
        escrowId: created.id,
        openedBy: 'client-1',
        reason: 'Motivo suficientemente largo para la disputa',
      })
    ).rejects.toThrow(/Solo se puede disputar una custodia con fondos retenidos/);
  });

  it('no debe permitir resolver una disputa inexistente ni un motivo demasiado corto', async () => {
    const escrowId = await depositar('job-disputa-4');

    await expect(
      resolveDisputeUseCase.execute({ escrowId, adminId: 'admin-1', resolution: 'REFUNDED_TO_CLIENT' })
    ).rejects.toThrow(/No hay una disputa activa/);

    await expect(
      openDisputeUseCase.execute({ escrowId, openedBy: 'client-1', reason: 'corto' })
    ).rejects.toThrow(/al menos 10 caracteres/);
  });

  it('debe cancelar administrativamente una custodia pendiente de depósito', async () => {
    const created = await createUseCase.execute({
      jobId: 'job-cancelar',
      clientId: 'client-1',
      providerId: 'provider-1',
      agreedAmountDecimal: 300.0,
    });

    const cancelado = await cancelUseCase.execute({
      escrowId: created.id,
      adminId: 'admin-1',
      reason: 'Trabajo cancelado por el cliente antes de pagar',
    });

    expect(cancelado.status).toBe('CANCELLED');
    expect(gateway.capturedDeposits.length).toBe(0); // nunca se cobró nada
    expect(gateway.refunds.length).toBe(0);

    const evento = broker.publishedEvents.find((e) => e.eventName === 'escrow.cancelled');
    expect(evento?.payload.adminId).toBe('admin-1');
    expect(evento?.payload.jobId).toBe('job-cancelar');

    // Una custodia con fondos ya retenidos no se puede cancelar por esta vía
    const escrowId = await depositar('job-cancelar-2');
    await expect(
      cancelUseCase.execute({ escrowId, adminId: 'admin-1', reason: 'Intento inválido' })
    ).rejects.toThrow(/pendiente de depósito/);
  });

  it('debe listar custodias con filtro por estado', async () => {
    const idPendiente = (
      await createUseCase.execute({
        jobId: 'job-lista-1',
        clientId: 'client-1',
        providerId: 'provider-1',
        agreedAmountDecimal: 100.0,
      })
    ).id;
    await depositar('job-lista-2');
    const idDisputado = await depositar('job-lista-3');
    await openDisputeUseCase.execute({
      escrowId: idDisputado,
      openedBy: 'client-1',
      reason: 'Otro motivo suficientemente largo',
    });

    const todas = await listUseCase.execute();
    expect(todas.length).toBe(3);

    const disputadas = await listUseCase.execute({ status: 'DISPUTED' });
    expect(disputadas.length).toBe(1);
    expect(disputadas[0].id).toBe(idDisputado);

    const pendientes = await listUseCase.execute({ status: 'PENDING_DEPOSIT' });
    expect(pendientes.length).toBe(1);
    expect(pendientes[0].id).toBe(idPendiente);
    expect(pendientes[0].createdAt).toBeInstanceOf(Date);
  });
});
