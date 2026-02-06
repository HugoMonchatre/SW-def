import express from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

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
router.patch('/me/profile', authenticate, async (req, res) => {
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

// Update own password (email provider only)
router.patch('/me/password', authenticate, async (req, res) => {
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

// Calculate speed for a rune
function getRuneSpeed(rune) {
  let speed = 0;
  // Main stat (pri_eff) - Type 8 = Speed
  if (rune.pri_eff && rune.pri_eff[0] === 8) speed += rune.pri_eff[1];
  // Prefix stat
  if (rune.prefix_eff && rune.prefix_eff[0] === 8) speed += rune.prefix_eff[1];
  // Substats (sec_eff) - [type, value, gems, grind]
  if (rune.sec_eff) {
    rune.sec_eff.forEach(sub => {
      if (sub[0] === 8) speed += sub[1] + (sub[3] || 0);
    });
  }
  return speed;
}

// Find best rune set for a given main set (4 pieces) + optional offset set (2 pieces)
function calculateBestRuneSet(allRunes, mainSetId, offsetSetId = null) {
  // Group runes by slot and set
  const runesBySlotAndSet = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} };

  allRunes.forEach(rune => {
    const slot = rune.slot_no;
    const set = rune.set_id;
    if (!runesBySlotAndSet[slot][set]) {
      runesBySlotAndSet[slot][set] = [];
    }
    runesBySlotAndSet[slot][set].push({
      id: rune.rune_id,
      slot,
      set,
      speed: getRuneSpeed(rune)
    });
  });

  // Sort by speed descending
  for (let slot = 1; slot <= 6; slot++) {
    for (let set in runesBySlotAndSet[slot]) {
      runesBySlotAndSet[slot][set].sort((a, b) => b.speed - a.speed);
    }
  }

  // Get best rune for a slot
  const getBestRune = (slot, setId = null) => {
    if (setId !== null) {
      const runes = runesBySlotAndSet[slot][setId];
      return runes && runes.length > 0 ? runes[0] : null;
    }
    let best = null;
    for (let set in runesBySlotAndSet[slot]) {
      const runes = runesBySlotAndSet[slot][set];
      if (runes.length > 0 && (!best || runes[0].speed > best.speed)) {
        best = runes[0];
      }
    }
    return best;
  };

  const slots = [1, 2, 3, 4, 5, 6];
  let bestTotal = -1;

  // Try all combinations of 4 slots for main set
  for (let i = 0; i < slots.length - 3; i++) {
    for (let j = i + 1; j < slots.length - 2; j++) {
      for (let k = j + 1; k < slots.length - 1; k++) {
        for (let l = k + 1; l < slots.length; l++) {
          const mainSlots = [slots[i], slots[j], slots[k], slots[l]];
          const offsetSlots = slots.filter(s => !mainSlots.includes(s));

          let valid = true;
          let total = 0;

          // Get best main set runes
          for (const slot of mainSlots) {
            const rune = getBestRune(slot, mainSetId);
            if (!rune) { valid = false; break; }
            total += rune.speed;
          }

          if (!valid) continue;

          // Get best offset runes
          for (const slot of offsetSlots) {
            const rune = offsetSetId ? getBestRune(slot, offsetSetId) : getBestRune(slot);
            if (offsetSetId && !rune) { valid = false; break; }
            if (rune) total += rune.speed;
          }

          if (!valid) continue;
          if (total > bestTotal) bestTotal = total;
        }
      }
    }
  }

  return bestTotal;
}

// Upload SW JSON data
router.post('/me/sw-data', authenticate, async (req, res) => {
  try {
    const { jsonData } = req.body;

    if (!jsonData) {
      return res.status(400).json({ error: 'No JSON data provided' });
    }

    // Validate JSON structure - must be a valid SW export
    if (!jsonData.command || jsonData.command !== 'HubUserLogin') {
      return res.status(400).json({
        error: 'Invalid file format. Must be a Summoners War export file (HubUserLogin).'
      });
    }

    if (!jsonData.wizard_info) {
      return res.status(400).json({
        error: 'Invalid file format. Missing wizard_info.'
      });
    }

    const wizardInfo = jsonData.wizard_info;

    // Validate required wizard fields
    if (!wizardInfo.wizard_id || !wizardInfo.wizard_name) {
      return res.status(400).json({
        error: 'Invalid file format. Missing wizard_id or wizard_name.'
      });
    }

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

    // Calculate best rune sets (Set IDs: Swift=3, Violent=13, Despair=10, Will=15)
    // Swift bonus: +25% base speed (assuming 100 base = +25 SPD)
    const SWIFT_BONUS = 25;
    const swiftSpeed = calculateBestRuneSet(allRunes, 3);
    const swiftWillSpeed = calculateBestRuneSet(allRunes, 3, 15);

    const bestRuneSets = {
      swift: swiftSpeed > 0 ? swiftSpeed + SWIFT_BONUS : -1,
      swiftWill: swiftWillSpeed > 0 ? swiftWillSpeed + SWIFT_BONUS : -1,
      violent: calculateBestRuneSet(allRunes, 13),
      violentWill: calculateBestRuneSet(allRunes, 13, 15),
      despair: calculateBestRuneSet(allRunes, 10),
      despairWill: calculateBestRuneSet(allRunes, 10, 15)
    };

    user.swData = {
      wizardId: wizardInfo.wizard_id,
      wizardName: wizardInfo.wizard_name,
      wizardLevel: wizardInfo.wizard_level || 0,
      lastUpload: new Date(),
      unitCount,
      runeCount,
      bestRuneSets
    };

    await user.save();

    res.json({
      message: 'SW data uploaded successfully',
      swData: user.swData
    });
  } catch (error) {
    console.error('SW Data upload error:', error);
    res.status(500).json({ error: 'Error processing SW data' });
  }
});

// Get my SW data
router.get('/me/sw-data', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ swData: user.swData || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete my SW data
router.delete('/me/sw-data', authenticate, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.swData = null;
    await user.save();

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
