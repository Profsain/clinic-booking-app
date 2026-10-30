import mongoose from 'mongoose';

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
