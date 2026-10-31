import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { Slot } from '../src/models/Slot.js';
import { Booking } from '../src/models/Booking.js';
import { Idempotency } from '../src/models/Idempotency.js';
import { RateLimit } from '../src/models/RateLimit.js';

let mongo;
let app;
const key = 'test-secret';
const future = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();
const slots = [
  { id: 'slot-1', provider: 'Dr Ada', start: future(60), end: future(90) },
  { id: 'slot-2', provider: 'Dr Ben', start: future(120), end: future(150) }
];
const api = () => ({
  get: path => request(app).get(path).set('X-API-Key', key),
  post: path => request(app).post(path).set('X-API-Key', key),
  delete: path => request(app).delete(path).set('X-API-Key', key)
});

before(async () => {
  process.env.API_KEY = key;
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  app = createApp();
  await Promise.all([Slot.init(), Booking.init(), Idempotency.init(), RateLimit.init()]);
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([
    Slot.deleteMany({}), Booking.deleteMany({}),
    Idempotency.deleteMany({}), RateLimit.deleteMany({})
  ]);
  await Slot.insertMany(slots);
});

test('requires API key and lists slots with availability', async () => {
  const denied = await request(app).get('/slots');
  assert.equal(denied.status, 401);
  const response = await api().get('/slots?provider=Dr%20Ada');
  assert.equal(response.status, 200);
  assert.equal(response.body.slots.length, 1);
  assert.equal(response.body.slots[0].available, true);
});

test('allows preflight requests for configured origins with trailing slashes', async () => {
  const originalCorsOrigin = config.corsOrigin;
  config.corsOrigin = 'https://clinic-booking-app-b23l.vercel.app/';
  const corsApp = createApp();
  config.corsOrigin = originalCorsOrigin;

  const response = await request(corsApp)
    .options('/slots')
    .set('Origin', 'https://clinic-booking-app-b23l.vercel.app')
    .set('Access-Control-Request-Method', 'GET')
    .set('Access-Control-Request-Headers', 'x-api-key');

  assert.equal(response.status, 204);
  assert.equal(response.headers['access-control-allow-origin'], 'https://clinic-booking-app-b23l.vercel.app');
  assert.match(response.headers['access-control-allow-headers'], /X-API-Key/i);
});

test('books a slot, returns confirmation and supports booking lookup', async () => {
  const created = await api().post('/bookings').send({
    slot_id: 'slot-1', name: ' Ada Obi ', email: ' ADA@EXAMPLE.COM '
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.name, 'Ada Obi');
  assert.equal(created.body.email, 'ada@example.com');
  assert.equal(created.body.status, 'confirmed');

  const found = await api().get(`/bookings/${created.body.id}`);
  assert.equal(found.status, 200);
  assert.equal(found.body.id, created.body.id);
  assert.equal(found.body.slot.provider, 'Dr Ada');
  assert.equal(found.body.slot.start, slots[0].start);
  assert.equal(found.body.slot.end, slots[0].end);
});

test('rejects duplicate concurrent bookings and allows cancellation', async () => {
  const payload = { slot_id: 'slot-1', name: 'Ada', email: 'ada@example.com' };
  const results = await Promise.all([
    api().post('/bookings').send(payload),
    api().post('/bookings').send({ ...payload, name: 'Another patient', email: 'other@example.com' })
  ]);
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);

  const winner = results.find(r => r.status === 201);
  const cancelled = await api().delete(`/bookings/${winner.body.id}`);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, 'cancelled');

  const rebooked = await api().post('/bookings').send(payload);
  assert.equal(rebooked.status, 201);
});

test('replays idempotent requests and rejects key reuse with another body', async () => {
  const payload = { slot_id: 'slot-1', name: 'Ada', email: 'ada@example.com' };
  const first = await api().post('/bookings').set('Idempotency-Key', 'request-123').send(payload);
  const retry = await api().post('/bookings').set('Idempotency-Key', 'request-123').send(payload);
  assert.equal(first.status, 201);
  assert.equal(retry.status, 201);
  assert.equal(retry.body.id, first.body.id);
  assert.equal(await Booking.countDocuments({}), 1);

  const conflict = await api().post('/bookings').set('Idempotency-Key', 'request-123')
    .send({ ...payload, name: 'Different patient' });
  assert.equal(conflict.status, 422);
});

test('validates booking data and paginates booking history', async () => {
  const invalid = await api().post('/bookings').send({ slot_id: 'slot-1', name: '', email: 'bad' });
  assert.equal(invalid.status, 400);

  await api().post('/bookings').send({ slot_id: 'slot-1', name: 'Ada', email: 'ada@example.com' });
  await api().post('/bookings').send({ slot_id: 'slot-2', name: 'Ada', email: 'ada@example.com' });

  const page1 = await api().get('/bookings?email=ada%40example.com&limit=1');
  assert.equal(page1.status, 200);
  assert.equal(page1.body.bookings.length, 1);
  assert.ok(page1.body.next_cursor);

  const page2 = await api().get(`/bookings?email=ada%40example.com&limit=1&cursor=${encodeURIComponent(page1.body.next_cursor)}`);
  assert.equal(page2.body.bookings.length, 1);
  assert.equal(page2.body.next_cursor, null);
});

test('rate limits the sixth attempt for the same email in a minute', async () => {
  // Failed attempts count: use a nonexistent slot with a valid email.
  const payload = { slot_id: 'missing', name: 'Ada', email: 'limit@example.com' };
  const statuses = [];
  for (let i = 0; i < 6; i += 1) {
    const response = await api().post('/bookings').send(payload);
    statuses.push(response.status);
    if (i === 5) assert.ok(response.headers['retry-after']);
  }
  assert.deepEqual(statuses, [404, 404, 404, 404, 404, 429]);
});
