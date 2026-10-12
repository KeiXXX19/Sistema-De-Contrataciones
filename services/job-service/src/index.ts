import { AggregateRoot, DomainEvent, UniqueEntityID, Money, IEventBroker } from '@platform/shared-kernel';

function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


// ==========================================
// 1. DOMINIO: ESTADOS, EVENTOS Y ENTIDAD
// ==========================================
export type JobStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'ASSIGNED_PENDING_ESCROW'
  | 'IN_PROGRESS'
  | 'UNDER_REVIEW'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'IN_DISPUTE'
  | 'PAYMENT_FAILED';

export type BudgetType = 'FIXED' | 'HOURLY' | 'DAILY' | 'NEGOTIABLE';
export type JobModalidad = 'REMOTO' | 'PRESENCIAL' | 'HIBRIDO';

export interface JobAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface JobRequirements {
  workerCount?: number;
  experienceLevel?: string;
  toolsRequired?: string[];
  materialsIncludedBy?: 'CLIENT' | 'PROVIDER' | 'NOT_APPLICABLE';
  certificationsRequired?: string[];
  scopeType?: 'LABOR_ONLY' | 'ALL_INCLUSIVE';
  proposalsDeadline?: string;
  startDate?: string;
  deliveryDuration?: string;
}

export interface JobProps {
  title: string;
  description: string;
  category: string;
  clientId: string;
  budget: Money;
  status: JobStatus;
  assignedProviderId?: string;
  deliverableUrl?: string;
  deliverableNotes?: string;
  disputeReason?: string;
  createdAt: Date;
  updatedAt: Date;
  budgetType?: BudgetType;
  currency?: string;
  estimatedDuration?: string;
  modalidad?: JobModalidad;
  location?: string;
  address?: string;
  attachments?: JobAttachment[];
  requirements?: JobRequirements;
  categoryDetails?: Record<string, any>;
}

export class JobCreatedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'job.created';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      jobId: string;
      title: string;
      clientId: string;
      budget: number;
      category: string;
      description?: string;
      budgetType?: BudgetType;
      currency?: string;
      estimatedDuration?: string;
      modalidad?: JobModalidad;
      location?: string;
      address?: string;
      attachments?: JobAttachment[];
      requirements?: JobRequirements;
      categoryDetails?: Record<string, any>;
    }
  ) {}
}

export class JobAssignedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'job.assigned';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      jobId: string;
      clientId: string;
      providerId: string;
      agreedAmount: number;
    }
  ) {}
}

export class JobStartedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'job.started';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      jobId: string;
      clientId: string;
      providerId: string;
    }
  ) {}
}

export class JobDeliveredEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'job.delivered';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      jobId: string;
      providerId: string;
      deliverableUrl: string;
    }
  ) {}
}

export class JobApprovedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'job.approved';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      jobId: string;
      clientId: string;
      providerId: string;
      completedAt: Date;
    }
  ) {}
}

export class JobPaymentFailedEvent implements DomainEvent {
  readonly eventId = generateUUID();
  readonly eventName = 'job.payment_failed';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      jobId: string;
      clientId: string;
      providerId?: string;
      reason: string;
    }
  ) {}
}

export class JobDisputedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'job.disputed';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      jobId: string;
      reason: string;
      openedBy: string;
    }
  ) {}
}

export class JobCancelledEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'job.cancelled';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      jobId: string;
      clientId: string;
      providerId?: string;
      cancelledAt: Date;
    }
  ) {}
}

export class Job extends AggregateRoot<JobProps> {
  private constructor(props: JobProps, id?: UniqueEntityID) {
    super(props, id);
  }

