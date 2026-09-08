import request from 'supertest';
import { app } from '../../app';
import mongoose from 'mongoose';
import { Ticket } from '../../models/ticket';

const createTicket = () => {
  const ticket = request(app)
    .post('/api/tickets')
    .set('Cookie', global.signin())
    .send({
      title: 'hey',
      price: '123',
    });
  return ticket;
};

it('returns 200 if the ticket search is successfull', async () => {
  await createTicket();
  await createTicket();
  await createTicket();
  await createTicket();

  const response = await request(app).get(`/api/tickets`).send().expect(200);

  expect(response.body.length).toEqual(4);
});

it('does not return tickets that are already reserved', async () => {
  await createTicket();
  await createTicket();

  const reserved = Ticket.build({
    title: 'reserved one',
    price: 50,
    userId: new mongoose.Types.ObjectId().toHexString(),
  });
  reserved.set({ orderId: new mongoose.Types.ObjectId().toHexString() });
  await reserved.save();

  const response = await request(app).get('/api/tickets').send().expect(200);

  expect(response.body.length).toEqual(2);
  expect(
    response.body.some((t: any) => t.title === 'reserved one')
  ).toEqual(false);
});
