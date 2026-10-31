import mongoose from 'mongoose';

// This schema defines the structure for storing slot information in the database. It includes fields for the slot ID, provider, start time, and end time. The schema also includes an index on the provider and start time to facilitate efficient querying of slots by provider and time.
const slotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  provider: { type: String, required: true, trim: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true }
}, { timestamps: false, versionKey: false });

slotSchema.index({ provider: 1, start: 1 });

export const Slot = mongoose.model('Slot', slotSchema);
