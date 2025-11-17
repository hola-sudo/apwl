#!/bin/bash

# Railway Deployment Script for APWL
# This script helps deploy backend and frontend to Railway

set -e

echo "🚀 APWL Railway Deployment Script"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if Railway is linked
if ! railway status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway project not linked${NC}"
    echo "Please link your Railway project first:"
    echo "  1. Go to Railway Dashboard: https://railway.app/dashboard"
    echo "  2. Create a new project or select existing one"
    echo "  3. Run: railway link"
    echo ""
    echo "Or configure via Railway Dashboard (see DEPLOYMENT_GUIDE.md)"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI configured${NC}"
echo ""

# Function to deploy backend
deploy_backend() {
    echo -e "${YELLOW}📦 Deploying Backend...${NC}"
    cd backend
    
    # Check if DATABASE_URL is set
    if ! railway variables | grep -q "DATABASE_URL"; then
        echo -e "${RED}❌ DATABASE_URL not configured${NC}"
        echo "Please set DATABASE_URL in Railway Dashboard or run:"
        echo "  railway variables --set 'DATABASE_URL=your-postgres-url'"
        exit 1
    fi
    
    echo "Running Prisma migrations..."
    railway run npx prisma migrate deploy
    
    echo "Deploying backend..."
    railway up
    
    cd ..
    echo -e "${GREEN}✅ Backend deployment initiated${NC}"
}

# Function to deploy frontend
deploy_frontend() {
    echo -e "${YELLOW}🌐 Deploying Frontend...${NC}"
    cd apwl-dashboard
    
    # Check if VITE_API_BASE_URL is set
    if ! railway variables | grep -q "VITE_API_BASE_URL"; then
        echo -e "${YELLOW}⚠️  VITE_API_BASE_URL not configured${NC}"
        echo "Please set VITE_API_BASE_URL to your backend URL"
    fi
    
    echo "Deploying frontend..."
    railway up
    
    cd ..
    echo -e "${GREEN}✅ Frontend deployment initiated${NC}"
}

# Main menu
case "${1:-}" in
    backend)
        deploy_backend
        ;;
    frontend)
        deploy_frontend
        ;;
    all)
        deploy_backend
        echo ""
        deploy_frontend
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        echo ""
        echo "Options:"
        echo "  backend   - Deploy only backend"
        echo "  frontend  - Deploy only frontend"
        echo "  all       - Deploy both backend and frontend"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo "Check Railway Dashboard for deployment status and URLs"

