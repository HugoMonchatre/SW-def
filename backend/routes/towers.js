import express from 'express';
import { Guild, User, Defense, Tower, TowerDefense, GuildMember, GuildSubLeader } from '../models/index.js';
import { authenticate, parseId } from '../middleware/auth.js';

const router = express.Router();

router.param('guildId', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid guild ID' });
  req.params.guildId = id;
  next();
});

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
const canManageTower = async (guild, userId, userRole) => {
  const isLeader = guild.leaderId === userId;
  const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId } });
  const isAdmin = userRole === 'admin';
  return isLeader || !!isSubLeader || isAdmin;
};

// Helper function to check if user is a member of the guild
const isGuildMember = async (guild, userId, userRole) => {
  if (userRole === 'admin') return true;
  if (guild.leaderId === userId) return true;
  const isSubLeader = await GuildSubLeader.findOne({ where: { guildId: guild.id, userId } });
  if (isSubLeader) return true;
  const isMember = await GuildMember.findOne({ where: { guildId: guild.id, userId } });
  return !!isMember;
};

// Helper to build tower include with nested defense and createdBy
const towerDefenseInclude = [{
  model: TowerDefense,
  as: 'towerDefenses',
  include: [{
    model: Defense,
    as: 'defense',
    include: [{ model: User, as: 'createdBy', attributes: ['id', 'name', 'username', 'avatar'] }]
  }]
}];

// Helper to format tower response (extract defenses from junction table)
const formatTowerDefenses = (tower) => {
  if (!tower) return [];
  return tower.towerDefenses.map(td => td.defense);
};

// Get tower defenses for a specific tower
router.get('/:guildId/:towerId', authenticate, async (req, res) => {
  try {
    const { guildId, towerId } = req.params;

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of the guild
    const isMember = await isGuildMember(guild, req.user.id, req.user.role);

    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member of this guild to view tower defenses' });
    }

    const tower = await Tower.findOne({
      where: { guildId, towerId },
      include: towerDefenseInclude
    });

    if (!tower) {
      // Return empty defenses if tower doesn't exist yet
      return res.json({ towerId, defenses: [], memo: '' });
    }

    res.json({
      towerId: tower.towerId,
      defenses: formatTowerDefenses(tower),
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

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (!(await canManageTower(guild, req.user.id, req.user.role))) {
      return res.status(403).json({ error: 'Only leaders, sub-leaders, and admins can manage tower defenses' });
    }

    // Verify the defense exists and belongs to this guild
    const defense = await Defense.findByPk(defenseId);
    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }
    if (defense.guildId !== parseInt(guildId)) {
      return res.status(403).json({ error: 'Defense does not belong to this guild' });
    }

    // Check 4-star restriction for towers 2, 7, 11
    if (is4StarTower(towerId) && !isDefenseValid4Star(defense)) {
      return res.status(400).json({ error: 'Cette tour n\'accepte que des défenses avec des monstres 4★ maximum' });
    }

    // Find or create the tower
    let tower = await Tower.findOne({ where: { guildId, towerId } });
    if (!tower) {
      tower = await Tower.create({
        towerId,
        guildId
      });
    }

    // Check if defense is already in the tower
    const existingTd = await TowerDefense.findOne({ where: { towerId: tower.id, defenseId } });
    if (existingTd) {
      return res.status(400).json({ error: 'Defense is already assigned to this tower' });
    }

    // Check max defenses per tower
    const currentCount = await TowerDefense.count({ where: { towerId: tower.id } });
    if (currentCount >= MAX_DEFENSES_PER_TOWER) {
      return res.status(400).json({ error: `Maximum ${MAX_DEFENSES_PER_TOWER} défenses par tour` });
    }

    await TowerDefense.create({ towerId: tower.id, defenseId });

    // Reload and return the updated tower
    const populatedTower = await Tower.findByPk(tower.id, {
      include: towerDefenseInclude
    });

    res.json({
      message: 'Defense added to tower',
      tower: {
        ...populatedTower.toJSON(),
        defenses: formatTowerDefenses(populatedTower)
      }
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

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (!(await canManageTower(guild, req.user.id, req.user.role))) {
      return res.status(403).json({ error: 'Only leaders, sub-leaders, and admins can manage tower defenses' });
    }

    // Verify the defense exists and belongs to this guild
    const defense = await Defense.findByPk(defenseId);
    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }
    if (defense.guildId !== parseInt(guildId)) {
      return res.status(403).json({ error: 'Defense does not belong to this guild' });
    }

    // Check 4-star restriction for towers 2, 7, 11
    if (is4StarTower(towerId) && !isDefenseValid4Star(defense)) {
      return res.status(400).json({ error: 'Cette tour n\'accepte que des défenses avec des monstres 4★ maximum' });
    }

    // Find or create the tower
    let tower = await Tower.findOne({ where: { guildId, towerId } });
    if (!tower) {
      tower = await Tower.create({
        towerId,
        guildId
      });
    }

    // Fill with the same defense ID up to MAX_DEFENSES_PER_TOWER
    const currentCount = await TowerDefense.count({ where: { towerId: tower.id } });
    const slotsToFill = MAX_DEFENSES_PER_TOWER - currentCount;

    if (slotsToFill <= 0) {
      return res.status(400).json({ error: 'La tour est déjà pleine' });
    }

    // Add the defense ID multiple times
    const rows = [];
    for (let i = 0; i < slotsToFill; i++) {
      rows.push({ towerId: tower.id, defenseId });
    }
    await TowerDefense.bulkCreate(rows);

    // Reload and return the updated tower
    const populatedTower = await Tower.findByPk(tower.id, {
      include: towerDefenseInclude
    });

    res.json({
      message: `Tour remplie avec ${slotsToFill} défenses`,
      addedCount: slotsToFill,
      tower: {
        ...populatedTower.toJSON(),
        defenses: formatTowerDefenses(populatedTower)
      }
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

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (!(await canManageTower(guild, req.user.id, req.user.role))) {
      return res.status(403).json({ error: 'Only leaders, sub-leaders, and admins can manage tower defenses' });
    }

    const tower = await Tower.findOne({ where: { guildId, towerId } });
    if (!tower) {
      return res.status(404).json({ error: 'Tower not found' });
    }

    // Get all TowerDefense rows ordered by id to determine index
    const towerDefenses = await TowerDefense.findAll({
      where: { towerId: tower.id },
      order: [['id', 'ASC']]
    });

    if (defenseIndex < 0 || defenseIndex >= towerDefenses.length) {
      return res.status(400).json({ error: 'Invalid defense index' });
    }

    // Destroy the row at the given index
    await towerDefenses[defenseIndex].destroy();

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

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    if (!(await canManageTower(guild, req.user.id, req.user.role))) {
      return res.status(403).json({ error: 'Only leaders, sub-leaders, and admins can update tower memo' });
    }

    // Find or create the tower
    let tower = await Tower.findOne({ where: { guildId, towerId } });
    if (!tower) {
      tower = await Tower.create({
        towerId,
        guildId,
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

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of the guild
    const isMember = await isGuildMember(guild, req.user.id, req.user.role);

    if (!isMember) {
      return res.status(403).json({ error: 'You must be a member of this guild to view towers' });
    }

    const towers = await Tower.findAll({
      where: { guildId },
      include: towerDefenseInclude
    });

    // Format towers to include flat defenses array
    const formattedTowers = towers.map(tower => ({
      ...tower.toJSON(),
      defenses: formatTowerDefenses(tower)
    }));

    res.json({ towers: formattedTowers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
