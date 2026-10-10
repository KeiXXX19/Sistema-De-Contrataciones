function generateUUID() {
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
    _value;
    constructor(id) {
        this._value = id || generateUUID();
    }
    toString() {
        return this._value;
    }
    equals(other) {
        if (!other)
            return false;
        return this._value === other._value;
    }
}
export class Money {
    _amount; // En centavos para evitar errores de coma flotante
    _currency;
    constructor(cents, currency = 'USD') {
        if (!Number.isInteger(cents)) {
            throw new Error(`Los centavos deben ser un entero: ${cents}`);
        }
        if (cents < 0) {
            throw new Error('El monto no puede ser negativo');
        }
        this._amount = cents;
        this._currency = currency.toUpperCase();
    }
    static fromCents(cents, currency = 'USD') {
        return new Money(Math.round(cents), currency);
    }
    static fromDecimal(amount, currency = 'USD') {
        if (amount < 0)
            throw new Error('El monto no puede ser negativo');
        return new Money(Math.round(amount * 100), currency);
    }
    static zero(currency = 'USD') {
        return new Money(0, currency);
    }
    get amount() {
        return this._amount;
    }
    get toDecimal() {
        return this._amount / 100;
    }
    get currency() {
        return this._currency;
    }
    add(other) {
        this.ensureSameCurrency(other);
        return new Money(this._amount + other._amount, this._currency);
    }
    subtract(other) {
        this.ensureSameCurrency(other);
        if (this._amount < other._amount) {
            throw new Error('Fondos insuficientes para la resta');
        }
        return new Money(this._amount - other._amount, this._currency);
    }
    percentage(ratePercent) {
        if (ratePercent < 0)
            throw new Error('El porcentaje no puede ser negativo');
        const calculatedCents = Math.round((this._amount * ratePercent) / 100);
        return new Money(calculatedCents, this._currency);
    }
    equals(other) {
        return this._amount === other._amount && this._currency === other._currency;
    }
    ensureSameCurrency(other) {
        if (this._currency !== other._currency) {
            throw new Error(`Monedas incompatibles: ${this._currency} vs ${other._currency}`);
        }
    }
}
export class Entity {
    _id;
    props;
    constructor(props, id) {
        this._id = id ? id : new UniqueEntityID();
        this.props = props;
    }
    get id() {
        return this._id;
    }
    equals(other) {
        if (!other || !(other instanceof Entity))
            return false;
        return this._id.equals(other._id);
    }
}
export class AggregateRoot extends Entity {
    _domainEvents = [];
    get domainEvents() {
        return this._domainEvents;
    }
    addDomainEvent(event) {
        this._domainEvents.push(event);
    }
    clearDomainEvents() {
        this._domainEvents = [];
    }
}
export class InMemoryEventBroker {
    handlers = new Map();
    publishedEvents = [];
    async publish(event) {
        this.publishedEvents.push(event);
        const eventHandlers = this.handlers.get(event.eventName) || [];
        for (const handler of eventHandlers) {
            await handler(event);
        }
    }
    async publishAll(events) {
        for (const event of events) {
            await this.publish(event);
        }
    }
    async subscribe(eventName, handler) {
        const list = this.handlers.get(eventName) || [];
        list.push(handler);
        this.handlers.set(eventName, list);
    }
    clear() {
        this.handlers.clear();
        this.publishedEvents = [];
    }
}
