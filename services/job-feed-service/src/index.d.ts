import { AggregateRoot, DomainEvent, UniqueEntityID, IEventBroker } from '@platform/shared-kernel';
export type JobModalidad = 'REMOTO' | 'PRESENCIAL' | 'HIBRIDO';
export type JobSource = 'TRUSTPAY' | 'COMPUTRABAJO' | 'ELEMPLEO' | 'MAGNETO' | 'LINKEDIN';
export interface JobFeedItemProps {
    jobId: string;
    title: string;
    description: string;
    category: string;
    modalidad: JobModalidad;
    clientId: string;
    clientName: string;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    tags: string[];
    isOpen: boolean;
    publishedAt: Date;
    location?: string;
    source?: JobSource;
    companyName?: string;
    sourceUrl?: string;
}
export declare class JobFeedItemProjectedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        feedItemId: string;
        jobId: string;
        title: string;
        category: string;
        modalidad: string;
        location: string;
        source: JobSource;
    };
    readonly eventId: string;
    readonly eventName = "jobfeed.item_projected";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        feedItemId: string;
        jobId: string;
        title: string;
        category: string;
        modalidad: string;
        location: string;
        source: JobSource;
    });
}
export declare class JobFeedItem extends AggregateRoot<JobFeedItemProps> {
    private constructor();
    static create(props: JobFeedItemProps, id?: UniqueEntityID): JobFeedItem;
    get jobId(): string;
    get title(): string;
    get description(): string;
    get category(): string;
    get modalidad(): JobModalidad;
    get clientId(): string;
    get clientName(): string;
    get budgetMin(): number;
    get budgetMax(): number;
    get currency(): string;
    get tags(): string[];
    get isOpen(): boolean;
    get publishedAt(): Date;
    get location(): string;
    get source(): JobSource;
    get companyName(): string;
    get sourceUrl(): string | undefined;
    markClosed(): void;
    markOpen(): void;
}
export interface JobFeedFilter {
    searchText?: string;
    category?: string;
    modalidad?: JobModalidad;
    budgetMin?: number;
    budgetMax?: number;
    onlyOpen?: boolean;
    location?: string;
    source?: JobSource;
}
export interface IJobFeedRepository {
    save(item: JobFeedItem): Promise<void>;
    findById(id: string): Promise<JobFeedItem | null>;
    findByJobId(jobId: string): Promise<JobFeedItem | null>;
    query(filter: JobFeedFilter): Promise<JobFeedItem[]>;
    markClosed(jobId: string): Promise<void>;
    clear(): void;
}
export interface CreateFeedItemDTO {
    jobId: string;
    title: string;
    description: string;
    category: string;
    modalidad: JobModalidad;
    clientId: string;
    clientName: string;
    budgetMin: number;
    budgetMax: number;
    currency?: string;
    tags?: string[];
    location?: string;
    source?: JobSource;
    companyName?: string;
    sourceUrl?: string;
}
export interface FeedItemResponseDTO {
    id: string;
    jobId: string;
    title: string;
    description: string;
    category: string;
    modalidad: JobModalidad;
    clientId: string;
    clientName: string;
    budgetMin: number;
    budgetMax: number;
    currency: string;
    tags: string[];
    isOpen: boolean;
    publishedAt: Date;
    location: string;
    source: JobSource;
    companyName: string;
    sourceUrl?: string;
}
export declare class PublishToFeedUseCase {
    private readonly feedRepo;
    private readonly eventBroker;
    constructor(feedRepo: IJobFeedRepository, eventBroker: IEventBroker);
    execute(dto: CreateFeedItemDTO): Promise<FeedItemResponseDTO>;
    private toDTO;
}
export declare class QueryJobFeedUseCase {
    private readonly feedRepo;
    constructor(feedRepo: IJobFeedRepository);
    execute(filter?: JobFeedFilter): Promise<FeedItemResponseDTO[]>;
}
export declare class CloseFeedItemUseCase {
    private readonly feedRepo;
    constructor(feedRepo: IJobFeedRepository);
    execute(jobId: string): Promise<void>;
}
export declare class JobFeedProjector {
    private readonly broker;
    private readonly publishUseCase;
    private readonly closeUseCase;
    constructor(broker: IEventBroker, publishUseCase: PublishToFeedUseCase, closeUseCase: CloseFeedItemUseCase);
    setupSubscriptions(): void;
}
export declare class InMemoryJobFeedRepository implements IJobFeedRepository {
    private items;
    save(item: JobFeedItem): Promise<void>;
    findById(id: string): Promise<JobFeedItem | null>;
    findByJobId(jobId: string): Promise<JobFeedItem | null>;
    query(filter: JobFeedFilter): Promise<JobFeedItem[]>;
    markClosed(jobId: string): Promise<void>;
    clear(): void;
}
export declare const VACANTES_COLOMBIA_DEMO: CreateFeedItemDTO[];
