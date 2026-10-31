import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';
import { Booking } from '../src/models/Booking.js';

let databaseReady;

async function initializeDatabase(_req, _res, next) {
  if (!config.mongoUri) return next(new Error('MONGODB_URI is required'));
  if (!config.apiKey) return next(new Error('API_KEY is required'));

  try {
    if (!databaseReady) {
      const connection = mongoose.connection.readyState === 1
        ? Promise.resolve()
        : mongoose.connect(config.mongoUri);
      databaseReady = connection.then(() => Booking.init()).catch((error) => {
        databaseReady = undefined;
        throw error;
      });
    }
    await databaseReady;
    return next();
  } catch (error) {
    return next(error);
  }
}

export default createApp({ beforeRoutes: initializeDatabase });
