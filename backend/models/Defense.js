import mongoose from 'mongoose';

const monsterSchema = new mongoose.Schema({
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
  }
}, { _id: false });

const defenseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
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
    type: [monsterSchema],
    validate: {
      validator: function(v) {
        return v.length === 3;
      },
      message: 'A defense must have exactly 3 monsters'
    }
  },
  position: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Defense = mongoose.model('Defense', defenseSchema);

export default Defense;
