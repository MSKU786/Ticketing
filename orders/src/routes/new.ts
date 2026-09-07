import express, { Request, Response } from 'express';
import {
  BadRequestError,
  NotFoundError,
  OrderStatus,
  requireAuth,
  validateRequest,
} from '@ticcketing/common';
import { body } from 'express-validator';
import mongoose from 'mongoose';
import { Ticket } from '../models/ticket';
import { Order } from '../models/order';
import { OrderCreatedPublisher } from '../events/publishers/order-created-publisher copy';
import { natsWrapper } from '../nats-wrapper';
const router = express.Router();

const EXPIRATION_WINDOW_SECONDS = 15 * 60;

router.post(
  '/api/orders',
  requireAuth,
  [
    body('ticketId')
      .not()
      .isEmpty()
      .custom((input: string) => mongoose.Types.ObjectId.isValid(input))
      .withMessage('Ticket id must be porvided'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { ticketId } = req.body;
    //find the ticket user is trying to order
    const ticket = await Ticket.findById(ticketId);

    if (!ticket) {
      throw new NotFoundError();
    }
    //Make sure ticket is not reserved
    const isReserved = await ticket.isReserved();

    if (isReserved) {
      throw new BadRequestError('Ticket is already Reserved');
    }

    //Calculate an expiration date for the order
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_WINDOW_SECONDS);

    //Build the order and save it to db
    const orderBuild = Order.build({
      userId: req.currentUser!.id,
      status: OrderStatus.Created,
      expiresAt: expiration,
      ticket,
    });

    await orderBuild.save();
    await new OrderCreatedPublisher(natsWrapper.client).publish({
      id: orderBuild.id,
      status: orderBuild.status,
      userId: orderBuild.userId,
      expiresAt: orderBuild.expiresAt.toISOString(),
      version: orderBuild.version,
      ticket: {
        id: ticket.id,
        price: ticket.price,
      },
    });
    // publish an event order is created

    return res.status(201).send(orderBuild);
  }
);

export { router as newOrderRouter };
