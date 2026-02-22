const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  workspaceId: {
    type: String, // Changed from ObjectId to String to accept any ID format
    required: true
  },
  createdBy: {
    type: String, // Changed from ObjectId to String
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 60
  },
  participants: [{
    userId: String,
    username: String,
    email: String,
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'accepted'
    }
  }],
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  meetingLink: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique meeting link before saving
meetingSchema.pre('save', async function(next) {
  if (!this.meetingLink) {
    this.meetingLink = `meet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Check if model exists before creating to avoid OverwriteModelError
const Meeting = mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;