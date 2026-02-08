import express from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Guild, User, Defense, Monster, GuildMember, GuildSubLeader, OffenseDefense } from '../models/index.js';
import { authenticate, parseId } from '../middleware/auth.js';

const router = express.Router();

router.param('id', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid ID' });
  req.params.id = id;
  next();
});
router.param('guildId', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid guild ID' });
  req.params.guildId = id;
  next();
});

// Search monsters from local database
router.get('/monsters/search', authenticate, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 1) {
      return res.json({ results: [] });
    }

    const monsters = await Monster.findAll({
      where: {
        name: { [Op.like]: `%${query}%` },
        obtainable: true
      },
      order: [['natural_stars', 'DESC'], ['name', 'ASC']],
      limit: 20
    });

    res.json({ results: monsters });
  } catch (error) {
    console.error('Error searching monsters:', error.message);
    res.status(500).json({ error: 'Failed to search monsters' });
  }
});

// Get leader skill by monster com2us_id
router.get('/leader-skills/:id', authenticate, async (req, res) => {
  try {
    const monster = await Monster.findOne({ where: { com2us_id: req.params.id } });
    if (!monster || !monster.leader_skill) {
      return res.json({});
    }
    res.json(monster.leader_skill);
  } catch (error) {
    console.error('Error fetching leader skill:', error.message);
    res.status(500).json({ error: 'Failed to fetch leader skill' });
  }
});

