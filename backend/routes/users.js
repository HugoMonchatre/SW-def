import express from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import Monster from '../models/Monster.js';
import { authenticate, authorize, parseId } from '../middleware/auth.js';
import { computeBestRuneSetsAsync } from '../services/runWorker.js';
import { computeRuneEfficiency } from '../services/runeCalculator.js';
import { validate, swDataSchema, profileSchema, passwordSchema, themeSchema } from '../middleware/validate.js';
import SwData from '../models/SwData.js';

const router = express.Router();

router.param('id', (req, res, next, val) => {
  const id = parseId(val);
  if (id === null) return res.status(400).json({ error: 'Invalid ID' });
  req.params.id = id;
  next();
});

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available users for guild (guild_leader or admin)
router.get('/available-for-guild', authenticate, authorize('guild_leader', 'admin'), async (req, res) => {
  try {
    // Get users who are not in any guild
    const users = await User.findAll({
      where: { guildId: null, isActive: true },
      order: [['name', 'ASC']]
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only admin or the user themselves can view
    if (req.user.role !== 'admin' && req.user.id !== user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (admin only)
router.patch('/:id/role', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'guild_leader', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent changing own role
    if (req.user.id === user.id) {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user status (admin only)
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deactivating own account
    if (req.user.id === user.id) {
      return res.status(403).json({ error: 'Cannot deactivate your own account' });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: 'User status updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update own profile (username, avatar)
router.patch('/me/profile', authenticate, validate(profileSchema), async (req, res) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update username if provided
    if (username !== undefined) {
      // Check if username is already taken by another user
      if (username !== user.username) {
        const existingUser = await User.findOne({
          where: { username, id: { [Op.ne]: user.id } }
        });
        if (existingUser) {
          return res.status(400).json({ error: 'Username already taken' });
        }
        user.username = username;
      }
    }

    // Update avatar if provided
    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update own theme preference
router.patch('/me/theme', authenticate, validate(themeSchema), async (req, res) => {
  try {
    const { theme } = req.body;
    if (!['light', 'dark'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme. Must be "light" or "dark".' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.theme = theme;
    await user.save();

    res.json({ message: 'Theme updated', theme: user.theme });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update own password (email provider only)
router.patch('/me/password', authenticate, validate(passwordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user registered with email (not OAuth)
    if (user.provider !== 'email') {
      return res.status(400).json({ error: 'Cannot change password for OAuth accounts' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload SW JSON data
router.post('/me/sw-data', authenticate, validate(swDataSchema), async (req, res) => {
  try {
    const { jsonData } = req.body;

    const wizardInfo = jsonData.wizard_info;

    // Extract essential data only
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count units and runes if available
    const unitCount = jsonData.unit_list ? jsonData.unit_list.length : 0;

    // Collect all runes (inventory + equipped)
    let allRunes = jsonData.runes || [];
    if (jsonData.unit_list) {
      jsonData.unit_list.forEach(unit => {
        if (unit.runes && Array.isArray(unit.runes)) {
          allRunes = allRunes.concat(unit.runes);
        }
      });
    }
    const runeCount = allRunes.length;

    const bestRuneSets = await computeBestRuneSetsAsync(allRunes);

    // Compute efficiency stats
    const efficiencies = allRunes.map(r => computeRuneEfficiency(r));
    const efficiencyStats = {
      total: allRunes.length,
      above100: efficiencies.filter(e => e >= 100).length,
      above105: efficiencies.filter(e => e >= 105).length,
      above110: efficiencies.filter(e => e >= 110).length,
      above115: efficiencies.filter(e => e >= 115).length,
      above120: efficiencies.filter(e => e >= 120).length,
    };

    // Extract unit com2us_ids for monster ownership checks
    const unitList = jsonData.unit_list || [];
    const unitIds = [...new Set(unitList.map(u => u.unit_master_id))];

    // All LD units lvl40 (attribute 4=light, 5=dark) — categorization done at GET time via Monster DB
    const ldMap = new Map();
    unitList.filter(u => (u.attribute === 4 || u.attribute === 5) && u.unit_level === 40)
      .forEach(u => ldMap.set(u.unit_master_id, (ldMap.get(u.unit_master_id) || 0) + 1));
    const fiveStarLD = Array.from(ldMap.entries()).map(([id, count]) => ({ com2us_id: id, count }));

    // Dupe 4-star elemental lvl40 (class >= 4, attribute 1-3, count > 1)
    const fourStarElemMap = new Map();
    unitList.filter(u => u.class >= 4 && u.attribute >= 1 && u.attribute <= 3 && u.unit_level === 40)
      .forEach(u => fourStarElemMap.set(u.unit_master_id, (fourStarElemMap.get(u.unit_master_id) || 0) + 1));
    const fourStarElemDupes = Array.from(fourStarElemMap.entries())
      .filter(([_, cnt]) => cnt > 1)
      .map(([id, count]) => ({ com2us_id: id, count }));

    // Upload history for sparklines (keep last 10)
    const existing = await SwData.findOne({ where: { userId: req.user.id } });
    const prevHistory = existing?.history || [];
    const history = [...prevHistory.slice(-9), { date: new Date().toISOString(), runeCount, artefactCount: jsonData.artifacts?.length || 0 }];

    const SERVER_NAMES = { 1: 'Global', 2: 'Asia', 3: 'Korea', 4: 'Japan', 5: 'China', 6: 'Europe' };
    const server = SERVER_NAMES[jsonData.this_server_id] || (jsonData.country || wizardInfo.wizard_last_country || '?');

    // Resolve representative unit image (profile monster)
    let repUnitImage = null;
    const repUnitId = wizardInfo.rep_unit_id;
    if (repUnitId) {
      const repUnit = unitList.find(u => u.unit_id === repUnitId);
      if (repUnit) {
        const repMonster = await Monster.findOne({ where: { com2us_id: repUnit.unit_master_id } });
        if (repMonster?.image_filename) {
          repUnitImage = `https://swarfarm.com/static/herders/images/monsters/${repMonster.image_filename}`;
        }
      }
    }

    const [swRecord] = await SwData.upsert({
      userId:           req.user.id,
      wizardId:         wizardInfo.wizard_id,
      wizardName:       wizardInfo.wizard_name,
      wizardLevel:      wizardInfo.wizard_level || 0,
      server,
      lastUpload:       new Date(),
      unitCount,
      runeCount,
      bestRuneSets,
      units:            unitIds,
      fiveStarLD,
      fourStarElemDupes,
      history,
      repUnitImage,
      efficiencyStats,
    });

    res.json({ message: 'SW data uploaded successfully', swData: swRecord });
  } catch (error) {
    console.error('SW Data upload error:', error);
    res.status(500).json({ error: 'Error processing SW data' });
  }
});

// Get my SW data
router.get('/me/sw-data', authenticate, async (req, res) => {
  try {
    const swData = await SwData.findOne({ where: { userId: req.user.id } });
    res.json({ swData: swData || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my categorized monsters (5*LD, 4*LD, dupe 4* elem)
router.get('/me/monsters', authenticate, async (req, res) => {
  try {
    const swData = await SwData.findOne({ where: { userId: req.user.id } });
    if (!swData) return res.json({ fiveStarLD: [], fourStarLD: [], fourStarElemDupes: [] });

    const { fiveStarLD = [], fourStarElemDupes = [] } = swData;
    const allIds = [...new Set([
      ...fiveStarLD.map(m => m.com2us_id),
      ...fourStarElemDupes.map(m => m.com2us_id)
    ])];

    if (allIds.length === 0) return res.json({ fiveStarLD: [], fourStarLD: [], fourStarElemDupes: [] });

    const monsters = await Monster.findAll({ where: { com2us_id: { [Op.in]: allIds } } });
    const monsterMap = Object.fromEntries(monsters.map(m => [m.com2us_id, m.toJSON()]));
    const enrich = (list) => list.map(item => ({ ...item, ...(monsterMap[item.com2us_id] || {}) }));

    const EXCLUDED_LD_IDS = new Set([
      19214, 17114,           // Elsharion
      27314,                  // Altaïr
      21814,                  // Jeanne
      19215, 17115,           // Veromos
      23015,                  // Eirgar
      30215,                  // Ryomen Sukuna
      28915,                  // Gapsoo
      27804,                  // Dual Blade
      1000101, 1000102, 1000103, 1000111, 1000112, 1000113, // Homunculus Attack
      1000204, 1000205, 1000214, 1000215                    // Homunculus Support
    ]);

    const enrichedLD = enrich(fiveStarLD);
    const nat5LD = enrichedLD.filter(m => m.natural_stars === 5 && !EXCLUDED_LD_IDS.has(m.com2us_id));
    const nat4LD = enrichedLD.filter(m => m.natural_stars === 4);

    res.json({ fiveStarLD: nat5LD, fourStarLD: nat4LD, fourStarElemDupes: enrich(fourStarElemDupes) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete my SW data
router.delete('/me/sw-data', authenticate, async (req, res) => {
  try {
    await SwData.destroy({ where: { userId: req.user.id } });
    res.json({ message: 'SW data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting own account
    if (req.user.id === user.id) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
