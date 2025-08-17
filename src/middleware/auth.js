const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware to verify JWT token from Supabase
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Invalid token.',
      code: 'TOKEN_ERROR'
    });
  }
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    logger.warn('Optional auth error:', error);
    next(); // Continue even if auth fails
  }
};

// Middleware to check if user has premium subscription
const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check user's subscription status
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_tier')
      .eq('id', req.user.id)
      .single();

    if (error) {
      logger.error('Error checking subscription:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!user || user.subscription_status !== 'active' || user.subscription_tier !== 'premium') {
      return res.status(403).json({
        error: 'Premium subscription required',
        code: 'PREMIUM_REQUIRED',
        upgradeUrl: '/membership'
      });
    }

    next();
  } catch (error) {
    logger.error('Premium check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requirePremium
};