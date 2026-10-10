import { AggregateRoot, Money } from '@platform/shared-kernel';
export class EscrowCreatedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'escrow.created';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class EscrowDepositedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'escrow.deposited';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class EscrowReleasedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'escrow.released';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class EscrowRefundedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'escrow.refunded';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class EscrowDisputeOpenedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'escrow.dispute_opened';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class EscrowDisputeResolvedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'escrow.dispute_resolved';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class EscrowCancelledEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'escrow.cancelled';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class Escrow extends AggregateRoot {
    constructor(props, id) {
        super(props, id);
    }
    // --- REGLAS DE NEGOCIO: CÁLCULO DE COMISIONES (TAKE-RATE) ---
    static calculateFees(baseAmountDecimal, clientFeeRate = 3, // 3% tarifa de servicio al cliente
    providerCommissionRate = 10, // 10% retención al prestador
    currency = 'USD') {
        const base = Money.fromDecimal(baseAmountDecimal, currency);
        const clientFee = base.percentage(clientFeeRate);
        const totalClientPaid = base.add(clientFee);
        const providerCommission = base.percentage(providerCommissionRate);
        const netProviderPayout = base.subtract(providerCommission);
        const platformProfit = clientFee.add(providerCommission);
        return {
            baseAmount: base,
            clientFeeRate,
            clientFeeAmount: clientFee,
            totalClientPaid,
            providerCommissionRate,
            providerCommissionAmount: providerCommission,
            netProviderPayout,
            platformProfit,
        };
    }
    static create(props, id) {
        if (!props.jobId)
            throw new Error('El ID del trabajo es requerido');
        if (!props.clientId)
            throw new Error('El ID del cliente es requerido');
        if (!props.providerId)
            throw new Error('El ID del prestador es requerido');
        if (props.agreedAmountDecimal <= 0) {
            throw new Error('El monto acordado debe ser mayor a cero');
        }
        const fees = Escrow.calculateFees(props.agreedAmountDecimal, props.clientFeeRate ?? 3, props.providerCommissionRate ?? 10);
        const escrow = new Escrow({
            jobId: props.jobId,
            clientId: props.clientId,
            providerId: props.providerId,
            fees,
            status: 'PENDING_DEPOSIT',
            createdAt: new Date(),
            updatedAt: new Date(),
        }, id);
        escrow.addDomainEvent(new EscrowCreatedEvent(escrow.id.toString(), {
            escrowId: escrow.id.toString(),
            jobId: escrow.props.jobId,
            clientId: escrow.props.clientId,
            providerId: escrow.props.providerId,
            totalToDeposit: escrow.props.fees.totalClientPaid.toDecimal,
        }));
        return escrow;
    }
    get jobId() {
        return this.props.jobId;
    }
    get clientId() {
        return this.props.clientId;
    }
    get providerId() {
        return this.props.providerId;
    }
    get fees() {
        return this.props.fees;
    }
    get status() {
        return this.props.status;
    }
    get paymentTransactionId() {
        return this.props.paymentTransactionId;
    }
    get payoutTransactionId() {
        return this.props.payoutTransactionId;
    }
    get refundTransactionId() {
        return this.props.refundTransactionId;
    }
    get disputeReason() {
        return this.props.disputeReason;
    }
    get disputeOpenedBy() {
        return this.props.disputeOpenedBy;
    }
    get disputeOpenedAt() {
        return this.props.disputeOpenedAt;
    }
    get disputeResolvedBy() {
        return this.props.disputeResolvedBy;
    }
    get disputeResolution() {
        return this.props.disputeResolution;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    get updatedAt() {
        return this.props.updatedAt;
    }
    // --- MÁQUINA DE ESTADOS Y PROTECCIÓN DEL DINERO ---
    confirmDeposit(transactionId) {
        if (this.props.status !== 'PENDING_DEPOSIT') {
            throw new Error(`No se puede depositar en una custodia en estado ${this.props.status}`);
        }
        if (!transactionId) {
            throw new Error('Se requiere el identificador de la transacción de pago');
        }
        this.props.status = 'FUNDS_HELD';
        this.props.paymentTransactionId = transactionId;
        this.props.updatedAt = new Date();
        this.addDomainEvent(new EscrowDepositedEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            clientId: this.props.clientId,
            providerId: this.props.providerId,
            amountHeld: this.props.fees.totalClientPaid.toDecimal,
            transactionId,
        }));
    }
    releaseFunds(payoutTransactionId) {
        if (this.props.status !== 'FUNDS_HELD') {
            throw new Error(`Solo se pueden liberar fondos actualmente retenidos en custodia`);
        }
        if (!payoutTransactionId) {
            throw new Error('Se requiere el identificador de la transferencia de liquidación');
        }
        this.props.status = 'RELEASED';
        this.props.payoutTransactionId = payoutTransactionId;
        this.props.updatedAt = new Date();
        this.addDomainEvent(new EscrowReleasedEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            providerId: this.props.providerId,
            netPayoutAmount: this.props.fees.netProviderPayout.toDecimal,
            platformFeeRetained: this.props.fees.platformProfit.toDecimal,
            payoutTransactionId,
        }));
    }
    refundClient(refundTransactionId) {
        if (this.props.status !== 'FUNDS_HELD' && this.props.status !== 'DISPUTED') {
            throw new Error(`No se puede reembolsar una custodia en estado ${this.props.status}`);
        }
        if (!refundTransactionId) {
            throw new Error('Se requiere el identificador de la transacción de reembolso');
        }
        this.props.status = 'REFUNDED';
        this.props.refundTransactionId = refundTransactionId;
        this.props.updatedAt = new Date();
        this.addDomainEvent(new EscrowRefundedEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            clientId: this.props.clientId,
            refundedAmount: this.props.fees.totalClientPaid.toDecimal,
            refundTransactionId,
        }));
    }
    // --- DISPUTAS Y ACCIONES ADMINISTRATIVAS ---
    openDispute(openedBy, reason) {
        if (this.props.status !== 'FUNDS_HELD') {
            throw new Error(`Solo se puede disputar una custodia con fondos retenidos (estado actual: ${this.props.status})`);
        }
        if (!openedBy) {
            throw new Error('Se requiere el identificador de quien abre la disputa');
        }
        if (!reason || reason.trim().length < 10) {
            throw new Error('El motivo de la disputa debe tener al menos 10 caracteres');
        }
        this.props.status = 'DISPUTED';
        this.props.disputeReason = reason.trim();
        this.props.disputeOpenedBy = openedBy;
        this.props.disputeOpenedAt = new Date();
        this.props.updatedAt = new Date();
        this.addDomainEvent(new EscrowDisputeOpenedEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            clientId: this.props.clientId,
            providerId: this.props.providerId,
            openedBy,
            reason: reason.trim(),
            amountHeld: this.props.fees.totalClientPaid.toDecimal,
            openedAt: new Date(),
        }));
    }
    resolveDisputeReleasing(payoutTransactionId, adminId) {
        if (this.props.status !== 'DISPUTED') {
            throw new Error(`No hay una disputa activa que resolver (estado actual: ${this.props.status})`);
        }
        if (!payoutTransactionId) {
            throw new Error('Se requiere el identificador de la transferencia de liquidación');
        }
        if (!adminId) {
            throw new Error('Se requiere el identificador del administrador que resuelve');
        }
        this.props.status = 'RELEASED';
        this.props.payoutTransactionId = payoutTransactionId;
        this.props.disputeResolvedBy = adminId;
        this.props.disputeResolution = 'RELEASED_TO_PROVIDER';
        this.props.updatedAt = new Date();
        this.addDomainEvent(new EscrowReleasedEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            providerId: this.props.providerId,
            netPayoutAmount: this.props.fees.netProviderPayout.toDecimal,
            platformFeeRetained: this.props.fees.platformProfit.toDecimal,
            payoutTransactionId,
        }));
        this.addDomainEvent(new EscrowDisputeResolvedEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            adminId,
            resolution: 'RELEASED_TO_PROVIDER',
            transactionId: payoutTransactionId,
            resolvedAt: new Date(),
        }));
    }
    resolveDisputeRefunding(refundTransactionId, adminId) {
        if (this.props.status !== 'DISPUTED') {
            throw new Error(`No hay una disputa activa que resolver (estado actual: ${this.props.status})`);
        }
        if (!refundTransactionId) {
            throw new Error('Se requiere el identificador de la transacción de reembolso');
        }
        if (!adminId) {
            throw new Error('Se requiere el identificador del administrador que resuelve');
        }
        this.props.status = 'REFUNDED';
        this.props.refundTransactionId = refundTransactionId;
        this.props.disputeResolvedBy = adminId;
        this.props.disputeResolution = 'REFUNDED_TO_CLIENT';
        this.props.updatedAt = new Date();
        this.addDomainEvent(new EscrowRefundedEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            clientId: this.props.clientId,
            refundedAmount: this.props.fees.totalClientPaid.toDecimal,
            refundTransactionId,
        }));
        this.addDomainEvent(new EscrowDisputeResolvedEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            adminId,
            resolution: 'REFUNDED_TO_CLIENT',
            transactionId: refundTransactionId,
            resolvedAt: new Date(),
        }));
    }
    cancelByAdmin(adminId, reason) {
        if (this.props.status !== 'PENDING_DEPOSIT') {
            throw new Error(`Solo se puede cancelar una custodia pendiente de depósito (estado actual: ${this.props.status})`);
        }
        if (!adminId) {
            throw new Error('Se requiere el identificador del administrador que cancela');
        }
        if (!reason || reason.trim().length < 5) {
            throw new Error('Se requiere un motivo de al menos 5 caracteres para cancelar la custodia');
        }
        this.props.status = 'CANCELLED';
        this.props.disputeReason = reason.trim();
        this.props.disputeOpenedBy = adminId;
        this.props.updatedAt = new Date();
        this.addDomainEvent(new EscrowCancelledEvent(this.id.toString(), {
            escrowId: this.id.toString(),
            jobId: this.props.jobId,
            adminId,
            reason: reason.trim(),
            cancelledAt: new Date(),
        }));
    }
}
export function toEscrowResponseDTO(escrow) {
    return {
        id: escrow.id.toString(),
        jobId: escrow.jobId,
        clientId: escrow.clientId,
        providerId: escrow.providerId,
        status: escrow.status,
        baseAmount: escrow.fees.baseAmount.toDecimal,
        clientFee: escrow.fees.clientFeeAmount.toDecimal,
        totalClientPaid: escrow.fees.totalClientPaid.toDecimal,
        providerCommission: escrow.fees.providerCommissionAmount.toDecimal,
        netProviderPayout: escrow.fees.netProviderPayout.toDecimal,
        platformProfit: escrow.fees.platformProfit.toDecimal,
        currency: escrow.fees.baseAmount.currency,
        paymentTransactionId: escrow.paymentTransactionId,
        payoutTransactionId: escrow.payoutTransactionId,
        refundTransactionId: escrow.refundTransactionId,
        disputeReason: escrow.disputeReason,
        disputeOpenedBy: escrow.disputeOpenedBy,
        disputeOpenedAt: escrow.disputeOpenedAt,
        disputeResolvedBy: escrow.disputeResolvedBy,
        disputeResolution: escrow.disputeResolution,
        createdAt: escrow.createdAt,
        updatedAt: escrow.updatedAt,
    };
}
// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class CreateEscrowUseCase {
    escrowRepo;
    eventBroker;
    constructor(escrowRepo, eventBroker) {
        this.escrowRepo = escrowRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const existing = await this.escrowRepo.findByJobId(dto.jobId);
        if (existing) {
            throw new Error(`Ya existe un contrato de custodia para el trabajo ${dto.jobId}`);
        }
        const escrow = Escrow.create(dto);
        await this.escrowRepo.save(escrow);
        await this.eventBroker.publishAll(escrow.domainEvents);
        escrow.clearDomainEvents();
        return toEscrowResponseDTO(escrow);
    }
}
export class DepositEscrowUseCase {
    escrowRepo;
    paymentGateway;
    eventBroker;
    constructor(escrowRepo, paymentGateway, eventBroker) {
        this.escrowRepo = escrowRepo;
        this.paymentGateway = paymentGateway;
        this.eventBroker = eventBroker;
    }
    async execute(escrowId, paymentMethodId) {
        const escrow = await this.escrowRepo.findById(escrowId);
        if (!escrow)
            throw new Error(`Custodia con ID ${escrowId} no encontrada`);
        // Cobrar al cliente mediante la pasarela de pagos
        const { transactionId } = await this.paymentGateway.captureEscrowDeposit(escrow.fees.totalClientPaid, paymentMethodId);
        escrow.confirmDeposit(transactionId);
        await this.escrowRepo.save(escrow);
        await this.eventBroker.publishAll(escrow.domainEvents);
        escrow.clearDomainEvents();
        return toEscrowResponseDTO(escrow);
    }
}
export class ReleaseEscrowUseCase {
    escrowRepo;
    paymentGateway;
    eventBroker;
    constructor(escrowRepo, paymentGateway, eventBroker) {
        this.escrowRepo = escrowRepo;
        this.paymentGateway = paymentGateway;
        this.eventBroker = eventBroker;
    }
    async execute(escrowId, providerAccountId) {
        const escrow = await this.escrowRepo.findById(escrowId);
        if (!escrow)
            throw new Error(`Custodia con ID ${escrowId} no encontrada`);
        // Liquidar el pago neto a la cuenta del proveedor a través de la pasarela
        const { payoutId } = await this.paymentGateway.payoutToProvider(providerAccountId, escrow.fees.netProviderPayout);
        escrow.releaseFunds(payoutId);
        await this.escrowRepo.save(escrow);
        await this.eventBroker.publishAll(escrow.domainEvents);
        escrow.clearDomainEvents();
        return toEscrowResponseDTO(escrow);
    }
}
export class OpenEscrowDisputeUseCase {
    escrowRepo;
    eventBroker;
    constructor(escrowRepo, eventBroker) {
        this.escrowRepo = escrowRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const escrow = await this.escrowRepo.findById(dto.escrowId);
        if (!escrow)
            throw new Error(`Custodia con ID ${dto.escrowId} no encontrada`);
        escrow.openDispute(dto.openedBy, dto.reason);
        await this.escrowRepo.save(escrow);
        await this.eventBroker.publishAll(escrow.domainEvents);
        escrow.clearDomainEvents();
        return toEscrowResponseDTO(escrow);
    }
}
export class ResolveEscrowDisputeUseCase {
    escrowRepo;
    paymentGateway;
    eventBroker;
    constructor(escrowRepo, paymentGateway, eventBroker) {
        this.escrowRepo = escrowRepo;
        this.paymentGateway = paymentGateway;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const escrow = await this.escrowRepo.findById(dto.escrowId);
        if (!escrow)
            throw new Error(`Custodia con ID ${dto.escrowId} no encontrada`);
        if (dto.resolution === 'RELEASED_TO_PROVIDER') {
            const providerAccountId = `acct_prov_${escrow.providerId}`;
            const { payoutId } = await this.paymentGateway.payoutToProvider(providerAccountId, escrow.fees.netProviderPayout);
            escrow.resolveDisputeReleasing(payoutId, dto.adminId);
        }
        else {
            if (!escrow.paymentTransactionId) {
                throw new Error('La custodia no tiene transacción de depósito asociada para reembolsar');
            }
            const { refundId } = await this.paymentGateway.refundToClient(escrow.paymentTransactionId, escrow.fees.totalClientPaid);
            escrow.resolveDisputeRefunding(refundId, dto.adminId);
        }
        await this.escrowRepo.save(escrow);
        await this.eventBroker.publishAll(escrow.domainEvents);
        escrow.clearDomainEvents();
        return toEscrowResponseDTO(escrow);
    }
}
export class CancelEscrowUseCase {
    escrowRepo;
    eventBroker;
    constructor(escrowRepo, eventBroker) {
        this.escrowRepo = escrowRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const escrow = await this.escrowRepo.findById(dto.escrowId);
        if (!escrow)
            throw new Error(`Custodia con ID ${dto.escrowId} no encontrada`);
        escrow.cancelByAdmin(dto.adminId, dto.reason);
        await this.escrowRepo.save(escrow);
        await this.eventBroker.publishAll(escrow.domainEvents);
        escrow.clearDomainEvents();
        return toEscrowResponseDTO(escrow);
    }
}
export class ListEscrowsUseCase {
    escrowRepo;
    constructor(escrowRepo) {
        this.escrowRepo = escrowRepo;
    }
    async execute(filter) {
        const escrows = await this.escrowRepo.findAll();
        const ordered = [...escrows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const filtered = filter?.status
            ? ordered.filter((e) => e.status === filter.status)
            : ordered;
        return filtered.map(toEscrowResponseDTO);
    }
}
// ==========================================
// 4. ADAPTADORES (INFRASTRUCTURE LAYER)
// ==========================================
export class InMemoryEscrowRepository {
    escrows = new Map();
    async save(escrow) {
        this.escrows.set(escrow.id.toString(), escrow);
    }
    async findById(id) {
        return this.escrows.get(id) || null;
    }
    async findByJobId(jobId) {
        for (const item of this.escrows.values()) {
            if (item.jobId === jobId)
                return item;
        }
        return null;
    }
    async findAll() {
        return Array.from(this.escrows.values());
    }
    clear() {
        this.escrows.clear();
    }
}
export class MockEscrowPaymentGateway {
    capturedDeposits = [];
    payouts = [];
    refunds = [];
    async captureEscrowDeposit(amount, paymentMethodId) {
        const txId = `ch_stripe_${crypto.randomUUID().slice(0, 8)}`;
        this.capturedDeposits.push({ amount, paymentMethodId, txId });
        return { transactionId: txId };
    }
    async payoutToProvider(providerAccountId, netAmount) {
        const payoutId = `po_stripe_${crypto.randomUUID().slice(0, 8)}`;
        this.payouts.push({ providerAccountId, netAmount, payoutId });
        return { payoutId };
    }
    async refundToClient(paymentTransactionId, amount) {
        const refundId = `re_stripe_${crypto.randomUUID().slice(0, 8)}`;
        this.refunds.push({ paymentTransactionId, amount, refundId });
        return { refundId };
    }
}
export class EscrowController {
    createUseCase;
    depositUseCase;
    releaseUseCase;
    repo;
    openDisputeUseCase;
    resolveDisputeUseCase;
    cancelUseCase;
    listUseCase;
    constructor(createUseCase, depositUseCase, releaseUseCase, repo, openDisputeUseCase, resolveDisputeUseCase, cancelUseCase, listUseCase) {
        this.createUseCase = createUseCase;
        this.depositUseCase = depositUseCase;
        this.releaseUseCase = releaseUseCase;
        this.repo = repo;
        this.openDisputeUseCase = openDisputeUseCase;
        this.resolveDisputeUseCase = resolveDisputeUseCase;
        this.cancelUseCase = cancelUseCase;
        this.listUseCase = listUseCase;
    }
    async handleCreate(body) {
        try {
            const data = await this.createUseCase.execute(body);
            return { statusCode: 201, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleDeposit(escrowId, body) {
        try {
            const data = await this.depositUseCase.execute(escrowId, body.paymentMethodId);
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleRelease(escrowId, body) {
        try {
            const data = await this.releaseUseCase.execute(escrowId, body.providerAccountId);
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleOpenDispute(escrowId, body) {
        if (!this.openDisputeUseCase)
            return { statusCode: 501, error: 'Caso de uso no configurado' };
        try {
            const data = await this.openDisputeUseCase.execute({ escrowId, ...body });
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleResolveDispute(escrowId, body) {
        if (!this.resolveDisputeUseCase)
            return { statusCode: 501, error: 'Caso de uso no configurado' };
        try {
            const data = await this.resolveDisputeUseCase.execute({ escrowId, ...body });
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleCancel(escrowId, body) {
        if (!this.cancelUseCase)
            return { statusCode: 501, error: 'Caso de uso no configurado' };
        try {
            const data = await this.cancelUseCase.execute({ escrowId, ...body });
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleList(query) {
        if (!this.listUseCase)
            return { statusCode: 501, error: 'Caso de uso no configurado' };
        try {
            const data = await this.listUseCase.execute(query);
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
}
