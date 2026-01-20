import express from 'express';
import Offense from '../models/Offense.js';
import Defense from '../models/Defense.js';
import Guild from '../models/Guild.js';
import { authenticate } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

const SWARFARM_API = 'https://swarfarm.com/api/v2';

// Search monsters (reuse from defenses)
router.get('/monsters/search', authenticate, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 1) {
      return res.json({ results: [] });
    }

    const url = `${SWARFARM_API}/monsters/?name=${encodeURIComponent(query)}&page_size=20`;
    const response = await axios.get(url);

    if (response.data.results && response.data.results.length > 0) {
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

// Get all offenses for a defense
router.get('/defense/:defenseId', authenticate, async (req, res) => {
  try {
    const offenses = await Offense.find({ defenses: req.params.defenseId })
      .populate('createdBy', 'name avatar')
      .populate('defenses', 'name monsters')
      .sort({ createdAt: -1 });

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

    const guild = await Guild.findById(guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    // Verify user is in the guild
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());
    const isMember = guild.members.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only guild members can view offenses' });
    }

    let query = { guild: guildId };

    // Optionally exclude offenses already linked to a specific defense
    if (excludeDefenseId) {
      query.defenses = { $ne: excludeDefenseId };
    }

    const offenses = await Offense.find(query)
      .populate('createdBy', 'name avatar')
      .populate('defenses', 'name monsters')
      .sort({ createdAt: -1 });

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
    const defense = await Defense.findById(defenseId);
    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    // Verify user is in the guild
    const guild = await Guild.findById(defense.guild);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());
    const isMember = guild.members.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only guild members can create offenses' });
    }

    // Validate monsters
    if (!monsters || monsters.length !== 3) {
      return res.status(400).json({ error: 'An offense must have exactly 3 monsters' });
    }

    const offense = new Offense({
      name,
      defenses: [defenseId],
      guild: defense.guild,
      createdBy: req.user._id,
      monsters,
      generalInstructions: generalInstructions || '',
      votes: { up: 0, down: 0 }
    });

    await offense.save();

    const populatedOffense = await Offense.findById(offense._id)
      .populate('createdBy', 'name avatar')
      .populate('defenses', 'name monsters');

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
    const offense = await Offense.findById(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Verify defense exists and is in the same guild
    const defense = await Defense.findById(defenseId);
    if (!defense) {
      return res.status(404).json({ error: 'Defense not found' });
    }

    if (offense.guild.toString() !== defense.guild.toString()) {
      return res.status(400).json({ error: 'Defense must be in the same guild' });
    }

    // Check if already linked
    if (offense.defenses.some(d => d.toString() === defenseId)) {
      return res.status(400).json({ error: 'Offense is already linked to this defense' });
    }

    // Verify user is in the guild
    const guild = await Guild.findById(offense.guild);
    const isLeader = guild.leader.toString() === req.user._id.toString();
    const isSubLeader = guild.subLeaders.some(id => id.toString() === req.user._id.toString());
    const isMember = guild.members.some(id => id.toString() === req.user._id.toString());

    if (!isLeader && !isSubLeader && !isMember && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only guild members can link offenses' });
    }

    offense.defenses.push(defenseId);
    await offense.save();

    const populatedOffense = await Offense.findById(offense._id)
      .populate('createdBy', 'name avatar')
      .populate('defenses', 'name monsters');

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
    const offense = await Offense.findById(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Check permission
    const guild = await Guild.findById(offense.guild);
    const isCreator = offense.createdBy.toString() === req.user._id.toString();
    const isLeader = guild?.leader.toString() === req.user._id.toString();
    const isSubLeader = guild?.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isCreator && !isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to unlink this offense' });
    }

    // Remove the defense from the array
    offense.defenses = offense.defenses.filter(d => d.toString() !== defenseId);
    await offense.save();

    const populatedOffense = await Offense.findById(offense._id)
      .populate('createdBy', 'name avatar')
      .populate('defenses', 'name monsters');

    res.json({
      message: 'Offense unlinked successfully',
      offense: populatedOffense,
      deleted: offense.defenses.length === 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update an offense
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { name, monsters, generalInstructions } = req.body;
    const offense = await Offense.findById(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Check permission
    const guild = await Guild.findById(offense.guild);
    const isCreator = offense.createdBy.toString() === req.user._id.toString();
    const isLeader = guild?.leader.toString() === req.user._id.toString();
    const isSubLeader = guild?.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isCreator && !isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this offense' });
    }

    if (name) offense.name = name;
    if (monsters && monsters.length === 3) offense.monsters = monsters;
    if (generalInstructions !== undefined) offense.generalInstructions = generalInstructions;

    await offense.save();

    const populatedOffense = await Offense.findById(offense._id)
      .populate('createdBy', 'name avatar')
      .populate('defenses', 'name monsters');

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
    const offense = await Offense.findById(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Check permission
    const guild = await Guild.findById(offense.guild);
    const isCreator = offense.createdBy.toString() === req.user._id.toString();
    const isLeader = guild?.leader.toString() === req.user._id.toString();
    const isSubLeader = guild?.subLeaders.some(id => id.toString() === req.user._id.toString());

    if (!isCreator && !isLeader && !isSubLeader && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this offense' });
    }

    await offense.deleteOne();

    res.json({ message: 'Offense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vote on an offense (increment or decrement up/down counter)
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const { voteType } = req.body; // 'up', 'down', 'decrement_up', 'decrement_down'
    const offense = await Offense.findById(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    // Initialize votes if they don't exist
    if (typeof offense.votes.up !== 'number') offense.votes.up = 0;
    if (typeof offense.votes.down !== 'number') offense.votes.down = 0;

    // Handle the vote action
    if (voteType === 'up') {
      offense.votes.up += 1;
    } else if (voteType === 'down') {
      offense.votes.down += 1;
    } else if (voteType === 'decrement_up') {
      offense.votes.up = Math.max(0, offense.votes.up - 1);
    } else if (voteType === 'decrement_down') {
      offense.votes.down = Math.max(0, offense.votes.down - 1);
    }

    await offense.save();

    res.json({
      message: 'Vote recorded',
      votes: {
        up: offense.votes.up,
        down: offense.votes.down,
        score: offense.votes.up - offense.votes.down
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
