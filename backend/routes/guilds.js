import express from 'express';
import { Op } from 'sequelize';
import { Guild, User, GuildMember, GuildSubLeader, GuildJoinRequest } from '../models/index.js';
import Invitation from '../models/Invitation.js';
import { authenticate, authorize, parseId } from '../middleware/auth.js';

const router = express.Router();

// Validate numeric route params
router.param('id', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid ID' });
  req.params.id = id;
  next();
});
router.param('userId', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid user ID' });
  req.params.userId = id;
  next();
});

// Helper to get a fully populated guild by primary key
const getPopulatedGuild = (id) => Guild.findByPk(id, {
  include: [
    { model: User, as: 'leader', attributes: ['id', 'name', 'email', 'avatar'] },
    { model: User, as: 'subLeaders', attributes: ['id', 'name', 'email', 'avatar'] },
    { model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'] },
    { model: GuildJoinRequest, as: 'joinRequests', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username', 'email', 'avatar'] }] }
  ]
});

// Get all guilds
router.get('/', authenticate, async (req, res) => {
  try {
    const guilds = await Guild.findAll({
      include: [
        { model: User, as: 'leader', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: User, as: 'subLeaders', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar'] },
        { model: GuildJoinRequest, as: 'joinRequests', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username', 'email', 'avatar'] }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json({ guilds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get guild by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findByPk(req.params.id, {
      include: [
        { model: User, as: 'leader', attributes: ['id', 'name', 'email', 'avatar', 'role'] },
        { model: User, as: 'subLeaders', attributes: ['id', 'name', 'email', 'avatar', 'role'] },
        { model: User, as: 'members', attributes: ['id', 'name', 'email', 'avatar', 'role'] },
        { model: GuildJoinRequest, as: 'joinRequests', include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username', 'email', 'avatar'] }] }
      ]
    });

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
    const existingGuild = await Guild.findOne({ where: { leaderId: req.user.id } });
    if (existingGuild) {
      return res.status(400).json({ error: 'You already lead a guild' });
    }

    // Check if guild name already exists
    const duplicateGuild = await Guild.findOne({ where: { name } });
    if (duplicateGuild) {
      return res.status(400).json({ error: 'Guild name already exists' });
    }

    const guild = await Guild.create({
      name,
      description,
      logo: logo || null,
      leaderId: req.user.id
    });

    // Add the leader as a member in the junction table
    await GuildMember.create({ guildId: guild.id, userId: req.user.id });

    // Update user's guild reference
    await User.update({ guildId: guild.id }, { where: { id: req.user.id } });

    const populatedGuild = await getPopulatedGuild(guild.id);

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
    const guild = await Guild.findByPk(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or admin
    if (guild.leaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader or admin can update the guild' });
    }

    // Check for duplicate name if changed
    if (name && name !== guild.name) {
      const duplicate = await Guild.findOne({ where: { name, id: { [Op.ne]: guild.id } } });
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

    const populatedGuild = await getPopulatedGuild(guild.id);

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
    const guild = await Guild.findByPk(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or sub-leader
    const isLeader = guild.leaderId === req.user.id;
    const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: req.user.id } });

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader, sub-leaders, or admin can invite members' });
    }

    // Check if guild is full
    const memberCount = await GuildMember.count({ where: { guildId: guild.id } });
    if (memberCount >= guild.maxMembers) {
      return res.status(400).json({ error: 'Guild is at maximum capacity' });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a member
    const isAlreadyMember = await GuildMember.findOne({ where: { guildId: guild.id, userId } });
    if (isAlreadyMember) {
      return res.status(400).json({ error: 'User is already a member of this guild' });
    }

    // Check if there's already a pending invitation
    const existingInvitation = await Invitation.findOne({
      where: {
        guildId: guild.id,
        invitedUserId: userId,
        status: 'pending',
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (existingInvitation) {
      return res.status(400).json({ error: 'An invitation has already been sent to this user' });
    }

    // Create invitation
    const invitation = await Invitation.create({
      guildId: guild.id,
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

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: populatedInvitation
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member from guild (leader or admin only)
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const parsedUserId = parseInt(userId, 10);
    const guild = await Guild.findByPk(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or admin
    if (guild.leaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader or admin can remove members' });
    }

    // Can't remove the leader
    if (guild.leaderId === parsedUserId) {
      return res.status(400).json({ error: 'Cannot remove the guild leader' });
    }

    // Remove from sub-leaders if applicable
    await GuildSubLeader.destroy({ where: { guildId: guild.id, userId: parsedUserId } });

    // Remove member from guild
    await GuildMember.destroy({ where: { guildId: guild.id, userId: parsedUserId } });

    // Remove guild reference from user
    await User.update({ guildId: null }, { where: { id: parsedUserId } });

    const populatedGuild = await getPopulatedGuild(guild.id);

    res.json({
      message: 'Member removed successfully',
      guild: populatedGuild
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promote member to sub-leader (leader, sub-leader, or admin only)
router.post('/:id/sub-leaders/:userId', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const parsedUserId = parseInt(userId, 10);
    const guild = await Guild.findByPk(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader, sub-leader, or admin
    const isLeader = guild.leaderId === req.user.id;
    const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: req.user.id } });

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader, sub-leaders, or admin can promote members' });
    }

    // Check if member exists in guild
    const isMember = await GuildMember.findOne({ where: { guildId: guild.id, userId: parsedUserId } });
    if (!isMember) {
      return res.status(400).json({ error: 'User is not a member of this guild' });
    }

    // Can't promote the leader
    if (guild.leaderId === parsedUserId) {
      return res.status(400).json({ error: 'Cannot promote the guild leader' });
    }

    // Check if already a sub-leader
    const alreadySubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: parsedUserId } });
    if (alreadySubLeader) {
      return res.status(400).json({ error: 'User is already a sub-leader' });
    }

    // Check max sub-leaders (4)
    const subLeaderCount = await GuildSubLeader.count({ where: { guildId: guild.id } });
    if (subLeaderCount >= 4) {
      return res.status(400).json({ error: 'Maximum number of sub-leaders reached (4)' });
    }

    // Promote to sub-leader
    await GuildSubLeader.create({ guildId: guild.id, userId: parsedUserId });

    const populatedGuild = await getPopulatedGuild(guild.id);

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
    const parsedUserId = parseInt(userId, 10);
    const guild = await Guild.findByPk(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or admin
    if (guild.leaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader or admin can demote sub-leaders' });
    }

    // Check if user is a sub-leader
    const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: parsedUserId } });
    if (!isSubLeader) {
      return res.status(400).json({ error: 'User is not a sub-leader' });
    }

    // Remove from sub-leaders
    await GuildSubLeader.destroy({ where: { guildId: guild.id, userId: parsedUserId } });

    const populatedGuild = await getPopulatedGuild(guild.id);

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
    const guild = await Guild.findByPk(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or admin
    if (guild.leaderId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the guild leader or admin can delete the guild' });
    }

    // Remove guild reference from all users who belong to this guild
    await User.update({ guildId: null }, { where: { guildId: guild.id } });

    // Clean up all junction table records
    await GuildMember.destroy({ where: { guildId: guild.id } });
    await GuildSubLeader.destroy({ where: { guildId: guild.id } });
    await GuildJoinRequest.destroy({ where: { guildId: guild.id } });

    await guild.destroy();

    res.json({ message: 'Guild deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request to join a guild (user without guild only)
router.post('/:id/join-request', authenticate, async (req, res) => {
  try {
    const { message = '' } = req.body;
    const guild = await Guild.findByPk(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user already has a guild
    const user = await User.findByPk(req.user.id);
    if (user.guildId) {
      return res.status(400).json({ error: "Vous \u00eates d\u00e9j\u00e0 membre d'une guilde" });
    }

    // Check if guild is full
    const memberCount = await GuildMember.count({ where: { guildId: guild.id } });
    if (memberCount >= guild.maxMembers) {
      return res.status(400).json({ error: 'Cette guilde est compl\u00e8te' });
    }

    // Check if user already has a pending request
    const existingRequest = await GuildJoinRequest.findOne({ where: { guildId: guild.id, userId: req.user.id } });
    if (existingRequest) {
      return res.status(400).json({ error: 'Vous avez d\u00e9j\u00e0 une demande en attente pour cette guilde' });
    }

    // Add join request
    await GuildJoinRequest.create({
      guildId: guild.id,
      userId: req.user.id,
      message,
      requestedAt: new Date()
    });

    res.status(201).json({
      message: "Demande d'adh\u00e9sion envoy\u00e9e avec succ\u00e8s"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get join requests for a guild (leader and sub-leaders only)
router.get('/:id/join-requests', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findByPk(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or sub-leader
    const isLeader = guild.leaderId === req.user.id;
    const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: req.user.id } });

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seuls le chef et les sous-chefs peuvent voir les demandes' });
    }

    const joinRequests = await GuildJoinRequest.findAll({
      where: { guildId: guild.id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'username', 'email', 'avatar'] }]
    });

    res.json({ joinRequests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept join request (leader and sub-leaders only)
router.post('/:id/join-requests/:userId/accept', authenticate, async (req, res) => {
  try {
    const { id, userId } = req.params;
    const parsedUserId = parseInt(userId, 10);
    const guild = await Guild.findByPk(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or sub-leader
    const isLeader = guild.leaderId === req.user.id;
    const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: req.user.id } });

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seuls le chef et les sous-chefs peuvent accepter les demandes' });
    }

    // Check if request exists
    const joinRequest = await GuildJoinRequest.findOne({ where: { guildId: guild.id, userId: parsedUserId } });
    if (!joinRequest) {
      return res.status(404).json({ error: 'Demande non trouv\u00e9e' });
    }

    // Check if guild is full
    const memberCount = await GuildMember.count({ where: { guildId: guild.id } });
    if (memberCount >= guild.maxMembers) {
      return res.status(400).json({ error: 'La guilde est compl\u00e8te' });
    }

    // Check if user already has a guild (might have joined another)
    const joiningUser = await User.findByPk(parsedUserId);
    if (joiningUser.guildId) {
      // Remove request since user already in a guild
      await GuildJoinRequest.destroy({ where: { guildId: guild.id, userId: parsedUserId } });
      return res.status(400).json({ error: 'Cet utilisateur a d\u00e9j\u00e0 rejoint une guilde' });
    }

    // Add user to members
    await GuildMember.create({ guildId: guild.id, userId: parsedUserId });

    // Remove request
    await GuildJoinRequest.destroy({ where: { guildId: guild.id, userId: parsedUserId } });

    // Update user's guild reference
    await User.update({ guildId: guild.id }, { where: { id: parsedUserId } });

    const populatedGuild = await getPopulatedGuild(guild.id);

    res.json({
      message: 'Demande accept\u00e9e avec succ\u00e8s',
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
    const parsedUserId = parseInt(userId, 10);
    const guild = await Guild.findByPk(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is the leader or sub-leader
    const isLeader = guild.leaderId === req.user.id;
    const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId: req.user.id } });

    if (!isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Seuls le chef et les sous-chefs peuvent refuser les demandes' });
    }

    // Check if request exists
    const joinRequest = await GuildJoinRequest.findOne({ where: { guildId: guild.id, userId: parsedUserId } });
    if (!joinRequest) {
      return res.status(404).json({ error: 'Demande non trouv\u00e9e' });
    }

    // Remove request
    await GuildJoinRequest.destroy({ where: { guildId: guild.id, userId: parsedUserId } });

    res.json({
      message: 'Demande refus\u00e9e'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel own join request
router.delete('/:id/join-request', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findByPk(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if request exists
    const joinRequest = await GuildJoinRequest.findOne({ where: { guildId: guild.id, userId: req.user.id } });
    if (!joinRequest) {
      return res.status(404).json({ error: 'Aucune demande en attente' });
    }

    // Remove request
    await GuildJoinRequest.destroy({ where: { guildId: guild.id, userId: req.user.id } });

    res.json({
      message: 'Demande annul\u00e9e'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get guild members rune stats (for rune comparison chart)
router.get('/:id/rune-stats', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findByPk(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of this guild
    const isMember = await GuildMember.findOne({ where: { guildId: guild.id, userId: req.user.id } });
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Vous devez \u00eatre membre de cette guilde' });
    }

    // Get all member IDs from the junction table
    const memberRows = await GuildMember.findAll({ where: { guildId: guild.id } });
    const memberIds = memberRows.map(m => m.userId);

    // Get all members with their swData
    const members = await User.findAll({
      where: { id: { [Op.in]: memberIds } },
      attributes: ['id', 'name', 'username', 'avatar', 'swData']
    });

    // Format data for chart
    const runeStats = members
      .filter(m => m.swData?.bestRuneSets)
      .map(m => ({
        id: m.id,
        name: m.username || m.name,
        avatar: m.avatar,
        bestRuneSets: m.swData.bestRuneSets
      }))
      .sort((a, b) => (b.bestRuneSets?.swift || 0) - (a.bestRuneSets?.swift || 0));

    res.json({ runeStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rune set definitions
const RUNE_SETS = [
  { id: 1, name: 'Energy', pieces: 2, color: '#22c55e' },
  { id: 2, name: 'Guard', pieces: 2, color: '#64748b' },
  { id: 3, name: 'Swift', pieces: 4, color: '#3b82f6' },
  { id: 4, name: 'Blade', pieces: 2, color: '#ef4444' },
  { id: 5, name: 'Rage', pieces: 4, color: '#f97316' },
  { id: 6, name: 'Focus', pieces: 2, color: '#8b5cf6' },
  { id: 7, name: 'Endure', pieces: 2, color: '#14b8a6' },
  { id: 8, name: 'Fatal', pieces: 4, color: '#dc2626' },
  { id: 10, name: 'Despair', pieces: 4, color: '#a855f7' },
  { id: 11, name: 'Vampire', pieces: 4, color: '#be123c' },
  { id: 13, name: 'Violent', pieces: 4, color: '#7c3aed' },
  { id: 14, name: 'Nemesis', pieces: 2, color: '#f59e0b' },
  { id: 15, name: 'Will', pieces: 2, color: '#eab308' },
  { id: 16, name: 'Shield', pieces: 2, color: '#0ea5e9' },
  { id: 17, name: 'Revenge', pieces: 2, color: '#e11d48' },
  { id: 18, name: 'Destroy', pieces: 2, color: '#78716c' },
  { id: 19, name: 'Fight', pieces: 2, color: '#ef4444' },
  { id: 20, name: 'Determination', pieces: 2, color: '#2563eb' },
  { id: 21, name: 'Enhance', pieces: 2, color: '#16a34a' },
  { id: 22, name: 'Accuracy', pieces: 2, color: '#9333ea' },
  { id: 23, name: 'Tolerance', pieces: 2, color: '#0d9488' },
];

// Get guild rune efficiency per set
router.get('/:id/rune-efficiency', authenticate, async (req, res) => {
  try {
    const guild = await Guild.findByPk(req.params.id);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const isMember = await GuildMember.findOne({ where: { guildId: guild.id, userId: req.user.id } });
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Vous devez être membre de cette guilde' });
    }

    const memberRows = await GuildMember.findAll({ where: { guildId: guild.id } });
    const memberIds = memberRows.map(m => m.userId);

    const members = await User.findAll({
      where: { id: { [Op.in]: memberIds } },
      attributes: ['id', 'name', 'username', 'swData']
    });

    const membersWithData = members.filter(m => m.swData?.runeEfficiency);

    // Aggregate efficiency per set across all members
    const efficiencies = RUNE_SETS.map(set => {
      let totalEfficiency = 0;
      let totalRunes = 0;
      let memberCount = 0;

      membersWithData.forEach(member => {
        const setData = member.swData.runeEfficiency?.[set.id];
        if (setData && setData.count > 0) {
          totalEfficiency += setData.avgEfficiency * setData.count;
          totalRunes += setData.count;
          memberCount++;
        }
      });

      return {
        setId: set.id,
        name: set.name,
        pieces: set.pieces,
        color: set.color,
        avgEfficiency: totalRunes > 0 ? totalEfficiency / totalRunes : 0,
        totalRunes,
        memberCount
      };
    }).filter(s => s.totalRunes > 0);

    res.json({ efficiencies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leave guild (members can leave, but not the leader)
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const guild = await Guild.findByPk(id);

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of this guild
    const isMember = await GuildMember.findOne({ where: { guildId: guild.id, userId: req.user.id } });
    if (!isMember) {
      return res.status(400).json({ error: 'You are not a member of this guild' });
    }

    // Leader cannot leave (must transfer leadership or delete guild first)
    if (guild.leaderId === req.user.id) {
      return res.status(400).json({ error: "Le chef de guilde ne peut pas quitter la guilde. Vous devez soit transf\u00e9rer le r\u00f4le de chef, soit supprimer la guilde." });
    }

    // Remove user from sub-leaders if they are one
    await GuildSubLeader.destroy({ where: { guildId: guild.id, userId: req.user.id } });

    // Remove user from members
    await GuildMember.destroy({ where: { guildId: guild.id, userId: req.user.id } });

    // Remove guild reference from user
    await User.update({ guildId: null }, { where: { id: req.user.id } });

    res.json({
      message: 'Vous avez quitt\u00e9 la guilde avec succ\u00e8s'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
