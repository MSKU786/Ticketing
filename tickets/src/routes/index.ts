import express, { Request, Response } from 'express';
import { Ticket } from '../models/ticket';

const router = express.Router();

router.get('/api/tickets', async (req: Request, res: Response) => {
  // null matches docs where orderId is null OR absent, i.e. unreserved
  const tickets = await Ticket.find({ orderId: null });

  return res.send(tickets);
});

export { router as indexTicketRouter };
