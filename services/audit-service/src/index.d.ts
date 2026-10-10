import { UniqueEntityID, IEventBroker } from '@platform/shared-kernel';
export type AuditEntityType = 'USUARIO' | 'TRABAJO' | 'PROPUESTA' | 'CUSTODIA' | 'RESEÑA' | 'FEED';
export type AuditResult = 'EXITOSA' | 'FALLIDA';
export interface AuditEntryProps {
    occurredAt: Date;
    eventName: string;
    entityType: AuditEntityType;
    aggregateId: string;
    actorId?: string;
    description: string;
    affectedIds: string[];
    amount?: number;
    result: AuditResult;
}
export declare class AuditEntry {
    private readonly _id;
    private readonly props;
    constructor(props: AuditEntryProps, id?: UniqueEntityID);
    get id(): UniqueEntityID;
    get occurredAt(): Date;
    get eventName(): string;
    get entityType(): AuditEntityType;
    get aggregateId(): string;
    get actorId(): string | undefined;
    get description(): string;
    get affectedIds(): string[];
    get amount(): number | undefined;
    get result(): AuditResult;
}
export interface IAuditRepository {
    append(entry: AuditEntry): Promise<void>;
    query(filter: AuditFilter): Promise<AuditEntry[]>;
    count(): Promise<number>;
}
export interface AuditFilter {
    eventName?: string;
    entityType?: AuditEntityType;
    actorId?: string;
    aggregateId?: string;
    from?: Date;
    to?: Date;
    limit?: number;
}
export interface AuditEntryResponseDTO {
    id: string;
    occurredAt: Date;
    eventName: string;
    entityType: AuditEntityType;
    aggregateId: string;
    actorId?: string;
    description: string;
    affectedIds: string[];
    amount?: number;
    result: AuditResult;
}
export declare function toAuditEntryDTO(entry: AuditEntry): AuditEntryResponseDTO;
export declare class RegisterAuditEntryUseCase {
    private readonly auditRepo;
    constructor(auditRepo: IAuditRepository);
    execute(props: AuditEntryProps): Promise<AuditEntryResponseDTO>;
}
export declare class QueryAuditLogUseCase {
    private readonly auditRepo;
    constructor(auditRepo: IAuditRepository);
    execute(filter?: AuditFilter): Promise<AuditEntryResponseDTO[]>;
}
export declare class InMemoryAuditRepository implements IAuditRepository {
    private entries;
    append(entry: AuditEntry): Promise<void>;
    query(filter: AuditFilter): Promise<AuditEntry[]>;
    count(): Promise<number>;
    clear(): void;
}
export declare const EVENTOS_AUDITABLES: string[];
export declare class AuditEventProjector {
    private readonly eventBroker;
    private readonly registerUseCase;
    constructor(eventBroker: IEventBroker, registerUseCase: RegisterAuditEntryUseCase);
    setupSubscriptions(eventNames?: string[]): Promise<void>;
    private project;
}
export declare class AuditController {
    private readonly queryUseCase;
    constructor(queryUseCase: QueryAuditLogUseCase);
    handleGetLog(query?: AuditFilter): Promise<{
        statusCode: number;
        data: AuditEntryResponseDTO[];
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
}
