# Configuración del Frontend APWL en Railway

## ✅ Estado Actual

- ✅ Repositorio GitHub: https://github.com/hola-sudo/apwl
- ✅ `railway.toml` actualizado en `apwl-dashboard/` con builder nixpacks
- ✅ Código usa variables de entorno: `VITE_API_KEY` y `VITE_API_BASE_URL`
- ✅ Cambios pusheados a GitHub

## 📋 Pasos para Configurar en Railway Dashboard

### 1. Conectar Repositorio GitHub

1. Ve a [Railway Dashboard](https://railway.app/dashboard)
2. Click en **"New Project"** → **"Deploy from GitHub repo"**
3. Selecciona el repositorio: `hola-sudo/apwl`
4. Railway detectará automáticamente el repositorio

### 2. Crear/Configurar Servicio Frontend

1. En el proyecto, click en **"New Service"** → **"GitHub Repo"**
2. Selecciona nuevamente `hola-sudo/apwl`
3. En la configuración del servicio:
   - **Nombre del servicio**: `apwl` (o el que prefieras)
   - **Root Directory**: `apwl-dashboard`
   - **Branch**: `main`

### 3. Configurar Variables de Entorno

En la pestaña **"Variables"** del servicio frontend, agrega:

```
VITE_API_KEY=frontend-admin-key-2024
VITE_API_BASE_URL=https://backend-production-5f9b.up.railway.app
```

### 4. Verificar railway.toml

El archivo `apwl-dashboard/railway.toml` ya está configurado correctamente:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npx serve dist -s"
```

Railway detectará automáticamente este archivo cuando el Root Directory sea `apwl-dashboard`.

### 5. Forzar Deployment

1. Ve a la pestaña **"Deployments"** del servicio
2. Click en **"Redeploy"** o **"Deploy Latest"**
3. Selecciona el commit más reciente de la rama `main`
4. Espera a que el deployment termine (verás el progreso en tiempo real)

### 6. Verificar Deployment

Una vez completado, verifica:

1. **URL del servicio**: Debería estar en `https://apwl-production.up.railway.app` (o la URL que Railway asigne)
2. **Archivos servidos**: Verifica que `index-Dwdt3UJf.js` (o similar) esté disponible
3. **Funcionalidad**: Prueba el login con la API key configurada

## 🔍 Verificación Post-Deployment

### Verificar que el build fue exitoso:

```bash
# El build debería generar:
# - dist/index.html
# - dist/assets/index-[hash].js
# - dist/assets/index-[hash].css
```

### Verificar variables de entorno:

El código en `apwl-dashboard/src/services/api.ts` usa:
- `import.meta.env.VITE_API_KEY` → Debe ser `frontend-admin-key-2024`
- `import.meta.env.VITE_API_BASE_URL` → Debe ser `https://backend-production-5f9b.up.railway.app`

## 🚨 Troubleshooting

### Si el deployment falla:

1. Verifica los logs en Railway Dashboard → Deployments → [último deployment] → Logs
2. Asegúrate de que `Root Directory` esté configurado como `apwl-dashboard`
3. Verifica que las variables de entorno estén configuradas correctamente
4. Asegúrate de que `serve` esté en `dependencies` (ya está en package.json)

### Si el frontend no carga:

1. Verifica que `npx serve dist -s` esté ejecutándose correctamente
2. Revisa los logs del servicio en Railway
3. Verifica que el puerto esté configurado correctamente (Railway asigna automáticamente PORT)

## 📝 Notas Importantes

- Railway detecta automáticamente el `railway.toml` cuando el Root Directory está configurado
- Las variables `VITE_*` deben estar disponibles en tiempo de build
- El comando `npx serve dist -s` sirve los archivos estáticos del directorio `dist`
- El flag `-s` hace que sirva `index.html` para todas las rutas (SPA routing)

