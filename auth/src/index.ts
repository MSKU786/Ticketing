import mongoose from 'mongoose';
import { app } from './app';

const startDB = async () => {
  if (!process.env.JWT_KEY) {
    throw new Error('JWT Key must be defined');
  }

  if (!process.env.MONGO_URI) {
    throw new Error('Mongo URI must be defined');
  }

  await mongoose.connect(process.env.MONGO_URI);

  app.listen(4000, () => {
    console.log('listening on port 4000!!!!!');
  });
};

startDB().catch((err) => {
  console.error(err);
  process.exit(1);
});
