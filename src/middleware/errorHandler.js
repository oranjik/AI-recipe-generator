const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error
  let error = { ...err };
  error.message = err.message;

  // Mongoose/MongoDB duplicate key error
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // OpenAI API errors
  if (err.type === 'insufficient_quota') {
    const message = 'AI service temporarily unavailable. Please try again later.';
    error = { message, statusCode: 503 };
  }

  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    const message = 'Payment processing error. Please try again.';
    error = { message, statusCode: 400 };
  }

  // Supabase errors
  if (err.message && err.message.includes('supabase')) {
    const message = 'Database service temporarily unavailable';
    error = { message, statusCode: 503 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };