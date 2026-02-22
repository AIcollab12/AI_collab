const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String },
  email: { 
    type: String, 
    lowercase: true,
    trim: true
  },
  googleId: { 
    type: String, 
    sparse: true 
  },
  githubId: { 
    type: String, 
    sparse: true 
  },
  profilePicture: { type: String, default: '' },
  color: { type: String, default: '#3B82F6' },
  createdAt: { type: Date, default: Date.now }
});

// Add indexes
userSchema.index({ googleId: 1 }, { sparse: true, unique: true });
userSchema.index({ githubId: 1 }, { sparse: true, unique: true });
userSchema.index({ email: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);