  static create(
    props: {
      title: string;
      description: string;
      category: string;
      clientId: string;
      budgetAmount: number;
      asDraft?: boolean;
      budgetType?: BudgetType;
      currency?: string;
      estimatedDuration?: string;
      modalidad?: JobModalidad;
      location?: string;
      address?: string;
      attachments?: JobAttachment[];
      requirements?: JobRequirements;
      categoryDetails?: Record<string, any>;
    },
    id?: UniqueEntityID
  ): Job {
    if (!props.title || props.title.trim().length < 5) {
      throw new Error('El título del trabajo debe tener al menos 5 caracteres');
    }
    if (!props.description || props.description.trim().length < 10) {
      throw new Error('La descripción del trabajo debe tener al menos 10 caracteres');
    }

    const budget = Money.fromDecimal(props.budgetAmount);
    const initialStatus: JobStatus = props.asDraft ? 'DRAFT' : 'OPEN';

    const job = new Job(
      {
        title: props.title.trim(),
        description: props.description.trim(),
        category: props.category.trim(),
        clientId: props.clientId,
        budget,
        status: initialStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetType: props.budgetType ?? 'FIXED',
        currency: props.currency ?? 'COP',
        estimatedDuration: props.estimatedDuration,
        modalidad: props.modalidad ?? 'REMOTO',
        location: props.location,
        address: props.address,
        attachments: props.attachments ?? [],
        requirements: props.requirements,
        categoryDetails: props.categoryDetails,
      },
      id
    );

    if (initialStatus === 'OPEN') {
      job.addDomainEvent(
        new JobCreatedEvent(job.id.toString(), {
          jobId: job.id.toString(),
          title: job.title,
          clientId: job.clientId,
          budget: job.budget.toDecimal,
          category: job.category,
          description: job.description,
          budgetType: job.props.budgetType,
          currency: job.props.currency,
          estimatedDuration: job.props.estimatedDuration,
          modalidad: job.props.modalidad,
          location: job.props.location,
          address: job.props.address,
          attachments: job.props.attachments,
          requirements: job.props.requirements,
          categoryDetails: job.props.categoryDetails,
        })
      );
    }

    return job;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get budget(): Money {
    return this.props.budget;
  }

  get status(): JobStatus {
    return this.props.status;
  }

  get assignedProviderId(): string | undefined {
    return this.props.assignedProviderId;
  }

  get deliverableUrl(): string | undefined {
    return this.props.deliverableUrl;
  }

  get disputeReason(): string | undefined {
    return this.props.disputeReason;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get budgetType(): BudgetType | undefined {
    return this.props.budgetType;
  }

  get currency(): string | undefined {
    return this.props.currency;
  }

  get estimatedDuration(): string | undefined {
    return this.props.estimatedDuration;
  }

  get modalidad(): JobModalidad | undefined {
    return this.props.modalidad;
  }

  get location(): string | undefined {
    return this.props.location;
  }

  get address(): string | undefined {
    return this.props.address;
  }

  get attachments(): JobAttachment[] {
    return this.props.attachments ?? [];
  }

  get requirements(): JobRequirements | undefined {
    return this.props.requirements;
  }

  get categoryDetails(): Record<string, any> | undefined {
    return this.props.categoryDetails;
  }

  // --- MÁQUINA DE ESTADOS / INVARIANTES DE NEGOCIO ---
  assignToProvider(providerId: string, agreedAmountDecimal: number): void {
    if (this.props.status !== 'OPEN') {
      throw new Error(`No se puede asignar un trabajo en estado: ${this.props.status}`);
    }
    this.props.assignedProviderId = providerId;
    this.props.budget = Money.fromDecimal(agreedAmountDecimal);
    this.props.status = 'ASSIGNED_PENDING_ESCROW';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new JobAssignedEvent(this.id.toString(), {
        jobId: this.id.toString(),
        clientId: this.props.clientId,
        providerId,
        agreedAmount: agreedAmountDecimal,
      })
    );
  }

  confirmEscrowFunded(): void {
    if (this.props.status !== 'ASSIGNED_PENDING_ESCROW') {
      throw new Error(`El trabajo debe estar pendiente de depósito para activarse`);
    }
    this.props.status = 'IN_PROGRESS';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new JobStartedEvent(this.id.toString(), {
        jobId: this.id.toString(),
        clientId: this.props.clientId,
        providerId: this.props.assignedProviderId!,
      })
    );
  }

  submitDeliverable(deliverableUrl: string, notes?: string): void {
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

    this.addDomainEvent(
      new JobDeliveredEvent(this.id.toString(), {
        jobId: this.id.toString(),
        providerId: this.props.assignedProviderId!,
        deliverableUrl: this.props.deliverableUrl,
      })
    );
  }

  requestModifications(reason: string): void {
    if (this.props.status !== 'UNDER_REVIEW') {
      throw new Error('Solo se pueden pedir cambios sobre trabajos entregados en revisión');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('Debe especificar un motivo válido de corrección');
    }
    this.props.status = 'IN_PROGRESS';
    this.props.updatedAt = new Date();
  }

