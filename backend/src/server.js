import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { Booking } from './models/Booking.js';

if (!config.mongoUri) throw new Error('MONGODB_URI is required');
if (!config.apiKey) throw new Error('API_KEY is required');

await mongoose.connect(config.mongoUri);

// Ensure unique index exists before accepting requests
await Booking.init();

console.log('Connected to MongoDB');

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`Clinic booking API listening on port ${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
