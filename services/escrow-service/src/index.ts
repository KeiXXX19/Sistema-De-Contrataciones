import { AggregateRoot, DomainEvent, UniqueEntityID, Money, IEventBroker } from '@platform/shared-kernel';

// ==========================================
// 1. DOMINIO: ESTADOS, EVENTOS Y ENTIDAD
// ==========================================
export type EscrowStatus =
  | 'PENDING_DEPOSIT'
  | 'FUNDS_HELD'
  | 'RELEASED'
  | 'REFUNDED'
  | 'DISPUTED'
  | 'SPLIT_SETTLED'
  | 'CANCELLED';

export type DisputeResolution = 'RELEASED_TO_PROVIDER' | 'REFUNDED_TO_CLIENT';

export interface FeeBreakdown {
  baseAmount: Money;
  clientFeeRate: number; // Ej: 3%
  clientFeeAmount: Money;
  totalClientPaid: Money;
  providerCommissionRate: number; // Ej: 10%
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

export class EscrowCreatedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'escrow.created';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      escrowId: string;
      jobId: string;
      clientId: string;
      providerId: string;
      totalToDeposit: number;
    }
  ) {}
}

export class EscrowDepositedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'escrow.deposited';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      escrowId: string;
      jobId: string;
      clientId: string;
      providerId: string;
      amountHeld: number;
      transactionId: string;
    }
  ) {}
}

export class EscrowReleasedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'escrow.released';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      escrowId: string;
      jobId: string;
      providerId: string;
      netPayoutAmount: number;
      platformFeeRetained: number;
      payoutTransactionId: string;
    }
  ) {}
}

export class EscrowRefundedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'escrow.refunded';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      escrowId: string;
      jobId: string;
      clientId: string;
      refundedAmount: number;
      refundTransactionId: string;
    }
  ) {}
}

export class EscrowDisputeOpenedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'escrow.dispute_opened';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      escrowId: string;
      jobId: string;
      clientId: string;
      providerId: string;
      openedBy: string;
      reason: string;
      amountHeld: number;
      openedAt: Date;
    }
  ) {}
}

export class EscrowDisputeResolvedEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'escrow.dispute_resolved';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      escrowId: string;
      jobId: string;
      adminId: string;
      resolution: DisputeResolution;
      transactionId: string;
      resolvedAt: Date;
    }
  ) {}
}

export class EscrowCancelledEvent implements DomainEvent {
  readonly eventId = crypto.randomUUID();
  readonly eventName = 'escrow.cancelled';
  readonly occurredOn = new Date();

  constructor(
    public readonly aggregateId: string,
    public readonly payload: {
      escrowId: string;
      jobId: string;
      adminId: string;
      reason: string;
      cancelledAt: Date;
    }
  ) {}
}

export class Escrow extends AggregateRoot<EscrowProps> {
  private constructor(props: EscrowProps, id?: UniqueEntityID) {
    super(props, id);
  }

  // --- REGLAS DE NEGOCIO: CÁLCULO DE COMISIONES (TAKE-RATE) ---
  static calculateFees(
    baseAmountDecimal: number,
    clientFeeRate = 3, // 3% tarifa de servicio al cliente
    providerCommissionRate = 10, // 10% retención al prestador
    currency = 'USD'
  ): FeeBreakdown {
    const base = Money.fromDecimal(baseAmountDecimal, currency);
    const clientFee = base.percentage(clientFeeRate);
    const totalClientPaid = base.add(clientFee);

    const providerCommission = base.percentage(providerCommissionRate);
    const netProviderPayout = base.subtract(providerCommission);

    const platformProfit = clientFee.add(providerCommission);

    return {
      baseAmount: base,
      clientFeeRate,
      clientFeeAmount: clientFee,
      totalClientPaid,
      providerCommissionRate,
      providerCommissionAmount: providerCommission,
      netProviderPayout,
      platformProfit,
    };
  }

