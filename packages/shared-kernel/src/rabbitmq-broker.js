import amqp from 'amqplib';
export class RabbitMQEventBroker {
    connection = null;
    channel = null;
    url;
    exchangeName;
    serviceQueueName;
    constructor(config) {
        this.url = config?.url || process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        this.exchangeName = config?.exchangeName || 'marketplace.events.topic';
        this.serviceQueueName = config?.serviceQueueName || 'marketplace.default.queue';
    }
    async connect() {
        if (!this.connection) {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
            await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
        }
    }
    async publish(event) {
        if (!this.channel) {
            await this.connect();
        }
        const payloadBuffer = Buffer.from(JSON.stringify({
            eventId: event.eventId,
            eventName: event.eventName,
            aggregateId: event.aggregateId,
            occurredOn: event.occurredOn,
            payload: event.payload,
        }));
        this.channel.publish(this.exchangeName, event.eventName, payloadBuffer, {
            persistent: true,
            contentType: 'application/json',
            timestamp: event.occurredOn.getTime(),
        });
    }
    async publishAll(events) {
        for (const event of events) {
            await this.publish(event);
        }
    }
    async subscribe(eventName, handler) {
        if (!this.channel) {
            await this.connect();
        }
        const queue = await this.channel.assertQueue(this.serviceQueueName, { durable: true });
        await this.channel.bindQueue(queue.queue, this.exchangeName, eventName);
        await this.channel.consume(queue.queue, async (msg) => {
            if (!msg)
                return;
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
            }
            catch (err) {
                // Reencolar en caso de fallo transitorio
                this.channel.nack(msg, false, true);
            }
        }, { noAck: false });
    }
    async close() {
        if (this.channel)
            await this.channel.close();
        if (this.connection)
            await this.connection.close();
        this.channel = null;
        this.connection = null;
    }
}
