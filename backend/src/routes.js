import express from 'express';
import { requireApiKey } from './middleware/apiKey.js';
import {
  cancelBooking, createBooking, getBooking, listBookings, listSlots, resetData
} from './services/bookingService.js';
import { HttpError } from './utils/errors.js';

// Define api routers 
export const router = express.Router();

router.use(requireApiKey);

router.post('/reset', async (req, res, next) => {
  try {
    await resetData(req.body?.slots);
    return res.status(200).json({ message: 'Done' });
  } catch (err) { next(err); }
});

router.get('/slots', async (req, res, next) => {
  try {
    if (req.query.provider !== undefined && typeof req.query.provider !== 'string') {
      throw new HttpError(400, 'invalid provider');
    }
    return res.json(await listSlots(req.query.provider));
  } catch (err) { next(err); }
});

router.post('/bookings', async (req, res, next) => {
  try {
    const result = await createBooking(req.body, req.get('Idempotency-Key'), req.ip);
    return res.status(result.status).json(result.body);
  } catch (err) { next(err); }
});

router.get('/bookings', async (req, res, next) => {
  try {
    return res.json(await listBookings(req.query.email, req.query.limit, req.query.cursor));
  } catch (err) { next(err); }
});

router.get('/bookings/:id', async (req, res, next) => {
  try {
    return res.json(await getBooking(req.params.id));
  } catch (err) { next(err); }
});

router.delete('/bookings/:id', async (req, res, next) => {
  try {
    return res.json(await cancelBooking(req.params.id));
  } catch (err) { next(err); }
});
