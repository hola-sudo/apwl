#!/bin/bash

# Railway Project Setup Script
# Para ejecutar como senior developer con acceso completo

set -e

echo "🚀 APWL Project - Railway Setup Completo"
echo "========================================"

# Verificar autenticación
if ! railway whoami &>/dev/null; then
    echo "❌ No estás autenticado en Railway"
    echo "Ejecuta: railway login"
    exit 1
fi

echo "✅ Autenticado como: $(railway whoami)"

# Crear proyecto nuevo desde CLI
echo ""
echo "📦 Creando nuevo proyecto Railway..."

# Crear un nombre único para el proyecto
PROJECT_NAME="apwl-production-$(date +%s)"

# Crear proyecto usando la nueva estructura
echo "Proyecto: $PROJECT_NAME"

# Crear proyecto con railway init en modo no interactivo
export RAILWAY_PROJECT_NAME="$PROJECT_NAME"

# Alternativa: usar curl directo a Railway API
echo ""
echo "🔧 Configurando servicios..."

# Crear archivos temporales para configuración
cat > tmp_rovodev_backend_config.json << EOF
{
  "name": "backend",
  "source": {
    "type": "github",
    "repo": "hola-sudo/apwl",
    "branch": "main",
    "rootDirectory": "backend"
  },
  "variables": {
    "NODE_ENV": "production",
    "PORT": "8080"
  }
}
EOF

cat > tmp_rovodev_frontend_config.json << EOF
{
  "name": "frontend", 
  "source": {
    "type": "github",
    "repo": "hola-sudo/apwl", 
    "branch": "main",
    "rootDirectory": "apwl-dashboard"
  },
  "variables": {
    "VITE_API_KEY": "frontend-admin-key-2024"
  }
}
EOF

echo ""
echo "📋 Configuración lista para deployment manual en Railway Dashboard"
echo ""
echo "SIGUIENTE PASO MANUAL:"
echo "1. Ve a: https://railway.app/new"
echo "2. Selecciona 'Deploy from GitHub repo'"
echo "3. Conecta: hola-sudo/apwl"
echo "4. Crea 2 servicios:"
echo "   - Backend (Root: backend/)"
echo "   - Frontend (Root: apwl-dashboard/)"
echo "5. Agrega PostgreSQL database"
echo ""

# Limpiar archivos temporales
rm -f tmp_rovodev_*.json

echo "✅ Script completado. Continúa con deployment manual."