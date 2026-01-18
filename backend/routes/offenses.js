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
    const offenses = await Offense.find({ defense: req.params.defenseId })
      .populate('createdBy', 'name avatar')
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
      defense: defenseId,
      guild: defense.guild,
      createdBy: req.user._id,
      monsters,
      generalInstructions: generalInstructions || '',
      votes: { up: [], down: [] }
    });

    await offense.save();

    const populatedOffense = await Offense.findById(offense._id)
      .populate('createdBy', 'name avatar');

    res.status(201).json({
      message: 'Offense created successfully',
      offense: populatedOffense
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
      .populate('createdBy', 'name avatar');

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

// Vote on an offense
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const { voteType } = req.body; // 'up', 'down', or 'none'
    const offense = await Offense.findById(req.params.id);

    if (!offense) {
      return res.status(404).json({ error: 'Offense not found' });
    }

    const userId = req.user._id.toString();

    // Remove existing votes
    offense.votes.up = offense.votes.up.filter(id => id.toString() !== userId);
    offense.votes.down = offense.votes.down.filter(id => id.toString() !== userId);

    // Add new vote
    if (voteType === 'up') {
      offense.votes.up.push(req.user._id);
    } else if (voteType === 'down') {
      offense.votes.down.push(req.user._id);
    }

    await offense.save();

    res.json({
      message: 'Vote recorded',
      votes: {
        up: offense.votes.up.length,
        down: offense.votes.down.length,
        score: offense.votes.up.length - offense.votes.down.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
