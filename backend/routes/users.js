import express from 'express';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available users for guild (guild_leader or admin)
router.get('/available-for-guild', authenticate, authorize('guild_leader', 'admin'), async (req, res) => {
  try {
    // Get users who are not in any guild
    const users = await User.find({ guild: null, isActive: true }).sort({ name: 1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only admin or the user themselves can view
    if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
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

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent changing own role
    if (req.user._id.toString() === user._id.toString()) {
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

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deactivating own account
    if (req.user._id.toString() === user._id.toString()) {
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

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting own account
    if (req.user._id.toString() === user._id.toString()) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
