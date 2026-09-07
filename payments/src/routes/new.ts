import {
  BadRequestError,
  NotAuthorizedError,
  NotFoundError,
  OrderStatus,
  currentUser,
  requireAuth,
  validateRequest,
} from '@ticcketing/common';
import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { Order } from '../models/order';
import { stripe } from '../stripe';
import { Payment } from '../models/payemnt';
import { PaymentCreatedPublisher } from '../events/publishers/payment-created-publisher';
import { natsWrapper } from '../nats-wrapper';
const router = express.Router();

router.post(
  '/api/payments',
  requireAuth,
  [body('token').not().isEmpty(), body('orderId').not().isEmpty()],
  validateRequest,
  async (req: Request, res: Response) => {
    const { orderId, token } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      throw new NotFoundError();
    }

    if (order.userId !== req.currentUser!.id) {
      throw new NotAuthorizedError();
    }

    if (order.status === OrderStatus.Cancelled) {
      throw new BadRequestError('Cannot pay for cancelled order');
    }

    if (order.status === OrderStatus.Complete) {
      throw new BadRequestError('Order has already been paid for');
    }

    const charge = await stripe.charges.create({
      currency: 'usd',
      // stripe expects the smallest currency unit, i.e. cents
      amount: Math.round(order.price * 100),
      source: token,
    });

    const payment = Payment.build({
      orderId,
      stripeId: charge?.id,
    });

    await payment.save();
    await new PaymentCreatedPublisher(natsWrapper.client).publish({
      id: payment.id,
      orderId,
      stripeId: charge.id,
    });

    res.status(201).send({ id: payment.id });
  }
);

export { router as createChargeRouter };
