# ✅ Configuración Railway Frontend APWL - Estado Actual

## 📊 Resumen de Verificación

### ✅ Archivos Configurados Correctamente:

1. **railway.toml** (`apwl-dashboard/railway.toml`):
   ```toml
   [build]
   builder = "nixpacks"
   
   [deploy]
   startCommand = "npx serve dist -s"
   ```
   ✅ **CORRECTO** - Pusheado a GitHub

2. **package.json** (`apwl-dashboard/package.json`):
   - ✅ Script `build` existe: `"build": "tsc -b && vite build"`
   - ✅ `serve` está en dependencies: `"serve": "^14.2.5"`

3. **Código Frontend** (`apwl-dashboard/src/services/api.ts`):
   - ✅ Usa `import.meta.env.VITE_API_KEY`
   - ✅ Usa `import.meta.env.VITE_API_BASE_URL`
   - ✅ Fallback a valores por defecto si no están configuradas

4. **Repositorio GitHub**:
   - ✅ URL: https://github.com/hola-sudo/apwl
   - ✅ Branch: `main`
   - ✅ Todos los cambios pusheados

## 🚀 Pasos para Completar en Railway Dashboard

### Paso 1: Conectar Repositorio (si no está conectado)

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Si ya tienes el proyecto `contract-processor`, ve al paso 2
3. Si no, click en **"New Project"** → **"Deploy from GitHub repo"**
4. Selecciona: `hola-sudo/apwl`
5. Railway detectará automáticamente el repositorio

### Paso 2: Crear/Configurar Servicio Frontend

1. En tu proyecto Railway, click en **"New Service"** → **"GitHub Repo"**
2. Selecciona nuevamente: `hola-sudo/apwl`
3. En la configuración del servicio:
   - **Service Name**: `apwl` (o el nombre que prefieras)
   - **Root Directory**: `apwl-dashboard` ⚠️ **MUY IMPORTANTE**
   - **Branch**: `main`
   - **Build Command**: Railway detectará automáticamente desde `railway.toml`
   - **Start Command**: Railway detectará automáticamente desde `railway.toml`

### Paso 3: Configurar Variables de Entorno

En la pestaña **"Variables"** del servicio frontend, agrega estas variables:

```
VITE_API_KEY=frontend-admin-key-2024
VITE_API_BASE_URL=https://backend-production-5f9b.up.railway.app
```

**⚠️ IMPORTANTE**: Las variables que empiezan con `VITE_` deben estar disponibles en tiempo de BUILD, no solo en runtime.

### Paso 4: Forzar Deployment

1. Ve a la pestaña **"Deployments"** del servicio `apwl`
2. Click en **"Redeploy"** o **"Deploy Latest"**
3. Selecciona el commit más reciente de la rama `main`
4. Espera a que el deployment termine

### Paso 5: Verificar Deployment

Una vez completado el deployment:

1. **URL del servicio**: Debería estar disponible en algo como:
   - `https://apwl-production.up.railway.app` (o la URL que Railway asigne)

2. **Verificar archivos servidos**:
   - Abre la URL en el navegador
   - Verifica en DevTools → Network que se carguen:
     - `index.html`
     - `assets/index-[hash].js` (ej: `index-Dwdt3UJf.js`)
     - `assets/index-[hash].css`

3. **Verificar funcionalidad**:
   - El frontend debería cargar correctamente
   - Debería poder conectarse al backend en `https://backend-production-5f9b.up.railway.app`
   - El login/auth debería funcionar con la API key configurada

## 🔍 Verificación Post-Deployment

### Verificar Logs en Railway:

1. Ve a Railway Dashboard → Servicio `apwl` → Deployments → [último deployment] → Logs
2. Deberías ver:
   - ✅ Build exitoso: `npm run build`
   - ✅ Archivos generados en `dist/`
   - ✅ Servidor iniciado: `npx serve dist -s`
   - ✅ Puerto asignado por Railway

### Verificar Variables de Entorno:

En Railway Dashboard → Servicio `apwl` → Variables, verifica que estén:
- ✅ `VITE_API_KEY=frontend-admin-key-2024`
- ✅ `VITE_API_BASE_URL=https://backend-production-5f9b.up.railway.app`

## 🚨 Troubleshooting

### Si el build falla:

1. **Verifica Root Directory**: Debe ser exactamente `apwl-dashboard`
2. **Verifica railway.toml**: Debe estar en `apwl-dashboard/railway.toml`
3. **Revisa logs**: Railway Dashboard → Deployments → Logs

### Si el frontend no carga:

1. **Verifica que `serve` esté instalado**: Debería estar en `package.json` dependencies ✅
2. **Verifica el comando de inicio**: Debe ser `npx serve dist -s`
3. **Verifica el puerto**: Railway asigna automáticamente `PORT`, `serve` lo detecta

### Si las variables de entorno no funcionan:

1. **Verifica que empiecen con `VITE_`**: Solo las variables `VITE_*` están disponibles en el código
2. **Verifica que estén en Variables del servicio**: No en Variables del proyecto
3. **Redeploy después de agregar variables**: Las variables `VITE_*` se inyectan en tiempo de build

## ✅ Checklist Final

- [ ] Repositorio GitHub conectado a Railway
- [ ] Servicio `apwl` creado con Root Directory `apwl-dashboard`
- [ ] Variables de entorno configuradas:
  - [ ] `VITE_API_KEY=frontend-admin-key-2024`
  - [ ] `VITE_API_BASE_URL=https://backend-production-5f9b.up.railway.app`
- [ ] Deployment completado exitosamente
- [ ] Frontend accesible en la URL de Railway
- [ ] Frontend se conecta correctamente al backend
- [ ] Auth/login funciona correctamente

## 📝 Notas Técnicas

- **Builder**: Railway usará `nixpacks` para detectar automáticamente Node.js y ejecutar `npm install` y `npm run build`
- **Start Command**: `npx serve dist -s` sirve los archivos estáticos del directorio `dist`
- **SPA Routing**: El flag `-s` hace que todas las rutas sirvan `index.html` (necesario para React Router)
- **Variables VITE_**: Se inyectan en tiempo de build, no en runtime. Si cambias variables, necesitas redeploy.

## 🎯 Estado Actual del Código

✅ Todo el código está listo y pusheado a GitHub
✅ `railway.toml` configurado correctamente
✅ Variables de entorno siendo usadas en el código
✅ Dependencies correctas en `package.json`

**Solo falta configurar el servicio en Railway Dashboard siguiendo los pasos arriba.**

