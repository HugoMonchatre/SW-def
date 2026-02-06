// IMPORTANT: Load environment variables FIRST
import './config/env.js';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import sequelize from './config/database.js';
// Import models/index.js to set up all associations
import './models/index.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import guildRoutes from './routes/guilds.js';
import invitationRoutes from './routes/invitations.js';
import defenseRoutes from './routes/defenses.js';
import offenseRoutes from './routes/offenses.js';
import inventoryRoutes from './routes/inventory.js';
import towerRoutes from './routes/towers.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Database Connection & Sync
sequelize.authenticate()
  .then(() => {
    console.log('Connected to database');
    return sequelize.sync();
  })
  .then(() => {
    console.log('Database synced');
  })
  .catch((err) => console.error('Database connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/guilds', guildRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/defenses', defenseRoutes);
app.use('/api/offenses', offenseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/towers', towerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
