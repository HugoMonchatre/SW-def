import express from 'express';
import { Op } from 'sequelize';
import { Guild, User, GuildMember, GuildSubLeader } from '../models/index.js';
import Invitation from '../models/Invitation.js';
import { authenticate, parseId } from '../middleware/auth.js';

const router = express.Router();

router.param('invitationId', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid invitation ID' });
  req.params.invitationId = id;
  next();
});
router.param('guildId', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid guild ID' });
  req.params.guildId = id;
  next();
});

// Get all invitations for the current user
router.get('/my-invitations', authenticate, async (req, res) => {
  try {
    const invitations = await Invitation.findAll({
      where: {
        invitedUserId: req.user.id,
        status: 'pending',
        expiresAt: { [Op.gt]: new Date() }
      },
      include: [
        { model: Guild, as: 'guild', attributes: ['id', 'name', 'description', 'logo'] },
        { model: User, as: 'invitedBy', attributes: ['id', 'name', 'username', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

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
    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user has permission to invite (must be leader or subLeader)
    const isLeader = guild.leaderId === req.user.id;
    const isSubLeader = await GuildSubLeader.findOne({ where: { guildId, userId: req.user.id } });

    if (!isLeader && !isSubLeader) {
      return res.status(403).json({ error: 'Only leaders and sub-leaders can send invitations' });
    }

    // Check if user exists
    const invitedUser = await User.findByPk(userId);
    if (!invitedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const isMemberRecord = await GuildMember.findOne({ where: { guildId, userId } });
    const isSubLeaderRecord = await GuildSubLeader.findOne({ where: { guildId, userId } });
    const isAlreadyLeader = guild.leaderId === userId;

    if (isMemberRecord || isSubLeaderRecord || isAlreadyLeader) {
      return res.status(400).json({ error: 'User is already a member of this guild' });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await Invitation.findOne({
      where: {
        guildId,
        invitedUserId: userId,
        status: 'pending',
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'An invitation has already been sent to this user' });
    }

    // Check if guild is at max capacity
    const memberCount = await GuildMember.count({ where: { guildId } });
    const subLeaderCount = await GuildSubLeader.count({ where: { guildId } });
    const totalMembers = 1 + subLeaderCount + memberCount;
    if (totalMembers >= guild.maxMembers) {
      return res.status(400).json({ error: 'Guild is at maximum capacity' });
    }

    // Create invitation
    const invitation = await Invitation.create({
      guildId,
      invitedUserId: userId,
      invitedById: req.user.id,
      role,
      message
    });

    // Reload with associations for response
    const populatedInvitation = await Invitation.findByPk(invitation.id, {
      include: [
        { model: Guild, as: 'guild', attributes: ['id', 'name', 'description', 'logo'] },
        { model: User, as: 'invitedUser', attributes: ['id', 'name', 'username', 'email'] },
        { model: User, as: 'invitedBy', attributes: ['id', 'name', 'username', 'email'] }
      ]
    });

    res.status(201).json(populatedInvitation);
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
});

// Accept an invitation
router.post('/:invitationId/accept', authenticate, async (req, res) => {
  try {
    const invitation = await Invitation.findByPk(req.params.invitationId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation belongs to the user
    if (invitation.invitedUserId !== req.user.id) {
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
    const guild = await Guild.findByPk(invitation.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if guild is at max capacity
    const memberCount = await GuildMember.count({ where: { guildId: guild.id } });
    const subLeaderCount = await GuildSubLeader.count({ where: { guildId: guild.id } });
    const totalMembers = 1 + subLeaderCount + memberCount;
    if (totalMembers >= guild.maxMembers) {
      return res.status(400).json({ error: 'Guild is at maximum capacity' });
    }

    // Add user to guild
    if (invitation.role === 'subLeader') {
      await GuildSubLeader.create({ guildId: guild.id, userId: req.user.id });
    } else {
      await GuildMember.create({ guildId: guild.id, userId: req.user.id });
    }

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
    const invitation = await Invitation.findByPk(req.params.invitationId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if invitation belongs to the user
    if (invitation.invitedUserId !== req.user.id) {
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
    const guild = await Guild.findByPk(req.params.guildId);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user has permission
    const isLeader = guild.leaderId === req.user.id;
    const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: req.user.id } });

    if (!isLeader && !isSubLeader) {
      return res.status(403).json({ error: 'Only leaders and sub-leaders can view guild invitations' });
    }

    const invitations = await Invitation.findAll({
      where: { guildId: req.params.guildId },
      include: [
        { model: User, as: 'invitedUser', attributes: ['id', 'name', 'username', 'email'] },
        { model: User, as: 'invitedBy', attributes: ['id', 'name', 'username', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(invitations);
  } catch (error) {
    console.error('Error fetching guild invitations:', error);
    res.status(500).json({ error: 'Failed to fetch guild invitations' });
  }
});

export default router;
