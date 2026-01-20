import mongoose from 'mongoose';

const playerInventorySchema = new mongoose.Schema({
  playerName: {
    type: String,
    required: true
  },
  visibleName: {
    type: String,
    required: true
  },
  monsters: [{
    type: String,
    required: true
  }]
}, { _id: false });

const guildInventorySchema = new mongoose.Schema({
  guild: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guild',
    required: true,
    unique: true
  },
  players: [playerInventorySchema],
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String
  },
  monsterColumns: [{
    type: String
  }]
}, {
  timestamps: true
});

guildInventorySchema.index({ 'players.playerName': 1 });

export default mongoose.model('GuildInventory', guildInventorySchema);
