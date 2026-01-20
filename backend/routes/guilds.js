import express from 'express';
import Guild from '../models/Guild.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all guilds
router.get('/', authenticate, async (req, res) => {
  try {
    const guilds = await Guild.find()
      .populate('leader', 'name email avatar')
      .populate('subLeaders', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate('joinRequests.user', 'name username email avatar')
      .sort({ createdAt: -1 });
    res.json({ guilds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get guild by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findById(req.params.id)
      .populate('leader', 'name email avatar role')
      .populate('subLeaders', 'name email avatar role')
      .populate('members', 'name email avatar role')
      .populate('joinRequests.user', 'name username email avatar');

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    res.json({ guild });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new guild (guild_leader or admin only)
router.post('/', authenticate, authorize('guild_leader', 'admin'), async (req, res) => {
  try {
    const { name, description, logo } = req.body;

    // Check if user already leads a guild
    const existingGuild = await Guild.findOne({ leader: req.user._id });
    if (existingGuild) {
      return res.status(400).json({ error: 'You already lead a guild' });
    }

    // Check if guild name already exists
    const duplicateGuild = await Guild.findOne({ name });
    if (duplicateGuild) {
      return res.status(400).json({ error: 'Guild name already exists' });
    }

    const guild = await Guild.create({
      name,
      description,
      logo: logo || null,
      leader: req.user._id,
      members: [req.user._id]
    });

    // Update user's guild reference
    await User.findByIdAndUpdate(req.user._id, { guild: guild._id });

    const populatedGuild = await Guild.findById(guild._id)
      .populate('leader', 'name email avatar')
      .populate('subLeaders', 'name email avatar')
      .populate('members', 'name email avatar');

    res.status(201).json({
      message: 'Guild created successfully',
      guild: populatedGuild
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update guild (leader or admin only)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, logo } = req.body;
    const guild = await Guild.findById(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or admin
    if (guild.leader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader or admin can update the guild' });
    }

    // Check for duplicate name if changed
    if (name && name !== guild.name) {
      const duplicate = await Guild.findOne({ name, _id: { $ne: guild._id } });
      if (duplicate) {
        return res.status(400).json({ error: 'Guild name already exists' });
      }
      guild.name = name;
    }

    if (description !== undefined) {
      guild.description = description;
    }

    if (logo !== undefined) {
      guild.logo = logo;
    }

    await guild.save();

    const populatedGuild = await Guild.findById(guild._id)
      .populate('leader', 'name email avatar')
      .populate('subLeaders', 'name email avatar')
      .populate('members', 'name email avatar');

    res.json({
      message: 'Guild updated successfully',
      guild: populatedGuild
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Invite member to guild (leader or sub-leader only) - SENDS INVITATION
router.post('/:id/invite', authenticate, async (req, res) => {
  try {
    const { userId, role = 'member', message = '' } = req.body;
    const guild = await Guild.findById(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or sub-leader
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader, sub-leaders, or admin can invite members' });
    }

    // Check if guild is full
    const totalMembers = 1 + guild.subLeaders.length + guild.members.length;
    if (totalMembers >= guild.maxMembers) {
      return res.status(400).json({ error: 'Guild is at maximum capacity' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
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
      guild: req.params.id,
      invitedUser: userId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'An invitation has already been sent to this user' });
    }

    // Create invitation
    const invitation = new Invitation({
      guild: req.params.id,
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

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member from guild (leader or admin only)
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const guild = await Guild.findById(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or admin
    if (guild.leader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader or admin can remove members' });
    }

    // Can't remove the leader
    if (guild.leader.toString() === userId) {
      return res.status(400).json({ error: 'Cannot remove the guild leader' });
    }

    // Remove member from guild
    guild.members = guild.members.filter(member => member.toString() !== userId);
    await guild.save();

    // Remove guild reference from user
    await User.findByIdAndUpdate(userId, { $unset: { guild: 1 } });

    const populatedGuild = await Guild.findById(guild._id)
      .populate('leader', 'name email avatar')
      .populate('members', 'name email avatar');

    res.json({
      message: 'Member removed successfully',
      guild: populatedGuild
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promote member to sub-leader (leader or admin only)
router.post('/:id/sub-leaders/:userId', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const guild = await Guild.findById(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader, sub-leader, or admin
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader, sub-leaders, or admin can promote members' });
    }

    // Check if member exists in guild
    if (!guild.members.some(m => m.toString() === userId)) {
      return res.status(400).json({ error: 'User is not a member of this guild' });
    }

    // Can't promote the leader
    if (guild.leader.toString() === userId) {
      return res.status(400).json({ error: 'Cannot promote the guild leader' });
    }

    // Check if already a sub-leader
    if (guild.subLeaders.some(s => s.toString() === userId)) {
      return res.status(400).json({ error: 'User is already a sub-leader' });
    }

    // Check max sub-leaders (4)
    if (guild.subLeaders.length >= 4) {
      return res.status(400).json({ error: 'Maximum number of sub-leaders reached (4)' });
    }

    // Promote to sub-leader
    guild.subLeaders.push(userId);
    await guild.save();

    const populatedGuild = await Guild.findById(guild._id)
      .populate('leader', 'name email avatar')
      .populate('subLeaders', 'name email avatar')
      .populate('members', 'name email avatar');

    res.json({
      message: 'Member promoted to sub-leader successfully',
      guild: populatedGuild
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Demote sub-leader to regular member (leader or admin only)
router.delete('/:id/sub-leaders/:userId', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const guild = await Guild.findById(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or admin
    if (guild.leader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader or admin can demote sub-leaders' });
    }

    // Check if user is a sub-leader
    if (!guild.subLeaders.some(s => s.toString() === userId)) {
      return res.status(400).json({ error: 'User is not a sub-leader' });
    }

    // Remove from sub-leaders
    guild.subLeaders = guild.subLeaders.filter(s => s.toString() !== userId);
    await guild.save();

    const populatedGuild = await Guild.findById(guild._id)
      .populate('leader', 'name email avatar')
      .populate('subLeaders', 'name email avatar')
      .populate('members', 'name email avatar');

    res.json({
      message: 'Sub-leader demoted successfully',
      guild: populatedGuild
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete guild (leader or admin only)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findById(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or admin
    if (guild.leader.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader or admin can delete the guild' });
    }

    // Remove guild reference from all members
    await User.updateMany(
      { _id: { $in: guild.members } },
      { $unset: { guild: 1 } }
    );

    await guild.deleteOne();

    res.json({ message: 'Guild deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request to join a guild (user without guild only)
router.post('/:id/join-request', authenticate, async (req, res) => {
  try {
    const { message = '' } = req.body;
    const guild = await Guild.findById(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user already has a guild
    const user = await User.findById(req.user._id);
    if (user.guild) {
      return res.status(400).json({ error: 'Vous êtes déjà membre d\'une guilde' });
    }

    // Check if guild is full
    const totalMembers = 1 + guild.subLeaders.length + guild.members.length;
    if (totalMembers >= guild.maxMembers) {
      return res.status(400).json({ error: 'Cette guilde est complète' });
    }

    // Check if user already has a pending request
    const existingRequest = guild.joinRequests.find(
      r => r.user.toString() === req.user._id.toString()
    );
    if (existingRequest) {
      return res.status(400).json({ error: 'Vous avez déjà une demande en attente pour cette guilde' });
    }

    // Add join request
    guild.joinRequests.push({
      user: req.user._id,
      message,
      requestedAt: new Date()
    });

    await guild.save();

    res.status(201).json({
      message: 'Demande d\'adhésion envoyée avec succès'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get join requests for a guild (leader and sub-leaders only)
router.get('/:id/join-requests', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findById(req.params.id)
      .populate('joinRequests.user', 'name username email avatar');

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or sub-leader
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seuls le chef et les sous-chefs peuvent voir les demandes' });
    }

    res.json({ joinRequests: guild.joinRequests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept join request (leader and sub-leaders only)
router.post('/:id/join-requests/:userId/accept', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const guild = await Guild.findById(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or sub-leader
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seuls le chef et les sous-chefs peuvent accepter les demandes' });
    }

    // Check if request exists
    const requestIndex = guild.joinRequests.findIndex(
      r => r.user.toString() === userId
    );
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    // Check if guild is full
    const totalMembers = 1 + guild.subLeaders.length + guild.members.length;
    if (totalMembers >= guild.maxMembers) {
      return res.status(400).json({ error: 'La guilde est complète' });
    }

    // Check if user already has a guild (might have joined another)
    const joiningUser = await User.findById(userId);
    if (joiningUser.guild) {
      // Remove request since user already in a guild
      guild.joinRequests.splice(requestIndex, 1);
      await guild.save();
      return res.status(400).json({ error: 'Cet utilisateur a déjà rejoint une guilde' });
    }

    // Add user to members
    guild.members.push(userId);
    // Remove request
    guild.joinRequests.splice(requestIndex, 1);
    await guild.save();

    // Update user's guild reference
    await User.findByIdAndUpdate(userId, { guild: guild._id });

    const populatedGuild = await Guild.findById(guild._id)
      .populate('leader', 'name email avatar')
      .populate('subLeaders', 'name email avatar')
      .populate('members', 'name email avatar')
      .populate('joinRequests.user', 'name username email avatar');

    res.json({
      message: 'Demande acceptée avec succès',
      guild: populatedGuild
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject join request (leader and sub-leaders only)
router.post('/:id/join-requests/:userId/reject', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const guild = await Guild.findById(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or sub-leader
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seuls le chef et les sous-chefs peuvent refuser les demandes' });
    }

    // Check if request exists
    const requestIndex = guild.joinRequests.findIndex(
      r => r.user.toString() === userId
    );
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    // Remove request
    guild.joinRequests.splice(requestIndex, 1);
    await guild.save();

    res.json({
      message: 'Demande refusée'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel own join request
router.delete('/:id/join-request', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findById(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if request exists
    const requestIndex = guild.joinRequests.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Aucune demande en attente' });
    }

    // Remove request
    guild.joinRequests.splice(requestIndex, 1);
    await guild.save();

    res.json({
      message: 'Demande annulée'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave guild (members can leave, but not the leader)
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const guild = await Guild.findById(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of this guild
    const isMember = guild.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(400).json({ error: 'You are not a member of this guild' });
    }

    // Leader cannot leave (must transfer leadership or delete guild first)
    if (guild.leader.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Le chef de guilde ne peut pas quitter la guilde. Vous devez soit transférer le rôle de chef, soit supprimer la guilde.' });
    }

    // Remove user from sub-leaders if they are one
    guild.subLeaders = guild.subLeaders.filter(s => s.toString() !== req.user._id.toString());

    // Remove user from members
    guild.members = guild.members.filter(m => m.toString() !== req.user._id.toString());
    await guild.save();

    // Remove guild reference from user
    await User.findByIdAndUpdate(req.user._id, { $unset: { guild: 1 } });

    res.json({
      message: 'Vous avez quitté la guilde avec succès'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
