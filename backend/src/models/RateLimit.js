import mongoose from 'mongoose';

const rateLimitSchema = new mongoose.Schema({
  bucket: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expires_at: { type: Date, required: true }
}, { versionKey: false });

rateLimitSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = mongoose.model('RateLimit', rateLimitSchema);
