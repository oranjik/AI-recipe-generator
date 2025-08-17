const express = require('express');
const { body, validationResult } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Apply auth rate limiting to all routes
router.use(authLimiter);

// Validation rules
const signUpValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('fullName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
];

const signInValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

// POST /api/auth/signup
router.post('/signup', signUpValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, fullName } = req.body;

    // Sign up user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          subscription_status: 'free',
          subscription_tier: 'free'
        }
      }
    });

    if (error) {
      logger.error('Signup error:', error);
      
      if (error.message.includes('already registered')) {
        return res.status(409).json({
          error: 'User already exists with this email',
          code: 'USER_EXISTS'
        });
      }

      return res.status(400).json({
        error: error.message,
        code: 'SIGNUP_FAILED'
      });
    }

    // Create user profile in our custom table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          subscription_status: 'free',
          subscription_tier: 'free',
          created_at: new Date().toISOString(),
          recipe_count: 0
        });

      if (profileError) {
        logger.error('Profile creation error:', profileError);
      }
    }

    logger.info('User signed up successfully', {
      userId: data.user?.id,
      email: email
    });

    res.status(201).json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        fullName: fullName,
        emailConfirmed: data.user?.email_confirmed_at !== null
      },
      session: data.session,
      message: 'Account created successfully. Please check your email to verify your account.'
    });

  } catch (error) {
    logger.error('Signup error:', error);
    res.status(500).json({
      error: 'Failed to create account',
      code: 'SIGNUP_ERROR'
    });
  }
});

// POST /api/auth/signin
router.post('/signin', signInValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      logger.error('Signin error:', error);
      
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        });
      }

      return res.status(400).json({
        error: error.message,
        code: 'SIGNIN_FAILED'
      });
    }

    // Get user profile data
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      logger.error('Profile fetch error:', profileError);
    }

    logger.info('User signed in successfully', {
      userId: data.user.id,
      email: email
    });

    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: userProfile?.full_name,
        subscriptionStatus: userProfile?.subscription_status,
        subscriptionTier: userProfile?.subscription_tier,
        recipeCount: userProfile?.recipe_count || 0
      },
      session: data.session
    });

  } catch (error) {
    logger.error('Signin error:', error);
    res.status(500).json({
      error: 'Failed to sign in',
      code: 'SIGNIN_ERROR'
    });
  }
});

// POST /api/auth/signout
router.post('/signout', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Signout error:', error);
      return res.status(400).json({
        error: error.message,
        code: 'SIGNOUT_FAILED'
      });
    }

    logger.info('User signed out', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Signed out successfully'
    });

  } catch (error) {
    logger.error('Signout error:', error);
    res.status(500).json({
      error: 'Failed to sign out',
      code: 'SIGNOUT_ERROR'
    });
  }
});

// GET /api/auth/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      logger.error('Profile fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch profile',
        code: 'PROFILE_FETCH_ERROR'
      });
    }

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: userProfile.full_name,
        subscriptionStatus: userProfile.subscription_status,
        subscriptionTier: userProfile.subscription_tier,
        recipeCount: userProfile.recipe_count,
        createdAt: userProfile.created_at,
        lastLoginAt: userProfile.last_login_at
      }
    });

  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      code: 'PROFILE_ERROR'
    });
  }
});

// PUT /api/auth/profile
router.put('/profile', 
  authenticateToken,
  [
    body('fullName')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('Full name must be between 2 and 50 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { fullName } = req.body;
      const updates = {};

      if (fullName) {
        updates.full_name = fullName;
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) {
        logger.error('Profile update error:', error);
        return res.status(500).json({
          error: 'Failed to update profile',
          code: 'PROFILE_UPDATE_ERROR'
        });
      }

      logger.info('Profile updated', { userId: req.user.id });

      res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          fullName: data.full_name,
          subscriptionStatus: data.subscription_status,
          subscriptionTier: data.subscription_tier
        }
      });

    } catch (error) {
      logger.error('Profile update error:', error);
      res.status(500).json({
        error: 'Failed to update profile',
        code: 'PROFILE_UPDATE_FAILED'
      });
    }
  }
);

// POST /api/auth/forgot-password
router.post('/forgot-password',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`
      });

      if (error) {
        logger.error('Password reset error:', error);
        return res.status(400).json({
          error: error.message,
          code: 'PASSWORD_RESET_FAILED'
        });
      }

      logger.info('Password reset email sent', { email });

      res.json({
        success: true,
        message: 'Password reset email sent. Please check your inbox.'
      });

    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        error: 'Failed to send password reset email',
        code: 'PASSWORD_RESET_ERROR'
      });
    }
  }
);

// POST /api/auth/verify-email
router.post('/verify-email', optionalAuth, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      logger.error('Email verification resend error:', error);
      return res.status(400).json({
        error: error.message,
        code: 'VERIFICATION_FAILED'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      error: 'Failed to send verification email',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// GET /api/auth/session
router.get('/session', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({
        success: true,
        session: null,
        user: null
      });
    }

    // Get fresh user data
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error) {
      logger.error('Session fetch error:', error);
    }

    res.json({
      success: true,
      session: {
        user: req.user,
        expires_at: req.user.exp
      },
      user: userProfile ? {
        id: req.user.id,
        email: req.user.email,
        fullName: userProfile.full_name,
        subscriptionStatus: userProfile.subscription_status,
        subscriptionTier: userProfile.subscription_tier,
        recipeCount: userProfile.recipe_count
      } : null
    });

  } catch (error) {
    logger.error('Session check error:', error);
    res.status(500).json({
      error: 'Failed to check session',
      code: 'SESSION_ERROR'
    });
  }
});

module.exports = router;