  static create(
    props: {
      jobId: string;
      clientId: string;
      providerId: string;
      agreedAmountDecimal: number;
      clientFeeRate?: number;
      providerCommissionRate?: number;
    },
    id?: UniqueEntityID
  ): Escrow {
    if (!props.jobId) throw new Error('El ID del trabajo es requerido');
    if (!props.clientId) throw new Error('El ID del cliente es requerido');
    if (!props.providerId) throw new Error('El ID del prestador es requerido');
    if (props.agreedAmountDecimal <= 0) {
      throw new Error('El monto acordado debe ser mayor a cero');
    }

    const fees = Escrow.calculateFees(
      props.agreedAmountDecimal,
      props.clientFeeRate ?? 3,
      props.providerCommissionRate ?? 10
    );

    const escrow = new Escrow(
      {
        jobId: props.jobId,
        clientId: props.clientId,
        providerId: props.providerId,
        fees,
        status: 'PENDING_DEPOSIT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id
    );

    escrow.addDomainEvent(
      new EscrowCreatedEvent(escrow.id.toString(), {
        escrowId: escrow.id.toString(),
        jobId: escrow.props.jobId,
        clientId: escrow.props.clientId,
        providerId: escrow.props.providerId,
        totalToDeposit: escrow.props.fees.totalClientPaid.toDecimal,
      })
    );

    return escrow;
  }

  get jobId(): string {
    return this.props.jobId;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get providerId(): string {
    return this.props.providerId;
  }

  get fees(): FeeBreakdown {
    return this.props.fees;
  }

  get status(): EscrowStatus {
    return this.props.status;
  }

  get paymentTransactionId(): string | undefined {
    return this.props.paymentTransactionId;
  }

  get payoutTransactionId(): string | undefined {
    return this.props.payoutTransactionId;
  }

  get refundTransactionId(): string | undefined {
    return this.props.refundTransactionId;
  }

  get disputeReason(): string | undefined {
    return this.props.disputeReason;
  }

  get disputeOpenedBy(): string | undefined {
    return this.props.disputeOpenedBy;
  }

  get disputeOpenedAt(): Date | undefined {
    return this.props.disputeOpenedAt;
  }

  get disputeResolvedBy(): string | undefined {
    return this.props.disputeResolvedBy;
  }

  get disputeResolution(): DisputeResolution | undefined {
    return this.props.disputeResolution;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // --- MÁQUINA DE ESTADOS Y PROTECCIÓN DEL DINERO ---
  confirmDeposit(transactionId: string): void {
    if (this.props.status !== 'PENDING_DEPOSIT') {
      throw new Error(`No se puede depositar en una custodia en estado ${this.props.status}`);
    }
    if (!transactionId) {
      throw new Error('Se requiere el identificador de la transacción de pago');
    }

    this.props.status = 'FUNDS_HELD';
    this.props.paymentTransactionId = transactionId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new EscrowDepositedEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        clientId: this.props.clientId,
        providerId: this.props.providerId,
        amountHeld: this.props.fees.totalClientPaid.toDecimal,
        transactionId,
      })
    );
  }

