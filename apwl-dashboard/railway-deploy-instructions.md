# 🚀 INSTRUCCIONES EXACTAS PARA RAILWAY DASHBOARD

## Problema identificado:
Railway CLI está enviando deployments al servicio BACKEND en lugar del FRONTEND.

## Solución - Deploy desde GitHub:

### 1. Acceder a Railway Dashboard
```
URL: https://railway.app/dashboard
Buscar proyecto: hola-sudo/apwl
```

### 2. Configurar servicio frontend
```
- Buscar servicio que sirve: frontend-production-5f9b.up.railway.app
- Configurar: Deploy from GitHub
- Repositorio: hola-sudo/apwl
- Root Directory: apwl-dashboard
- Branch: main
```

### 3. Variables de entorno requeridas:
```
VITE_API_KEY=frontend-admin-key-2024
VITE_API_BASE_URL=https://backend-production-5f9b.up.railway.app
```

### 4. Verificar railway.toml:
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npx serve dist -s"
```

### 5. Verification checklist:
- [ ] Bundle nuevo: index-Dwdt3UJf.js
- [ ] URL corregida: /api/admin/health
- [ ] Serve funcionando: 200 OK
- [ ] API Key: frontend-admin-key-2024 válida

## Build actual listo:
- ✅ dist/ folder: 268KB
- ✅ serve dependency: installed
- ✅ railway.toml: configured
- ✅ Local test: 200 OK