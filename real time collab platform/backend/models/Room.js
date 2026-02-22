const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: String,
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  // Add other room fields as needed
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);