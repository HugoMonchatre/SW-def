import express from 'express';
import { Op } from 'sequelize';
import { Guild, User, Defense, Offense, Monster, GuildMember, GuildSubLeader, OffenseDefense } from '../models/index.js';
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

// Get all offenses for a defense
router.get('/defense/:defenseId', authenticate, async (req, res) => {
  try {
    const { defenseId } = req.params;

    // Find offense IDs linked to this defense via the junction table
    const offenseLinks = await OffenseDefense.findAll({
      where: { defenseId }
    });
    const offenseIds = offenseLinks.map(l => l.offenseId);

    if (offenseIds.length === 0) {
      return res.json({ offenses: [] });
    }

    const offenses = await Offense.findAll({
      where: { id: { [Op.in]: offenseIds } },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: Defense,
          as: 'defenses',
          attributes: ['id', 'name', 'monsters']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ offenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all offenses for a guild (for reuse)
router.get('/guild/:guildId', authenticate, async (req, res) => {
  try {
    const { guildId } = req.params;
    const { excludeDefenseId } = req.query;

    const guild = await Guild.findByPk(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Verify user is in the guild
    const isLeader = guild.leaderId === req.user.id;

    const isSubLeader = await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    const isMember = await GuildMember.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    if (!isLeader && !isSubLeader && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only guild members can view offenses' });
    }

    let whereClause = { guildId };

    // Optionally exclude offenses already linked to a specific defense
    if (excludeDefenseId) {
      const linkedOffenseLinks = await OffenseDefense.findAll({
        where: { defenseId: excludeDefenseId }
      });
      const excludeOffenseIds = linkedOffenseLinks.map(l => l.offenseId);

      if (excludeOffenseIds.length > 0) {
        whereClause.id = { [Op.notIn]: excludeOffenseIds };
      }
    }

    const offenses = await Offense.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: Defense,
          as: 'defenses',
          attributes: ['id', 'name', 'monsters']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ offenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create an offense
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, defenseId, monsters, generalInstructions } = req.body;

    // Verify defense exists
    const defense = await Defense.findByPk(defenseId);
    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    // Verify user is in the guild
    const guild = await Guild.findByPk(defense.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const isLeader = guild.leaderId === req.user.id;

    const isSubLeader = await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    const isMember = await GuildMember.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    if (!isLeader && !isSubLeader && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only guild members can create offenses' });
    }

    // Validate monsters
    if (!monsters || monsters.length !== 3) {
      return res.status(400).json({ error: 'An offense must have exactly 3 monsters' });
    }

    const offense = await Offense.create({
      name,
      guildId: defense.guildId,
      createdById: req.user.id,
      monsters,
      generalInstructions: generalInstructions || '',
      votesUp: 0,
      votesDown: 0
    });

    // Link offense to the defense via junction table
    await OffenseDefense.create({
      offenseId: offense.id,
      defenseId
    });

    const populatedOffense = await Offense.findByPk(offense.id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: Defense,
          as: 'defenses',
          attributes: ['id', 'name', 'monsters']
        }
      ]
    });

    res.status(201).json({
      message: 'Offense created successfully',
      offense: populatedOffense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Link an existing offense to a defense
router.post('/:id/link', authenticate, async (req, res) => {
  try {
    const { defenseId } = req.body;
    const offense = await Offense.findByPk(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Verify defense exists and is in the same guild
    const defense = await Defense.findByPk(defenseId);
    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    if (offense.guildId !== defense.guildId) {
      return res.status(400).json({ error: 'Defense must be in the same guild' });
    }

    // Check if already linked
    const existingLink = await OffenseDefense.findOne({
      where: { offenseId: offense.id, defenseId }
    });
    if (existingLink) {
      return res.status(400).json({ error: 'Offense is already linked to this defense' });
    }

    // Verify user is in the guild
    const guild = await Guild.findByPk(offense.guildId);
    const isLeader = guild.leaderId === req.user.id;

    const isSubLeader = await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    const isMember = await GuildMember.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    });

    if (!isLeader && !isSubLeader && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only guild members can link offenses' });
    }

    await OffenseDefense.create({
      offenseId: offense.id,
      defenseId
    });

    const populatedOffense = await Offense.findByPk(offense.id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: Defense,
          as: 'defenses',
          attributes: ['id', 'name', 'monsters']
        }
      ]
    });

    res.json({
      message: 'Offense linked successfully',
      offense: populatedOffense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unlink an offense from a defense
router.post('/:id/unlink', authenticate, async (req, res) => {
  try {
    const { defenseId } = req.body;
    const offense = await Offense.findByPk(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Check permission
    const guild = await Guild.findByPk(offense.guildId);
    const isCreator = offense.createdById === req.user.id;
    const isLeader = guild?.leaderId === req.user.id;

    const isSubLeader = guild ? await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    }) : null;

    if (!isCreator && !isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to unlink this offense' });
    }

    // Remove the link from the junction table
    await OffenseDefense.destroy({
      where: { offenseId: offense.id, defenseId }
    });

    // Check remaining links
    const remaining = await OffenseDefense.count({
      where: { offenseId: offense.id }
    });

    const populatedOffense = await Offense.findByPk(offense.id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: Defense,
          as: 'defenses',
          attributes: ['id', 'name', 'monsters']
        }
      ]
    });

    res.json({
      message: 'Offense unlinked successfully',
      offense: populatedOffense,
      deleted: remaining === 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an offense
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, monsters, generalInstructions } = req.body;
    const offense = await Offense.findByPk(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Check permission
    const guild = await Guild.findByPk(offense.guildId);
    const isCreator = offense.createdById === req.user.id;
    const isLeader = guild?.leaderId === req.user.id;

    const isSubLeader = guild ? await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    }) : null;

    if (!isCreator && !isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this offense' });
    }

    if (name) offense.name = name;
    if (monsters && monsters.length === 3) offense.monsters = monsters;
    if (generalInstructions !== undefined) offense.generalInstructions = generalInstructions;

    await offense.save();

    const populatedOffense = await Offense.findByPk(offense.id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'name', 'avatar']
        },
        {
          model: Defense,
          as: 'defenses',
          attributes: ['id', 'name', 'monsters']
        }
      ]
    });

    res.json({
      message: 'Offense updated successfully',
      offense: populatedOffense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an offense
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const offense = await Offense.findByPk(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Check permission
    const guild = await Guild.findByPk(offense.guildId);
    const isCreator = offense.createdById === req.user.id;
    const isLeader = guild?.leaderId === req.user.id;

    const isSubLeader = guild ? await GuildSubLeader.findOne({
      where: { guildId: guild.id, userId: req.user.id }
    }) : null;

    if (!isCreator && !isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this offense' });
    }

    await offense.destroy();

    res.json({ message: 'Offense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vote on an offense (increment or decrement up/down counter)
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const { voteType } = req.body; // 'up', 'down', 'decrement_up', 'decrement_down'
    const offense = await Offense.findByPk(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Initialize votes if they are null
    if (typeof offense.votesUp !== 'number') offense.votesUp = 0;
    if (typeof offense.votesDown !== 'number') offense.votesDown = 0;

    // Handle the vote action
    if (voteType === 'up') {
      offense.votesUp += 1;
    } else if (voteType === 'down') {
      offense.votesDown += 1;
    } else if (voteType === 'decrement_up') {
      offense.votesUp = Math.max(0, offense.votesUp - 1);
    } else if (voteType === 'decrement_down') {
      offense.votesDown = Math.max(0, offense.votesDown - 1);
    }

    await offense.save();

    res.json({
      message: 'Vote recorded',
      votes: {
        up: offense.votesUp,
        down: offense.votesDown,
        score: offense.votesUp - offense.votesDown
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