  releaseFunds(payoutTransactionId: string): void {
    if (this.props.status !== 'FUNDS_HELD') {
      throw new Error(`Solo se pueden liberar fondos actualmente retenidos en custodia`);
    }
    if (!payoutTransactionId) {
      throw new Error('Se requiere el identificador de la transferencia de liquidación');
    }

    this.props.status = 'RELEASED';
    this.props.payoutTransactionId = payoutTransactionId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new EscrowReleasedEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        providerId: this.props.providerId,
        netPayoutAmount: this.props.fees.netProviderPayout.toDecimal,
        platformFeeRetained: this.props.fees.platformProfit.toDecimal,
        payoutTransactionId,
      })
    );
  }

  refundClient(refundTransactionId: string): void {
    if (this.props.status !== 'FUNDS_HELD' && this.props.status !== 'DISPUTED') {
      throw new Error(`No se puede reembolsar una custodia en estado ${this.props.status}`);
    }
    if (!refundTransactionId) {
      throw new Error('Se requiere el identificador de la transacción de reembolso');
    }

    this.props.status = 'REFUNDED';
    this.props.refundTransactionId = refundTransactionId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new EscrowRefundedEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        clientId: this.props.clientId,
        refundedAmount: this.props.fees.totalClientPaid.toDecimal,
        refundTransactionId,
      })
    );
  }

  // --- DISPUTAS Y ACCIONES ADMINISTRATIVAS ---
  openDispute(openedBy: string, reason: string): void {
    if (this.props.status !== 'FUNDS_HELD') {
      throw new Error(
        `Solo se puede disputar una custodia con fondos retenidos (estado actual: ${this.props.status})`
      );
    }
    if (!openedBy) {
      throw new Error('Se requiere el identificador de quien abre la disputa');
    }
    if (!reason || reason.trim().length < 10) {
      throw new Error('El motivo de la disputa debe tener al menos 10 caracteres');
    }

    this.props.status = 'DISPUTED';
    this.props.disputeReason = reason.trim();
    this.props.disputeOpenedBy = openedBy;
    this.props.disputeOpenedAt = new Date();
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new EscrowDisputeOpenedEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        clientId: this.props.clientId,
        providerId: this.props.providerId,
        openedBy,
        reason: reason.trim(),
        amountHeld: this.props.fees.totalClientPaid.toDecimal,
        openedAt: new Date(),
      })
    );
  }

  resolveDisputeReleasing(payoutTransactionId: string, adminId: string): void {
    if (this.props.status !== 'DISPUTED') {
      throw new Error(`No hay una disputa activa que resolver (estado actual: ${this.props.status})`);
    }
    if (!payoutTransactionId) {
      throw new Error('Se requiere el identificador de la transferencia de liquidación');
    }
    if (!adminId) {
      throw new Error('Se requiere el identificador del administrador que resuelve');
    }

    this.props.status = 'RELEASED';
    this.props.payoutTransactionId = payoutTransactionId;
    this.props.disputeResolvedBy = adminId;
    this.props.disputeResolution = 'RELEASED_TO_PROVIDER';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new EscrowReleasedEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        providerId: this.props.providerId,
        netPayoutAmount: this.props.fees.netProviderPayout.toDecimal,
        platformFeeRetained: this.props.fees.platformProfit.toDecimal,
        payoutTransactionId,
      })
    );

    this.addDomainEvent(
      new EscrowDisputeResolvedEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        adminId,
        resolution: 'RELEASED_TO_PROVIDER',
        transactionId: payoutTransactionId,
        resolvedAt: new Date(),
      })
    );
  }

  resolveDisputeRefunding(refundTransactionId: string, adminId: string): void {
    if (this.props.status !== 'DISPUTED') {
      throw new Error(`No hay una disputa activa que resolver (estado actual: ${this.props.status})`);
    }
    if (!refundTransactionId) {
      throw new Error('Se requiere el identificador de la transacción de reembolso');
    }
    if (!adminId) {
      throw new Error('Se requiere el identificador del administrador que resuelve');
    }

    this.props.status = 'REFUNDED';
    this.props.refundTransactionId = refundTransactionId;
    this.props.disputeResolvedBy = adminId;
    this.props.disputeResolution = 'REFUNDED_TO_CLIENT';
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new EscrowRefundedEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        clientId: this.props.clientId,
        refundedAmount: this.props.fees.totalClientPaid.toDecimal,
        refundTransactionId,
      })
    );

    this.addDomainEvent(
      new EscrowDisputeResolvedEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        adminId,
        resolution: 'REFUNDED_TO_CLIENT',
        transactionId: refundTransactionId,
        resolvedAt: new Date(),
      })
    );
  }

  cancelByAdmin(adminId: string, reason: string): void {
    if (this.props.status !== 'PENDING_DEPOSIT') {
      throw new Error(
        `Solo se puede cancelar una custodia pendiente de depósito (estado actual: ${this.props.status})`
      );
    }
    if (!adminId) {
      throw new Error('Se requiere el identificador del administrador que cancela');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('Se requiere un motivo de al menos 5 caracteres para cancelar la custodia');
    }

    this.props.status = 'CANCELLED';
    this.props.disputeReason = reason.trim();
    this.props.disputeOpenedBy = adminId;
    this.props.updatedAt = new Date();

    this.addDomainEvent(
      new EscrowCancelledEvent(this.id.toString(), {
        escrowId: this.id.toString(),
        jobId: this.props.jobId,
        adminId,
        reason: reason.trim(),
        cancelledAt: new Date(),
      })
    );
  }
}

