import mongoose from 'mongoose';

// This schema defines the structure for storing rate limit information in the database. It includes fields for the bucket identifier, the count of requests made, and the expiration time for the rate limit entry. The schema also includes an index on the expires_at field to automatically expire entries when they are no longer valid, ensuring that old rate limit entries are cleaned up from the database.
const rateLimitSchema = new mongoose.Schema({
  bucket: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expires_at: { type: Date, required: true }
}, { versionKey: false });

rateLimitSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = mongoose.model('RateLimit', rateLimitSchema);
