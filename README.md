# AI Recipe Chef - Backend API

A comprehensive backend API for the AI Recipe Chef application with OpenAI integration, Supabase authentication, Stripe payments, and Amazon affiliate marketing.

## 🚀 Features

- **AI Recipe Generation**: OpenAI GPT-4 powered recipe creation
- **User Authentication**: Supabase Auth with JWT tokens
- **Subscription Management**: Stripe integration for premium features
- **Rate Limiting**: 3 free recipes per day, unlimited for premium users
- **Amazon Affiliate**: Product recommendations with affiliate links
- **Security**: Helmet, CORS, input validation, and error handling
- **Logging**: Winston-based comprehensive logging system

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project
- OpenAI API key
- Stripe account (for payments)
- Amazon Associate account (for affiliate links)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-recipe-chef
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   Fill in all the required environment variables (see Configuration section below).

4. **Database Setup**
   
   Create the following tables in your Supabase database:

   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
     email TEXT UNIQUE NOT NULL,
     full_name TEXT,
     subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled', 'past_due')),
     subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
     subscription_start_date TIMESTAMPTZ,
     subscription_end_date TIMESTAMPTZ,
     stripe_customer_id TEXT,
     recipe_count INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     last_login_at TIMESTAMPTZ
   );

   -- Recipe usage tracking
   CREATE TABLE recipe_usage (
     id SERIAL PRIMARY KEY,
     identifier TEXT NOT NULL, -- user_id or IP address
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     date DATE NOT NULL,
     count INTEGER DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(identifier, date)
   );

   -- Enable Row Level Security
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE recipe_usage ENABLE ROW LEVEL SECURITY;

   -- RLS Policies
   CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for recipe generation | `sk-...` |
| `SUPABASE_URL` | Your Supabase project URL | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | `whsec_...` |
| `STRIPE_PREMIUM_PRICE_ID` | Stripe price ID for premium plan | `price_...` |

### Stripe Setup

1. Create a premium subscription product in Stripe Dashboard
2. Set up webhook endpoint: `https://yourdomain.com/api/subscription/webhook`
3. Configure webhook events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Amazon Associate Setup

1. Join the Amazon Associates program
2. Get your affiliate tag (ends with -20)
3. Add your tag to the `AMAZON_AFFILIATE_TAG` environment variable

## 🔌 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/signup` | Create new user account | No |
| POST | `/signin` | Sign in user | No |
| POST | `/signout` | Sign out user | Yes |
| GET | `/profile` | Get user profile | Yes |
| PUT | `/profile` | Update user profile | Yes |
| POST | `/forgot-password` | Send password reset email | No |
| GET | `/session` | Check current session | No |

### Recipe Generation (`/api/recipe`)

| Method | Endpoint | Description | Auth Required | Rate Limited |
|--------|----------|-------------|---------------|--------------|
| POST | `/generate-recipe` | Generate AI recipe | Optional | Yes (3/day free) |
| GET | `/suggestions` | Get recipe suggestions | Optional | No |

### Subscription (`/api/subscription`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/create-checkout-session` | Create Stripe checkout | Yes |
| POST | `/create-portal-session` | Create billing portal session | Yes |
| GET | `/status` | Get subscription status | Yes |
| POST | `/cancel` | Cancel subscription | Yes (Premium) |
| POST | `/webhook` | Stripe webhook handler | No |
| GET | `/plans` | Get available plans | No |

### Amazon Products (`/api/amazon`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | Get product recommendations | Optional |
| GET | `/search` | Search products | Optional |
| GET | `/categories` | Get product categories | Optional |
| POST | `/track-click` | Track affiliate clicks | Optional |

## 📊 Rate Limiting

- **Free Users**: 3 recipe generations per day
- **Premium Users**: Unlimited recipe generations
- **General API**: 100 requests per 15 minutes per IP
- **Auth Endpoints**: 10 requests per 15 minutes per IP
- **Webhooks**: 10 requests per minute

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin request protection
- **Input Validation**: joi and express-validator
- **Rate Limiting**: express-rate-limit
- **Error Handling**: Centralized error management
- **Logging**: Comprehensive request/error logging

## 📝 Request Examples

### Generate Recipe

```bash
curl -X POST http://localhost:3000/api/recipe/generate-recipe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "ingredients": "chicken breast, onions, garlic, rice",
    "cuisine": "asian",
    "cookingTime": "medium",
    "dietary": "high-protein",
    "skillLevel": "beginner"
  }'
```

### Create Subscription

```bash
curl -X POST http://localhost:3000/api/subscription/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "plan": "premium"
  }'
```

### Get Amazon Products

```bash
curl "http://localhost:3000/api/amazon/products?cuisine=korean&limit=5"
```

## 🚀 Deployment

### Quick Deployment to Vercel

