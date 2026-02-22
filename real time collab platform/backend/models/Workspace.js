const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  settings: {
    collaboration: { type: Boolean, default: true },
    realtime: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('Workspace', workspaceSchema);