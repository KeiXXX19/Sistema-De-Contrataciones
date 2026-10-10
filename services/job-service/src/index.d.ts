import { AggregateRoot, DomainEvent, UniqueEntityID, Money, IEventBroker } from '@platform/shared-kernel';
export type JobStatus = 'DRAFT' | 'OPEN' | 'ASSIGNED_PENDING_ESCROW' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'CANCELLED' | 'IN_DISPUTE' | 'PAYMENT_FAILED';
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
}
export declare class JobCreatedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        jobId: string;
        title: string;
        clientId: string;
        budget: number;
        category: string;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "job.created";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        jobId: string;
        title: string;
        clientId: string;
        budget: number;
        category: string;
    });
}
export declare class JobAssignedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        jobId: string;
        clientId: string;
        providerId: string;
        agreedAmount: number;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "job.assigned";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        jobId: string;
        clientId: string;
        providerId: string;
        agreedAmount: number;
    });
}
export declare class JobStartedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        jobId: string;
        clientId: string;
        providerId: string;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "job.started";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        jobId: string;
        clientId: string;
        providerId: string;
    });
}
export declare class JobDeliveredEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        jobId: string;
        providerId: string;
        deliverableUrl: string;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "job.delivered";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        jobId: string;
        providerId: string;
        deliverableUrl: string;
    });
}
export declare class JobApprovedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        jobId: string;
        clientId: string;
        providerId: string;
        completedAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "job.approved";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        jobId: string;
        clientId: string;
        providerId: string;
        completedAt: Date;
    });
}
export declare class JobPaymentFailedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        jobId: string;
        clientId: string;
        providerId?: string;
        reason: string;
    };
    readonly eventId: string;
    readonly eventName = "job.payment_failed";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        jobId: string;
        clientId: string;
        providerId?: string;
        reason: string;
    });
}
export declare class JobDisputedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        jobId: string;
        reason: string;
        openedBy: string;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "job.disputed";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        jobId: string;
        reason: string;
        openedBy: string;
    });
}
export declare class JobCancelledEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        jobId: string;
        clientId: string;
        providerId?: string;
        cancelledAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "job.cancelled";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        jobId: string;
        clientId: string;
        providerId?: string;
        cancelledAt: Date;
    });
}
export declare class Job extends AggregateRoot<JobProps> {
    private constructor();
    static create(props: {
        title: string;
        description: string;
        category: string;
        clientId: string;
        budgetAmount: number;
        asDraft?: boolean;
    }, id?: UniqueEntityID): Job;
    get title(): string;
    get description(): string;
    get category(): string;
    get clientId(): string;
    get budget(): Money;
    get status(): JobStatus;
    get assignedProviderId(): string | undefined;
    get deliverableUrl(): string | undefined;
    get disputeReason(): string | undefined;
    get createdAt(): Date;
    assignToProvider(providerId: string, agreedAmountDecimal: number): void;
    confirmEscrowFunded(): void;
    submitDeliverable(deliverableUrl: string, notes?: string): void;
    requestModifications(reason: string): void;
    approveWork(): void;
    openDispute(openedByUserId: string, reason: string): void;
    resolveDisputeCompleted(): void;
    cancelAfterDispute(): void;
    revertToOpen(reason?: string): void;
}
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
}
export declare function toJobResponseDTO(job: Job): JobResponseDTO;
export declare class CreateJobUseCase {
    private readonly jobRepo;
    private readonly eventBroker;
    constructor(jobRepo: IJobRepository, eventBroker: IEventBroker);
    execute(dto: CreateJobDTO): Promise<JobResponseDTO>;
}
export declare class AssignJobUseCase {
    private readonly jobRepo;
    private readonly eventBroker;
    constructor(jobRepo: IJobRepository, eventBroker: IEventBroker);
    execute(jobId: string, providerId: string, agreedAmountDecimal: number): Promise<JobResponseDTO>;
}
export declare class SubmitDeliverableUseCase {
    private readonly jobRepo;
    private readonly eventBroker;
    constructor(jobRepo: IJobRepository, eventBroker: IEventBroker);
    execute(jobId: string, deliverableUrl: string, notes?: string): Promise<JobResponseDTO>;
}
export declare class ApproveJobUseCase {
    private readonly jobRepo;
    private readonly eventBroker;
    constructor(jobRepo: IJobRepository, eventBroker: IEventBroker);
    execute(jobId: string): Promise<JobResponseDTO>;
}
export declare class ListJobsUseCase {
    private readonly jobRepo;
    constructor(jobRepo: IJobRepository);
    execute(filter?: {
        status?: JobStatus;
        clientId?: string;
    }): Promise<JobResponseDTO[]>;
}
export declare class InMemoryJobRepository implements IJobRepository {
    private jobs;
    save(job: Job): Promise<void>;
    findById(id: string): Promise<Job | null>;
    findByStatus(status: JobStatus): Promise<Job[]>;
    findByClient(clientId: string): Promise<Job[]>;
    findAll(): Promise<Job[]>;
    clear(): void;
}
export declare class JobController {
    private readonly createJobUseCase;
    private readonly assignJobUseCase;
    private readonly submitDeliverableUseCase;
    private readonly approveJobUseCase;
    private readonly jobRepo;
    constructor(createJobUseCase: CreateJobUseCase, assignJobUseCase: AssignJobUseCase, submitDeliverableUseCase: SubmitDeliverableUseCase, approveJobUseCase: ApproveJobUseCase, jobRepo: IJobRepository);
    handleCreate(body: CreateJobDTO): Promise<{
        statusCode: number;
        data: JobResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleAssign(jobId: string, body: {
        providerId: string;
        agreedAmount: number;
    }): Promise<{
        statusCode: number;
        data: JobResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleSubmitDeliverable(jobId: string, body: {
        deliverableUrl: string;
        notes?: string;
    }): Promise<{
        statusCode: number;
        data: JobResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleApprove(jobId: string): Promise<{
        statusCode: number;
        data: JobResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleGetById(jobId: string): Promise<{
        statusCode: number;
        error: string;
        data?: undefined;
    } | {
        statusCode: number;
        data: {
            id: string;
            title: string;
            status: JobStatus;
            budget: number;
        };
        error?: undefined;
    }>;
}
