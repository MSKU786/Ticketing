import {
  Listener,
  OrderCancelledEvent,
  OrderStatus,
  Subjects,
} from '@ticcketing/common';
import { queueGroupName } from './queue-group-name';
import { Message } from 'node-nats-streaming';
import { Ticket } from '../../models/ticket';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  subject: Subjects.OrderCancelled = Subjects.OrderCancelled;
  queueGroupName: string = queueGroupName;

  async onMessge(data: OrderCancelledEvent['data'], msg: Message) {
    // find the ticket order is reserving
    const ticket = await Ticket.findById(data.ticket.id);

    // if no ticket throw errro
    if (!ticket) throw new Error('Ticket not found');

    // mark the ticket as being reserved by setting up the orderId property
    ticket.set({ orderId: undefined });

    // Save the ticket
    await ticket.save();

    await new TicketUpdatedPublisher(this.client).publish({
      id: ticket.id,
      price: ticket.price,
      userId: ticket.userId,
      orderId: ticket.orderId,
      version: ticket.version,
      title: ticket.title,
    });

    // ack the message
    msg.ack();
  }
}