// ==========================================
// 2. PUERTOS (IN & OUT)
// ==========================================
export interface IEscrowRepository {
  save(escrow: Escrow): Promise<void>;
  findById(id: string): Promise<Escrow | null>;
  findByJobId(jobId: string): Promise<Escrow | null>;
  findAll(): Promise<Escrow[]>;
}

export interface IPaymentGateway {
  captureEscrowDeposit(amount: Money, paymentMethodId: string): Promise<{ transactionId: string }>;
  payoutToProvider(providerAccountId: string, netAmount: Money): Promise<{ payoutId: string }>;
  refundToClient(paymentTransactionId: string, amount: Money): Promise<{ refundId: string }>;
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

export function toEscrowResponseDTO(escrow: Escrow): EscrowResponseDTO {
  return {
    id: escrow.id.toString(),
    jobId: escrow.jobId,
    clientId: escrow.clientId,
    providerId: escrow.providerId,
    status: escrow.status,
    baseAmount: escrow.fees.baseAmount.toDecimal,
    clientFee: escrow.fees.clientFeeAmount.toDecimal,
    totalClientPaid: escrow.fees.totalClientPaid.toDecimal,
    providerCommission: escrow.fees.providerCommissionAmount.toDecimal,
    netProviderPayout: escrow.fees.netProviderPayout.toDecimal,
    platformProfit: escrow.fees.platformProfit.toDecimal,
    currency: escrow.fees.baseAmount.currency,
    paymentTransactionId: escrow.paymentTransactionId,
    payoutTransactionId: escrow.payoutTransactionId,
    refundTransactionId: escrow.refundTransactionId,
    disputeReason: escrow.disputeReason,
    disputeOpenedBy: escrow.disputeOpenedBy,
    disputeOpenedAt: escrow.disputeOpenedAt,
    disputeResolvedBy: escrow.disputeResolvedBy,
    disputeResolution: escrow.disputeResolution,
    createdAt: escrow.createdAt,
    updatedAt: escrow.updatedAt,
  };
}

// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class CreateEscrowUseCase {
  constructor(
    private readonly escrowRepo: IEscrowRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: CreateEscrowDTO): Promise<EscrowResponseDTO> {
    const existing = await this.escrowRepo.findByJobId(dto.jobId);
    if (existing) {
      throw new Error(`Ya existe un contrato de custodia para el trabajo ${dto.jobId}`);
    }

    const escrow = Escrow.create(dto);
    await this.escrowRepo.save(escrow);
    await this.eventBroker.publishAll(escrow.domainEvents);
    escrow.clearDomainEvents();

    return toEscrowResponseDTO(escrow);
  }
}

