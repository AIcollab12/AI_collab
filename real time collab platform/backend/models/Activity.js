// models/Activity.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  activityType: {
    type: String,
    enum: [
      'login', 'logout', 'file_upload', 'meeting_started', 
      'branch_merged', 'code_review', 'task_completed', 
      'room_created', 'room_joined', 'room_deleted',
      'user_invited', 'document_edited', 'api_call_failed'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  status: {
    type: String,
    enum: ['success', 'error', 'pending', 'completed', 'joined', 'created', 'started', 'uploaded'],
    default: 'success'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for faster queries
activitySchema.index({ createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);