import { AggregateRoot, DomainEvent, UniqueEntityID, Money, IEventBroker } from '@platform/shared-kernel';
export type ProposalStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
export interface ProposalProps {
    jobId: string;
    providerId: string;
    proposedAmount: Money;
    estimatedDays: number;
    coverLetter: string;
    status: ProposalStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ProposalSubmittedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        proposalId: string;
        jobId: string;
        providerId: string;
        proposedAmount: number;
        estimatedDays: number;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "proposal.submitted";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        proposalId: string;
        jobId: string;
        providerId: string;
        proposedAmount: number;
        estimatedDays: number;
    });
}
export declare class ProposalAcceptedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        proposalId: string;
        jobId: string;
        providerId: string;
        agreedAmount: number;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "proposal.accepted";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        proposalId: string;
        jobId: string;
        providerId: string;
        agreedAmount: number;
    });
}
export declare class ProposalRejectedEvent implements DomainEvent {
    readonly aggregateId: string;
    readonly payload: {
        proposalId: string;
        jobId: string;
        providerId: string;
    };
    readonly eventId: `${string}-${string}-${string}-${string}-${string}`;
    readonly eventName = "proposal.rejected";
    readonly occurredOn: Date;
    constructor(aggregateId: string, payload: {
        proposalId: string;
        jobId: string;
        providerId: string;
    });
}
export declare class Proposal extends AggregateRoot<ProposalProps> {
    private constructor();
    static create(props: {
        jobId: string;
        providerId: string;
        proposedAmountDecimal: number;
        estimatedDays: number;
        coverLetter: string;
    }, id?: UniqueEntityID): Proposal;
    get jobId(): string;
    get providerId(): string;
    get proposedAmount(): Money;
    get estimatedDays(): number;
    get coverLetter(): string;
    get status(): ProposalStatus;
    accept(): void;
    reject(): void;
}
export interface IProposalRepository {
    save(proposal: Proposal): Promise<void>;
    findById(id: string): Promise<Proposal | null>;
    findByJobId(jobId: string): Promise<Proposal[]>;
    findByProviderId(providerId: string): Promise<Proposal[]>;
}
export interface SubmitProposalDTO {
    jobId: string;
    providerId: string;
    proposedAmountDecimal: number;
    estimatedDays: number;
    coverLetter: string;
}
export interface ProposalResponseDTO {
    id: string;
    jobId: string;
    providerId: string;
    proposedAmount: number;
    currency: string;
    estimatedDays: number;
    coverLetter: string;
    status: ProposalStatus;
}
export declare class SubmitProposalUseCase {
    private readonly proposalRepo;
    private readonly eventBroker;
    constructor(proposalRepo: IProposalRepository, eventBroker: IEventBroker);
    execute(dto: SubmitProposalDTO): Promise<ProposalResponseDTO>;
    private mapToDTO;
}
export declare class AcceptProposalUseCase {
    private readonly proposalRepo;
    private readonly eventBroker;
    constructor(proposalRepo: IProposalRepository, eventBroker: IEventBroker);
    execute(proposalId: string): Promise<ProposalResponseDTO>;
}
export declare class InMemoryProposalRepository implements IProposalRepository {
    private proposals;
    save(proposal: Proposal): Promise<void>;
    findById(id: string): Promise<Proposal | null>;
    findByJobId(jobId: string): Promise<Proposal[]>;
    findByProviderId(providerId: string): Promise<Proposal[]>;
    clear(): void;
}
export declare class ProposalController {
    private readonly submitUseCase;
    private readonly acceptUseCase;
    private readonly proposalRepo;
    constructor(submitUseCase: SubmitProposalUseCase, acceptUseCase: AcceptProposalUseCase, proposalRepo: IProposalRepository);
    handleSubmit(body: SubmitProposalDTO): Promise<{
        statusCode: number;
        data: ProposalResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleAccept(proposalId: string): Promise<{
        statusCode: number;
        data: ProposalResponseDTO;
        error?: undefined;
    } | {
        statusCode: number;
        error: any;
        data?: undefined;
    }>;
    handleGetByJob(jobId: string): Promise<{
        statusCode: number;
        data: {
            id: string;
            providerId: string;
            amount: number;
            days: number;
            status: ProposalStatus;
        }[];
    }>;
}
