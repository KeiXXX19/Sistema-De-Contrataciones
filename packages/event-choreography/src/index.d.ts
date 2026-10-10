import { IEventBroker } from '@platform/shared-kernel';
import { IJobRepository } from '@platform/job-service';
import { IEscrowRepository, CreateEscrowUseCase, ReleaseEscrowUseCase } from '@platform/escrow-service';
import { IJobFeedRepository } from '@platform/job-feed-service';
export declare class MarketplaceEventCoordinator {
    private readonly eventBroker;
    private readonly jobRepo;
    private readonly escrowRepo;
    private readonly createEscrowUseCase;
    private readonly releaseEscrowUseCase;
    private readonly feedRepo?;
    constructor(eventBroker: IEventBroker, jobRepo: IJobRepository, escrowRepo: IEscrowRepository, createEscrowUseCase: CreateEscrowUseCase, releaseEscrowUseCase: ReleaseEscrowUseCase, feedRepo?: IJobFeedRepository | undefined);
    setupSubscriptions(): Promise<void>;
}
