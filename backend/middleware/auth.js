import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Parse and validate an integer ID, returns null if invalid
export const parseId = (value) => {
  const id = parseInt(value, 10);
  return isNaN(id) ? null : id;
};

// Middleware to validate :id param (and other common ID params)
export const validateId = (...paramNames) => {
  const names = paramNames.length > 0 ? paramNames : ['id'];
  return (req, res, next) => {
    for (const name of names) {
      if (req.params[name] !== undefined) {
        const id = parseId(req.params[name]);
        if (id === null) {
          return res.status(400).json({ error: `Invalid ${name}` });
        }
        req.params[name] = id;
      }
    }
    next();
  };
};

export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};
