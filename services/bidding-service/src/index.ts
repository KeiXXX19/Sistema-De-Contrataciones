import { AggregateRoot, DomainEvent, UniqueEntityID, Money, IEventBroker } from '@platform/shared-kernel';

// ==========================================
// 1. DOMINIO: ESTADOS, EVENTOS Y ENTIDAD
// ==========================================
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

export class ProposalSubmittedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'proposal.submitted';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      proposalId: string;
      jobId: string;
      providerId: string;
      proposedAmount: number;
      estimatedDays: number;
    }
  ) {}
}

export class ProposalAcceptedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'proposal.accepted';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      proposalId: string;
      jobId: string;
      providerId: string;
      agreedAmount: number;
    }
  ) {}
}

export class ProposalRejectedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'proposal.rejected';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      proposalId: string;
      jobId: string;
      providerId: string;
    }
  ) {}
}

export class Proposal extends AggregateRoot<ProposalProps> {
  private constructor(props: ProposalProps, id?: UniqueEntityID) {
    super(props, id);
  }

  static create(
    props: {
      jobId: string;
      providerId: string;
      proposedAmountDecimal: number;
      estimatedDays: number;
      coverLetter: string;
    },
    id?: UniqueEntityID
  ): Proposal {
    if (!props.jobId) throw new Error('El ID del trabajo es requerido');
    if (!props.providerId) throw new Error('El ID del prestador es requerido');
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
    const proposal = new Proposal(
      {
        jobId: props.jobId,
        providerId: props.providerId,
        proposedAmount,
        estimatedDays: props.estimatedDays,
        coverLetter: props.coverLetter.trim(),
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id
    );

    proposal.addDomainEvent(
      new ProposalSubmittedEvent(proposal.id.toString(), {
        proposalId: proposal.id.toString(),
        jobId: proposal.jobId,
        providerId: proposal.providerId,
        proposedAmount: proposal.proposedAmount.toDecimal,
        estimatedDays: proposal.estimatedDays,
      })
    );

    return proposal;
  }

  get jobId(): string {
    return this.props.jobId;
  }

  get providerId(): string {
    return this.props.providerId;
  }

  get proposedAmount(): Money {
    return this.props.proposedAmount;
  }

  get estimatedDays(): number {
    return this.props.estimatedDays;
  }

  get coverLetter(): string {
    return this.props.coverLetter;
  }

  get status(): ProposalStatus {
    return this.props.status;
  }

  accept(): void {
    if (this.props.status !== 'SUBMITTED') {
      throw new Error(`No se puede aceptar una propuesta en estado ${this.props.status}`);
    }
    this.props.status = 'ACCEPTED';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ProposalAcceptedEvent(this.id.toString(), {
        proposalId: this.id.toString(),
        jobId: this.props.jobId,
        providerId: this.props.providerId,
        agreedAmount: this.props.proposedAmount.toDecimal,
      })
    );
  }

  reject(): void {
    if (this.props.status !== 'SUBMITTED') {
      throw new Error(`No se puede rechazar una propuesta en estado ${this.props.status}`);
    }
    this.props.status = 'REJECTED';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new ProposalRejectedEvent(this.id.toString(), {
        proposalId: this.id.toString(),
        jobId: this.props.jobId,
        providerId: this.props.providerId,
      })
    );
  }
}

// ==========================================
// 2. PUERTOS (IN & OUT)
// ==========================================
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

// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class SubmitProposalUseCase {
  constructor(
    private readonly proposalRepo: IProposalRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: SubmitProposalDTO): Promise<ProposalResponseDTO> {
    const existing = await this.proposalRepo.findByJobId(dto.jobId);
    const alreadySubmitted = existing.some(
      (p) => p.providerId === dto.providerId && p.status === 'SUBMITTED'
    );
    if (alreadySubmitted) {
      throw new Error('El prestador ya tiene una oferta activa para este trabajo');
    }

    const proposal = Proposal.create(dto);
    await this.proposalRepo.save(proposal);
    await this.eventBroker.publishAll(proposal.domainEvents);
    proposal.clearDomainEvents();

    return this.mapToDTO(proposal);
  }

  private mapToDTO(proposal: Proposal): ProposalResponseDTO {
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
  constructor(
    private readonly proposalRepo: IProposalRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(proposalId: string): Promise<ProposalResponseDTO> {
    const proposal = await this.proposalRepo.findById(proposalId);
    if (!proposal) throw new Error(`Propuesta con ID ${proposalId} no encontrada`);

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
export class InMemoryProposalRepository implements IProposalRepository {
  private proposals = new Map<string, Proposal>();

  async save(proposal: Proposal): Promise<void> {
    this.proposals.set(proposal.id.toString(), proposal);
  }

  async findById(id: string): Promise<Proposal | null> {
    return this.proposals.get(id) || null;
  }

  async findByJobId(jobId: string): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter((p) => p.jobId === jobId);
  }

  async findByProviderId(providerId: string): Promise<Proposal[]> {
    return Array.from(this.proposals.values()).filter((p) => p.providerId === providerId);
  }

  clear(): void {
    this.proposals.clear();
  }
}

export class ProposalController {
  constructor(
    private readonly submitUseCase: SubmitProposalUseCase,
    private readonly acceptUseCase: AcceptProposalUseCase,
    private readonly proposalRepo: IProposalRepository
  ) {}

  async handleSubmit(body: SubmitProposalDTO) {
    try {
      const data = await this.submitUseCase.execute(body);
      return { statusCode: 201, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleAccept(proposalId: string) {
    try {
      const data = await this.acceptUseCase.execute(proposalId);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleGetByJob(jobId: string) {
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
