#!/bin/bash

# AI Recipe Chef - Development Setup Script
# This script sets up the development environment

set -e  # Exit on any error

echo "🛠️ AI Recipe Chef - Development Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check Node.js version
check_node_version() {
    print_status "Checking Node.js version..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        print_error "Visit: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        print_error "Please update Node.js and try again."
        exit 1
    fi
    
    print_success "Node.js version: $(node --version) ✓"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependencies installed ✓"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment file..."
    
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "Please edit .env file with your actual API keys and configuration"
        print_warning "Required variables:"
        echo "  - OPENAI_API_KEY (get from https://platform.openai.com/api-keys)"
        echo "  - SUPABASE_URL (get from https://supabase.com/dashboard)"
        echo "  - SUPABASE_ANON_KEY (get from Supabase → Settings → API)"
        echo "  - STRIPE_SECRET_KEY (get from https://dashboard.stripe.com/apikeys)"
        echo "  - JWT_SECRET (generate a random 32+ character string)"
    else
        print_success ".env file already exists ✓"
    fi
}

# Create logs directory
setup_logs() {
    print_status "Setting up logs directory..."
    
    if [ ! -d "logs" ]; then
        mkdir logs
        print_success "Created logs directory ✓"
    else
        print_success "Logs directory already exists ✓"
    fi
}

# Run health check
health_check() {
    print_status "Running health check..."
    
    # Start server in background
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Test health endpoint
    if curl -s -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
        print_success "Server health check passed ✓"
    else
        print_warning "Server health check failed (this is expected if environment variables are not configured)"
    fi
    
    # Stop server
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
}

# Display next steps
show_next_steps() {
    echo ""
    print_success "🎉 Development setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your API keys (see .env.example for reference)"
    echo "2. Set up your Supabase database (see database-schema.sql)"
    echo "3. Configure Stripe products and webhooks"
    echo "4. Start development server: npm run dev"
    echo ""
    echo "Useful commands:"
    echo "  npm run dev        - Start development server"
    echo "  npm test          - Run tests"
    echo "  npm run lint      - Run linting"
    echo "  npm run build     - Build for production"
    echo ""
    echo "Documentation:"
    echo "  README.md         - Full project documentation"
    echo "  DEPLOYMENT.md     - Deployment guide"
    echo "  .env.example      - Environment variables reference"
    echo ""
}

# Main setup function
main() {
    echo ""
    print_status "Starting development setup..."
    echo ""
    
    check_node_version
    install_dependencies
    setup_environment
    setup_logs
    
    # Ask if user wants to run health check
    echo ""
    read -p "Run server health check? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        health_check
    fi
    
    show_next_steps
}

# Run main function
main "$@"