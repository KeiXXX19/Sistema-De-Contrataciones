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

export class UniqueEntityID {
  private readonly _value: string;

  constructor(id?: string) {
    this._value = id || generateUUID();
  }

  toString(): string {
    return this._value;
  }

  equals(other?: UniqueEntityID): boolean {
    if (!other) return false;
    return this._value === other._value;
  }
}

export class Money {
  private readonly _amount: number; // En centavos para evitar errores de coma flotante
  private readonly _currency: string;

  private constructor(cents: number, currency = 'USD') {
    if (!Number.isInteger(cents)) {
      throw new Error(`Los centavos deben ser un entero: ${cents}`);
    }
    if (cents < 0) {
      throw new Error('El monto no puede ser negativo');
    }
    this._amount = cents;
    this._currency = currency.toUpperCase();
  }

  static fromCents(cents: number, currency = 'USD'): Money {
    return new Money(Math.round(cents), currency);
  }

  static fromDecimal(amount: number, currency = 'USD'): Money {
    if (amount < 0) throw new Error('El monto no puede ser negativo');
    return new Money(Math.round(amount * 100), currency);
  }

  static zero(currency = 'USD'): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get toDecimal(): number {
    return this._amount / 100;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    if (this._amount < other._amount) {
      throw new Error('Fondos insuficientes para la resta');
    }
    return new Money(this._amount - other._amount, this._currency);
  }

  percentage(ratePercent: number): Money {
    if (ratePercent < 0) throw new Error('El porcentaje no puede ser negativo');
    const calculatedCents = Math.round((this._amount * ratePercent) / 100);
    return new Money(calculatedCents, this._currency);
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Monedas incompatibles: ${this._currency} vs ${other._currency}`);
    }
  }
}

export interface StandardDomainEvent<T = Record<string, unknown>> {
  readonly eventId: string;
  readonly eventType: string;
  readonly aggregateId: string;
  readonly timestamp: string;
  readonly version: number;
  readonly producer: string;
  readonly data: T;
  readonly metadata?: Record<string, unknown>;
}

export interface DomainEvent {
  readonly eventId: string;
  readonly eventName: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly payload: Record<string, unknown>;
}

export abstract class Entity<T> {
  protected readonly _id: UniqueEntityID;
  protected readonly props: T;

  protected constructor(props: T, id?: UniqueEntityID) {
    this._id = id ? id : new UniqueEntityID();
    this.props = props;
  }

  get id(): UniqueEntityID {
    return this._id;
  }

  equals(other?: Entity<T>): boolean {
    if (!other || !(other instanceof Entity)) return false;
    return this._id.equals(other._id);
  }
}

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}

export interface IEventBroker {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
}

export class InMemoryEventBroker implements IEventBroker {
  private handlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();
  public publishedEvents: DomainEvent[] = [];

  async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
    const eventHandlers = this.handlers.get(event.eventName) || [];
    for (const handler of eventHandlers) {
      await handler(event);
    }
  }

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  async subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): Promise<void> {
    const list = this.handlers.get(eventName) || [];
    list.push(handler);
    this.handlers.set(eventName, list);
  }

  clear(): void {
    this.handlers.clear();
    this.publishedEvents = [];
  }
}

