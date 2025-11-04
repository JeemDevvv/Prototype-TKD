// Input validation and sanitization middleware
const validator = require('validator');

// Sanitize input data
const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
          .replace(/javascript:/gi, '') // Remove javascript: protocols
          .replace(/on\w+\s*=/gi, '') // Remove event handlers
          .trim();
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Validate email format
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  if (email && !validator.isEmail(email)) {
    return res.status(400).json({
      error: 'Invalid email format',
      code: 'INVALID_EMAIL'
    });
  }
  next();
};

// Validate password strength
const validatePassword = (req, res, next) => {
  const { password } = req.body;
  if (password) {
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        code: 'WEAK_PASSWORD'
      });
    }
  }
  next();
};

// Validate required fields
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = fields.filter(field => !req.body[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missing.join(', ')}`,
        code: 'MISSING_FIELDS'
      });
    }
    next();
  };
};

// Validate MongoDB ObjectId
const validateObjectId = (field) => {
  return (req, res, next) => {
    const id = req.params[field] || req.body[field];
    if (id && !validator.isMongoId(id)) {
      return res.status(400).json({
        error: `Invalid ${field} format`,
        code: 'INVALID_ID'
      });
    }
    next();
  };
};

module.exports = {
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateRequired,
  validateObjectId
};
