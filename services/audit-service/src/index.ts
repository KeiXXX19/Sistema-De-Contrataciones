import { UniqueEntityID, DomainEvent, IEventBroker } from '@platform/shared-kernel';

// ==========================================
// 1. DOMINIO: READ MODEL DE AUDITORÍA (CQRS)
// Registro inmutable de solo consulta que proyecta
// todos los eventos de dominio del marketplace.
// ==========================================
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

export class AuditEntry {
  private readonly _id: UniqueEntityID;
  private readonly props: AuditEntryProps;

  constructor(props: AuditEntryProps, id?: UniqueEntityID) {
    if (!props.eventName) throw new Error('El nombre del evento auditable es requerido');
    if (!props.description || props.description.trim().length === 0) {
      throw new Error('La descripción de la entrada de auditoría es requerida');
    }
    this._id = id ?? new UniqueEntityID();
    this.props = { ...props, affectedIds: props.affectedIds ?? [] };
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  get occurredAt(): Date {
    return this.props.occurredAt;
  }

  get eventName(): string {
    return this.props.eventName;
  }

  get entityType(): AuditEntityType {
    return this.props.entityType;
  }

  get aggregateId(): string {
    return this.props.aggregateId;
  }

  get actorId(): string | undefined {
    return this.props.actorId;
  }

  get description(): string {
    return this.props.description;
  }

  get affectedIds(): string[] {
    return [...this.props.affectedIds];
  }

  get amount(): number | undefined {
    return this.props.amount;
  }

  get result(): AuditResult {
    return this.props.result;
  }
}

// ==========================================
// 2. PUERTOS
// ==========================================
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

export function toAuditEntryDTO(entry: AuditEntry): AuditEntryResponseDTO {
  return {
    id: entry.id.toString(),
    occurredAt: entry.occurredAt,
    eventName: entry.eventName,
    entityType: entry.entityType,
    aggregateId: entry.aggregateId,
    actorId: entry.actorId,
    description: entry.description,
    affectedIds: entry.affectedIds,
    amount: entry.amount,
    result: entry.result,
  };
}

// ==========================================
// 3. CASOS DE USO (APPLICATION LAYER)
// ==========================================
export class RegisterAuditEntryUseCase {
  constructor(private readonly auditRepo: IAuditRepository) {}

  async execute(props: AuditEntryProps): Promise<AuditEntryResponseDTO> {
    const entry = new AuditEntry(props);
    await this.auditRepo.append(entry);
    return toAuditEntryDTO(entry);
  }
}

export class QueryAuditLogUseCase {
  constructor(private readonly auditRepo: IAuditRepository) {}

  async execute(filter: AuditFilter = {}): Promise<AuditEntryResponseDTO[]> {
    const entries = await this.auditRepo.query(filter);
    return entries.map(toAuditEntryDTO);
  }
}

// ==========================================
// 4. ADAPTADORES (INFRASTRUCTURE LAYER)
// ==========================================
export class InMemoryAuditRepository implements IAuditRepository {
  private entries: AuditEntry[] = [];

  async append(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async query(filter: AuditFilter): Promise<AuditEntry[]> {
    let results = [...this.entries];

    if (filter.eventName) {
      results = results.filter((e) => e.eventName === filter.eventName);
    }
    if (filter.entityType) {
      results = results.filter((e) => e.entityType === filter.entityType);
    }
    if (filter.actorId) {
      results = results.filter((e) => e.actorId === filter.actorId);
    }
    if (filter.aggregateId) {
      results = results.filter(
        (e) => e.aggregateId === filter.aggregateId || e.affectedIds.includes(filter.aggregateId!)
      );
    }
    if (filter.from) {
      results = results.filter((e) => e.occurredAt.getTime() >= filter.from!.getTime());
    }
    if (filter.to) {
      results = results.filter((e) => e.occurredAt.getTime() <= filter.to!.getTime());
    }

    results.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }
    return results;
  }

  async count(): Promise<number> {
    return this.entries.length;
  }