  approveWork(): void {
    if (this.props.status !== 'UNDER_REVIEW') {
      throw new Error('No se puede aprobar un trabajo que no haya sido entregado para revisión');
    }
    this.props.status = 'COMPLETED';
    const now = new Date();
    this.props.updatedAt = now;

    this.addDomainEvent(
      new JobApprovedEvent(this.id.toString(), {
        jobId: this.id.toString(),
        clientId: this.props.clientId,
        providerId: this.props.assignedProviderId!,
        completedAt: now,
      })
    );
  }

  openDispute(openedByUserId: string, reason: string): void {
    if (this.props.status !== 'IN_PROGRESS' && this.props.status !== 'UNDER_REVIEW') {
      throw new Error('Solo se puede abrir disputa sobre trabajos en progreso o bajo revisión');
    }
    this.props.status = 'IN_DISPUTE';
    this.props.disputeReason = reason;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new JobDisputedEvent(this.id.toString(), {
        jobId: this.id.toString(),
        reason,
        openedBy: openedByUserId,
      })
    );
  }

  // RESOLUCIÓN DE DISPUTA A FAVOR DEL PRESTADOR: el pago ya fue liberado por escrow
  resolveDisputeCompleted(): void {
    if (this.props.status !== 'IN_DISPUTE') {
      throw new Error('Solo se puede completar un trabajo que se encuentre en disputa');
    }
    this.props.status = 'COMPLETED';
    const now = new Date();
    this.props.updatedAt = now;

    this.addDomainEvent(
      new JobApprovedEvent(this.id.toString(), {
        jobId: this.id.toString(),
        clientId: this.props.clientId,
        providerId: this.props.assignedProviderId!,
        completedAt: now,
      })
    );
  }

  // RESOLUCIÓN DE DISPUTA A FAVOR DEL CLIENTE: el dinero fue reembolsado por escrow
  cancelAfterDispute(): void {
    if (this.props.status !== 'IN_DISPUTE') {
      throw new Error('Solo se puede cancelar un trabajo que se encuentre en disputa');
    }
    this.props.status = 'CANCELLED';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new JobCancelledEvent(this.id.toString(), {
        jobId: this.id.toString(),
        clientId: this.props.clientId,
        providerId: this.props.assignedProviderId,
        cancelledAt: new Date(),
      })
    );
  }

  // SAGA COMPENSACIÓN: Revertir al estado OPEN cuando el pago en escrow falla
  revertToOpen(reason = 'Fallo en el pago de la pasarela'): void {
    if (this.props.status !== 'ASSIGNED_PENDING_ESCROW') {
      throw new Error(`Solo se puede revertir un trabajo en estado ASSIGNED_PENDING_ESCROW. Estado actual: ${this.props.status}`);
    }
    const failedProviderId = this.props.assignedProviderId;
    this.props.status = 'OPEN';
    this.props.assignedProviderId = undefined;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new JobPaymentFailedEvent(this.id.toString(), {
        jobId: this.id.toString(),
        clientId: this.props.clientId,
        providerId: failedProviderId,
        reason,
      })
    );
  }
}

// ==========================================
// 2. PUERTOS (IN & OUT)
// ==========================================
export interface IJobRepository {
  save(job: Job): Promise<void>;
  findById(id: string): Promise<Job | null>;
  findByStatus(status: JobStatus): Promise<Job[]>;
  findByClient(clientId: string): Promise<Job[]>;
  findAll(): Promise<Job[]>;
}

export interface CreateJobDTO {
  title: string;
  description: string;
  category: string;
  clientId: string;
  budgetAmount: number;
  budgetType?: BudgetType;
  currency?: string;
  estimatedDuration?: string;
  modalidad?: JobModalidad;
  location?: string;
  address?: string;
  attachments?: JobAttachment[];
  requirements?: JobRequirements;
  categoryDetails?: Record<string, any>;
  asDraft?: boolean;
}

export interface JobResponseDTO {
  id: string;
  title: string;
  description: string;
  category: string;
  clientId: string;
  budgetAmount: number;
  currency: string;
  status: JobStatus;
  assignedProviderId?: string;
  deliverableUrl?: string;
  disputeReason?: string;
  createdAt: Date;
  budgetType?: BudgetType;
  estimatedDuration?: string;
  modalidad?: JobModalidad;
  location?: string;
  address?: string;
  attachments?: JobAttachment[];
  requirements?: JobRequirements;
  categoryDetails?: Record<string, any>;
}

