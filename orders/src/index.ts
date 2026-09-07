import mongoose from 'mongoose';
import { app } from './app';
import { natsWrapper } from './nats-wrapper';
import { TicketCreatedListener } from './events/listeners/ticket-created-listener';
import { TicketUpdatedListener } from './events/listeners/ticket-updated-listener';
import { ExpirationCompleteListener } from './events/listeners/expiration-complete-listener';
import { PaymentCreatedListener } from './events/listeners/payment-created-listener';

const startDB = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error('JWT Key must be defined');
  }

  if (!process.env.MONGO_URI) {
    throw new Error('Mongo URL must be define');
  }

  if (!process.env.NATS_CLIENT_ID) {
    throw new Error('NATS cliend ID must be define');
  }

  if (!process.env.NATS_URL) {
    throw new Error('NATS URL must be define');
  }

  if (!process.env.NATS_CLUSTER_ID) {
    throw new Error('NATS CLUSTER ID must be define');
  }
  await natsWrapper.connect(
    process.env.NATS_CLUSTER_ID,
    process.env.NATS_CLIENT_ID,
    process.env.NATS_URL
  );
  natsWrapper.client.on('close', () => {
    console.log('Nats connection closed');
    process.exit();
  });
  //on process interupt
  process.on('SIGINT', () => natsWrapper.client.close());

  //on process termaination
  process.on('SIGTERM', () => natsWrapper.client.close());

  //db must be up before any listener starts handling messages
  await mongoose.connect(process.env.MONGO_URI);

  //intializing the ticketlisteners

  new TicketCreatedListener(natsWrapper.client).listen();
  new TicketUpdatedListener(natsWrapper.client).listen();
  new ExpirationCompleteListener(natsWrapper.client).listen();
  new PaymentCreatedListener(natsWrapper.client).listen();

  app.listen(5000, () => {
    console.log('listening on port 5000!!!!!');
  });
};

startDB().catch((err) => {
  console.error(err);
  process.exit(1);
});
