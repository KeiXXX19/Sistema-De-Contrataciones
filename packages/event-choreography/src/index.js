// ============================================================
// SAGA: Coreografía de Eventos del Marketplace
// Gestiona el ciclo de vida completo y las acciones compensatorias
// en caso de fallo (ej: pago rechazado por la pasarela).
// ============================================================
export class MarketplaceEventCoordinator {
    eventBroker;
    jobRepo;
    escrowRepo;
    createEscrowUseCase;
    releaseEscrowUseCase;
    feedRepo;
    constructor(eventBroker, jobRepo, escrowRepo, createEscrowUseCase, releaseEscrowUseCase, feedRepo) {
        this.eventBroker = eventBroker;
        this.jobRepo = jobRepo;
        this.escrowRepo = escrowRepo;
        this.createEscrowUseCase = createEscrowUseCase;
        this.releaseEscrowUseCase = releaseEscrowUseCase;
        this.feedRepo = feedRepo;
    }
    async setupSubscriptions() {
        // -------------------------------------------------------
        // SAGA PASO 1: Propuesta Aceptada
        // BiddingService emite -> JobService asigna el trabajo
        // JobService emite job.assigned -> EscrowService crea custodia
        // FeedService cierra el ítem del muro
        // -------------------------------------------------------
        await this.eventBroker.subscribe('proposal.accepted', async (event) => {
            const payload = event.payload;
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
        await this.eventBroker.subscribe('job.assigned', async (event) => {
            const payload = event.payload;
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
        await this.eventBroker.subscribe('escrow.deposited', async (event) => {
            const payload = event.payload;
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
        await this.eventBroker.subscribe('job.approved', async (event) => {
            const payload = event.payload;
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
        await this.eventBroker.subscribe('escrow.dispute_opened', async (event) => {
            const payload = event.payload;
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
        await this.eventBroker.subscribe('escrow.dispute_resolved', async (event) => {
            const payload = event.payload;
            const job = await this.jobRepo.findById(payload.jobId);
            if (job && job.status === 'IN_DISPUTE') {
                if (payload.resolution === 'RELEASED_TO_PROVIDER') {
                    job.resolveDisputeCompleted();
                }
                else {
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
        await this.eventBroker.subscribe('escrow.deposit_failed', async (event) => {
            const payload = event.payload;
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
        await this.eventBroker.subscribe('escrow.cancelled', async (event) => {
            const payload = event.payload;
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