#### Prerequisites
- [Vercel CLI](https://vercel.com/cli) installed: `npm i -g vercel`
- [Git](https://git-scm.com/) repository
- All required environment variables configured

#### 1. One-Click Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/ai-recipe-chef)

#### 2. Manual Deployment

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Clone and setup project
git clone https://github.com/your-username/ai-recipe-chef
cd ai-recipe-chef
npm install

# 3. Login to Vercel
vercel login

# 4. Deploy to preview
vercel

# 5. Deploy to production
vercel --prod
```

### Environment Variables Setup

#### Required Variables
Set these in Vercel Dashboard (Settings → Environment Variables):

```bash
# Core API Keys (REQUIRED)
OPENAI_API_KEY=sk-your-openai-api-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Payment Processing (REQUIRED)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_PREMIUM_PRICE_ID=price_your-premium-price-id

# App Configuration (REQUIRED)
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
JWT_SECRET=your-super-secure-32-char-secret
```

#### Using Vercel CLI for Environment Variables

```bash
# Set individual variables
vercel env add OPENAI_API_KEY
vercel env add SUPABASE_URL
vercel env add STRIPE_SECRET_KEY

# Pull environment variables to local
vercel env pull .env.local

# List all environment variables
vercel env ls
```

### Database Setup (Supabase)

#### 1. Create Supabase Project
```bash
# Visit https://supabase.com/dashboard
# Create new project
# Note down your project URL and keys
```

#### 2. Run Database Schema
```sql
-- Copy and paste the contents of database-schema.sql
-- into your Supabase SQL editor and run
```

#### 3. Configure Row Level Security
```sql
-- RLS policies are included in database-schema.sql
-- Ensure they are applied correctly
```

### Stripe Configuration

#### 1. Create Products and Prices
```bash
# In Stripe Dashboard:
# 1. Products → Create Product: "AI Recipe Chef Premium"
# 2. Add Price: $9.99/month recurring
# 3. Copy the price ID (starts with price_)
```

#### 2. Configure Webhooks
```bash
# Webhook URL: https://your-app.vercel.app/api/subscription/webhook
# Events to listen for:
# - checkout.session.completed
# - customer.subscription.created
# - customer.subscription.updated
# - customer.subscription.deleted
# - invoice.payment_succeeded
# - invoice.payment_failed
```

### Domain Configuration

#### Custom Domain Setup
```bash
# 1. In Vercel Dashboard → Domains
# 2. Add your custom domain
# 3. Configure DNS records
# 4. Update FRONTEND_URL and ALLOWED_ORIGINS
```

#### SSL Certificate
Vercel automatically provides SSL certificates for all deployments.

### Performance Optimization

#### 1. Enable Caching
```javascript
// Headers are configured in vercel.json
// Static assets: 1 year cache
// API responses: No cache for dynamic content
```

#### 2. Function Optimization
```bash
# Functions are automatically optimized
# Max duration: 30 seconds (configured in vercel.json)
# Region: iad1 (US East) for optimal performance
```

### Monitoring Setup

#### 1. Vercel Analytics
```bash
# Enable in Vercel Dashboard → Analytics
# Real-time performance metrics
```

#### 2. Error Tracking (Optional)
```bash
# Add Sentry DSN to environment variables
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

#### 3. Uptime Monitoring
```bash
# Health check endpoint: /api/health
# Use services like UptimeRobot or Pingdom
```

### Alternative Deployment Options

#### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t ai-recipe-chef .
docker run -p 3000:3000 --env-file .env ai-recipe-chef
```

#### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

#### Heroku Deployment
```bash
# Install Heroku CLI
# Create Procfile
echo "web: npm start" > Procfile

# Deploy
heroku create your-app-name
git push heroku main
```

### Post-Deployment Checklist

#### ✅ Verify Core Functionality
- [ ] Frontend loads correctly
- [ ] API health check: `GET /api/health`
- [ ] User registration works
- [ ] Recipe generation works
- [ ] Payment flow works (test mode first)

#### ✅ Test Integrations
- [ ] OpenAI API calls successful
- [ ] Supabase authentication works
- [ ] Stripe payments process correctly
- [ ] Email notifications sent (if enabled)

#### ✅ Security Verification
- [ ] All environment variables set correctly
- [ ] HTTPS enabled and working
- [ ] CORS configured properly
- [ ] Rate limiting active
- [ ] Input validation working

#### ✅ Performance Check
- [ ] Page load times < 3 seconds
- [ ] API response times < 2 seconds
- [ ] Images and assets loading quickly
- [ ] Mobile responsiveness verified

### Troubleshooting

#### Common Deployment Issues

**Build Failures:**
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
npm run clean
npm install

# Check for missing dependencies
npm audit
```

**Environment Variable Issues:**
```bash
# Verify variables are set
vercel env ls

# Pull latest environment variables
vercel env pull .env.local

# Test locally with production environment
npm run preview
```

**Database Connection Issues:**
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     "https://your-project.supabase.co/rest/v1/users?select=*"
```

**Payment Processing Issues:**
```bash
# Test Stripe webhook
stripe listen --forward-to your-app.vercel.app/api/subscription/webhook

# Verify webhook secret matches
echo $STRIPE_WEBHOOK_SECRET
```

#### Logs and Debugging
```bash
# View Vercel function logs
vercel logs

# View real-time logs
vercel logs --follow

# View specific function logs
vercel logs --since 24h
```

### Scaling Considerations

#### Traffic Scaling
- Vercel automatically scales serverless functions
- Consider upgrading to Vercel Pro for higher limits
- Monitor function execution time and memory usage

#### Database Scaling
- Supabase automatically handles connection pooling
- Consider upgrading Supabase plan for higher limits
- Implement database caching for frequently accessed data

#### Cost Optimization
- Monitor Vercel function usage
- Optimize API endpoints for performance
- Implement proper caching strategies
- Use rate limiting to prevent abuse

## 📊 Monitoring

- **Logs**: Check `logs/` directory for error and combined logs
- **Health Check**: GET `/api/health`
- **Metrics**: Consider adding Prometheus/Grafana for production

## 🔧 Development

```bash
# Install dev dependencies
npm install

# Run in development mode (with nodemon)
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Verify environment variables are set correctly
3. Check Supabase, Stripe, and OpenAI dashboard for service status
4. Review API documentation for correct request formats

## 🔄 API Versioning

Current version: v1

Future versions will be backward compatible or provide migration guides.