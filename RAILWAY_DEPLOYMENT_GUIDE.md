# 🚀 Railway Deployment Guide - APWL Project

## 📋 **DEPLOYMENT CHECKLIST**

### **1. Railway Project Setup**
- [ ] Create new Railway project: `apwl-production`
- [ ] Connect GitHub repository: `hola-sudo/apwl`
- [ ] Create two services from repository

### **2. Backend Service Configuration**
**Service Name:** `backend`
**Root Directory:** `/backend`
**Build Command:** `npm run build` (auto-detected from railway.toml)
**Start Command:** `npm run start` (auto-detected from railway.toml)

**Required Environment Variables:**
```
DATABASE_URL=<Railway PostgreSQL URL>
OPENAI_API_KEY=<Your OpenAI API Key>
PORT=8080
NODE_ENV=production
```

### **3. Frontend Service Configuration**
**Service Name:** `frontend`
**Root Directory:** `/apwl-dashboard`
**Build Command:** `npm run build` (auto-detected from railway.toml)
**Start Command:** `npx serve dist -s` (auto-detected from railway.toml)

**Required Environment Variables:**
```
VITE_API_KEY=frontend-admin-key-2024
VITE_API_BASE_URL=<Backend Railway URL>
```

### **4. Database Setup**
- [ ] Add PostgreSQL plugin to Railway project
- [ ] Copy DATABASE_URL to backend service environment
- [ ] Run database migration: `npx prisma migrate deploy`

### **5. Post-Deployment Verification**
- [ ] Backend health check: `GET /api/health`
- [ ] Frontend loads correctly
- [ ] API connectivity test
- [ ] Authentication flow test

## 🔗 **EXPECTED URLS**
- Backend: `https://backend-production-<id>.up.railway.app`
- Frontend: `https://frontend-production-<id>.up.railway.app`

---
*Generated automatically for APWL deployment*