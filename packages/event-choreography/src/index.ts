import { IEventBroker, DomainEvent } from '@platform/shared-kernel';
import { IJobRepository } from '@platform/job-service';
import { IEscrowRepository, CreateEscrowUseCase, ReleaseEscrowUseCase } from '@platform/escrow-service';
import { IJobFeedRepository } from '@platform/job-feed-service';

// ============================================================
// SAGA: Coreografía de Eventos del Marketplace
// Gestiona el ciclo de vida completo y las acciones compensatorias
// en caso de fallo (ej: pago rechazado por la pasarela).
// ============================================================
export class MarketplaceEventCoordinator {
  constructor(
    private readonly eventBroker: IEventBroker,
    private readonly jobRepo: IJobRepository,
    private readonly escrowRepo: IEscrowRepository,
    private readonly createEscrowUseCase: CreateEscrowUseCase,
    private readonly releaseEscrowUseCase: ReleaseEscrowUseCase,
    private readonly feedRepo?: IJobFeedRepository
  ) {}

  async setupSubscriptions(): Promise<void> {
    // -------------------------------------------------------
    // SAGA PASO 1: Propuesta Aceptada
    // BiddingService emite -> JobService asigna el trabajo
    // JobService emite job.assigned -> EscrowService crea custodia
    // FeedService cierra el ítem del muro
    // -------------------------------------------------------
    await this.eventBroker.subscribe('proposal.accepted', async (event: DomainEvent) => {
      const payload = event.payload as {
        jobId: string;
        providerId: string;
        agreedAmount: number;
      };

      const job = await this.jobRepo.findById(payload.jobId);
      if (job && job.status === 'OPEN') {
        job.assignToProvider(payload.providerId, payload.agreedAmount);
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
      }
    });

    // -------------------------------------------------------
    // SAGA PASO 2: Trabajo Asignado
    // JobService emite -> EscrowService crea contrato de custodia
    // FeedService elimina del muro (ya no está disponible)
    // -------------------------------------------------------
    await this.eventBroker.subscribe('job.assigned', async (event: DomainEvent) => {
      const payload = event.payload as {
        jobId: string;
        clientId: string;
        providerId: string;
        agreedAmount: number;
      };

      // Crear custodia si no existe
      const existingEscrow = await this.escrowRepo.findByJobId(payload.jobId);
      if (!existingEscrow) {
        await this.createEscrowUseCase.execute({
          jobId: payload.jobId,
          clientId: payload.clientId,
          providerId: payload.providerId,
          agreedAmountDecimal: payload.agreedAmount,
        });
      }

      // Cerrar el ítem del Feed (ya no aparece en el muro)
      if (this.feedRepo) {
        await this.feedRepo.markClosed(payload.jobId);
      }
    });

    // -------------------------------------------------------
    // SAGA PASO 3: Depósito en Escrow Confirmado
    // EscrowService emite -> JobService pasa a IN_PROGRESS
    // -------------------------------------------------------
    await this.eventBroker.subscribe('escrow.deposited', async (event: DomainEvent) => {
      const payload = event.payload as { jobId: string };

      const job = await this.jobRepo.findById(payload.jobId);
      if (job && job.status === 'ASSIGNED_PENDING_ESCROW') {
        job.confirmEscrowFunded();
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
      }
    });

    // -------------------------------------------------------
    // SAGA PASO 4: Trabajo Aprobado por el Cliente
    // JobService emite -> EscrowService libera fondos al prestador
    // -------------------------------------------------------
    await this.eventBroker.subscribe('job.approved', async (event: DomainEvent) => {
      const payload = event.payload as {
        jobId: string;
        providerId: string;
      };

      const escrow = await this.escrowRepo.findByJobId(payload.jobId);
      if (escrow && escrow.status === 'FUNDS_HELD') {
        const providerAccountId = `acct_prov_${payload.providerId}`;
        await this.releaseEscrowUseCase.execute(escrow.id.toString(), providerAccountId);
      }
    });

    // -------------------------------------------------------
    // SAGA DISPUTA: Disputa abierta sobre la custodia
    // EscrowService emite escrow.dispute_opened
    // -> JobService marca el trabajo como IN_DISPUTE
    // -------------------------------------------------------
    await this.eventBroker.subscribe('escrow.dispute_opened', async (event: DomainEvent) => {
      const payload = event.payload as {
        jobId: string;
        openedBy: string;
        reason: string;
      };

      const job = await this.jobRepo.findById(payload.jobId);
      if (job && (job.status === 'IN_PROGRESS' || job.status === 'UNDER_REVIEW')) {
        job.openDispute(payload.openedBy, payload.reason);
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
      }
    });

    // -------------------------------------------------------
    // SAGA DISPUTA: Resolución administrativa
    // EscrowService emite escrow.dispute_resolved
    // -> JobService completa el trabajo (favor prestador)
    //    o lo cancela definitivamente (favor cliente)
    // -------------------------------------------------------
    await this.eventBroker.subscribe('escrow.dispute_resolved', async (event: DomainEvent) => {
      const payload = event.payload as {
        jobId: string;
        adminId: string;
        resolution: 'RELEASED_TO_PROVIDER' | 'REFUNDED_TO_CLIENT';
      };

      const job = await this.jobRepo.findById(payload.jobId);
      if (job && job.status === 'IN_DISPUTE') {
        if (payload.resolution === 'RELEASED_TO_PROVIDER') {
          job.resolveDisputeCompleted();
        } else {
          job.cancelAfterDispute();
        }
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
      }
    });

    // -------------------------------------------------------
    // SAGA COMPENSACIÓN: Fallo de Pago en la Pasarela
    // EscrowService emite escrow.deposit_failed
    // -> JobService revierte el trabajo de ASSIGNED_PENDING_ESCROW a OPEN
    // -> FeedService reabre el ítem en el muro para nuevas postulaciones
    // -------------------------------------------------------
    await this.eventBroker.subscribe('escrow.deposit_failed', async (event: DomainEvent) => {
      const payload = event.payload as {
        jobId: string;
        reason: string;
      };

      const job = await this.jobRepo.findById(payload.jobId);
      if (job && job.status === 'ASSIGNED_PENDING_ESCROW') {
        // Revertir el trabajo a OPEN para aceptar nuevas propuestas
        job.revertToOpen();
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
      }

      // Reabrir el ítem en el feed si fue cerrado prematuramente
      if (this.feedRepo) {
        const feedItem = await this.feedRepo.findByJobId(payload.jobId);
        if (feedItem) {
          feedItem.markOpen();
          await this.feedRepo.save(feedItem);
        }
      }
    });

    // -------------------------------------------------------
    // SAGA COMPENSACIÓN: Cancelación administrativa de custodia sin depósito
    // EscrowService emite escrow.cancelled (nunca se cobró al cliente)
    // -> JobService revierte de ASSIGNED_PENDING_ESCROW a OPEN
    // -> FeedService reabre el ítem en el muro
    // -------------------------------------------------------
    await this.eventBroker.subscribe('escrow.cancelled', async (event: DomainEvent) => {
      const payload = event.payload as {
        jobId: string;
        adminId: string;
        reason: string;
      };

      const job = await this.jobRepo.findById(payload.jobId);
      if (job && job.status === 'ASSIGNED_PENDING_ESCROW') {
        job.revertToOpen(`Custodia cancelada por administración: ${payload.reason}`);
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
      }

      if (this.feedRepo) {
        const feedItem = await this.feedRepo.findByJobId(payload.jobId);
        if (feedItem) {
          feedItem.markOpen();
          await this.feedRepo.save(feedItem);
        }
      }
    });
  }
}