  clear(): void {
    this.entries = [];
  }
}

// --- PROYECTOR DE EVENTOS: traduce eventos del broker a entradas de auditoría ---
const DESCRIPCIONES_EVENTOS: Record<string, string> = {
  'user.registered': 'Usuario registrado en la plataforma',
  'user.verified': 'Identidad de usuario verificada (KYC)',
  'user.logged_in': 'Inicio de sesión',
  'user.blocked': 'Cuenta bloqueada por administración',
  'user.unblocked': 'Cuenta desbloqueada por administración',
  'job.created': 'Trabajo publicado',
  'job.assigned': 'Trabajo asignado a prestador',
  'job.started': 'Trabajo iniciado tras fondeo de custodia',
  'job.delivered': 'Entrega sometida a revisión del cliente',
  'job.approved': 'Trabajo aprobado por el cliente',
  'job.disputed': 'Trabajo en disputa',
  'job.payment_failed': 'Pago fallido',
  'proposal.submitted': 'Propuesta enviada por prestador',
  'proposal.accepted': 'Propuesta aceptada por cliente',
  'proposal.rejected': 'Propuesta rechazada',
  'escrow.created': 'Contrato de custodia creado',
  'escrow.deposited': 'Depósito retenido en custodia',
  'escrow.released': 'Fondos liberados al prestador',
  'escrow.refunded': 'Reembolso emitido al cliente',
  'escrow.dispute_opened': 'Disputa abierta sobre la custodia',
  'escrow.dispute_resolved': 'Disputa resuelta por administración',
  'escrow.cancelled': 'Custodia cancelada por administración',
  'review.submitted': 'Reseña registrada',
  'jobfeed.item_projected': 'Publicación proyectada al muro de trabajos',
};

const ENTIDADES_POR_PREFIJO: Record<string, AuditEntityType> = {
  user: 'USUARIO',
  job: 'TRABAJO',
  proposal: 'PROPUESTA',
  escrow: 'CUSTODIA',
  review: 'RESEÑA',
  jobfeed: 'FEED',
};

export const EVENTOS_AUDITABLES: string[] = Object.keys(DESCRIPCIONES_EVENTOS);

function entityTypeDe(eventName: string): AuditEntityType {
  const prefijo = eventName.split('.')[0];
  return ENTIDADES_POR_PREFIJO[prefijo] ?? 'TRABAJO';
}

function extraerActor(payload: Record<string, unknown>): string | undefined {
  const candidato = payload.actorId ?? payload.adminId ?? payload.openedBy ?? payload.reviewerId ?? payload.userId;
  return typeof candidato === 'string' && candidato.length > 0 ? candidato : undefined;
}

function extraerIds(payload: Record<string, unknown>): string[] {
  const claves = ['jobId', 'escrowId', 'userId', 'providerId', 'clientId', 'proposalId', 'reviewId'];
  const ids: string[] = [];
  for (const clave of claves) {
    const valor = payload[clave];
    if (typeof valor === 'string' && valor.length > 0 && !ids.includes(valor)) {
      ids.push(valor);
    }
  }
  return ids;
}

function extraerMonto(payload: Record<string, unknown>): number | undefined {
  const claves = [
    'agreedAmount',
    'amountHeld',
    'netPayoutAmount',
    'refundedAmount',
    'totalToDeposit',
    'amount',
    'budget',
  ];
  for (const clave of claves) {
    const valor = payload[clave];
    if (typeof valor === 'number') return valor;
  }
  return undefined;
}

export class AuditEventProjector {
  constructor(
    private readonly eventBroker: IEventBroker,
    private readonly registerUseCase: RegisterAuditEntryUseCase
  ) {}

  async setupSubscriptions(eventNames?: string[]): Promise<void> {
    const nombres = eventNames ?? EVENTOS_AUDITABLES;
    for (const nombre of nombres) {
      await this.eventBroker.subscribe(nombre, (event) => this.project(event));
    }
  }

  private async project(event: DomainEvent): Promise<void> {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    await this.registerUseCase.execute({
      occurredAt: event.occurredOn,
      eventName: event.eventName,
      entityType: entityTypeDe(event.eventName),
      aggregateId: event.aggregateId,
      actorId: extraerActor(payload),
      description: DESCRIPCIONES_EVENTOS[event.eventName] ?? `Evento ${event.eventName}`,
      affectedIds: extraerIds(payload),
      amount: extraerMonto(payload),
      result: 'EXITOSA',
    });
  }
}

export class AuditController {
  constructor(private readonly queryUseCase: QueryAuditLogUseCase) {}

  async handleGetLog(query?: AuditFilter) {
    try {
      const data = await this.queryUseCase.execute(query);
      return { statusCode: 200, data };
    } catch (err: any) {
      return { statusCode: 400, error: err.message };
    }
  }
}
