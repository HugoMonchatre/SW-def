import express from 'express';
import User from '../models/User.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import passport from '../config/passport.js';

const router = express.Router();

// Initialize passport
router.use(passport.initialize());
router.use(passport.session());

// Register with email
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      provider: 'email',
      role: 'user'
    });

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login with email
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔍 Login attempt:', { email, provider: 'email' });

    const user = await User.findOne({ email });
    console.log('👤 User found:', user ? `Yes (${user.email}, provider: ${user.provider})` : 'No');

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials - User not found' });
    }

    if (user.provider !== 'email') {
      return res.status(401).json({
        error: `This email is registered with ${user.provider}. Please use ${user.provider} to login.`
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    console.log('🔐 Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials - Wrong password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('✅ Login successful for:', user.email);

    res.json({
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Discord OAuth - Only register routes if Discord is configured
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  router.get('/discord', passport.authenticate('discord'));

  router.get('/discord/callback',
    passport.authenticate('discord', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=discord` }),
    (req, res) => {
      console.log('🎮 Discord OAuth callback successful!');
      console.log('   User:', req.user.name);
      console.log('   Email:', req.user.email);
      console.log('   Provider:', req.user.provider);
      console.log('   Role:', req.user.role);

      const token = generateToken(req.user._id);
      console.log('   Token generated:', token ? '✅' : '❌');

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      console.log('   Redirecting to:', `${process.env.FRONTEND_URL}/dashboard?auth=success&token=${token}`);
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?auth=success&token=${token}`);
    }
  );
} else {
  // Return error if Discord is not configured
  router.get('/discord', (req, res) => {
    res.status(503).json({ error: 'Discord OAuth is not configured' });
  });
}

// Google OAuth - Only register routes if Google is configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: `${process.env.FRONTEND_URL}/login?error=google` }),
    (req, res) => {
      console.log('🔴 Google OAuth callback successful!');
      console.log('   User:', req.user.name);
      console.log('   Email:', req.user.email);
      console.log('   Provider:', req.user.provider);
      console.log('   Role:', req.user.role);

      const token = generateToken(req.user._id);
      console.log('   Token generated:', token ? '✅' : '❌');

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      console.log('   Redirecting to:', `${process.env.FRONTEND_URL}/dashboard?auth=success&token=${token}`);
      res.redirect(`${process.env.FRONTEND_URL}/dashboard?auth=success&token=${token}`);
    }
  );
} else {
  // Return error if Google is not configured
  router.get('/google', (req, res) => {
    res.status(503).json({ error: 'Google OAuth is not configured' });
  });
}

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('guild', 'name logo');
    res.json({ user });
  } catch (error) {
    res.json({ user: req.user });
  }
});

// Logout
router.post('/logout', authenticate, (req, res) => {
  res.clearCookie('token');
  req.logout(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;
