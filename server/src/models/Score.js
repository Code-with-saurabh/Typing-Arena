import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  nickname: { type: String, required: true, trim: true, minlength: 2, maxlength: 20 },
  wpm: { type: Number, required: true, min: 0, max: 400 },
  rawWpm: { type: Number, default: 0 },
  accuracy: { type: Number, default: 100, min: 0, max: 100 },
  mode: { type: String, required: true, index: true },
  correctChars: { type: Number, default: 0 },
  incorrectChars: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  multiplayer: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

scoreSchema.index({ mode: 1, wpm: -1 });

export default mongoose.model('Score', scoreSchema);
