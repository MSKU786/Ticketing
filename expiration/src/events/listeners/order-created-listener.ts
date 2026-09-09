import { Listener, Subjects, OrderCreatedEvent } from '@ticcketing/common';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { expirationQueue } from '../../queues/expiration-queue';

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName: string = queueGroupName;

  async onMessge(data: OrderCreatedEvent['data'], msg: Message) {
    const expiresAt = new String(data.expiresAt).toString();
    // an order that already expired while the message sat in the queue
    // must fire immediately, never with a negative delay
    const delay = Math.max(
      new Date(expiresAt).getTime() - new Date().getTime(),
      0
    );

    await expirationQueue.add(
      {
        orderId: data.id,
      },
      {
        delay,
      }
    );

    msg.ack();
  }
}
