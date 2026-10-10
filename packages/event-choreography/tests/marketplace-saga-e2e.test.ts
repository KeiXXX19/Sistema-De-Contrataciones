import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryEventBroker } from '@platform/shared-kernel';
import {
  InMemoryUserRepository,
  RegisterUserUseCase,
  VerifyUserUseCase,
} from '@platform/user-service';
import {
  InMemoryJobRepository,
  CreateJobUseCase,
  SubmitDeliverableUseCase,
  ApproveJobUseCase,
} from '@platform/job-service';
import {
  InMemoryProposalRepository,
  SubmitProposalUseCase,
  AcceptProposalUseCase,
} from '@platform/bidding-service';
import {
  InMemoryEscrowRepository,
  MockEscrowPaymentGateway,
  CreateEscrowUseCase,
  DepositEscrowUseCase,
  ReleaseEscrowUseCase,
  OpenEscrowDisputeUseCase,
  ResolveEscrowDisputeUseCase,
  CancelEscrowUseCase,
} from '@platform/escrow-service';
import {
  InMemoryReviewRepository,
  SubmitReviewUseCase,
  GetUserReputationUseCase,
} from '@platform/review-service';
import { MarketplaceEventCoordinator } from '../src/index.js';

describe('Marketplace Saga & Event Choreography - E2E Lifecycle Test', () => {
  let broker: InMemoryEventBroker;

  // User Service
  let userRepo: InMemoryUserRepository;
  let registerUserUseCase: RegisterUserUseCase;
  let verifyUserUseCase: VerifyUserUseCase;

  // Job Service
  let jobRepo: InMemoryJobRepository;
  let createJobUseCase: CreateJobUseCase;
  let submitDeliverableUseCase: SubmitDeliverableUseCase;
  let approveJobUseCase: ApproveJobUseCase;

  // Bidding Service
  let proposalRepo: InMemoryProposalRepository;
  let submitProposalUseCase: SubmitProposalUseCase;
  let acceptProposalUseCase: AcceptProposalUseCase;

  // Escrow Service
  let escrowRepo: InMemoryEscrowRepository;
  let paymentGateway: MockEscrowPaymentGateway;
  let createEscrowUseCase: CreateEscrowUseCase;
  let depositEscrowUseCase: DepositEscrowUseCase;
  let releaseEscrowUseCase: ReleaseEscrowUseCase;
  let openDisputeUseCase: OpenEscrowDisputeUseCase;
  let resolveDisputeUseCase: ResolveEscrowDisputeUseCase;
  let cancelEscrowUseCase: CancelEscrowUseCase;

  // Review Service
  let reviewRepo: InMemoryReviewRepository;
  let submitReviewUseCase: SubmitReviewUseCase;
  let getReputationUseCase: GetUserReputationUseCase;

  // Event Coordinator
  let coordinator: MarketplaceEventCoordinator;

  beforeEach(async () => {
    broker = new InMemoryEventBroker();

    userRepo = new InMemoryUserRepository();
    registerUserUseCase = new RegisterUserUseCase(userRepo, broker);
    verifyUserUseCase = new VerifyUserUseCase(userRepo, broker);

    jobRepo = new InMemoryJobRepository();
    createJobUseCase = new CreateJobUseCase(jobRepo, broker);
    submitDeliverableUseCase = new SubmitDeliverableUseCase(jobRepo, broker);
    approveJobUseCase = new ApproveJobUseCase(jobRepo, broker);

    proposalRepo = new InMemoryProposalRepository();
    submitProposalUseCase = new SubmitProposalUseCase(proposalRepo, broker);
    acceptProposalUseCase = new AcceptProposalUseCase(proposalRepo, broker);

    escrowRepo = new InMemoryEscrowRepository();
    paymentGateway = new MockEscrowPaymentGateway();
    createEscrowUseCase = new CreateEscrowUseCase(escrowRepo, broker);
    depositEscrowUseCase = new DepositEscrowUseCase(escrowRepo, paymentGateway, broker);
    releaseEscrowUseCase = new ReleaseEscrowUseCase(escrowRepo, paymentGateway, broker);
    openDisputeUseCase = new OpenEscrowDisputeUseCase(escrowRepo, broker);
    resolveDisputeUseCase = new ResolveEscrowDisputeUseCase(escrowRepo, paymentGateway, broker);
    cancelEscrowUseCase = new CancelEscrowUseCase(escrowRepo, broker);

    reviewRepo = new InMemoryReviewRepository();
    submitReviewUseCase = new SubmitReviewUseCase(reviewRepo, broker);
    getReputationUseCase = new GetUserReputationUseCase(reviewRepo);

    // Conectar el coordinador de eventos
    coordinator = new MarketplaceEventCoordinator(
      broker,
      jobRepo,
      escrowRepo,
      createEscrowUseCase,
      releaseEscrowUseCase
    );
    await coordinator.setupSubscriptions();
  });

  it('debe ejecutar el ciclo de vida completo de 5 microservicios coordinado por eventos asíncronos', async () => {
    // ----------------------------------------------------
    // PASO 1: Registro y Verificación de Usuarios
    // ----------------------------------------------------
    const client = await registerUserUseCase.execute({
      name: 'Tech Ventures Inc',
      email: 'contact@techventures.io',
      role: 'CLIENT',
    });

    const provider = await registerUserUseCase.execute({
      name: 'Dev Studio SRL',
      email: 'studio@devs.com',
      role: 'PROVIDER',
    });

    await verifyUserUseCase.execute(provider.id);

    // ----------------------------------------------------
    // PASO 2: Cliente publica requerimiento (Job / Publication Service)
    // ----------------------------------------------------
    const job = await createJobUseCase.execute({
      title: 'Sistema de Pasarela y Facturación Automática',
      description: 'Implementación de microservicios con NestJS y Docker',
      category: 'Backend Architecture',
      clientId: client.id,
      budgetAmount: 600.0,
    });

    expect(job.status).toBe('OPEN');

    // ----------------------------------------------------
    // PASO 3: Prestador envía su oferta (Bidding Service)
    // ----------------------------------------------------
    const proposal = await submitProposalUseCase.execute({
      jobId: job.id,
      providerId: provider.id,
      proposedAmountDecimal: 500.0,
      estimatedDays: 10,
      coverLetter: 'Experiencia previa comprobada en pasarelas bancarias y PCI-DSS.',
    });

    expect(proposal.status).toBe('SUBMITTED');

    // ----------------------------------------------------
    // PASO 4: Cliente acepta la oferta -> Dispara eventos en cadena
    // proposal.accepted -> JobService asigna -> job.assigned -> EscrowService crea custodia
    // ----------------------------------------------------
    await acceptProposalUseCase.execute(proposal.id);

    // Verificamos que JobService actualizó su estado automáticamente a ASSIGNED_PENDING_ESCROW
    const updatedJob = await jobRepo.findById(job.id);
    expect(updatedJob?.status).toBe('ASSIGNED_PENDING_ESCROW');
    expect(updatedJob?.assignedProviderId).toBe(provider.id);

    // Verificamos que EscrowService creó automáticamente el contrato de custodia
    const escrow = await escrowRepo.findByJobId(job.id);
    expect(escrow).toBeDefined();
    expect(escrow?.status).toBe('PENDING_DEPOSIT');
    expect(escrow?.fees.baseAmount.toDecimal).toBe(500.0);
    expect(escrow?.fees.totalClientPaid.toDecimal).toBe(515.0); // 500 + 3% tarifa cliente
    expect(escrow?.fees.netProviderPayout.toDecimal).toBe(450.0); // 500 - 10% comisión
    expect(escrow?.fees.platformProfit.toDecimal).toBe(65.0); // 15 + 50

    // ----------------------------------------------------
    // PASO 5: Cliente deposita fondos en Escrow (Escrow Service)
    // escrow.deposited -> JobService activa el trabajo a IN_PROGRESS
    // ----------------------------------------------------
    await depositEscrowUseCase.execute(escrow!.id.toString(), 'tok_visa_valid_999');

    const fundedEscrow = await escrowRepo.findById(escrow!.id.toString());
    expect(fundedEscrow?.status).toBe('FUNDS_HELD');

    const inProgressJob = await jobRepo.findById(job.id);
    expect(inProgressJob?.status).toBe('IN_PROGRESS');

    // ----------------------------------------------------
    // PASO 6: Prestador entrega el trabajo (Job Service)
    // ----------------------------------------------------
    await submitDeliverableUseCase.execute(
      job.id,
      'https://github.com/techventures/billing-service/releases/tag/v1.0.0',
      'Entregable completo con suite de pruebas y documentación swagger.'
    );

    const underReviewJob = await jobRepo.findById(job.id);
    expect(underReviewJob?.status).toBe('UNDER_REVIEW');

    // ----------------------------------------------------
    // PASO 7: Cliente aprueba el trabajo -> Dispara liberación de fondos
    // job.approved -> EscrowService libera fondos al prestador descontando comisión
    // ----------------------------------------------------
    await approveJobUseCase.execute(job.id);

    const completedJob = await jobRepo.findById(job.id);
    expect(completedJob?.status).toBe('COMPLETED');

    // Verificamos que el pago en Escrow fue liquidado automáticamente
    const releasedEscrow = await escrowRepo.findById(escrow!.id.toString());
    expect(releasedEscrow?.status).toBe('RELEASED');
    expect(paymentGateway.payouts.length).toBe(1);
    expect(paymentGateway.payouts[0].netAmount.toDecimal).toBe(450.0);

    // ----------------------------------------------------
    // PASO 8: Calificación y Reputación (Review & Rating Service)
    // ----------------------------------------------------
    await submitReviewUseCase.execute({
      jobId: job.id,
      reviewerId: client.id,
      reviewedUserId: provider.id,
      score: 5,
      comment: 'Trabajo excepcional, arquitectura limpia y entrega puntual.',
    });

    // Prestador también califica al cliente
    await submitReviewUseCase.execute({
      jobId: job.id,
      reviewerId: provider.id,
      reviewedUserId: client.id,
      score: 5,
      comment: 'Excelente comunicación y pagos puntuales a través de Escrow.',
    });

    const providerReputation = await getReputationUseCase.execute(provider.id);
    expect(providerReputation.totalReviews).toBe(1);
    expect(providerReputation.averageScore).toBe(5.0);
    expect(providerReputation.recentReviews[0].comment).toContain('arquitectura limpia');

    const clientReputation = await getReputationUseCase.execute(client.id);
    expect(clientReputation.totalReviews).toBe(1);
    expect(clientReputation.averageScore).toBe(5.0);
  });

  // Helper: ejecuta el flujo base hasta dejar el trabajo IN_PROGRESS con fondos retenidos
  async function prepararTrabajoEnProgreso(sufijo: string, monto: number) {
    const client = await registerUserUseCase.execute({
      name: `Cliente ${sufijo}`,
      email: `cliente.${sufijo}@trustpay.io`,
      role: 'CLIENT',
    });
    const provider = await registerUserUseCase.execute({
      name: `Prestador ${sufijo}`,
      email: `prestador.${sufijo}@trustpay.io`,
      role: 'PROVIDER',
    });
    await verifyUserUseCase.execute(provider.id);

    const job = await createJobUseCase.execute({
      title: `Trabajo ${sufijo}`,
      description: 'Trabajo de prueba para el flujo de disputas.',
      category: 'Testing',
      clientId: client.id,
      budgetAmount: monto + 100,
    });

    const proposal = await submitProposalUseCase.execute({
      jobId: job.id,
      providerId: provider.id,
      proposedAmountDecimal: monto,
      estimatedDays: 5,
      coverLetter: 'Postulación para el flujo de disputas.',
    });

    await acceptProposalUseCase.execute(proposal.id);

    const escrow = await escrowRepo.findByJobId(job.id);
    expect(escrow).toBeDefined();
    await depositEscrowUseCase.execute(escrow!.id.toString(), `tok_${sufijo}`);

    const jobEnProgreso = await jobRepo.findById(job.id);
    expect(jobEnProgreso?.status).toBe('IN_PROGRESS');

    return { client, provider, job, escrowId: escrow!.id.toString() };
  }

  it('debe propagar escrow.dispute_opened y marcar el trabajo como IN_DISPUTE', async () => {
    const { client, job, escrowId } = await prepararTrabajoEnProgreso('disputa', 700.0);

    await openDisputeUseCase.execute({
      escrowId,
      openedBy: client.id,
      reason: 'El prestador no ha entregado avances en dos semanas.',
    });

    const jobEnDisputa = await jobRepo.findById(job.id);
    expect(jobEnDisputa?.status).toBe('IN_DISPUTE');
    expect(jobEnDisputa?.disputeReason).toContain('no ha entregado avances');

    const escrowEnDisputa = await escrowRepo.findById(escrowId);
    expect(escrowEnDisputa?.status).toBe('DISPUTED');
  });

  it('debe resolver disputa a favor del prestador: trabajo COMPLETED y pago liberado', async () => {
    const { provider, job, escrowId } = await prepararTrabajoEnProgreso('favor-prestador', 700.0);

    await openDisputeUseCase.execute({
      escrowId,
      openedBy: provider.id,
      reason: 'El cliente exige cambios fuera del alcance acordado.',
    });

    const resuelta = await resolveDisputeUseCase.execute({
      escrowId,
      adminId: 'admin-1',
      resolution: 'RELEASED_TO_PROVIDER',
    });

    expect(resuelta.status).toBe('RELEASED');

    // La saga completó el trabajo automáticamente tras la resolución
    const jobCompletado = await jobRepo.findById(job.id);
    expect(jobCompletado?.status).toBe('COMPLETED');

    // El prestador recibió el pago neto: 700 - 10% comisión = 630
    expect(paymentGateway.payouts.length).toBe(1);
    expect(paymentGateway.payouts[0].netAmount.toDecimal).toBe(630.0);
    expect(paymentGateway.payouts[0].providerAccountId).toBe(`acct_prov_${provider.id}`);
  });

  it('debe resolver disputa a favor del cliente: trabajo CANCELLED y reembolso total', async () => {
    const { client, job, escrowId } = await prepararTrabajoEnProgreso('favor-cliente', 700.0);

    await openDisputeUseCase.execute({
      escrowId,
      openedBy: client.id,
      reason: 'La entrega recibida no cumple los requisitos mínimos.',
    });

    const resuelta = await resolveDisputeUseCase.execute({
      escrowId,
      adminId: 'admin-1',
      resolution: 'REFUNDED_TO_CLIENT',
    });

    expect(resuelta.status).toBe('REFUNDED');

    // La saga canceló el trabajo definitivamente tras la resolución
    const jobCancelado = await jobRepo.findById(job.id);
    expect(jobCancelado?.status).toBe('CANCELLED');

    // El cliente recibió el reembolso total: 700 + 3% tarifa = 721
    expect(paymentGateway.refunds.length).toBe(1);
    expect(paymentGateway.refunds[0].amount.toDecimal).toBe(721.0);
  });

  it('debe revertir el trabajo a OPEN cuando administración cancela la custodia sin depósito', async () => {
    const client = await registerUserUseCase.execute({
      name: 'Cliente Cancelación',
      email: 'cliente.cancelacion@trustpay.io',
      role: 'CLIENT',
    });
    const provider = await registerUserUseCase.execute({
      name: 'Prestador Cancelación',
      email: 'prestador.cancelacion@trustpay.io',
      role: 'PROVIDER',
    });
    await verifyUserUseCase.execute(provider.id);

    const job = await createJobUseCase.execute({
      title: 'Trabajo sin depósito',
      description: 'El cliente nunca deposita la custodia.',
      category: 'Testing',
      clientId: client.id,
      budgetAmount: 300.0,
    });

    const proposal = await submitProposalUseCase.execute({
      jobId: job.id,
      providerId: provider.id,
      proposedAmountDecimal: 250.0,
      estimatedDays: 3,
      coverLetter: 'Postulación para prueba de cancelación.',
    });

    await acceptProposalUseCase.execute(proposal.id);

    const escrow = await escrowRepo.findByJobId(job.id);
    expect(escrow?.status).toBe('PENDING_DEPOSIT');

    await cancelEscrowUseCase.execute({
      escrowId: escrow!.id.toString(),
      adminId: 'admin-1',
      reason: 'Solicitud del cliente de retirar la contratación.',
    });

    // La saga revirtió el trabajo a OPEN para recibir nuevas propuestas
    const jobRevertido = await jobRepo.findById(job.id);
    expect(jobRevertido?.status).toBe('OPEN');
    expect(jobRevertido?.assignedProviderId).toBeUndefined();

    const escrowCancelado = await escrowRepo.findById(escrow!.id.toString());
    expect(escrowCancelado?.status).toBe('CANCELLED');

    // Nunca se cobró al cliente ni se pagó al prestador
    expect(paymentGateway.capturedDeposits.length).toBe(0);
    expect(paymentGateway.payouts.length).toBe(0);
  });
});