export function toJobResponseDTO(job: Job): JobResponseDTO {
  return {
    id: job.id.toString(),
    title: job.title,
    description: job.description,
    category: job.category,
    clientId: job.clientId,
    budgetAmount: job.budget.toDecimal,
    currency: job.currency ?? job.budget.currency,
    status: job.status,
    assignedProviderId: job.assignedProviderId,
    deliverableUrl: job.deliverableUrl,
    disputeReason: job.disputeReason,
    createdAt: job.createdAt,
    budgetType: job.budgetType,
    estimatedDuration: job.estimatedDuration,
    modalidad: job.modalidad,
    location: job.location,
    address: job.address,
    attachments: job.attachments,
    requirements: job.requirements,
    categoryDetails: job.categoryDetails,
  };
}

// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class CreateJobUseCase {
  constructor(
    private readonly jobRepo: IJobRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: CreateJobDTO): Promise<JobResponseDTO> {
    const job = Job.create(dto);
    await this.jobRepo.save(job);
    await this.eventBroker.publishAll(job.domainEvents);
    job.clearDomainEvents();

    return toJobResponseDTO(job);
  }
}

export class AssignJobUseCase {
  constructor(
    private readonly jobRepo: IJobRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(jobId: string, providerId: string, agreedAmountDecimal: number): Promise<JobResponseDTO> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new Error(`Trabajo con ID ${jobId} no encontrado`);

    job.assignToProvider(providerId, agreedAmountDecimal);
    await this.jobRepo.save(job);
    await this.eventBroker.publishAll(job.domainEvents);
    job.clearDomainEvents();

    return toJobResponseDTO(job);
  }
}

export class SubmitDeliverableUseCase {
  constructor(
    private readonly jobRepo: IJobRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(jobId: string, deliverableUrl: string, notes?: string): Promise<JobResponseDTO> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new Error(`Trabajo con ID ${jobId} no encontrado`);

    job.submitDeliverable(deliverableUrl, notes);
    await this.jobRepo.save(job);
    await this.eventBroker.publishAll(job.domainEvents);
    job.clearDomainEvents();

    return toJobResponseDTO(job);
  }
}

export class ApproveJobUseCase {
  constructor(
    private readonly jobRepo: IJobRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(jobId: string): Promise<JobResponseDTO> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new Error(`Trabajo con ID ${jobId} no encontrado`);

    job.approveWork();
    await this.jobRepo.save(job);
    await this.eventBroker.publishAll(job.domainEvents);
    job.clearDomainEvents();

    return toJobResponseDTO(job);
  }
}

export class ListJobsUseCase {
  constructor(private readonly jobRepo: IJobRepository) {}

  async execute(filter?: { status?: JobStatus; clientId?: string }): Promise<JobResponseDTO[]> {
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
export class InMemoryJobRepository implements IJobRepository {
  private jobs = new Map<string, Job>();

  async save(job: Job): Promise<void> {
    this.jobs.set(job.id.toString(), job);
  }

  async findById(id: string): Promise<Job | null> {
    return this.jobs.get(id) || null;
  }

  async findByStatus(status: JobStatus): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter((j) => j.status === status);
  }

  async findByClient(clientId: string): Promise<Job[]> {
    return Array.from(this.jobs.values()).filter((j) => j.clientId === clientId);
  }

  async findAll(): Promise<Job[]> {
    return Array.from(this.jobs.values());
  }

  clear(): void {
    this.jobs.clear();
  }
}

export class JobController {
  constructor(
    private readonly createJobUseCase: CreateJobUseCase,
    private readonly assignJobUseCase: AssignJobUseCase,
    private readonly submitDeliverableUseCase: SubmitDeliverableUseCase,
    private readonly approveJobUseCase: ApproveJobUseCase,
    private readonly jobRepo: IJobRepository
  ) {}

  async handleCreate(body: CreateJobDTO) {
    try {
      const data = await this.createJobUseCase.execute(body);
      return { statusCode: 201, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleAssign(jobId: string, body: { providerId: string; agreedAmount: number }) {
    try {
      const data = await this.assignJobUseCase.execute(jobId, body.providerId, body.agreedAmount);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleSubmitDeliverable(jobId: string, body: { deliverableUrl: string; notes?: string }) {
    try {
      const data = await this.submitDeliverableUseCase.execute(jobId, body.deliverableUrl, body.notes);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleApprove(jobId: string) {
    try {
      const data = await this.approveJobUseCase.execute(jobId);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleGetById(jobId: string) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) return { statusCode: 404, error: 'Trabajo no encontrado' };
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
