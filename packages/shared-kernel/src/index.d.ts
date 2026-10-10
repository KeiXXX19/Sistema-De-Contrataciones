export declare class UniqueEntityID {
    private readonly _value;
    constructor(id?: string);
    toString(): string;
    equals(other?: UniqueEntityID): boolean;
}
export declare class Money {
    private readonly _amount;
    private readonly _currency;
    private constructor();
    static fromCents(cents: number, currency?: string): Money;
    static fromDecimal(amount: number, currency?: string): Money;
    static zero(currency?: string): Money;
    get amount(): number;
    get toDecimal(): number;
    get currency(): string;
    add(other: Money): Money;
    subtract(other: Money): Money;
    percentage(ratePercent: number): Money;
    equals(other: Money): boolean;
    private ensureSameCurrency;
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
export declare abstract class Entity<T> {
    protected readonly _id: UniqueEntityID;
    protected readonly props: T;
    protected constructor(props: T, id?: UniqueEntityID);
    get id(): UniqueEntityID;
    equals(other?: Entity<T>): boolean;
}
export declare abstract class AggregateRoot<T> extends Entity<T> {
    private _domainEvents;
    get domainEvents(): ReadonlyArray<DomainEvent>;
    protected addDomainEvent(event: DomainEvent): void;
    clearDomainEvents(): void;
}
export interface IEventBroker {
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
    subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
}
export declare class InMemoryEventBroker implements IEventBroker {
    private handlers;
    publishedEvents: DomainEvent[];
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
    subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
    clear(): void;
}
