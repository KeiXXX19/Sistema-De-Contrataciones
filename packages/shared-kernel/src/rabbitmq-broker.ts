import amqp from 'amqplib';
import { DomainEvent, IEventBroker } from './index.js';

export interface RabbitMQBrokerConfig {
  url?: string;
  exchangeName?: string;
  serviceQueueName?: string;
}

export class RabbitMQEventBroker implements IEventBroker {
  private connection: any = null;
  private channel: any = null;
  private readonly url: string;
  private readonly exchangeName: string;
  private readonly serviceQueueName: string;

  constructor(config?: RabbitMQBrokerConfig) {
    this.url = config?.url || process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    this.exchangeName = config?.exchangeName || 'marketplace.events.topic';
    this.serviceQueueName = config?.serviceQueueName || 'marketplace.default.queue';
  }

  async connect(): Promise<void> {
    if (!this.connection) {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    const payloadBuffer = Buffer.from(
      JSON.stringify({
        eventId: event.eventId,
        eventName: event.eventName,
        aggregateId: event.aggregateId,
        occurredOn: event.occurredOn,
        payload: event.payload,
      })
    );

    this.channel.publish(this.exchangeName, event.eventName, payloadBuffer, {
      persistent: true,
      contentType: 'application/json',
      timestamp: event.occurredOn.getTime(),
    });
  }

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  async subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    const queue = await this.channel.assertQueue(this.serviceQueueName, { durable: true });
    await this.channel.bindQueue(queue.queue, this.exchangeName, eventName);

    await this.channel.consume(
      queue.queue,
      async (msg: any) => {
        if (!msg) return;
        try {
          const content = JSON.parse(msg.content.toString());
          await handler({
            eventId: content.eventId,
            eventName: content.eventName,
            aggregateId: content.aggregateId,
            occurredOn: new Date(content.occurredOn),
            payload: content.payload,
          });
          this.channel.ack(msg);
        } catch (err) {
          // Reencolar en caso de fallo transitorio
          this.channel.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  }

  async close(): Promise<void> {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.channel = null;
    this.connection = null;
  }
}
