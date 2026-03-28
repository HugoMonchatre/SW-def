export function errorHandler(err, req, res, next) {
  // Joi validation errors
  if (err.isJoi) {
    return res.status(400).json({ error: err.details[0].message });
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ error: err.errors[0].message });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}
