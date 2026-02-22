const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const Room = require('../models/Room');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Create room in workspace
router.post('/:id/rooms', auth, async (req, res) => {
  try {
    const { name, description, type, settings } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }
    
    // Check if user is a member
    const isMember = workspace.members.some(member => 
      member.user.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    const room = new Room({
      name,
      description,
      type,
      workspace: workspace._id,
      createdBy: req.user.id,
      settings: settings || { language: 'javascript' }
    });
    
    await room.save();
    
    // Add room to workspace
    workspace.rooms.push(room._id);
    await workspace.save();
    
    const populatedRoom = await Room.findById(room._id)
      .populate('createdBy', 'username color');
    
    res.json({ success: true, room: populatedRoom });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get rooms in workspace
router.get('/:id/rooms', auth, async (req, res) => {
  try {
    const rooms = await Room.find({ workspace: req.params.id })
      .populate('createdBy', 'username color')
      .sort('-createdAt');
    
    res.json({ success: true, rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Join workspace by invite code
router.post('/join', auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    const workspace = await Workspace.findOne({ inviteCode })
      .populate('owner', 'username email color')
      .populate('members.user', 'username email color');
    
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Invalid invite code' });
    }
    
    // Check if already a member
    const isMember = workspace.members.some(member => 
      member.user._id.toString() === req.user.id
    );
    
    if (isMember) {
      return res.status(400).json({ success: false, error: 'Already a member' });
    }
    
    // Add user as member
    workspace.members.push({
      user: req.user.id,
      role: 'member'
    });
    
    await workspace.save();
    
    // Update user's workspaces
    await User.findByIdAndUpdate(req.user.id, {
      $push: { workspaces: workspace._id }
    });
    
    res.json({ success: true, workspace });
  } catch (error) {
    console.error('Error joining workspace:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate new invite code
router.post('/:id/invite-code', auth, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }
    
    // Generate new invite code
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    workspace.inviteCode = inviteCode;
    await workspace.save();
    
    res.json({ success: true, inviteCode });
  } catch (error) {
    console.error('Error generating invite code:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;