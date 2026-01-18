import mongoose from 'mongoose';

const offenseMonsterSchema = new mongoose.Schema({
  com2us_id: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  element: {
    type: String,
    required: true
  },
  natural_stars: {
    type: Number,
    required: true
  },
  leader_skill: {
    id: Number,
    attribute: String,
    amount: Number,
    area: String,
    element: String
  },
  instructions: {
    type: String,
    default: ''
  }
}, { _id: false });

const offenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  defenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Defense'
  }],
  guild: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guild',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  monsters: {
    type: [offenseMonsterSchema],
    validate: {
      validator: function(v) {
        return v.length === 3;
      },
      message: 'An offense must have exactly 3 monsters'
    }
  },
  generalInstructions: {
    type: String,
    default: ''
  },
  votes: {
    up: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    down: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }
}, {
  timestamps: true
});

// Virtual for vote score
offenseSchema.virtual('voteScore').get(function() {
  return (this.votes?.up?.length || 0) - (this.votes?.down?.length || 0);
});

offenseSchema.set('toJSON', { virtuals: true });
offenseSchema.set('toObject', { virtuals: true });

const Offense = mongoose.model('Offense', offenseSchema);

export default Offense;
