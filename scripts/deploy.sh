#!/bin/bash

# AI Recipe Chef - Deployment Script
# This script automates the deployment process to Vercel

set -e  # Exit on any error

echo "🚀 AI Recipe Chef - Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm and try again."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git and try again."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Install Vercel CLI if not present
install_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
        print_success "Vercel CLI installed"
    else
        print_success "Vercel CLI is already installed"
    fi
}

# Run pre-deployment checks
pre_deployment_checks() {
    print_status "Running pre-deployment checks..."
    
    # Check if .env.example exists
    if [ ! -f ".env.example" ]; then
        print_error ".env.example file not found"
        exit 1
    fi
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json file not found"
        exit 1
    fi
    
    # Check if vercel.json exists
    if [ ! -f "vercel.json" ]; then
        print_error "vercel.json file not found"
        exit 1
    fi
    
    print_success "Pre-deployment checks passed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Run tests and linting
run_tests() {
    print_status "Running tests and linting..."
    
    # Run linting if configured
    if npm run lint --silent 2>/dev/null; then
        print_success "Linting passed"
    else
        print_warning "Linting not configured or failed"
    fi
    
    # Run tests if configured
    if npm test --silent 2>/dev/null; then
        print_success "Tests passed"
    else
        print_warning "Tests not configured or failed"
    fi
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file with your actual values before deploying"
        
        # Prompt user to edit .env file
        read -p "Press enter to continue after editing .env file..."
    fi
    
    print_success "Environment setup complete"
}

# Deploy to Vercel
deploy_to_vercel() {
    local deployment_type=$1
    
    if [ "$deployment_type" = "production" ]; then
        print_status "Deploying to production..."
        vercel --prod
    else
        print_status "Deploying to preview..."
        vercel
    fi
    
    print_success "Deployment complete!"
}

# Set up environment variables in Vercel
setup_vercel_env() {
    print_status "Setting up Vercel environment variables..."
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Skipping automatic environment variable setup."
        print_warning "Please set environment variables manually in Vercel dashboard."
        return
    fi
    
    print_warning "Environment variables should be set manually in Vercel dashboard for security."
    print_warning "Visit: https://vercel.com/dashboard → Your Project → Settings → Environment Variables"
    
    echo ""
    echo "Required environment variables:"
    echo "- NODE_ENV"
    echo "- OPENAI_API_KEY"
    echo "- SUPABASE_URL"
    echo "- SUPABASE_ANON_KEY"
    echo "- SUPABASE_SERVICE_ROLE_KEY"
    echo "- STRIPE_SECRET_KEY"
    echo "- STRIPE_WEBHOOK_SECRET"
    echo "- STRIPE_PREMIUM_PRICE_ID"
    echo "- JWT_SECRET"
    echo "- FRONTEND_URL"
    echo ""
}

# Post-deployment verification
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Get deployment URL from Vercel
    DEPLOYMENT_URL=$(vercel ls | grep "ai-recipe-chef" | head -n1 | awk '{print $2}')
    
    if [ -z "$DEPLOYMENT_URL" ]; then
        print_warning "Could not determine deployment URL automatically"
        print_warning "Please verify your deployment manually"
        return
    fi
    
    print_status "Testing deployment at: https://$DEPLOYMENT_URL"
    
    # Test health endpoint
    if curl -s -f "https://$DEPLOYMENT_URL/api/health" > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        print_warning "Please check your deployment manually"
    fi
}

# Main deployment function
main() {
    echo ""
    print_status "Starting deployment process..."
    echo ""
    
    # Run all checks and deployment steps
    check_dependencies
    install_vercel_cli
    pre_deployment_checks
    install_dependencies
    run_tests
    setup_environment
    
    # Ask user for deployment type
    echo ""
    read -p "Deploy to production? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_to_vercel "production"
    else
        deploy_to_vercel "preview"
    fi
    
    setup_vercel_env
    verify_deployment
    
    echo ""
    print_success "🎉 Deployment script completed!"
    echo ""
    echo "Next steps:"
    echo "1. Set environment variables in Vercel dashboard"
    echo "2. Configure your database (see DEPLOYMENT.md)"
    echo "3. Set up Stripe webhooks"
    echo "4. Test your application thoroughly"
    echo ""
    echo "For detailed instructions, see:"
    echo "- README.md"
    echo "- DEPLOYMENT.md"
    echo ""
}

# Run main function
main "$@"