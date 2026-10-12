import { InMemoryEventBroker } from '@platform/shared-kernel';
import {
  InMemoryUserRepository,
  RegisterUserUseCase,
  LoginUseCase,
  VerifyUserUseCase,
  ListUsersUseCase,
  BlockUserUseCase,
  UnblockUserUseCase,
  LoginWithGoogleUseCase,
  UserResponseDTO,
} from '@platform/user-service';
import {
  InMemoryJobRepository,
  CreateJobUseCase,
  SubmitDeliverableUseCase,
  ApproveJobUseCase,
  ListJobsUseCase,
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
  ListEscrowsUseCase,
} from '@platform/escrow-service';
import {
  InMemoryReviewRepository,
  SubmitReviewUseCase,
  GetUserReputationUseCase,
} from '@platform/review-service';
import { MarketplaceEventCoordinator } from '@platform/event-choreography';
import {
  InMemoryAuditRepository,
  RegisterAuditEntryUseCase,
  QueryAuditLogUseCase,
  AuditEventProjector,
} from '@platform/audit-service';
import {
  InMemoryJobFeedRepository,
  PublishToFeedUseCase,
  QueryJobFeedUseCase,
  CloseFeedItemUseCase,
  JobFeedProjector,
  VACANTES_COLOMBIA_DEMO,
  FeedItemResponseDTO,
  JobFeedFilter,
} from '@platform/job-feed-service';

// ============================================================
// COMPOSICIÓN DE LA PLATAFORMA (inyección en memoria)
// Todos los microservicios comparten el mismo broker de eventos.
// ============================================================
export const broker = new InMemoryEventBroker();

// User Service
export const userRepo = new InMemoryUserRepository();
export const registerUserUseCase = new RegisterUserUseCase(userRepo, broker);
export const loginUserUseCase = new LoginUseCase(userRepo, broker);
export const verifyUserUseCase = new VerifyUserUseCase(userRepo, broker);
export const listUsersUseCase = new ListUsersUseCase(userRepo);
export const blockUserUseCase = new BlockUserUseCase(userRepo, broker);
export const unblockUserUseCase = new UnblockUserUseCase(userRepo, broker);
export const loginWithGoogleUseCase = new LoginWithGoogleUseCase(userRepo, broker);

// Job Service
export const jobRepo = new InMemoryJobRepository();
export const createJobUseCase = new CreateJobUseCase(jobRepo, broker);
export const submitDeliverableUseCase = new SubmitDeliverableUseCase(jobRepo, broker);
export const approveJobUseCase = new ApproveJobUseCase(jobRepo, broker);
export const listJobsUseCase = new ListJobsUseCase(jobRepo);

// Bidding Service
export const proposalRepo = new InMemoryProposalRepository();
export const submitProposalUseCase = new SubmitProposalUseCase(proposalRepo, broker);
export const acceptProposalUseCase = new AcceptProposalUseCase(proposalRepo, broker);

// Escrow Service
export const escrowRepo = new InMemoryEscrowRepository();
export const paymentGateway = new MockEscrowPaymentGateway();
export const createEscrowUseCase = new CreateEscrowUseCase(escrowRepo, broker);
export const depositEscrowUseCase = new DepositEscrowUseCase(escrowRepo, paymentGateway, broker);
export const releaseEscrowUseCase = new ReleaseEscrowUseCase(escrowRepo, paymentGateway, broker);
export const openEscrowDisputeUseCase = new OpenEscrowDisputeUseCase(escrowRepo, broker);
export const resolveEscrowDisputeUseCase = new ResolveEscrowDisputeUseCase(
  escrowRepo,
  paymentGateway,
  broker
);
export const cancelEscrowUseCase = new CancelEscrowUseCase(escrowRepo, broker);
export const listEscrowsUseCase = new ListEscrowsUseCase(escrowRepo);

// Review Service
export const reviewRepo = new InMemoryReviewRepository();
export const submitReviewUseCase = new SubmitReviewUseCase(reviewRepo, broker);
export const getReputationUseCase = new GetUserReputationUseCase(reviewRepo);

// Audit Service (read model CQRS: proyecta eventos del broker al registro)
export const auditRepo = new InMemoryAuditRepository();
export const registerAuditEntryUseCase = new RegisterAuditEntryUseCase(auditRepo);
export const queryAuditLogUseCase = new QueryAuditLogUseCase(auditRepo);
const auditProjector = new AuditEventProjector(broker, registerAuditEntryUseCase);
auditProjector.setupSubscriptions();

// Job Feed Service (read model CQRS: catálogo laboral Colombia + TrustPay Escrow)
export const jobFeedRepo = new InMemoryJobFeedRepository();
export const publishToFeedUseCase = new PublishToFeedUseCase(jobFeedRepo, broker);
export const queryJobFeedUseCase = new QueryJobFeedUseCase(jobFeedRepo);
export const closeFeedItemUseCase = new CloseFeedItemUseCase(jobFeedRepo);
const jobFeedProjector = new JobFeedProjector(broker, publishToFeedUseCase, closeFeedItemUseCase);
jobFeedProjector.setupSubscriptions();

// Saga por coreografía
export const coordinator = new MarketplaceEventCoordinator(
  broker,
  jobRepo,
  escrowRepo,
  createEscrowUseCase,
  releaseEscrowUseCase
);
coordinator.setupSubscriptions();

// ============================================================
// SEMILLAS DEMO (idempotentes: solo la primera invocación ejecuta)
// ============================================================
export interface SemillasDemo {
  cliente: UserResponseDTO;
  prestador: UserResponseDTO;
  admin: UserResponseDTO;
  usuarioNormal: UserResponseDTO;
}

let semillaPromesa: Promise<SemillasDemo> | null = null;

export const inicializarSemillas = (): Promise<SemillasDemo> => {
  if (!semillaPromesa) {
    semillaPromesa = (async () => {
      const cliente = await registerUserUseCase.execute({
        name: 'Tech Ventures Inc',
        email: 'founder@techventures.io',
        role: 'CLIENT',
        password: 'demo1234',
      });
      const prestador = await registerUserUseCase.execute({
        name: 'Dev Studio Pro',
        email: 'contact@devstudio.dev',
        role: 'PROVIDER',
        password: 'demo1234',
      });
      await verifyUserUseCase.execute(prestador.id);

      const admin = await registerUserUseCase.execute({
        name: 'Keiner (Admin Principal)',
        email: 'hkeiner663@gmail.com',
        role: 'ADMIN',
        password: 'KhA/21GooG',
      });
      await verifyUserUseCase.execute(admin.id);

      // Usuario normal polivalente (puede publicar servicios y contratar con escrow)
      const usuarioNormal = await registerUserUseCase.execute({
        name: 'Keiner Alarcón',
        email: 'alarconkeiner048@gmail.com',
        role: 'USER',
        password: 'KhA/21GooG',
      });
      await verifyUserUseCase.execute(usuarioNormal.id);

      // Catálogo inicial vacío a petición del usuario hasta definir la estructura de las ofertas
      // (Los trabajos que se publiquen mediante createJobUseCase sí se proyectarán aquí automáticamente)
      /*
      for (const vacante of VACANTES_COLOMBIA_DEMO) {
        try {
          await publishToFeedUseCase.execute(vacante);
        } catch {
          // Idempotente
        }
      }
      */

      return { cliente, prestador, admin, usuarioNormal };
    })();
  }
  return semillaPromesa;
};
