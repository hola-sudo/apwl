# Railway Setup - Manual Steps Required

## Current Status

✅ Railway project "apwl" created: `4be8a337-39f8-4ebe-abef-44265fa0395f`
✅ Railway CLI authenticated
⚠️ Services need to be created via Railway Dashboard

## Required Manual Steps

Due to Railway CLI limitations with interactive prompts, please complete these steps in Railway Dashboard:

### Step 1: Open Railway Dashboard
```bash
railway open
```
Or visit: https://railway.app/project/4be8a337-39f8-4ebe-abef-44265fa0395f

### Step 2: Add PostgreSQL Database
1. In Railway Dashboard → Project "apwl"
2. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Railway will create PostgreSQL and automatically set `DATABASE_URL` variable

### Step 3: Create Backend Service
1. Click **"New Service"** → **"GitHub Repo"**
2. Select repository: `hola-sudo/apwl`
3. Configure:
   - **Root Directory**: `backend`
   - **Branch**: `main`
   - **Service Name**: `backend` (optional)

### Step 4: Configure Backend Environment Variables
In backend service → **Variables** tab, add:
```
OPENAI_API_KEY=sk-test-placeholder
PORT=8080
NODE_ENV=production
```
Note: `DATABASE_URL` will be automatically set when PostgreSQL is added.

### Step 5: Run Prisma Migrations
Once backend is deployed, run:
```bash
cd backend
railway link  # Link to backend service in project apwl
railway run npx prisma migrate deploy
```

### Step 6: Create Frontend Service
1. Click **"New Service"** → **"GitHub Repo"**
2. Select repository: `hola-sudo/apwl`
3. Configure:
   - **Root Directory**: `apwl-dashboard`
   - **Branch**: `main`
   - **Service Name**: `frontend` (optional)

### Step 7: Configure Frontend Environment Variables
In frontend service → **Variables** tab, add:
```
VITE_API_BASE_URL=<backend-url-from-step-5>
VITE_API_KEY=frontend-admin-key-2024
```

### Step 8: Get Backend URL
After backend deployment:
1. Go to backend service → **Settings** → **Networking**
2. Copy the **Public Domain** URL
3. Update frontend `VITE_API_BASE_URL` with this URL

## After Manual Setup

Once services are created via dashboard, run:

```bash
# Link backend service
cd backend
railway link  # Select backend service from project apwl
railway variables --set "OPENAI_API_KEY=sk-test-placeholder"
railway variables --set "PORT=8080"
railway run npx prisma migrate deploy
railway up

# Link frontend service  
cd ../apwl-dashboard
railway link  # Select frontend service from project apwl
railway variables --set "VITE_API_BASE_URL=<backend-url>"
railway variables --set "VITE_API_KEY=frontend-admin-key-2024"
railway up
```

## Verification

After deployment, verify with:
```bash
./scripts/verify-deployment.sh
```

