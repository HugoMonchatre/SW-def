import express from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Guild, User, Defense, Monster, GuildMember, GuildSubLeader, OffenseDefense } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

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

// Delete a defense
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const defense = await Defense.findByPk(req.params.id);

    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    // Check if user is the creator, guild leader, or admin
    const guild = await Guild.findByPk(defense.guildId);
    const isCreator = defense.createdById === req.user.id;
    const isLeader = guild.leaderId === req.user.id;

    if (!isCreator && !isLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this defense' });
    }

    await defense.destroy();

    res.json({ message: 'Defense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
