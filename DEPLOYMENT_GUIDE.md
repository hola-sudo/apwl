# Railway Deployment Guide - APWL

This guide walks you through deploying the APWL backend and frontend to Railway.

## Prerequisites

1. Railway account: https://railway.app
2. Railway CLI installed: `npm install -g @railway/cli`
3. Railway CLI authenticated: `railway login`

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose repository: `hola-sudo/apwl`
5. Railway will detect the repository

## Step 2: Create PostgreSQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will create a PostgreSQL database
3. Copy the `DATABASE_URL` connection string (you'll need it in Step 3)

## Step 3: Create Backend Service

1. In your Railway project, click **"New Service"** → **"GitHub Repo"**
2. Select: `hola-sudo/apwl`
3. Configure the service:
   - **Name**: `backend` (or `apwl-backend`)
   - **Root Directory**: `backend`
   - **Branch**: `main`

## Step 4: Configure Backend Environment Variables

In the backend service, go to **"Variables"** tab and add:

```
DATABASE_URL=<your-postgresql-connection-string-from-step-2>
OPENAI_API_KEY=sk-test-placeholder
PORT=8080
NODE_ENV=production
```

**Important**: Replace `<your-postgresql-connection-string-from-step-2>` with the actual DATABASE_URL from Step 2.

## Step 5: Run Prisma Migrations

1. In Railway Dashboard, go to your backend service
2. Click on **"Deployments"** tab
3. Click **"New Deployment"** → **"Deploy from GitHub"**
4. Once deployed, go to **"Logs"** tab
5. Click **"Run Command"** or use Railway CLI:

```bash
cd backend
railway link  # Link to your backend service
railway run npx prisma migrate deploy
```

This will create all the database tables.

## Step 6: Deploy Backend

The backend should auto-deploy when you push to `main` branch. To manually deploy:

```bash
cd backend
railway link  # If not already linked
railway up
```

Or use the Railway Dashboard:
1. Go to backend service → **"Deployments"**
2. Click **"Redeploy"**

## Step 7: Get Backend URL

1. After deployment, Railway will assign a public URL
2. Go to backend service → **"Settings"** → **"Networking"**
3. Copy the **"Public Domain"** (e.g., `backend-production-xxxx.up.railway.app`)
4. Test the health endpoint: `https://your-backend-url.up.railway.app/health`

## Step 8: Create Frontend Service

1. In your Railway project, click **"New Service"** → **"GitHub Repo"**
2. Select: `hola-sudo/apwl`
3. Configure the service:
   - **Name**: `frontend` (or `apwl-frontend`)
   - **Root Directory**: `apwl-dashboard`
   - **Branch**: `main`

## Step 9: Configure Frontend Environment Variables

In the frontend service, go to **"Variables"** tab and add:

```
VITE_API_BASE_URL=https://your-backend-url.up.railway.app
VITE_API_KEY=frontend-admin-key-2024
```

**Important**: Replace `https://your-backend-url.up.railway.app` with the actual backend URL from Step 7.

## Step 10: Deploy Frontend

The frontend should auto-deploy when you push to `main` branch. To manually deploy:

```bash
cd apwl-dashboard
railway link  # Link to your frontend service
railway up
```

Or use the Railway Dashboard:
1. Go to frontend service → **"Deployments"**
2. Click **"Redeploy"**

## Step 11: Verify Deployment

1. **Backend Health Check**:
   ```bash
   curl https://your-backend-url.up.railway.app/health
   ```
   Should return: `{"status":"healthy",...}`

2. **Frontend**:
   - Open the frontend URL in browser
   - Check browser console for errors
   - Verify API calls are working

## Troubleshooting

### Backend Issues

- **Database connection errors**: Verify `DATABASE_URL` is correct and PostgreSQL is running
- **Migration errors**: Run `railway run npx prisma migrate deploy` again
- **Build errors**: Check logs in Railway Dashboard → Deployments → Logs

### Frontend Issues

- **API connection errors**: Verify `VITE_API_BASE_URL` points to correct backend URL
- **CORS errors**: Check backend CORS configuration in `backend/src/index.ts`
- **Build errors**: Check that `npm run build` works locally

### Railway CLI Issues

- **Not linked**: Run `railway link` in the service directory
- **Authentication**: Run `railway login`
- **Wrong project**: Check current project with `railway status`

## Quick Reference Commands

```bash
# Link to Railway project
railway link

# Set environment variables
railway variables --set "KEY=value"

# View environment variables
railway variables

# Run migrations
railway run npx prisma migrate deploy

# Deploy service
railway up

# View logs
railway logs

# Check status
railway status
```

## Next Steps

After successful deployment:
1. Update `DEPLOYMENT_STATUS.md` with your URLs
2. Test all endpoints from the frontend
3. Verify authentication flow works
4. Monitor logs for any errors

