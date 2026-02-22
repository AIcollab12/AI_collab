const express = require('express');
const router = express.Router();
const Workspace = require('../models/Workspace');
const Room = require('../models/Room');
const WorkspaceMember = require('../models/WorkspaceMember');
const authMiddleware = require('../middleware/authMiddleware');

// Add this DELETE route with your existing routes
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Find workspace
    const workspace = await Workspace.findById(id);
    
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // 2. Check if user is owner
    if (workspace.owner.toString() !== userId) {
      return res.status(403).json({ error: 'Only owner can delete workspace' });
    }

    // 3. Delete related data first
    await Room.deleteMany({ workspace: id });
    await WorkspaceMember.deleteMany({ workspace: id });
    
    // 4. Delete the workspace
    await Workspace.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: 'Workspace deleted successfully' 
    });

  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;