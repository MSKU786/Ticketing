import { OrderCreatedEvent, OrderStatus } from '@ticcketing/common';
import { Message } from 'node-nats-streaming';
import { natsWrapper } from '../../../nats-wrapper';
import { expirationQueue } from '../../../queues/expiration-queue';
import { OrderCreatedListener } from '../order-created-listener';

const setup = async (expiresAt: Date) => {
  const listener = new OrderCreatedListener(natsWrapper.client);

  const data: OrderCreatedEvent['data'] = {
    id: '507f1f77bcf86cd799439011',
    version: 0,
    status: OrderStatus.Created,
    userId: '507f1f77bcf86cd799439012',
    expiresAt: expiresAt.toISOString(),
    ticket: {
      id: '507f1f77bcf86cd799439013',
      price: 20,
    },
  };

  // @ts-ignore
  const msg: Message = {
    ack: jest.fn(),
  };

  return { listener, data, msg };
};

beforeEach(() => {
  (expirationQueue.add as jest.Mock).mockClear();
});

it('queues the job with a delay that matches the order expiry', async () => {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const { listener, data, msg } = await setup(expiresAt);

  await listener.onMessge(data, msg);

  expect(expirationQueue.add).toHaveBeenCalledTimes(1);

  const [payload, opts] = (expirationQueue.add as jest.Mock).mock.calls[0];
  expect(payload).toEqual({ orderId: data.id });

  // allow a little slack for the time spent inside the handler
  expect(opts.delay).toBeGreaterThan(15 * 60 * 1000 - 5000);
  expect(opts.delay).toBeLessThanOrEqual(15 * 60 * 1000);
});

it('queues an already expired order with no delay', async () => {
  const { listener, data, msg } = await setup(new Date(Date.now() - 60 * 1000));

  await listener.onMessge(data, msg);

  const [, opts] = (expirationQueue.add as jest.Mock).mock.calls[0];
  expect(opts.delay).toEqual(0);
});

it('acks the message', async () => {
  const { listener, data, msg } = await setup(new Date(Date.now() + 60 * 1000));

  await listener.onMessge(data, msg);

  expect(msg.ack).toHaveBeenCalled();
});
