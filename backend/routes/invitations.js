import express from 'express';
import Invitation from '../models/Invitation.js';
import Guild from '../models/Guild.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all invitations for the current user
router.get('/my-invitations', authenticate, async (req, res) => {
  try {
    const invitations = await Invitation.find({
      invitedUser: req.user._id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('guild', 'name description logo')
      .populate('invitedBy', 'name username email')
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Send an invitation to a user
router.post('/send', authenticate, async (req, res) => {
  try {
    const { guildId, userId, role = 'member', message = '' } = req.body;

    // Validate inputs
    if (!guildId || !userId) {
      return res.status(400).json({ error: 'Guild ID and User ID are required' });
    }

    // Check if guild exists
    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user has permission to invite (must be leader or subLeader)
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader) {
      return res.status(403).json({ error: 'Only leaders and sub-leaders can send invitations' });
    }

    // Check if user exists
    const invitedUser = await User.findById(userId);
    if (!invitedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const isAlreadyMember = guild.members.some(id => id.toString() === userId) ||
                           guild.subLeaders.some(id => id.toString() === userId) ||
                           guild.leader.toString() === userId;

    if (isAlreadyMember) {
      return res.status(400).json({ error: 'User is already a member of this guild' });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await Invitation.findOne({
      guild: guildId,
      invitedUser: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'An invitation has already been sent to this user' });
    }

    // Check if guild is at max capacity
    const totalMembers = 1 + guild.subLeaders.length + guild.members.length;
    if (totalMembers >= guild.maxMembers) {
      return res.status(400).json({ error: 'Guild is at maximum capacity' });
    }

    // Create invitation
    const invitation = new Invitation({
      guild: guildId,
      invitedUser: userId,
      invitedBy: req.user._id,
      role,
      message
    });

    await invitation.save();

    // Populate for response
    await invitation.populate('guild', 'name description logo');
    await invitation.populate('invitedUser', 'name username email');
    await invitation.populate('invitedBy', 'name username email');

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Accept an invitation
router.post('/:invitationId/accept', authenticate, async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.invitationId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation belongs to the user
    if (invitation.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'This invitation has already been processed' });
    }

    // Check if invitation is expired
    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This invitation has expired' });
    }

    // Get guild
    const guild = await Guild.findById(invitation.guild);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if guild is at max capacity
    const totalMembers = 1 + guild.subLeaders.length + guild.members.length;
    if (totalMembers >= guild.maxMembers) {
      return res.status(400).json({ error: 'Guild is at maximum capacity' });
    }

    // Add user to guild
    if (invitation.role === 'subLeader') {
      guild.subLeaders.push(req.user._id);
    } else {
      guild.members.push(req.user._id);
    }

    await guild.save();

    // Update invitation status
    invitation.status = 'accepted';
    await invitation.save();

    res.json({ message: 'Invitation accepted successfully', guild });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Decline an invitation
router.post('/:invitationId/decline', authenticate, async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.invitationId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation belongs to the user
    if (invitation.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'This invitation is not for you' });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'This invitation has already been processed' });
    }

    // Update invitation status
    invitation.status = 'declined';
    await invitation.save();

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
});

// Get invitations sent by a guild (for leaders/subLeaders)
router.get('/guild/:guildId', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findById(req.params.guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user has permission
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader) {
      return res.status(403).json({ error: 'Only leaders and sub-leaders can view guild invitations' });
    }

    const invitations = await Invitation.find({
      guild: req.params.guildId
    })
      .populate('invitedUser', 'name username email')
      .populate('invitedBy', 'name username email')
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching guild invitations:', error);
    res.status(500).json({ error: 'Failed to fetch guild invitations' });
  }
});

export default router;
