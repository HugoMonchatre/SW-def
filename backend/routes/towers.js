import express from 'express';
import Tower from '../models/Tower.js';
import Defense from '../models/Defense.js';
import Guild from '../models/Guild.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const MAX_DEFENSES_PER_TOWER = 5;
const MAX_STARS_TOWERS = ['2', '7', '11']; // Tours avec restriction 4 étoiles max

// Helper function to check if tower has 4-star restriction
const is4StarTower = (towerId) => {
  const towerNumber = towerId.slice(1); // Remove color prefix (r, b, y)
  return MAX_STARS_TOWERS.includes(towerNumber);
};

// Helper function to check if defense has only 4-star or less monsters
const isDefenseValid4Star = (defense) => {
  return defense.monsters.every(monster => monster.natural_stars <= 4);
};

// Helper function to check if user can manage tower defenses
const canManageTower = (guild, userId, userRole) => {
  const isLeader = guild.leader.toString() === userId.toString();
  const isSubLeader = guild.subLeaders.some(s => s.toString() === userId.toString());
  const isAdmin = userRole === 'admin';
  return isLeader || isSubLeader || isAdmin;
};

// Get tower defenses for a specific tower
router.get('/:guildId/:towerId', authenticate, async (req, res) => {
  try {
    const { guildId, towerId } = req.params;

    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of the guild
    const isMember = guild.members.some(m => m.toString() === req.user._id.toString()) ||
                     guild.subLeaders.some(s => s.toString() === req.user._id.toString()) ||
                     guild.leader.toString() === req.user._id.toString();

    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You must be a member of this guild to view tower defenses' });
    }

    let tower = await Tower.findOne({ guild: guildId, towerId })
      .populate({
        path: 'defenses',
        populate: {
          path: 'createdBy',
          select: 'name username avatar'
        }
      });

    if (!tower) {
      // Return empty defenses if tower doesn't exist yet
      return res.json({ towerId, defenses: [], memo: '' });
    }

    res.json({
      towerId: tower.towerId,
      defenses: tower.defenses,
      memo: tower.memo || ''
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a defense to a tower
router.post('/:guildId/:towerId/defense', authenticate, async (req, res) => {
  try {
    const { guildId, towerId } = req.params;
    const { defenseId } = req.body;

    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (!canManageTower(guild, req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'Only leaders, sub-leaders, and admins can manage tower defenses' });
    }

    // Verify the defense exists and belongs to this guild
    const defense = await Defense.findById(defenseId);
    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }
    if (defense.guild.toString() !== guildId) {
      return res.status(403).json({ error: 'Defense does not belong to this guild' });
    }

    // Check 4-star restriction for towers 2, 7, 11
    if (is4StarTower(towerId) && !isDefenseValid4Star(defense)) {
      return res.status(400).json({ error: 'Cette tour n\'accepte que des défenses avec des monstres 4★ maximum' });
    }

    // Find or create the tower
    let tower = await Tower.findOne({ guild: guildId, towerId });
    if (!tower) {
      tower = await Tower.create({
        towerId,
        guild: guildId,
        defenses: []
      });
    }

    // Check if defense is already in the tower
    if (tower.defenses.some(d => d.toString() === defenseId)) {
      return res.status(400).json({ error: 'Defense is already assigned to this tower' });
    }

    // Check max defenses per tower
    if (tower.defenses.length >= MAX_DEFENSES_PER_TOWER) {
      return res.status(400).json({ error: `Maximum ${MAX_DEFENSES_PER_TOWER} défenses par tour` });
    }

    tower.defenses.push(defenseId);
    await tower.save();

    // Populate and return the updated tower
    const populatedTower = await Tower.findById(tower._id)
      .populate({
        path: 'defenses',
        populate: {
          path: 'createdBy',
          select: 'name username avatar'
        }
      });

    res.json({
      message: 'Defense added to tower',
      tower: populatedTower
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fill tower with the same defense (up to max)
router.post('/:guildId/:towerId/fill', authenticate, async (req, res) => {
  try {
    const { guildId, towerId } = req.params;
    const { defenseId } = req.body;

    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (!canManageTower(guild, req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'Only leaders, sub-leaders, and admins can manage tower defenses' });
    }

    // Verify the defense exists and belongs to this guild
    const defense = await Defense.findById(defenseId);
    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }
    if (defense.guild.toString() !== guildId) {
      return res.status(403).json({ error: 'Defense does not belong to this guild' });
    }

    // Check 4-star restriction for towers 2, 7, 11
    if (is4StarTower(towerId) && !isDefenseValid4Star(defense)) {
      return res.status(400).json({ error: 'Cette tour n\'accepte que des défenses avec des monstres 4★ maximum' });
    }

    // Find or create the tower
    let tower = await Tower.findOne({ guild: guildId, towerId });
    if (!tower) {
      tower = await Tower.create({
        towerId,
        guild: guildId,
        defenses: []
      });
    }

    // Fill with the same defense ID up to MAX_DEFENSES_PER_TOWER
    // This adds duplicate references to the same defense (no new defense created)
    const currentCount = tower.defenses.length;
    const slotsToFill = MAX_DEFENSES_PER_TOWER - currentCount;

    if (slotsToFill <= 0) {
      return res.status(400).json({ error: 'La tour est déjà pleine' });
    }

    // Add the defense ID multiple times
    for (let i = 0; i < slotsToFill; i++) {
      tower.defenses.push(defenseId);
    }
    await tower.save();

    // Populate and return the updated tower
    const populatedTower = await Tower.findById(tower._id)
      .populate({
        path: 'defenses',
        populate: {
          path: 'createdBy',
          select: 'name username avatar'
        }
      });

    res.json({
      message: `Tour remplie avec ${slotsToFill} défenses`,
      addedCount: slotsToFill,
      tower: populatedTower
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a defense from a tower by index
router.delete('/:guildId/:towerId/defense/:index', authenticate, async (req, res) => {
  try {
    const { guildId, towerId, index } = req.params;
    const defenseIndex = parseInt(index, 10);

    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (!canManageTower(guild, req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'Only leaders, sub-leaders, and admins can manage tower defenses' });
    }

    const tower = await Tower.findOne({ guild: guildId, towerId });
    if (!tower) {
      return res.status(404).json({ error: 'Tower not found' });
    }

    if (defenseIndex < 0 || defenseIndex >= tower.defenses.length) {
      return res.status(400).json({ error: 'Invalid defense index' });
    }

    tower.defenses.splice(defenseIndex, 1);
    await tower.save();

    res.json({ message: 'Defense removed from tower' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update tower memo
router.put('/:guildId/:towerId/memo', authenticate, async (req, res) => {
  try {
    const { guildId, towerId } = req.params;
    const { memo } = req.body;

    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (!canManageTower(guild, req.user._id, req.user.role)) {
      return res.status(403).json({ error: 'Only leaders, sub-leaders, and admins can update tower memo' });
    }

    // Find or create the tower
    let tower = await Tower.findOne({ guild: guildId, towerId });
    if (!tower) {
      tower = await Tower.create({
        towerId,
        guild: guildId,
        defenses: [],
        memo: memo || ''
      });
    } else {
      tower.memo = memo || '';
      await tower.save();
    }

    res.json({ message: 'Memo updated', memo: tower.memo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all towers for a guild (with their defenses)
router.get('/:guildId', authenticate, async (req, res) => {
  try {
    const { guildId } = req.params;

    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of the guild
    const isMember = guild.members.some(m => m.toString() === req.user._id.toString()) ||
                     guild.subLeaders.some(s => s.toString() === req.user._id.toString()) ||
                     guild.leader.toString() === req.user._id.toString();

    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You must be a member of this guild to view towers' });
    }

    const towers = await Tower.find({ guild: guildId })
      .populate({
        path: 'defenses',
        populate: {
          path: 'createdBy',
          select: 'name username avatar'
        }
      });

    res.json({ towers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
