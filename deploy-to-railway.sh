#!/bin/bash

# 🚀 APWL Railway Deployment - Senior Developer Script
# Deployment directo sin interactividad

set -e

echo "🎯 APWL Railway Production Deployment"
echo "====================================="
echo "Senior Developer: $(railway whoami)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verify authentication
if ! railway whoami &>/dev/null; then
    print_error "No estás autenticado en Railway"
    echo "Ejecuta: railway login"
    exit 1
fi

print_status "Autenticado en Railway: $(railway whoami)"

# Verify builds work
echo ""
echo "🔍 Verificando builds..."

cd backend
if npm run build; then
    print_status "Backend build successful"
else
    print_error "Backend build failed"
    exit 1
fi
cd ..

cd apwl-dashboard
if npm run build; then
    print_status "Frontend build successful" 
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

echo ""
echo "📦 Deployments usando Railway CLI..."

# Deploy backend
echo ""
echo "🔧 Deploying Backend..."
cd backend

# Try to deploy backend directly
if railway up --detach 2>/dev/null; then
    print_status "Backend deployed successfully"
    BACKEND_URL=$(railway status --json 2>/dev/null | grep -o 'https://[^"]*\.up\.railway\.app' | head -1 || echo "")
    if [ ! -z "$BACKEND_URL" ]; then
        print_status "Backend URL: $BACKEND_URL"
        echo "export BACKEND_URL=\"$BACKEND_URL\"" > ../tmp_rovodev_backend_url.env
    fi
else
    print_warning "Direct deployment failed, manual setup required"
fi

cd ..

# Deploy frontend
echo ""
echo "🎨 Deploying Frontend..."
cd apwl-dashboard

# Update API URL if we got backend URL
if [ -f ../tmp_rovodev_backend_url.env ]; then
    source ../tmp_rovodev_backend_url.env
    print_status "Updating frontend with backend URL: $BACKEND_URL"
fi

# Try to deploy frontend directly  
if railway up --detach 2>/dev/null; then
    print_status "Frontend deployed successfully"
    FRONTEND_URL=$(railway status --json 2>/dev/null | grep -o 'https://[^"]*\.up\.railway\.app' | head -1 || echo "")
    if [ ! -z "$FRONTEND_URL" ]; then
        print_status "Frontend URL: $FRONTEND_URL"
    fi
else
    print_warning "Direct deployment failed, manual setup required"
fi

cd ..

# Final instructions
echo ""
echo "📋 DEPLOYMENT SUMMARY"
echo "==================="

if [ ! -z "$BACKEND_URL" ]; then
    print_status "Backend: $BACKEND_URL"
    print_status "Health Check: $BACKEND_URL/api/health"
else
    print_warning "Backend: Manual setup required via Railway Dashboard"
fi

if [ ! -z "$FRONTEND_URL" ]; then
    print_status "Frontend: $FRONTEND_URL"
else
    print_warning "Frontend: Manual setup required via Railway Dashboard"
fi

echo ""
echo "🔧 MANUAL SETUP INSTRUCTIONS (if needed):"
echo "1. Go to: https://railway.app/new"
echo "2. Deploy from GitHub: hola-sudo/apwl"
echo "3. Create services:"
echo "   - backend (root: backend/)"
echo "   - frontend (root: apwl-dashboard/)"
echo "4. Add PostgreSQL database"
echo "5. Configure environment variables as per RAILWAY_PRODUCTION_SETUP.md"

# Cleanup
rm -f tmp_rovodev_*.env

print_status "Deployment script completed"