// Get all defenses for a guild
router.get('/guild/:guildId', authenticate, async (req, res) => {
  try {
    const { guildId } = req.params;

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of the guild
    const isLeader = guild.leaderId === req.user.id;

    const isSubLeader = await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    const isMember = await GuildMember.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    if (!isLeader && !isSubLeader && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You must be a member of this guild to view defenses' });
    }

    const defenses = await Defense.findAll({
      where: { guildId },
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name', 'username', 'avatar']
      }],
      order: [['position', 'ASC'], ['createdAt', 'DESC']]
    });

    // Get offense counts for each defense
    const defenseIds = defenses.map(d => d.id);

    let countMap = {};
    if (defenseIds.length > 0) {
      const offenseCounts = await OffenseDefense.findAll({
        where: { defenseId: { [Op.in]: defenseIds } },
        attributes: [
          'defenseId',
          [sequelize.fn('COUNT', sequelize.col('offense_id')), 'count']
        ],
        group: ['defenseId']
      });

      offenseCounts.forEach(item => {
        countMap[item.defenseId] = parseInt(item.getDataValue('count'), 10);
      });
    }

    // Add offense count to each defense
    const defensesWithCounts = defenses.map(defense => {
      const defenseJson = defense.toJSON();
      defenseJson.offenseCount = countMap[defense.id] || 0;
      return defenseJson;
    });

    res.json({ defenses: defensesWithCounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new defense
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, guildId, monsters } = req.body;

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of the guild
    const isLeader = guild.leaderId === req.user.id;

    const isSubLeader = await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    const isMember = await GuildMember.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    if (!isLeader && !isSubLeader && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You must be a member of this guild to create a defense' });
    }

    if (!monsters || monsters.length !== 3) {
      return res.status(400).json({ error: 'A defense must have exactly 3 monsters' });
    }

    // Check for duplicate defense (same 3 monsters regardless of order)
    const newIds = monsters.map(m => m.com2us_id).sort().join(',');
    const existingDefenses = await Defense.findAll({ where: { guildId } });
    const duplicate = existingDefenses.find(d => {
      const existingIds = (d.monsters || []).map(m => m.com2us_id).sort().join(',');
      return existingIds === newIds;
    });
    if (duplicate) {
      return res.status(409).json({ error: `Une défense identique existe déjà : "${duplicate.name}"` });
    }

    const defense = await Defense.create({
      name,
      guildId,
      createdById: req.user.id,
      monsters
    });

    const populatedDefense = await Defense.findByPk(defense.id, {
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name', 'username', 'avatar']
      }]
    });

    res.status(201).json({
      message: 'Defense created successfully',
      defense: populatedDefense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a defense
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, monsters, position } = req.body;
    const defense = await Defense.findByPk(req.params.id);

    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    // Check if user is the creator, guild leader, sub-leader, or admin
    const guild = await Guild.findByPk(defense.guildId);
    const isCreator = defense.createdById === req.user.id;
    const isLeader = guild.leaderId === req.user.id;

    const isSubLeader = await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    if (!isCreator && !isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to update this defense' });
    }

    if (name) defense.name = name;
    if (monsters) {
      if (monsters.length !== 3) {
        return res.status(400).json({ error: 'A defense must have exactly 3 monsters' });
      }

      // Check for duplicate defense (excluding current one)
      const newIds = monsters.map(m => m.com2us_id).sort().join(',');
      const existingDefenses = await Defense.findAll({
        where: { guildId: defense.guildId, id: { [Op.ne]: defense.id } }
      });
      const duplicate = existingDefenses.find(d => {
        const existingIds = (d.monsters || []).map(m => m.com2us_id).sort().join(',');
        return existingIds === newIds;
      });
      if (duplicate) {
        return res.status(409).json({ error: `Une défense identique existe déjà : "${duplicate.name}"` });
      }

      defense.monsters = monsters;
    }
    if (position !== undefined) defense.position = position;

    await defense.save();

    const populatedDefense = await Defense.findByPk(defense.id, {
      include: [{
        model: User,
        as: 'createdBy',
        attributes: ['id', 'name', 'username', 'avatar']
      }]
    });

    res.json({
      message: 'Defense updated successfully',
      defense: populatedDefense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check which guild members can make a defense (from their swData)
router.post('/guild/:guildId/check-players', authenticate, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { monsters } = req.body;

    if (!monsters || !Array.isArray(monsters) || monsters.length === 0) {
      return res.status(400).json({ error: 'Liste de monstres requise' });
    }

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guilde non trouvée' });
    }

    // Get all guild member user IDs
    const memberRows = await GuildMember.findAll({ where: { guildId }, attributes: ['userId'] });
    const subLeaderRows = await GuildSubLeader.findAll({ where: { guildId }, attributes: ['userId'] });
    const memberIds = [
      guild.leaderId,
      ...subLeaderRows.map(r => r.userId),
      ...memberRows.map(r => r.userId)
    ];
    const uniqueIds = [...new Set(memberIds)];

    // Get users with swData
    const users = await User.findAll({
      where: { id: { [Op.in]: uniqueIds }, swData: { [Op.ne]: null } },
      attributes: ['id', 'name', 'username', 'swData']
    });

    const monsterIds = monsters.map(m => m.com2us_id);
    const compatiblePlayers = [];
    const partialPlayers = [];
    let membersWithUnits = 0;

    for (const user of users) {
      const units = user.swData.units;
      if (!units || !Array.isArray(units) || units.length === 0) continue;
      membersWithUnits++;

      const unitSet = new Set(units);
      const hasMonsters = monsterIds.map(id => unitSet.has(id));
      const matchCount = hasMonsters.filter(Boolean).length;

      const displayName = user.username || user.name;

      if (matchCount === monsterIds.length) {
        compatiblePlayers.push({ name: displayName });
      } else if (matchCount > 0) {
        const missingMonsters = monsters
          .filter((_, i) => !hasMonsters[i])
          .map(m => m.name);
        partialPlayers.push({ name: displayName, matchCount, missingMonsters });
      }
    }

    partialPlayers.sort((a, b) => b.matchCount - a.matchCount);

    res.json({
      compatiblePlayers,
      partialPlayers: partialPlayers.slice(0, 10),
      membersWithData: users.length,
      membersWithUnits
    });
  } catch (error) {
    console.error('Error checking players:', error);
    res.status(500).json({ error: 'Erreur lors de la vérification des joueurs' });
  }
});

// Delete a defense
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const defense = await Defense.findByPk(req.params.id);

    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    // Check if user is the creator, guild leader, sub-leader, or admin
    const guild = await Guild.findByPk(defense.guildId);
    const isCreator = defense.createdById === req.user.id;
    const isLeader = guild.leaderId === req.user.id;
    const isSubLeader = await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    if (!isCreator && !isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this defense' });
    }

    await defense.destroy();

    res.json({ message: 'Defense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
