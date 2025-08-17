const express = require('express');
const { body, validationResult } = require('express-validator');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { logger } = require('../utils/logger');
const { authenticateToken, requirePremium } = require('../middleware/auth');
const { webhookLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  premium: {
    name: 'Premium',
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: [
      'Unlimited recipe generation',
      'Save recipes to collection',
      'Advanced dietary customization',
      'Detailed nutrition information',
      'Automatic shopping list generation',
      'Recipe rating and reviews',
      'Priority customer support',
      'Access to premium cuisines'
    ]
  }
};

// POST /api/subscription/create-checkout-session
router.post('/create-checkout-session', 
  authenticateToken,
  [
    body('plan')
      .isIn(Object.keys(SUBSCRIPTION_PLANS))
      .withMessage('Invalid subscription plan')
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

      const { plan } = req.body;
      const planConfig = SUBSCRIPTION_PLANS[plan];

      if (!planConfig) {
        return res.status(400).json({
          error: 'Invalid subscription plan',
          code: 'INVALID_PLAN'
        });
      }

      // Check if user already has an active subscription
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_status, stripe_customer_id')
        .eq('id', req.user.id)
        .single();

      if (userError) {
        logger.error('Error fetching user data:', userError);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (userData.subscription_status === 'active') {
        return res.status(400).json({
          error: 'User already has an active subscription',
          code: 'ALREADY_SUBSCRIBED'
        });
      }

      // Create or retrieve Stripe customer
      let customerId = userData.stripe_customer_id;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: req.user.email,
          metadata: {
            userId: req.user.id
          }
        });
        customerId = customer.id;

        // Update user with Stripe customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', req.user.id);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: planConfig.priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/membership`,
        metadata: {
          userId: req.user.id,
          plan: plan
        },
        subscription_data: {
          metadata: {
            userId: req.user.id,
            plan: plan
          }
        },
        billing_address_collection: 'required',
        allow_promotion_codes: true,
        customer_update: {
          address: 'auto',
          name: 'auto'
        }
      });

      logger.info('Checkout session created', {
        userId: req.user.id,
        sessionId: session.id,
        plan: plan
      });

      res.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        plan: planConfig
      });

    } catch (error) {
      logger.error('Checkout session creation error:', error);
      res.status(500).json({
        error: 'Failed to create checkout session',
        code: 'CHECKOUT_FAILED'
      });
    }
  }
);

// POST /api/subscription/create-portal-session
router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    // Get user's Stripe customer ID
    const { data: userData, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error || !userData.stripe_customer_id) {
      return res.status(400).json({
        error: 'No subscription found',
        code: 'NO_SUBSCRIPTION'
      });
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/profile`,
    });

    res.json({
      success: true,
      url: session.url
    });

  } catch (error) {
    logger.error('Portal session creation error:', error);
    res.status(500).json({
      error: 'Failed to create portal session',
      code: 'PORTAL_FAILED'
    });
  }
});

// GET /api/subscription/status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('subscription_status, subscription_tier, stripe_customer_id, subscription_end_date')
      .eq('id', req.user.id)
      .single();

    if (error) {
      logger.error('Error fetching subscription status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    let stripeSubscription = null;
    
    // If user has Stripe customer ID, get subscription details
    if (userData.stripe_customer_id) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: userData.stripe_customer_id,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          stripeSubscription = subscriptions.data[0];
        }
      } catch (stripeError) {
        logger.error('Error fetching Stripe subscription:', stripeError);
      }
    }

    res.json({
      success: true,
      subscription: {
        status: userData.subscription_status,
        tier: userData.subscription_tier,
        endDate: userData.subscription_end_date,
        stripeSubscription: stripeSubscription ? {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodEnd: stripeSubscription.current_period_end,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          plan: stripeSubscription.items.data[0]?.price?.nickname || 'Premium'
        } : null
      }
    });

  } catch (error) {
    logger.error('Subscription status error:', error);
    res.status(500).json({
      error: 'Failed to get subscription status',
      code: 'STATUS_FAILED'
    });
  }
});

// POST /api/subscription/cancel
router.post('/cancel', authenticateToken, requirePremium, async (req, res) => {
  try {
    const { data: userData, error } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error || !userData.stripe_customer_id) {
      return res.status(400).json({
        error: 'No subscription found',
        code: 'NO_SUBSCRIPTION'
      });
    }

    // Get active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: userData.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({
        error: 'No active subscription found',
        code: 'NO_ACTIVE_SUBSCRIPTION'
      });
    }

    const subscription = subscriptions.data[0];

    // Cancel subscription at period end
    const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    });

    logger.info('Subscription cancelled', {
      userId: req.user.id,
      subscriptionId: subscription.id
    });

    res.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
      subscription: {
        id: updatedSubscription.id,
        cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        currentPeriodEnd: updatedSubscription.current_period_end
      }
    });

  } catch (error) {
    logger.error('Subscription cancellation error:', error);
    res.status(500).json({
      error: 'Failed to cancel subscription',
      code: 'CANCEL_FAILED'
    });
  }
});

// POST /api/subscription/webhook (Stripe webhook endpoint)
router.post('/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        logger.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      logger.info('Stripe webhook received', { type: event.type, id: event.id });

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });

    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

// Webhook handlers
async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;

    logger.info('Checkout session completed', {
      userId,
      sessionId: session.id,
      plan
    });

    // Update user subscription status
    await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_tier: plan,
        subscription_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

  } catch (error) {
    logger.error('Error handling checkout session completed:', error);
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
    await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_tier: 'premium',
        subscription_start_date: new Date(subscription.created * 1000).toISOString(),
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    logger.info('Subscription created', { userId, subscriptionId: subscription.id });

  } catch (error) {
    logger.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
    await supabase
      .from('users')
      .update({
        subscription_status: subscription.status,
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    logger.info('Subscription updated', { userId, subscriptionId: subscription.id });

  } catch (error) {
    logger.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    const userId = subscription.metadata.userId;
    
    await supabase
      .from('users')
      .update({
        subscription_status: 'cancelled',
        subscription_tier: 'free',
        subscription_end_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    logger.info('Subscription deleted', { userId, subscriptionId: subscription.id });

  } catch (error) {
    logger.error('Error handling subscription deleted:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;

    await supabase
      .from('users')
      .update({
        subscription_status: 'active',
        subscription_end_date: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    logger.info('Payment succeeded', { userId, invoiceId: invoice.id });

  } catch (error) {
    logger.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;

    // Don't immediately downgrade on first failure, Stripe will retry
    logger.info('Payment failed', { userId, invoiceId: invoice.id });

  } catch (error) {
    logger.error('Error handling payment failed:', error);
  }
}

// GET /api/subscription/plans
router.get('/plans', async (req, res) => {
  try {
    res.json({
      success: true,
      plans: SUBSCRIPTION_PLANS
    });
  } catch (error) {
    logger.error('Error fetching plans:', error);
    res.status(500).json({
      error: 'Failed to fetch plans',
      code: 'PLANS_FAILED'
    });
  }
});

module.exports = router;