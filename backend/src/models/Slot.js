import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, trim: true },
  provider: { type: String, required: true, trim: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true }
}, { timestamps: false, versionKey: false });

slotSchema.index({ provider: 1, start: 1 });

export const Slot = mongoose.model('Slot', slotSchema);
