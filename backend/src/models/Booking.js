import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  slot_id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed', required: true },
  created_at: { type: Date, default: Date.now, required: true }
}, { versionKey: false });

/*
 * Only confirmed bookings occupy a slot. The unique partial index is the
 * concurrency guarantee: MongoDB arbitrates simultaneous inserts atomically.
 * A cancelled booking no longer occupies the slot.
 */
bookingSchema.index(
  { slot_id: 1 },
  {
    name: 'unique_confirmed_slot_id',
    unique: true,
    partialFilterExpression: { status: 'confirmed' }
  }
);
bookingSchema.index({ email: 1, created_at: 1, _id: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
