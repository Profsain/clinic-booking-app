import crypto from 'node:crypto';
import { Slot } from '../models/Slot.js';
import { Booking } from '../models/Booking.js';
import { Idempotency } from '../models/Idempotency.js';
import { RateLimit } from '../models/RateLimit.js';
import { HttpError } from '../utils/errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeBookingBody(body = {}) {
  return {
    slot_id: typeof body.slot_id === 'string' ? body.slot_id.trim() : '',
    name: typeof body.name === 'string' ? body.name.trim() : '',
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  };
}

function validateBooking(data) {
  if (!data.slot_id || !data.name || !data.email || !EMAIL_RE.test(data.email)) {
    throw new HttpError(400, 'missing or invalid booking details');
  }
}

function toBookingResponse(booking) {
  return {
    id: String(booking._id),
    slot_id: booking.slot_id,
    name: booking.name,
    email: booking.email,
    status: booking.status,
    created_at: booking.created_at.toISOString()
  };
}

function hashBody(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

async function consumeRateLimit(email, ip) {
  const now = new Date();
  const windowStart = Math.floor(now.getTime() / 60000) * 60000;
  const resetAt = new Date(windowStart + 60000);
  const identity = email || `ip:${ip || 'unknown'}`;
  const bucket = `${identity}:${windowStart}`;

  const result = await RateLimit.findOneAndUpdate(
    { bucket },
    { $inc: { count: 1 }, $setOnInsert: { expires_at: new Date(resetAt.getTime() + 60000) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (result.count > 5) {
    const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
    throw new HttpError(429, 'too many booking attempts', { 'Retry-After': retryAfter });
  }
}

async function replayOrClaimIdempotency(key, requestHash) {
  if (!key) return { mode: 'none' };
  if (key.length > 200) throw new HttpError(400, 'invalid Idempotency-Key');

  try {
    const record = await Idempotency.create({
      key,
      request_hash: requestHash,
      state: 'processing'
    });
    return { mode: 'owner', record };
  } catch (err) {
    if (err.code !== 11000) throw err;
  }

  const existing = await Idempotency.findOne({ key });
  if (!existing) return replayOrClaimIdempotency(key, requestHash);
  if (existing.request_hash !== requestHash) {
    throw new HttpError(422, 'Idempotency-Key reused with a different request body');
  }
  if (existing.state === 'complete') {
    return { mode: 'replay', status: existing.response_status, body: existing.response_body };
  }

  // A simultaneous identical request waits briefly for the first request.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const refreshed = await Idempotency.findOne({ key });
    if (refreshed?.state === 'complete') {
      return { mode: 'replay', status: refreshed.response_status, body: refreshed.response_body };
    }
  }
  throw new HttpError(409, 'request with this Idempotency-Key is still processing');
}

export async function createBooking(body, idempotencyKey, ip) {
  const data = normalizeBookingBody(body);
  const requestHash = hashBody(data);

  // An exact retry replays the original result and does not create a new booking.
  if (idempotencyKey) {
    const prior = await Idempotency.findOne({ key: idempotencyKey });
    if (prior) {
      if (prior.request_hash !== requestHash) {
        throw new HttpError(422, 'Idempotency-Key reused with a different request body');
      }
      if (prior.state === 'complete') {
        return { status: prior.response_status, body: prior.response_body };
      }
    }
  }

  await consumeRateLimit(data.email, ip);
  validateBooking(data);

  const slot = await Slot.findOne({ id: data.slot_id });
  if (!slot) throw new HttpError(404, 'slot not found');
  if (slot.start.getTime() <= Date.now()) {
    throw new HttpError(400, 'slot has already started');
  }

  const claim = await replayOrClaimIdempotency(idempotencyKey, requestHash);
  if (claim.mode === 'replay') return { status: claim.status, body: claim.body };

  try {
    const booking = await Booking.create({
      slot_id: data.slot_id,
      name: data.name,
      email: data.email,
      status: 'confirmed'
    });
    const responseBody = toBookingResponse(booking);

    if (claim.mode === 'owner') {
      await Idempotency.updateOne(
        { _id: claim.record._id },
        { $set: { state: 'complete', response_status: 201, response_body: responseBody } }
      );
    }
    return { status: 201, body: responseBody };
  } catch (err) {
    if (claim.mode === 'owner') {
      await Idempotency.deleteOne({ _id: claim.record._id }).catch(() => {});
    }
    if (err.code === 11000) throw new HttpError(409, 'slot already booked');
    throw err;
  }
}

export async function listSlots(provider) {
  const query = provider ? { provider } : {};
  const slots = await Slot.find(query).sort({ start: 1, id: 1 }).lean();
  const occupied = await Booking.distinct('slot_id', { status: 'confirmed' });
  const occupiedSet = new Set(occupied);
  return {
    slots: slots.map(slot => ({
      id: slot.id,
      provider: slot.provider,
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      available: !occupiedSet.has(slot.id)
    }))
  };
}

export async function getBooking(id) {
  const booking = await Booking.findById(id);
  if (!booking) throw new HttpError(404, 'booking not found');
  const slot = await Slot.findOne({ id: booking.slot_id });
  return {
    ...toBookingResponse(booking),
    slot: slot ? {
      provider: slot.provider,
      start: slot.start.toISOString(),
      end: slot.end.toISOString()
    } : null
  };
}

export async function cancelBooking(id) {
  const booking = await Booking.findById(id);
  if (!booking) throw new HttpError(404, 'booking not found');
  if (booking.status === 'cancelled') throw new HttpError(409, 'booking already cancelled');

  booking.status = 'cancelled';
  await booking.save();
  return toBookingResponse(booking);
}

function encodeCursor(booking) {
  return Buffer.from(JSON.stringify({
    created_at: booking.created_at.toISOString(),
    id: String(booking._id)
  })).toString('base64url');
}

function decodeCursor(cursor) {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!value.created_at || !value.id || Number.isNaN(Date.parse(value.created_at))) throw new Error();
    return value;
  } catch {
    throw new HttpError(400, 'invalid cursor');
  }
}

export async function listBookings(email, limitValue, cursorValue) {
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    throw new HttpError(400, 'valid email is required');
  }
  const limit = limitValue === undefined ? 10 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new HttpError(400, 'limit must be between 1 and 50');
  }

  const query = { email: email.trim().toLowerCase() };
  if (cursorValue) {
    const cursor = decodeCursor(cursorValue);
    query.$or = [
      { created_at: { $gt: new Date(cursor.created_at) } },
      { created_at: new Date(cursor.created_at), _id: { $gt: cursor.id } }
    ];
  }

  const rows = await Booking.find(query).sort({ created_at: 1, _id: 1 }).limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    bookings: page.map(toBookingResponse),
    next_cursor: hasMore ? encodeCursor(page[page.length - 1]) : null
  };
}

export async function resetData(slotsInput) {
  if (!Array.isArray(slotsInput)) throw new HttpError(400, 'slots must be an array');
  const normalized = [];
  const ids = new Set();

  for (const item of slotsInput) {
    const id = typeof item?.id === 'string' ? item.id.trim() : '';
    const provider = typeof item?.provider === 'string' ? item.provider.trim() : '';
    const start = new Date(item?.start);
    const end = new Date(item?.end);
    if (!id || !provider || !item?.start || !item?.end ||
        Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ||
        end <= start || ids.has(id)) {
      throw new HttpError(400, 'invalid slot details');
    }
    ids.add(id);
    normalized.push({ id, provider, start, end });
  }

  await Booking.deleteMany({});
  await Idempotency.deleteMany({});
  await RateLimit.deleteMany({});
  await Slot.deleteMany({});
  if (normalized.length) await Slot.insertMany(normalized);
}
