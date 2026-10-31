import mongoose from 'mongoose';

// This schema defines the structure for storing idempotency keys in the database. It includes fields for the key itself, a hash of the request, the state of the request (processing or complete), the response status and body, and a timestamp for when the entry was created. The schema also includes an index on the created_at field to automatically expire entries after 24 hours, ensuring that old idempotency keys are cleaned up from the database.
const idempotencySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  request_hash: { type: String, required: true },
  state: { type: String, enum: ['processing', 'complete'], default: 'processing' },
  response_status: Number,
  response_body: mongoose.Schema.Types.Mixed,
  created_at: { type: Date, default: Date.now }
}, { versionKey: false });

idempotencySchema.index({ created_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export const Idempotency = mongoose.model('Idempotency', idempotencySchema);
