#!/bin/bash

echo "🚀 Desplegando Frontend a Railway..."

# Backup railway.json original
if [ -f "railway.json" ]; then
    cp railway.json railway.json.backup
    echo "✅ Backup del railway.json original creado"
fi

# Usar configuración de frontend
cp railway.frontend.json railway.json
echo "✅ Configuración de frontend aplicada"

# Deploy con Railway CLI
echo "📤 Iniciando deployment..."
railway up

# Restaurar configuración original
if [ -f "railway.json.backup" ]; then
    mv railway.json.backup railway.json
    echo "✅ Configuración original restaurada"
fi

echo "🎉 Deployment completado!"
echo "🌐 Revisa tu Railway dashboard para ver el frontend funcionando"