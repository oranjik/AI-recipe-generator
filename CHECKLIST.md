# 📋 AI Recipe Chef - Deployment Checklist

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment

### 🔧 Code Preparation
- [ ] All features implemented and tested
- [ ] Code review completed
- [ ] All tests passing: `npm test`
- [ ] Linting clean: `npm run lint`
- [ ] No debug code or console.log statements
- [ ] Error handling implemented
- [ ] Security best practices followed

### 📦 Dependencies
- [ ] Dependencies updated: `npm audit fix`
- [ ] No high-severity vulnerabilities
- [ ] Production dependencies optimized
- [ ] Node.js version verified (18+)

### 🔐 Environment Variables
- [ ] `.env.example` updated with all variables
- [ ] All required variables documented
- [ ] Production values prepared (without exposing secrets)
- [ ] JWT secrets generated (32+ characters)

## Third-Party Services Setup

### 🤖 OpenAI
- [ ] API key obtained from [OpenAI Platform](https://platform.openai.com/api-keys)
- [ ] Billing configured and limits set
- [ ] API key tested and working
- [ ] Rate limits understood

### 🗄️ Supabase
- [ ] Project created at [Supabase](https://supabase.com/dashboard)
- [ ] Database schema deployed (database-schema.sql)
- [ ] Row Level Security (RLS) policies applied
- [ ] API keys copied (URL, anon key, service role key)
- [ ] Database connection tested

### 💳 Stripe
- [ ] Account created at [Stripe](https://dashboard.stripe.com)
- [ ] Premium product created ($9.99/month)
- [ ] Price ID copied
- [ ] Webhook endpoint configured
- [ ] Test payments working
- [ ] API keys copied (publishable and secret)

### 🛒 Amazon Associates (Optional)
- [ ] Amazon Associate account created
- [ ] Affiliate tag obtained
- [ ] Product links tested

## Deployment Configuration

### 📋 Vercel Setup
- [ ] Vercel account created
- [ ] CLI installed: `npm install -g vercel`
- [ ] Project connected to repository
- [ ] Build settings configured
- [ ] Domain configured (if custom)

### 🌐 Environment Variables in Vercel
Set these in Vercel Dashboard → Settings → Environment Variables:

#### Core Configuration
- [ ] `NODE_ENV` = `production`
- [ ] `FRONTEND_URL` = your Vercel app URL
- [ ] `ALLOWED_ORIGINS` = your allowed domains
- [ ] `JWT_SECRET` = your JWT secret

#### API Keys
- [ ] `OPENAI_API_KEY` = your OpenAI key
- [ ] `SUPABASE_URL` = your Supabase URL
- [ ] `SUPABASE_ANON_KEY` = your Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service key
- [ ] `STRIPE_SECRET_KEY` = your Stripe secret key
- [ ] `STRIPE_WEBHOOK_SECRET` = your webhook secret
- [ ] `STRIPE_PREMIUM_PRICE_ID` = your premium price ID
- [ ] `AMAZON_AFFILIATE_TAG` = your affiliate tag (if using)

## Deployment Process

### 🚀 Initial Deployment
- [ ] Repository pushed to GitHub/GitLab
- [ ] Vercel project connected
- [ ] Environment variables set
- [ ] First deployment successful: `vercel --prod`
- [ ] Deployment URL accessible

### 🔗 Webhook Configuration
- [ ] Stripe webhook URL updated to production domain
- [ ] Webhook secret regenerated for production
- [ ] Webhook events configured:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`

### 🌍 Domain Setup (if using custom domain)
- [ ] Domain added in Vercel Dashboard
- [ ] DNS records configured
- [ ] SSL certificate issued
- [ ] Domain accessible via HTTPS

## Post-Deployment Testing

### 🧪 Functional Testing
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Recipe generation works
- [ ] Premium subscription flow works
- [ ] Payment processing works
- [ ] Recipe saving works (premium users)
- [ ] Rate limiting works (3 recipes for free users)

### 🔌 API Testing
Test these endpoints:
- [ ] `GET /api/health` → 200 OK
- [ ] `POST /api/auth/signup` → user creation
- [ ] `POST /api/auth/signin` → user login
- [ ] `POST /api/recipe/generate-recipe` → recipe generation
- [ ] `POST /api/subscription/create-checkout-session` → payment flow

### 🔒 Security Testing
- [ ] HTTPS enforced
- [ ] Environment variables not exposed
- [ ] Input validation working
- [ ] Authentication required for protected routes
- [ ] Rate limiting active
- [ ] CORS configured correctly

### 📱 Cross-Platform Testing
- [ ] Desktop browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile browsers (iOS Safari, Android Chrome)
- [ ] Tablet devices
- [ ] Different screen sizes

### ⚡ Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 2 seconds
- [ ] Recipe generation < 10 seconds
- [ ] Images loading quickly
- [ ] No JavaScript errors in console

## Monitoring Setup

### 📊 Analytics
- [ ] Vercel Analytics enabled
- [ ] Google Analytics configured (if using)
- [ ] User behavior tracking working

### 🚨 Error Monitoring
- [ ] Error logs accessible via `vercel logs`
- [ ] Sentry configured (if using)
- [ ] Alert notifications set up

### 📈 Performance Monitoring
- [ ] Vercel function performance monitored
- [ ] Database performance acceptable
- [ ] API response times tracked

### 💰 Cost Monitoring
- [ ] Vercel usage limits understood
- [ ] OpenAI API usage tracked
- [ ] Supabase usage monitored
- [ ] Stripe fees calculated

## Documentation

### 📚 User Documentation
- [ ] README.md updated
- [ ] API documentation current
- [ ] Environment variables documented
- [ ] Setup instructions clear

### 🔧 Technical Documentation
- [ ] Architecture documented
- [ ] Database schema documented
- [ ] API endpoints documented
- [ ] Deployment process documented

### 🆘 Support Documentation
- [ ] Troubleshooting guide available
- [ ] FAQ prepared
- [ ] Contact information updated
- [ ] Issue reporting process defined

## Security Checklist

### 🔐 Data Protection
- [ ] All sensitive data encrypted
- [ ] API keys stored securely
- [ ] User passwords hashed
- [ ] Database access restricted

### 🛡️ Application Security
- [ ] Input sanitization implemented
- [ ] SQL injection protection
- [ ] XSS protection enabled
- [ ] CSRF protection implemented

### 🔒 Infrastructure Security
- [ ] HTTPS enforced everywhere
- [ ] Security headers configured
- [ ] Access logs enabled
- [ ] Regular security updates planned

## Go-Live Checklist

### 🎯 Final Verification
- [ ] All features working as expected
- [ ] Performance within acceptable limits
- [ ] Security measures active
- [ ] Monitoring and alerts configured
- [ ] Backup and recovery plan in place

### 📢 Launch Preparation
- [ ] Marketing materials ready
- [ ] Social media accounts updated
- [ ] Press release prepared (if applicable)
- [ ] Customer support ready

### 🚀 Launch
- [ ] DNS switched to production
- [ ] All systems green
- [ ] Team notified of go-live
- [ ] Monitoring dashboard watched
- [ ] Success metrics tracked

## Post-Launch

### 📊 Day 1 Monitoring
- [ ] No critical errors reported
- [ ] Performance within expected range
- [ ] User registrations working
- [ ] Payments processing successfully
- [ ] Customer feedback monitored

### 📅 Week 1 Review
- [ ] Usage patterns analyzed
- [ ] Performance optimizations identified
- [ ] User feedback collected
- [ ] Bug reports triaged
- [ ] Success metrics evaluated

### 🔄 Ongoing Maintenance
- [ ] Regular security updates scheduled
- [ ] Performance monitoring ongoing
- [ ] User feedback incorporation planned
- [ ] Feature roadmap updated
- [ ] Team retrospective completed

---

## Emergency Contacts

Keep these handy during deployment:

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **Stripe Support**: [support.stripe.com](https://support.stripe.com)
- **OpenAI Support**: [help.openai.com](https://help.openai.com)

## Quick Commands

```bash
# Deploy to production
vercel --prod

# View logs
vercel logs --follow

# Test health endpoint
curl https://your-app.vercel.app/api/health

# Set environment variable
vercel env add VARIABLE_NAME

# Run local development
npm run dev
```

**Remember**: This checklist is comprehensive but adapt it to your specific needs and requirements.