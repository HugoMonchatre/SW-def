import mongoose from 'mongoose';

const towerSchema = new mongoose.Schema({
  towerId: {
    type: String,
    required: true
  },
  guild: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guild',
    required: true
  },
  defenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Defense'
  }],
  memo: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index to ensure unique tower per guild
towerSchema.index({ towerId: 1, guild: 1 }, { unique: true });

const Tower = mongoose.model('Tower', towerSchema);

export default Tower;
