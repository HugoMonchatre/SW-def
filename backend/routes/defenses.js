import express from 'express';
import axios from 'axios';
import Defense from '../models/Defense.js';
import Offense from '../models/Offense.js';
import Guild from '../models/Guild.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const SWARFARM_API = 'https://swarfarm.com/api/v2';

// Proxy for SWARFARM monster search (to avoid CORS issues)
router.get('/monsters/search', authenticate, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 1) {
      return res.json({ results: [] });
    }

    const url = `${SWARFARM_API}/monsters/?name=${encodeURIComponent(query)}&page_size=20`;
    const response = await axios.get(url);

    if (response.data.results && response.data.results.length > 0) {
      // leader_skill is already an object in the API response, no need to fetch separately
      const results = response.data.results.map(m => ({
        name: m.name,
        image: `https://swarfarm.com/static/herders/images/monsters/${m.image_filename}`,
        element: m.element,
        archetype: m.archetype,
        natural_stars: m.natural_stars,
        awaken_level: m.awaken_level,
        leader_skill: m.leader_skill ? {
          id: m.leader_skill.id,
          attribute: m.leader_skill.attribute,
          amount: m.leader_skill.amount,
          area: m.leader_skill.area,
          element: m.leader_skill.element
        } : null,
        com2us_id: m.com2us_id,
        image_filename: m.image_filename
      }));
      return res.json({ results });
    }

    res.json({ results: [] });
  } catch (error) {
    console.error('Error searching monsters:', error.message);
    res.status(500).json({ error: 'Failed to search monsters' });
  }
});

// Proxy for SWARFARM leader skill fetch
router.get('/leader-skills/:id', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${SWARFARM_API}/leader-skills/${req.params.id}/`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching leader skill:', error.message);
    res.status(500).json({ error: 'Failed to fetch leader skill' });
  }
});

// Get all defenses for user's guild
router.get('/guild/:guildId', authenticate, async (req, res) => {
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
      return res.status(403).json({ error: 'You must be a member of this guild to view defenses' });
    }

    const defenses = await Defense.find({ guild: guildId })
      .populate('createdBy', 'name username avatar')
      .sort({ position: 1, createdAt: -1 });

    // Get offense counts for each defense
    const defenseIds = defenses.map(d => d._id);
    const offenseCounts = await Offense.aggregate([
      { $match: { defenses: { $in: defenseIds } } },
      { $unwind: '$defenses' },
      { $match: { defenses: { $in: defenseIds } } },
      { $group: { _id: '$defenses', count: { $sum: 1 } } }
    ]);

    // Create a map of defense ID to offense count
    const countMap = {};
    offenseCounts.forEach(item => {
      countMap[item._id.toString()] = item.count;
    });

    // Add offense count to each defense
    const defensesWithCounts = defenses.map(defense => ({
      ...defense.toObject(),
      offenseCount: countMap[defense._id.toString()] || 0
    }));

    res.json({ defenses: defensesWithCounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new defense
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, guildId, monsters } = req.body;

    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Check if user is a member of the guild
    const isMember = guild.members.some(m => m.toString() === req.user._id.toString()) ||
                     guild.subLeaders.some(s => s.toString() === req.user._id.toString()) ||
                     guild.leader.toString() === req.user._id.toString();

    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You must be a member of this guild to create a defense' });
    }

    if (!monsters || monsters.length !== 3) {
      return res.status(400).json({ error: 'A defense must have exactly 3 monsters' });
    }

    const defense = await Defense.create({
      name,
      guild: guildId,
      createdBy: req.user._id,
      monsters
    });

    const populatedDefense = await Defense.findById(defense._id)
      .populate('createdBy', 'name username avatar');

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
    const defense = await Defense.findById(req.params.id);

    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    // Check if user is the creator, guild leader, sub-leader, or admin
    const guild = await Guild.findById(defense.guild);
    const isCreator = defense.createdBy.toString() === req.user._id.toString();
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(s => s.toString() === req.user._id.toString());

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

    const populatedDefense = await Defense.findById(defense._id)
      .populate('createdBy', 'name username avatar');

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
    const defense = await Defense.findById(req.params.id);

    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    // Check if user is the creator, guild leader, or admin
    const guild = await Guild.findById(defense.guild);
    const isCreator = defense.createdBy.toString() === req.user._id.toString();
    const isLeader = guild.leader.toString() === req.user._id.toString();

    if (!isCreator && !isLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this defense' });
    }

    await defense.deleteOne();

    res.json({ message: 'Defense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
