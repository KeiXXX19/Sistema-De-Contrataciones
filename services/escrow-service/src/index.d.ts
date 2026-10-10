import { AggregateRoot, DomainEvent, UniqueEntityID, Money, IEventBroker } from '@platform/shared-kernel';
export type EscrowStatus = 'PENDING_DEPOSIT' | 'FUNDS_HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED' | 'SPLIT_SETTLED' | 'CANCELLED';
export type DisputeResolution = 'RELEASED_TO_PROVIDER' | 'REFUNDED_TO_CLIENT';
export interface FeeBreakdown {
    baseAmount: Money;
    clientFeeRate: number;
    clientFeeAmount: Money;
    totalClientPaid: Money;
    providerCommissionRate: number;
    providerCommissionAmount: Money;
    netProviderPayout: Money;
    platformProfit: Money;
}
export interface EscrowProps {
    jobId: string;
    clientId: string;
    providerId: string;
    fees: FeeBreakdown;
    status: EscrowStatus;
    paymentTransactionId?: string;
    payoutTransactionId?: string;
    refundTransactionId?: string;
    disputeReason?: string;
    disputeOpenedBy?: string;
    disputeOpenedAt?: Date;
    disputeResolvedBy?: string;
    disputeResolution?: DisputeResolution;
    createdAt: Date;
    updatedAt: Date;
}
export declare class EscrowCreatedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        escrowId: string;
        jobId: string;
        clientId: string;
        providerId: string;
        totalToDeposit: number;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "escrow.created";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        escrowId: string;
        jobId: string;
        clientId: string;
        providerId: string;
        totalToDeposit: number;
    });
}
export declare class EscrowDepositedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        escrowId: string;
        jobId: string;
        clientId: string;
        providerId: string;
        amountHeld: number;
        transactionId: string;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "escrow.deposited";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        escrowId: string;
        jobId: string;
        clientId: string;
        providerId: string;
        amountHeld: number;
        transactionId: string;
    });
}
export declare class EscrowReleasedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        escrowId: string;
        jobId: string;
        providerId: string;
        netPayoutAmount: number;
        platformFeeRetained: number;
        payoutTransactionId: string;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "escrow.released";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        escrowId: string;
        jobId: string;
        providerId: string;
        netPayoutAmount: number;
        platformFeeRetained: number;
        payoutTransactionId: string;
    });
}
export declare class EscrowRefundedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        escrowId: string;
        jobId: string;
        clientId: string;
        refundedAmount: number;
        refundTransactionId: string;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "escrow.refunded";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        escrowId: string;
        jobId: string;
        clientId: string;
        refundedAmount: number;
        refundTransactionId: string;
    });
}
export declare class EscrowDisputeOpenedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        escrowId: string;
        jobId: string;
        clientId: string;
        providerId: string;
        openedBy: string;
        reason: string;
        amountHeld: number;
        openedAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "escrow.dispute_opened";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        escrowId: string;
        jobId: string;
        clientId: string;
        providerId: string;
        openedBy: string;
        reason: string;
        amountHeld: number;
        openedAt: Date;
    });
}
export declare class EscrowDisputeResolvedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        escrowId: string;
        jobId: string;
        adminId: string;
        resolution: DisputeResolution;
        transactionId: string;
        resolvedAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "escrow.dispute_resolved";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        escrowId: string;
        jobId: string;
        adminId: string;
        resolution: DisputeResolution;
        transactionId: string;
        resolvedAt: Date;
    });
}
export declare class EscrowCancelledEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        escrowId: string;
        jobId: string;
        adminId: string;
        reason: string;
        cancelledAt: Date;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "escrow.cancelled";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        escrowId: string;
        jobId: string;
        adminId: string;
        reason: string;
        cancelledAt: Date;
    });
}
export declare class Escrow extends AggregateRoot<EscrowProps> {
    private constructor();
    static calculateFees(baseAmountDecimal: number, clientFeeRate?: number, // 3% tarifa de servicio al cliente
    providerCommissionRate?: number, // 10% retención al prestador
    currency?: string): FeeBreakdown;
    static create(props: {
        jobId: string;
        clientId: string;
        providerId: string;
        agreedAmountDecimal: number;
        clientFeeRate?: number;
        providerCommissionRate?: number;
    }, id?: UniqueEntityID): Escrow;
    get jobId(): string;
    get clientId(): string;
    get providerId(): string;
    get fees(): FeeBreakdown;
    get status(): EscrowStatus;
    get paymentTransactionId(): string | undefined;
    get payoutTransactionId(): string | undefined;
    get refundTransactionId(): string | undefined;
    get disputeReason(): string | undefined;
    get disputeOpenedBy(): string | undefined;
    get disputeOpenedAt(): Date | undefined;
    get disputeResolvedBy(): string | undefined;
    get disputeResolution(): DisputeResolution | undefined;
    get createdAt(): Date;
    get updatedAt(): Date;
    confirmDeposit(transactionId: string): void;
    releaseFunds(payoutTransactionId: string): void;
    refundClient(refundTransactionId: string): void;
    openDispute(openedBy: string, reason: string): void;
    resolveDisputeReleasing(payoutTransactionId: string, adminId: string): void;
    resolveDisputeRefunding(refundTransactionId: string, adminId: string): void;
    cancelByAdmin(adminId: string, reason: string): void;
}
export interface IEscrowRepository {
    save(escrow: Escrow): Promise<void>;
    findById(id: string): Promise<Escrow | null>;
    findByJobId(jobId: string): Promise<Escrow | null>;
    findAll(): Promise<Escrow[]>;
}
export interface IPaymentGateway {
    captureEscrowDeposit(amount: Money, paymentMethodId: string): Promise<{
        transactionId: string;
    }>;
    payoutToProvider(providerAccountId: string, netAmount: Money): Promise<{
        payoutId: string;
    }>;
    refundToClient(paymentTransactionId: string, amount: Money): Promise<{
        refundId: string;
    }>;
}
export interface CreateEscrowDTO {
    jobId: string;
    clientId: string;
    providerId: string;
    agreedAmountDecimal: number;
}
export interface EscrowResponseDTO {
    id: string;
    jobId: string;
    clientId: string;
    providerId: string;
    status: EscrowStatus;
    baseAmount: number;
    clientFee: number;
    totalClientPaid: number;
    providerCommission: number;
    netProviderPayout: number;
    platformProfit: number;
    currency: string;
    paymentTransactionId?: string;
    payoutTransactionId?: string;
    refundTransactionId?: string;
    disputeReason?: string;
    disputeOpenedBy?: string;
    disputeOpenedAt?: Date;
    disputeResolvedBy?: string;
    disputeResolution?: DisputeResolution;
    createdAt: Date;
    updatedAt: Date;
}
export declare function toEscrowResponseDTO(escrow: Escrow): EscrowResponseDTO;
export declare class CreateEscrowUseCase {
    private readonly escrowRepo;
    private readonly eventBroker;
    constructor(escrowRepo: IEscrowRepository, eventBroker: IEventBroker);
    execute(dto: CreateEscrowDTO): Promise<EscrowResponseDTO>;
}
export declare class DepositEscrowUseCase {
    private readonly escrowRepo;
    private readonly paymentGateway;
    private readonly eventBroker;
    constructor(escrowRepo: IEscrowRepository, paymentGateway: IPaymentGateway, eventBroker: IEventBroker);
    execute(escrowId: string, paymentMethodId: string): Promise<EscrowResponseDTO>;
}
export declare class ReleaseEscrowUseCase {
    private readonly escrowRepo;
    private readonly paymentGateway;
    private readonly eventBroker;
    constructor(escrowRepo: IEscrowRepository, paymentGateway: IPaymentGateway, eventBroker: IEventBroker);
    execute(escrowId: string, providerAccountId: string): Promise<EscrowResponseDTO>;
}
export declare class OpenEscrowDisputeUseCase {
    private readonly escrowRepo;
    private readonly eventBroker;
    constructor(escrowRepo: IEscrowRepository, eventBroker: IEventBroker);
    execute(dto: {
        escrowId: string;
        openedBy: string;
        reason: string;
    }): Promise<EscrowResponseDTO>;
}
export declare class ResolveEscrowDisputeUseCase {
    private readonly escrowRepo;
    private readonly paymentGateway;
    private readonly eventBroker;
    constructor(escrowRepo: IEscrowRepository, paymentGateway: IPaymentGateway, eventBroker: IEventBroker);
    execute(dto: {
        escrowId: string;
        adminId: string;
        resolution: DisputeResolution;
    }): Promise<EscrowResponseDTO>;
}
export declare class CancelEscrowUseCase {
    private readonly escrowRepo;
    private readonly eventBroker;
    constructor(escrowRepo: IEscrowRepository, eventBroker: IEventBroker);
    execute(dto: {
        escrowId: string;
        adminId: string;
        reason: string;
    }): Promise<EscrowResponseDTO>;
}
export declare class ListEscrowsUseCase {
    private readonly escrowRepo;
    constructor(escrowRepo: IEscrowRepository);
    execute(filter?: {
        status?: EscrowStatus;
    }): Promise<EscrowResponseDTO[]>;
}
export declare class InMemoryEscrowRepository implements IEscrowRepository {
    private escrows;
    save(escrow: Escrow): Promise<void>;
    findById(id: string): Promise<Escrow | null>;
    findByJobId(jobId: string): Promise<Escrow | null>;
    findAll(): Promise<Escrow[]>;
    clear(): void;
}
export declare class MockEscrowPaymentGateway implements IPaymentGateway {
    capturedDeposits: Array<{
        amount: Money;
        paymentMethodId: string;
        txId: string;
    }>;
    payouts: Array<{
        providerAccountId: string;
        netAmount: Money;
        payoutId: string;
    }>;
    refunds: Array<{
        paymentTransactionId: string;
        amount: Money;
        refundId: string;
    }>;
    captureEscrowDeposit(amount: Money, paymentMethodId: string): Promise<{
        transactionId: string;
    }>;
    payoutToProvider(providerAccountId: string, netAmount: Money): Promise<{
        payoutId: string;
    }>;
    refundToClient(paymentTransactionId: string, amount: Money): Promise<{
        refundId: string;
    }>;
}
export declare class EscrowController {
    private readonly createUseCase;
    private readonly depositUseCase;
    private readonly releaseUseCase;
    private readonly repo;
    private readonly openDisputeUseCase?;
    private readonly resolveDisputeUseCase?;
    private readonly cancelUseCase?;
    private readonly listUseCase?;
    constructor(createUseCase: CreateEscrowUseCase, depositUseCase: DepositEscrowUseCase, releaseUseCase: ReleaseEscrowUseCase, repo: IEscrowRepository, openDisputeUseCase?: OpenEscrowDisputeUseCase | undefined, resolveDisputeUseCase?: ResolveEscrowDisputeUseCase | undefined, cancelUseCase?: CancelEscrowUseCase | undefined, listUseCase?: ListEscrowsUseCase | undefined);
    handleCreate(body: CreateEscrowDTO): Promise<{
        statusCode: number;
        data: EscrowResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleDeposit(escrowId: string, body: {
        paymentMethodId: string;
    }): Promise<{
        statusCode: number;
        data: EscrowResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleRelease(escrowId: string, body: {
        providerAccountId: string;
    }): Promise<{
        statusCode: number;
        data: EscrowResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleOpenDispute(escrowId: string, body: {
        openedBy: string;
        reason: string;
    }): Promise<{
        statusCode: number;
        data: EscrowResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleResolveDispute(escrowId: string, body: {
        adminId: string;
        resolution: DisputeResolution;
    }): Promise<{
        statusCode: number;
        data: EscrowResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleCancel(escrowId: string, body: {
        adminId: string;
        reason: string;
    }): Promise<{
        statusCode: number;
        data: EscrowResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleList(query?: {
        status?: EscrowStatus;
    }): Promise<{
        statusCode: number;
        data: EscrowResponseDTO[];
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
}
