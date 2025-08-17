# 🚀 AI Recipe Chef - Deployment Guide

## Pre-Deployment Checklist

### ✅ Code Preparation
- [ ] All tests passing: `npm test`
- [ ] Code linting clean: `npm run lint`
- [ ] No console.log statements in production code
- [ ] All TypeScript/JavaScript errors resolved
- [ ] Environment variables documented
- [ ] Dependencies updated and secured: `npm audit`

### ✅ Environment Setup
- [ ] Production environment variables configured
- [ ] `.env.example` file updated with all required variables
- [ ] Sensitive data excluded from repository (check `.gitignore`)
- [ ] Database schema deployed and tested
- [ ] All API keys and secrets generated and secured

### ✅ Third-Party Integrations
- [ ] OpenAI API key valid and has sufficient credits
- [ ] Supabase project created and configured
- [ ] Stripe account set up with products and webhooks
- [ ] Amazon Associate account active (if using affiliate features)
- [ ] DNS records configured (if using custom domain)

## Deployment Steps

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/your-username/ai-recipe-chef
cd ai-recipe-chef

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your actual values

# Test locally
npm run dev
```

### 2. Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# After testing, deploy to production
vercel --prod
```

### 3. Post-Deployment Configuration

```bash
# Set environment variables
vercel env add NODE_ENV production
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_URL
vercel env add STRIPE_SECRET_KEY
# ... (add all required variables)

# Redeploy with new environment variables
vercel --prod
```

## Environment Variables Setup Guide

### Core Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | ✅ | Environment mode | `production` |
| `FRONTEND_URL` | ✅ | Your app's URL | `https://yourapp.vercel.app` |
| `JWT_SECRET` | ✅ | JWT signing secret | `your-32-char-secret` |

### OpenAI Integration

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `OPENAI_ORG_ID` | ❌ | Organization ID | OpenAI Dashboard |

