import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return this.provider === 'email';
    }
  },
  provider: {
    type: String,
    enum: ['email', 'discord', 'google'],
    default: 'email'
  },
  providerId: {
    type: String,
    sparse: true
  },
  role: {
    type: String,
    enum: ['user', 'guild_leader', 'admin'],
    default: 'user'
  },
  avatar: {
    type: String,
    default: null
  },
  guild: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guild',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  username: {
    type: String,
    sparse: true,
    trim: true
  },
  swData: {
    wizardId: Number,
    wizardName: String,
    wizardLevel: Number,
    lastUpload: Date,
    unitCount: Number,
    runeCount: Number,
    bestRuneSets: {
      swift: Number,
      swiftWill: Number,
      violent: Number,
      violentWill: Number,
      despair: Number,
      despairWill: Number
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON response
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
