import { DomainEvent, IEventBroker } from './index.js';
export interface RabbitMQBrokerConfig {
    url?: string;
    exchangeName?: string;
    serviceQueueName?: string;
}
export declare class RabbitMQEventBroker implements IEventBroker {
    private connection;
    private channel;
    private readonly url;
    private readonly exchangeName;
    private readonly serviceQueueName;
    constructor(config?: RabbitMQBrokerConfig);
    connect(): Promise<void>;
    publish(event: DomainEvent): Promise<void>;
    publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
    subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): Promise<void>;
    close(): Promise<void>;
}