export class DepositEscrowUseCase {
  constructor(
    private readonly escrowRepo: IEscrowRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(escrowId: string, paymentMethodId: string): Promise<EscrowResponseDTO> {
    const escrow = await this.escrowRepo.findById(escrowId);
    if (!escrow) throw new Error(`Custodia con ID ${escrowId} no encontrada`);

    // Cobrar al cliente mediante la pasarela de pagos
    const { transactionId } = await this.paymentGateway.captureEscrowDeposit(
      escrow.fees.totalClientPaid,
      paymentMethodId
    );

    escrow.confirmDeposit(transactionId);
    await this.escrowRepo.save(escrow);
    await this.eventBroker.publishAll(escrow.domainEvents);
    escrow.clearDomainEvents();

    return toEscrowResponseDTO(escrow);
  }
}

export class ReleaseEscrowUseCase {
  constructor(
    private readonly escrowRepo: IEscrowRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(escrowId: string, providerAccountId: string): Promise<EscrowResponseDTO> {
    const escrow = await this.escrowRepo.findById(escrowId);
    if (!escrow) throw new Error(`Custodia con ID ${escrowId} no encontrada`);

    // Liquidar el pago neto a la cuenta del proveedor a través de la pasarela
    const { payoutId } = await this.paymentGateway.payoutToProvider(
      providerAccountId,
      escrow.fees.netProviderPayout
    );

    escrow.releaseFunds(payoutId);
    await this.escrowRepo.save(escrow);
    await this.eventBroker.publishAll(escrow.domainEvents);
    escrow.clearDomainEvents();

    return toEscrowResponseDTO(escrow);
  }
}

export class OpenEscrowDisputeUseCase {
  constructor(
    private readonly escrowRepo: IEscrowRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: { escrowId: string; openedBy: string; reason: string }): Promise<EscrowResponseDTO> {
    const escrow = await this.escrowRepo.findById(dto.escrowId);
    if (!escrow) throw new Error(`Custodia con ID ${dto.escrowId} no encontrada`);

    escrow.openDispute(dto.openedBy, dto.reason);
    await this.escrowRepo.save(escrow);
    await this.eventBroker.publishAll(escrow.domainEvents);
    escrow.clearDomainEvents();

    return toEscrowResponseDTO(escrow);
  }
}

export class ResolveEscrowDisputeUseCase {
  constructor(
    private readonly escrowRepo: IEscrowRepository,
    private readonly paymentGateway: IPaymentGateway,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: {
    escrowId: string;
    adminId: string;
    resolution: DisputeResolution;
  }): Promise<EscrowResponseDTO> {
    const escrow = await this.escrowRepo.findById(dto.escrowId);
    if (!escrow) throw new Error(`Custodia con ID ${dto.escrowId} no encontrada`);

    if (dto.resolution === 'RELEASED_TO_PROVIDER') {
      const providerAccountId = `acct_prov_${escrow.providerId}`;
      const { payoutId } = await this.paymentGateway.payoutToProvider(
        providerAccountId,
        escrow.fees.netProviderPayout
      );
      escrow.resolveDisputeReleasing(payoutId, dto.adminId);
    } else {
      if (!escrow.paymentTransactionId) {
        throw new Error('La custodia no tiene transacción de depósito asociada para reembolsar');
      }
      const { refundId } = await this.paymentGateway.refundToClient(
        escrow.paymentTransactionId,
        escrow.fees.totalClientPaid
      );
      escrow.resolveDisputeRefunding(refundId, dto.adminId);
    }

    await this.escrowRepo.save(escrow);
    await this.eventBroker.publishAll(escrow.domainEvents);
    escrow.clearDomainEvents();

    return toEscrowResponseDTO(escrow);
  }
}

export class CancelEscrowUseCase {
  constructor(
    private readonly escrowRepo: IEscrowRepository,
    private readonly eventBroker: IEventBroker
  ) {}

  async execute(dto: { escrowId: string; adminId: string; reason: string }): Promise<EscrowResponseDTO> {
    const escrow = await this.escrowRepo.findById(dto.escrowId);
    if (!escrow) throw new Error(`Custodia con ID ${dto.escrowId} no encontrada`);

    escrow.cancelByAdmin(dto.adminId, dto.reason);
    await this.escrowRepo.save(escrow);
    await this.eventBroker.publishAll(escrow.domainEvents);
    escrow.clearDomainEvents();

    return toEscrowResponseDTO(escrow);
  }
}

export class ListEscrowsUseCase {
  constructor(private readonly escrowRepo: IEscrowRepository) {}

  async execute(filter?: { status?: EscrowStatus }): Promise<EscrowResponseDTO[]> {
    const escrows = await this.escrowRepo.findAll();
    const ordered = [...escrows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const filtered = filter?.status
      ? ordered.filter((e) => e.status === filter.status)
      : ordered;
    return filtered.map(toEscrowResponseDTO);
  }
}

// ==========================================
// 4. ADAPTADORES (INFRASTRUCTURE LAYER)
// ==========================================
export class InMemoryEscrowRepository implements IEscrowRepository {
  private escrows = new Map<string, Escrow>();

