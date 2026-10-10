import { AggregateRoot, Money } from '@platform/shared-kernel';
export class ProposalSubmittedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'proposal.submitted';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class ProposalAcceptedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'proposal.accepted';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class ProposalRejectedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'proposal.rejected';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class Proposal extends AggregateRoot {
    constructor(props, id) {
        super(props, id);
    }
    static create(props, id) {
        if (!props.jobId)
            throw new Error('El ID del trabajo es requerido');
        if (!props.providerId)
            throw new Error('El ID del prestador es requerido');
        if (props.proposedAmountDecimal <= 0) {
            throw new Error('El monto ofertado debe ser mayor a cero');
        }
        if (props.estimatedDays < 1) {
            throw new Error('El tiempo estimado de entrega debe ser de al menos 1 día');
        }
        if (!props.coverLetter || props.coverLetter.trim().length < 10) {
            throw new Error('La propuesta debe incluir una descripción de al menos 10 caracteres');
        }
        const proposedAmount = Money.fromDecimal(props.proposedAmountDecimal);
        const proposal = new Proposal({
            jobId: props.jobId,
            providerId: props.providerId,
            proposedAmount,
            estimatedDays: props.estimatedDays,
            coverLetter: props.coverLetter.trim(),
            status: 'SUBMITTED',
            createdAt: new Date(),
            updatedAt: new Date(),
        }, id);
        proposal.addDomainEvent(new ProposalSubmittedEvent(proposal.id.toString(), {
            proposalId: proposal.id.toString(),
            jobId: proposal.jobId,
            providerId: proposal.providerId,
            proposedAmount: proposal.proposedAmount.toDecimal,
            estimatedDays: proposal.estimatedDays,
        }));
        return proposal;
    }
    get jobId() {
        return this.props.jobId;
    }
    get providerId() {
        return this.props.providerId;
    }
    get proposedAmount() {
        return this.props.proposedAmount;
    }
    get estimatedDays() {
        return this.props.estimatedDays;
    }
    get coverLetter() {
        return this.props.coverLetter;
    }
    get status() {
        return this.props.status;
    }
    accept() {
        if (this.props.status !== 'SUBMITTED') {
            throw new Error(`No se puede aceptar una propuesta en estado ${this.props.status}`);
        }
        this.props.status = 'ACCEPTED';
        this.props.updatedAt = new Date();
        this.addDomainEvent(new ProposalAcceptedEvent(this.id.toString(), {
            proposalId: this.id.toString(),
            jobId: this.props.jobId,
            providerId: this.props.providerId,
            agreedAmount: this.props.proposedAmount.toDecimal,
        }));
    }
    reject() {
        if (this.props.status !== 'SUBMITTED') {
            throw new Error(`No se puede rechazar una propuesta en estado ${this.props.status}`);
        }
        this.props.status = 'REJECTED';
        this.props.updatedAt = new Date();
        this.addDomainEvent(new ProposalRejectedEvent(this.id.toString(), {
            proposalId: this.id.toString(),
            jobId: this.props.jobId,
            providerId: this.props.providerId,
        }));
    }
}
// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class SubmitProposalUseCase {
    proposalRepo;
    eventBroker;
    constructor(proposalRepo, eventBroker) {
        this.proposalRepo = proposalRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const existing = await this.proposalRepo.findByJobId(dto.jobId);
        const alreadySubmitted = existing.some((p) => p.providerId === dto.providerId && p.status === 'SUBMITTED');
        if (alreadySubmitted) {
            throw new Error('El prestador ya tiene una oferta activa para este trabajo');
        }
        const proposal = Proposal.create(dto);
        await this.proposalRepo.save(proposal);
        await this.eventBroker.publishAll(proposal.domainEvents);
        proposal.clearDomainEvents();
        return this.mapToDTO(proposal);
    }
    mapToDTO(proposal) {
        return {
            id: proposal.id.toString(),
            jobId: proposal.jobId,
            providerId: proposal.providerId,
            proposedAmount: proposal.proposedAmount.toDecimal,
            currency: proposal.proposedAmount.currency,
            estimatedDays: proposal.estimatedDays,
            coverLetter: proposal.coverLetter,
            status: proposal.status,
        };
    }
}
export class AcceptProposalUseCase {
    proposalRepo;
    eventBroker;
    constructor(proposalRepo, eventBroker) {
        this.proposalRepo = proposalRepo;
        this.eventBroker = eventBroker;
    }
    async execute(proposalId) {
        const proposal = await this.proposalRepo.findById(proposalId);
        if (!proposal)
            throw new Error(`Propuesta con ID ${proposalId} no encontrada`);
        proposal.accept();
        await this.proposalRepo.save(proposal);
        // Rechazar automáticamente las demás propuestas del mismo trabajo
        const otherProposals = await this.proposalRepo.findByJobId(proposal.jobId);
        for (const other of otherProposals) {
            if (!other.id.equals(proposal.id) && other.status === 'SUBMITTED') {
                other.reject();
                await this.proposalRepo.save(other);
                await this.eventBroker.publishAll(other.domainEvents);
                other.clearDomainEvents();
            }
        }
        await this.eventBroker.publishAll(proposal.domainEvents);
        proposal.clearDomainEvents();
        return {
            id: proposal.id.toString(),
            jobId: proposal.jobId,
            providerId: proposal.providerId,
            proposedAmount: proposal.proposedAmount.toDecimal,
            currency: proposal.proposedAmount.currency,
            estimatedDays: proposal.estimatedDays,
            coverLetter: proposal.coverLetter,
            status: proposal.status,
        };
    }
}
// ==========================================
// 4. ADAPTADORES (INFRASTRUCTURE LAYER)
// ==========================================
export class InMemoryProposalRepository {
    proposals = new Map();
    async save(proposal) {
        this.proposals.set(proposal.id.toString(), proposal);
    }
    async findById(id) {
        return this.proposals.get(id) || null;
    }
    async findByJobId(jobId) {
        return Array.from(this.proposals.values()).filter((p) => p.jobId === jobId);
    }
    async findByProviderId(providerId) {
        return Array.from(this.proposals.values()).filter((p) => p.providerId === providerId);
    }
    clear() {
        this.proposals.clear();
    }
}
export class ProposalController {
    submitUseCase;
    acceptUseCase;
    proposalRepo;
    constructor(submitUseCase, acceptUseCase, proposalRepo) {
        this.submitUseCase = submitUseCase;
        this.acceptUseCase = acceptUseCase;
        this.proposalRepo = proposalRepo;
    }
    async handleSubmit(body) {
        try {
            const data = await this.submitUseCase.execute(body);
            return { statusCode: 201, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleAccept(proposalId) {
        try {
            const data = await this.acceptUseCase.execute(proposalId);
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleGetByJob(jobId) {
        const list = await this.proposalRepo.findByJobId(jobId);
        return {
            statusCode: 200,
            data: list.map((p) => ({
                id: p.id.toString(),
                providerId: p.providerId,
                amount: p.proposedAmount.toDecimal,
                days: p.estimatedDays,
                status: p.status,
            })),
        };
    }
}