### Supabase Database

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `SUPABASE_URL` | ✅ | Project URL | [Supabase Dashboard](https://supabase.com/dashboard) |
| `SUPABASE_ANON_KEY` | ✅ | Anonymous key | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key | Supabase → Settings → API |

### Stripe Payments

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `STRIPE_SECRET_KEY` | ✅ | Secret key | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook secret | Stripe → Webhooks → Endpoint |
| `STRIPE_PREMIUM_PRICE_ID` | ✅ | Premium price ID | Stripe → Products → Pricing |

## Database Setup (Supabase)

### 1. Create Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and set project details
4. Wait for database to be ready (~2 minutes)

### 2. Run Schema
```sql
-- Copy contents from database-schema.sql
-- Paste into Supabase SQL Editor
-- Execute the script
```

### 3. Verify Setup
```bash
# Test connection
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     "https://your-project.supabase.co/rest/v1/users?select=*"
```

## Stripe Configuration

### 1. Create Product
```bash
# In Stripe Dashboard:
# 1. Products → Create product
# 2. Name: "AI Recipe Chef Premium"
# 3. Add recurring price: $9.99/month
# 4. Copy the price ID (price_xxxxxxxxxxxx)
```

### 2. Configure Webhooks
```bash
# Webhook URL: https://your-app.vercel.app/api/subscription/webhook
# Events to select:
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

### 3. Test Webhook
```bash
# Install Stripe CLI
stripe login

# Test webhook locally
stripe listen --forward-to localhost:3000/api/subscription/webhook

# Test webhook in production
stripe listen --forward-to your-app.vercel.app/api/subscription/webhook
```

## Testing Checklist

### ✅ Frontend Testing
- [ ] Homepage loads correctly
- [ ] Recipe generation form works
- [ ] Navigation between screens functional
- [ ] Mobile responsiveness verified
- [ ] All buttons and links working

### ✅ API Testing
- [ ] Health check: `GET /api/health` returns 200
- [ ] Recipe generation: `POST /api/recipe/generate-recipe`
- [ ] User registration: `POST /api/auth/signup`
- [ ] User login: `POST /api/auth/signin`
- [ ] Subscription creation: `POST /api/subscription/create-checkout-session`

### ✅ Integration Testing
- [ ] OpenAI API calls successful
- [ ] Database queries working
- [ ] Stripe payments processing
- [ ] Email notifications sent (if enabled)
- [ ] Rate limiting functional

### ✅ Security Testing
- [ ] HTTPS enforced
- [ ] Environment variables secure
- [ ] Input validation working
- [ ] Authentication required for protected routes
- [ ] CORS properly configured

## Troubleshooting Guide

### Common Issues

#### 🔴 Build Failures

**Error: Module not found**
```bash
# Solution: Check package.json dependencies
npm install
npm audit fix
```

**Error: Node version mismatch**
```bash
# Solution: Update Node.js version
# Verify vercel.json has correct Node runtime
```

#### 🔴 Environment Variable Issues

**Error: Missing environment variables**
```bash
# Solution: Set all required variables
vercel env ls
vercel env add VARIABLE_NAME

# Redeploy after adding variables
vercel --prod
```

**Error: Variables not loading**
```bash
# Solution: Check variable names match exactly
# Restart deployment after changes
```

#### 🔴 Database Connection Issues

**Error: Supabase connection failed**
```bash
# Check URL and keys are correct
# Verify database is accessible
curl -H "apikey: YOUR_KEY" "YOUR_SUPABASE_URL/rest/v1/"
```

**Error: RLS policies blocking access**
```bash
# Solution: Verify RLS policies in database-schema.sql
# Check user authentication is working
```

#### 🔴 API Integration Issues

**Error: OpenAI API rate limit**
```bash
# Solution: Check OpenAI usage dashboard
# Implement better error handling
# Add retry logic
```

**Error: Stripe webhook verification failed**
```bash
# Solution: Verify webhook secret matches
# Check webhook URL is correct
# Ensure webhook is receiving events
```

#### 🔴 Performance Issues

**Error: Function timeout**
```bash
# Solution: Optimize API calls
# Increase timeout in vercel.json (max 30s)
# Implement caching
```

**Error: Slow page load**
```bash
# Solution: Optimize images
# Enable compression
# Check network requests
```

### Debugging Commands

```bash
# View Vercel logs
vercel logs
vercel logs --follow
vercel logs --since 1h

# Test API endpoints locally
curl -X GET http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/recipe/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{"ingredients": "chicken, rice"}'

# Check environment variables
vercel env ls
echo $OPENAI_API_KEY  # (locally)

# Test database connection
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 1;"

# Monitor API performance
time curl -X GET https://your-app.vercel.app/api/health
```

## Performance Monitoring

### Key Metrics to Monitor

1. **Response Times**
   - API endpoints < 2 seconds
   - Page load times < 3 seconds
   - Database queries < 500ms

2. **Error Rates**
   - 4xx errors < 1%
   - 5xx errors < 0.1%
   - Failed payments < 0.5%

3. **Resource Usage**
   - Function execution time
   - Memory consumption
   - Database connections

### Monitoring Setup

```bash
# Vercel Analytics (built-in)
# - Enable in Vercel Dashboard
# - View real-time metrics

# External monitoring
# - UptimeRobot for uptime
# - Sentry for error tracking
# - LogRocket for user sessions
```

## Scaling Considerations

### Traffic Growth
- Monitor Vercel function usage
- Consider upgrading to Vercel Pro
- Implement caching strategies
- Use CDN for static assets

### Database Scaling
- Monitor Supabase usage
- Optimize queries
- Consider read replicas
- Implement connection pooling

### Cost Optimization
- Monitor API usage costs
- Implement rate limiting
- Cache frequent requests
- Optimize function memory usage

## Security Best Practices

### Environment Security
- [ ] Never commit `.env` files
- [ ] Use strong, unique secrets
- [ ] Rotate API keys regularly
- [ ] Limit API key permissions

### Application Security
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection enabled
- [ ] CSRF protection implemented
- [ ] Rate limiting configured

### Infrastructure Security
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Database access restricted
- [ ] Webhook signature verification

## Maintenance Schedule

### Daily
- [ ] Monitor error logs
- [ ] Check API status
- [ ] Review usage metrics

### Weekly
- [ ] Update dependencies
- [ ] Review security alerts
- [ ] Check performance metrics
- [ ] Test backup systems

### Monthly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Update documentation

## Support Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)

### Community Support
- [Vercel Discord](https://vercel.com/discord)
- [Supabase Discord](https://supabase.com/discord)
- [Stripe Developers Slack](https://stripe.com/community)

### Emergency Contacts
- Save important support email addresses
- Document escalation procedures
- Keep backup access credentials secure