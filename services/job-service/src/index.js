import { AggregateRoot, Money } from '@platform/shared-kernel';
function generateUUID() {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
export class JobCreatedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'job.created';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class JobAssignedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'job.assigned';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class JobStartedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'job.started';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class JobDeliveredEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'job.delivered';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class JobApprovedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'job.approved';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class JobPaymentFailedEvent {
    aggregateId;
    payload;
    eventId = generateUUID();
    eventName = 'job.payment_failed';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class JobDisputedEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'job.disputed';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class JobCancelledEvent {
    aggregateId;
    payload;
    eventId = crypto.randomUUID();
    eventName = 'job.cancelled';
    occurredOn = new Date();
    constructor(aggregateId, payload) {
        this.aggregateId = aggregateId;
        this.payload = payload;
    }
}
export class Job extends AggregateRoot {
    constructor(props, id) {
        super(props, id);
    }
    static create(props, id) {
        if (!props.title || props.title.trim().length < 5) {
            throw new Error('El título del trabajo debe tener al menos 5 caracteres');
        }
        if (!props.description || props.description.trim().length < 10) {
            throw new Error('La descripción del trabajo debe tener al menos 10 caracteres');
        }
        const budget = Money.fromDecimal(props.budgetAmount);
        const initialStatus = props.asDraft ? 'DRAFT' : 'OPEN';
        const job = new Job({
            title: props.title.trim(),
            description: props.description.trim(),
            category: props.category.trim(),
            clientId: props.clientId,
            budget,
            status: initialStatus,
            createdAt: new Date(),
            updatedAt: new Date(),
        }, id);
        if (initialStatus === 'OPEN') {
            job.addDomainEvent(new JobCreatedEvent(job.id.toString(), {
                jobId: job.id.toString(),
                title: job.title,
                clientId: job.clientId,
                budget: job.budget.toDecimal,
                category: job.category,
            }));
        }
        return job;
    }
    get title() {
        return this.props.title;
    }
    get description() {
        return this.props.description;
    }
    get category() {
        return this.props.category;
    }
    get clientId() {
        return this.props.clientId;
    }
    get budget() {
        return this.props.budget;
    }
    get status() {
        return this.props.status;
    }
    get assignedProviderId() {
        return this.props.assignedProviderId;
    }
    get deliverableUrl() {
        return this.props.deliverableUrl;
    }
    get disputeReason() {
        return this.props.disputeReason;
    }
    get createdAt() {
        return this.props.createdAt;
    }
    // --- MÁQUINA DE ESTADOS / INVARIANTES DE NEGOCIO ---
    assignToProvider(providerId, agreedAmountDecimal) {
        if (this.props.status !== 'OPEN') {
            throw new Error(`No se puede asignar un trabajo en estado: ${this.props.status}`);
        }
        this.props.assignedProviderId = providerId;
        this.props.budget = Money.fromDecimal(agreedAmountDecimal);
        this.props.status = 'ASSIGNED_PENDING_ESCROW';
        this.props.updatedAt = new Date();
        this.addDomainEvent(new JobAssignedEvent(this.id.toString(), {
            jobId: this.id.toString(),
            clientId: this.props.clientId,
            providerId,
            agreedAmount: agreedAmountDecimal,
        }));
    }
    confirmEscrowFunded() {
        if (this.props.status !== 'ASSIGNED_PENDING_ESCROW') {
            throw new Error(`El trabajo debe estar pendiente de depósito para activarse`);
        }
        this.props.status = 'IN_PROGRESS';
        this.props.updatedAt = new Date();
        this.addDomainEvent(new JobStartedEvent(this.id.toString(), {
            jobId: this.id.toString(),
            clientId: this.props.clientId,
            providerId: this.props.assignedProviderId,
        }));
    }
    submitDeliverable(deliverableUrl, notes) {
        if (this.props.status !== 'IN_PROGRESS') {
            throw new Error(`Solo se pueden entregar trabajos que estén EN PROGRESO`);
        }
        if (!deliverableUrl || !deliverableUrl.trim()) {
            throw new Error('La URL del entregable es obligatoria');
        }
        this.props.deliverableUrl = deliverableUrl.trim();
        this.props.deliverableNotes = notes?.trim();
        this.props.status = 'UNDER_REVIEW';
        this.props.updatedAt = new Date();
        this.addDomainEvent(new JobDeliveredEvent(this.id.toString(), {
            jobId: this.id.toString(),
            providerId: this.props.assignedProviderId,
            deliverableUrl: this.props.deliverableUrl,
        }));
    }
    requestModifications(reason) {
        if (this.props.status !== 'UNDER_REVIEW') {
            throw new Error('Solo se pueden pedir cambios sobre trabajos entregados en revisión');
        }
        if (!reason || reason.trim().length < 5) {
            throw new Error('Debe especificar un motivo válido de corrección');
        }
        this.props.status = 'IN_PROGRESS';
        this.props.updatedAt = new Date();
    }
    approveWork() {
        if (this.props.status !== 'UNDER_REVIEW') {
            throw new Error('No se puede aprobar un trabajo que no haya sido entregado para revisión');
        }
        this.props.status = 'COMPLETED';
        const now = new Date();
        this.props.updatedAt = now;
        this.addDomainEvent(new JobApprovedEvent(this.id.toString(), {
            jobId: this.id.toString(),
            clientId: this.props.clientId,
            providerId: this.props.assignedProviderId,
            completedAt: now,
        }));
    }
    openDispute(openedByUserId, reason) {
        if (this.props.status !== 'IN_PROGRESS' && this.props.status !== 'UNDER_REVIEW') {
            throw new Error('Solo se puede abrir disputa sobre trabajos en progreso o bajo revisión');
        }
        this.props.status = 'IN_DISPUTE';
        this.props.disputeReason = reason;
        this.props.updatedAt = new Date();
        this.addDomainEvent(new JobDisputedEvent(this.id.toString(), {
            jobId: this.id.toString(),
            reason,
            openedBy: openedByUserId,
        }));
    }
    // RESOLUCIÓN DE DISPUTA A FAVOR DEL PRESTADOR: el pago ya fue liberado por escrow
    resolveDisputeCompleted() {
        if (this.props.status !== 'IN_DISPUTE') {
            throw new Error('Solo se puede completar un trabajo que se encuentre en disputa');
        }
        this.props.status = 'COMPLETED';
        const now = new Date();
        this.props.updatedAt = now;
        this.addDomainEvent(new JobApprovedEvent(this.id.toString(), {
            jobId: this.id.toString(),
            clientId: this.props.clientId,
            providerId: this.props.assignedProviderId,
            completedAt: now,
        }));
    }
    // RESOLUCIÓN DE DISPUTA A FAVOR DEL CLIENTE: el dinero fue reembolsado por escrow
    cancelAfterDispute() {
        if (this.props.status !== 'IN_DISPUTE') {
            throw new Error('Solo se puede cancelar un trabajo que se encuentre en disputa');
        }
        this.props.status = 'CANCELLED';
        this.props.updatedAt = new Date();
        this.addDomainEvent(new JobCancelledEvent(this.id.toString(), {
            jobId: this.id.toString(),
            clientId: this.props.clientId,
            providerId: this.props.assignedProviderId,
            cancelledAt: new Date(),
        }));
    }
    // SAGA COMPENSACIÓN: Revertir al estado OPEN cuando el pago en escrow falla
    revertToOpen(reason = 'Fallo en el pago de la pasarela') {
        if (this.props.status !== 'ASSIGNED_PENDING_ESCROW') {
            throw new Error(`Solo se puede revertir un trabajo en estado ASSIGNED_PENDING_ESCROW. Estado actual: ${this.props.status}`);
        }
        const failedProviderId = this.props.assignedProviderId;
        this.props.status = 'OPEN';
        this.props.assignedProviderId = undefined;
        this.props.updatedAt = new Date();
        this.addDomainEvent(new JobPaymentFailedEvent(this.id.toString(), {
            jobId: this.id.toString(),
            clientId: this.props.clientId,
            providerId: failedProviderId,
            reason,
        }));
    }
}
export function toJobResponseDTO(job) {
    return {
        id: job.id.toString(),
        title: job.title,
        description: job.description,
        category: job.category,
        clientId: job.clientId,
        budgetAmount: job.budget.toDecimal,
        currency: job.budget.currency,
        status: job.status,
        assignedProviderId: job.assignedProviderId,
        deliverableUrl: job.deliverableUrl,
        disputeReason: job.disputeReason,
        createdAt: job.createdAt,
    };
}
// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class CreateJobUseCase {
    jobRepo;
    eventBroker;
    constructor(jobRepo, eventBroker) {
        this.jobRepo = jobRepo;
        this.eventBroker = eventBroker;
    }
    async execute(dto) {
        const job = Job.create(dto);
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
        return toJobResponseDTO(job);
    }
}
export class AssignJobUseCase {
    jobRepo;
    eventBroker;
    constructor(jobRepo, eventBroker) {
        this.jobRepo = jobRepo;
        this.eventBroker = eventBroker;
    }
    async execute(jobId, providerId, agreedAmountDecimal) {
        const job = await this.jobRepo.findById(jobId);
        if (!job)
            throw new Error(`Trabajo con ID ${jobId} no encontrado`);
        job.assignToProvider(providerId, agreedAmountDecimal);
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
        return toJobResponseDTO(job);
    }
}
export class SubmitDeliverableUseCase {
    jobRepo;
    eventBroker;
    constructor(jobRepo, eventBroker) {
        this.jobRepo = jobRepo;
        this.eventBroker = eventBroker;
    }
    async execute(jobId, deliverableUrl, notes) {
        const job = await this.jobRepo.findById(jobId);
        if (!job)
            throw new Error(`Trabajo con ID ${jobId} no encontrado`);
        job.submitDeliverable(deliverableUrl, notes);
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
        return toJobResponseDTO(job);
    }
}
export class ApproveJobUseCase {
    jobRepo;
    eventBroker;
    constructor(jobRepo, eventBroker) {
        this.jobRepo = jobRepo;
        this.eventBroker = eventBroker;
    }
    async execute(jobId) {
        const job = await this.jobRepo.findById(jobId);
        if (!job)
            throw new Error(`Trabajo con ID ${jobId} no encontrado`);
        job.approveWork();
        await this.jobRepo.save(job);
        await this.eventBroker.publishAll(job.domainEvents);
        job.clearDomainEvents();
        return toJobResponseDTO(job);
    }
}
export class ListJobsUseCase {
    jobRepo;
    constructor(jobRepo) {
        this.jobRepo = jobRepo;
    }
    async execute(filter) {
        let jobs = await this.jobRepo.findAll();
        if (filter?.status) {
            jobs = jobs.filter((j) => j.status === filter.status);
        }
        if (filter?.clientId) {
            jobs = jobs.filter((j) => j.clientId === filter.clientId);
        }
        return jobs
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map(toJobResponseDTO);
    }
}
// ==========================================
// 4. ADAPTADORES (INFRASTRUCTURE LAYER)
// ==========================================
export class InMemoryJobRepository {
    jobs = new Map();
    async save(job) {
        this.jobs.set(job.id.toString(), job);
    }
    async findById(id) {
        return this.jobs.get(id) || null;
    }
    async findByStatus(status) {
        return Array.from(this.jobs.values()).filter((j) => j.status === status);
    }
    async findByClient(clientId) {
        return Array.from(this.jobs.values()).filter((j) => j.clientId === clientId);
    }
    async findAll() {
        return Array.from(this.jobs.values());
    }
    clear() {
        this.jobs.clear();
    }
}
export class JobController {
    createJobUseCase;
    assignJobUseCase;
    submitDeliverableUseCase;
    approveJobUseCase;
    jobRepo;
    constructor(createJobUseCase, assignJobUseCase, submitDeliverableUseCase, approveJobUseCase, jobRepo) {
        this.createJobUseCase = createJobUseCase;
        this.assignJobUseCase = assignJobUseCase;
        this.submitDeliverableUseCase = submitDeliverableUseCase;
        this.approveJobUseCase = approveJobUseCase;
        this.jobRepo = jobRepo;
    }
    async handleCreate(body) {
        try {
            const data = await this.createJobUseCase.execute(body);
            return { statusCode: 201, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleAssign(jobId, body) {
        try {
            const data = await this.assignJobUseCase.execute(jobId, body.providerId, body.agreedAmount);
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleSubmitDeliverable(jobId, body) {
        try {
            const data = await this.submitDeliverableUseCase.execute(jobId, body.deliverableUrl, body.notes);
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleApprove(jobId) {
        try {
            const data = await this.approveJobUseCase.execute(jobId);
            return { statusCode: 200, data };
        }
        catch (err) {
            return { statusCode: 400, error: err.message };
        }
    }
    async handleGetById(jobId) {
        const job = await this.jobRepo.findById(jobId);
        if (!job)
            return { statusCode: 404, error: 'Trabajo no encontrado' };
        return {
            statusCode: 200,
            data: {
                id: job.id.toString(),
                title: job.title,
                status: job.status,
                budget: job.budget.toDecimal,
            },
        };
    }
}
