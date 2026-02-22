const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { sendMeetingInviteEmail } = require('../utils/emailService');
const auth = require('../middleware/auth');

// Schedule a meeting
router.post('/schedule', auth, async (req, res) => {
  try {
    const meeting = new Meeting({
      ...req.body,
      createdBy: req.user._id
    });

    await meeting.save();

    // Add to participants' calendars
    await User.updateMany(
      { _id: { $in: meeting.participants.map(p => p.userId) } },
      { $push: { upcomingMeetings: meeting._id } }
    );

    res.status(201).json({
      success: true,
      meeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get meetings for workspace
router.get('/workspace/:workspaceId', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      workspaceId: req.params.workspaceId
    }).sort({ startTime: 1 });

    res.json({
      success: true,
      meetings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send meeting invitations
router.post('/send-invites', auth, async (req, res) => {
  try {
    const { meetingId } = req.body;
    const meeting = await Meeting.findById(meetingId)
      .populate('participants.userId');

    for (const participant of meeting.participants) {
      await sendMeetingInviteEmail(
        participant.userId.email,
        meeting
      );
    }

    res.json({
      success: true,
      message: 'Invitations sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update meeting status (start/end/cancel)
router.patch('/:meetingId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const meeting = await Meeting.findByIdAndUpdate(
      req.params.meetingId,
      { status },
      { new: true }
    );

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;