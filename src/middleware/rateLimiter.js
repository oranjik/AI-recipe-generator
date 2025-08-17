const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Recipe generation rate limiter for free users
const recipeGenerationLimiter = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    // Check if user is premium
    if (userId) {
      const { data: user, error } = await supabase
        .from('users')
        .select('subscription_status, subscription_tier')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error('Error checking user subscription:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // If user is premium, allow unlimited requests
      if (user && user.subscription_status === 'active' && user.subscription_tier === 'premium') {
        return next();
      }
    }

    // For free users or non-authenticated users, check daily limit
    const today = new Date().toISOString().split('T')[0];
    const identifier = userId || ipAddress;
    
    // Check today's recipe count
    const { data: usageRecord, error: usageError } = await supabase
      .from('recipe_usage')
      .select('count')
      .eq('identifier', identifier)
      .eq('date', today)
      .single();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.error('Error checking recipe usage:', usageError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const currentCount = usageRecord?.count || 0;
    const maxFreeRecipes = 3;

    if (currentCount >= maxFreeRecipes) {
      return res.status(429).json({
        error: 'Daily recipe limit reached',
        message: 'You have reached your daily limit of 3 free recipes. Please upgrade to Premium for unlimited recipes.',
        limit: maxFreeRecipes,
        current: currentCount,
        upgradeUrl: '/membership'
      });
    }

    // Increment usage count
    if (usageRecord) {
      await supabase
        .from('recipe_usage')
        .update({ count: currentCount + 1 })
        .eq('identifier', identifier)
        .eq('date', today);
    } else {
      await supabase
        .from('recipe_usage')
        .insert({
          identifier: identifier,
          date: today,
          count: 1,
          user_id: userId
        });
    }

    // Add remaining count to response headers
    res.set('X-RateLimit-Remaining', maxFreeRecipes - currentCount - 1);
    res.set('X-RateLimit-Limit', maxFreeRecipes);
    res.set('X-RateLimit-Reset', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    next();
  } catch (error) {
    logger.error('Rate limiter error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Stripe webhook rate limiter (more restrictive)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit to 10 webhook calls per minute
  message: {
    error: 'Webhook rate limit exceeded'
  }
});

// Auth rate limiter (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  rateLimiter: generalLimiter,
  recipeGenerationLimiter,
  webhookLimiter,
  authLimiter
};