  async save(escrow: Escrow): Promise<void> {
    this.escrows.set(escrow.id.toString(), escrow);
  }

  async findById(id: string): Promise<Escrow | null> {
    return this.escrows.get(id) || null;
  }

  async findByJobId(jobId: string): Promise<Escrow | null> {
    for (const item of this.escrows.values()) {
      if (item.jobId === jobId) return item;
    }
    return null;
  }

  async findAll(): Promise<Escrow[]> {
    return Array.from(this.escrows.values());
  }

  clear(): void {
    this.escrows.clear();
  }
}

export class MockEscrowPaymentGateway implements IPaymentGateway {
  public capturedDeposits: Array<{ amount: Money; paymentMethodId: string; txId: string }> = [];
  public payouts: Array<{ providerAccountId: string; netAmount: Money; payoutId: string }> = [];
  public refunds: Array<{ paymentTransactionId: string; amount: Money; refundId: string }> = [];

  async captureEscrowDeposit(amount: Money, paymentMethodId: string): Promise<{ transactionId: string }> {
    const txId = `ch_stripe_${crypto.randomUUID().slice(0, 8)}`;
    this.capturedDeposits.push({ amount, paymentMethodId, txId });
    return { transactionId: txId };
  }

  async payoutToProvider(providerAccountId: string, netAmount: Money): Promise<{ payoutId: string }> {
    const payoutId = `po_stripe_${crypto.randomUUID().slice(0, 8)}`;
    this.payouts.push({ providerAccountId, netAmount, payoutId });
    return { payoutId };
  }

  async refundToClient(paymentTransactionId: string, amount: Money): Promise<{ refundId: string }> {
    const refundId = `re_stripe_${crypto.randomUUID().slice(0, 8)}`;
    this.refunds.push({ paymentTransactionId, amount, refundId });
    return { refundId };
  }
}

export class EscrowController {
  constructor(
    private readonly createUseCase: CreateEscrowUseCase,
    private readonly depositUseCase: DepositEscrowUseCase,
    private readonly releaseUseCase: ReleaseEscrowUseCase,
    private readonly repo: IEscrowRepository,
    private readonly openDisputeUseCase?: OpenEscrowDisputeUseCase,
    private readonly resolveDisputeUseCase?: ResolveEscrowDisputeUseCase,
    private readonly cancelUseCase?: CancelEscrowUseCase,
    private readonly listUseCase?: ListEscrowsUseCase
  ) {}

  async handleCreate(body: CreateEscrowDTO) {
    try {
      const data = await this.createUseCase.execute(body);
      return { statusCode: 201, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleDeposit(escrowId: string, body: { paymentMethodId: string }) {
    try {
      const data = await this.depositUseCase.execute(escrowId, body.paymentMethodId);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleRelease(escrowId: string, body: { providerAccountId: string }) {
    try {
      const data = await this.releaseUseCase.execute(escrowId, body.providerAccountId);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleOpenDispute(escrowId: string, body: { openedBy: string; reason: string }) {
    if (!this.openDisputeUseCase) return { statusCode: 501, error: 'Caso de uso no configurado' };
    try {
      const data = await this.openDisputeUseCase.execute({ escrowId, ...body });
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleResolveDispute(
    escrowId: string,
    body: { adminId: string; resolution: DisputeResolution }
  ) {
    if (!this.resolveDisputeUseCase) return { statusCode: 501, error: 'Caso de uso no configurado' };
    try {
      const data = await this.resolveDisputeUseCase.execute({ escrowId, ...body });
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleCancel(escrowId: string, body: { adminId: string; reason: string }) {
    if (!this.cancelUseCase) return { statusCode: 501, error: 'Caso de uso no configurado' };
    try {
      const data = await this.cancelUseCase.execute({ escrowId, ...body });
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }

  async handleList(query?: { status?: EscrowStatus }) {
    if (!this.listUseCase) return { statusCode: 501, error: 'Caso de uso no configurado' };
    try {
      const data = await this.listUseCase.execute(query);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }
}
