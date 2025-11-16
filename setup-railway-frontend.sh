#!/bin/bash

echo "🚀 Configurando Frontend APWL en Railway"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -d "apwl-dashboard" ]; then
    echo -e "${RED}❌ Error: Ejecuta este script desde el directorio raíz del proyecto${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Instrucciones para configurar Railway desde el Dashboard:${NC}"
echo ""
echo "1. Ve a: https://railway.app/dashboard"
echo "2. Selecciona tu proyecto: contract-processor"
echo "3. Click en 'New Service' → 'GitHub Repo'"
echo "4. Selecciona: hola-sudo/apwl"
echo "5. Configura:"
echo "   - Service Name: apwl"
echo "   - Root Directory: apwl-dashboard"
echo "   - Branch: main"
echo ""
echo "6. En la pestaña 'Variables', agrega:"
echo "   VITE_API_KEY=frontend-admin-key-2024"
echo "   VITE_API_BASE_URL=https://backend-production-5f9b.up.railway.app"
echo ""
echo "7. Click en 'Deploy' o 'Redeploy'"
echo ""

# Intentar verificar si Railway CLI está configurado
if command -v railway &> /dev/null; then
    echo -e "${GREEN}✅ Railway CLI detectado${NC}"
    echo ""
    echo "Intentando configurar desde CLI..."
    echo ""
    
    # Cambiar al directorio del frontend
    cd apwl-dashboard
    
    # Intentar vincular al servicio frontend (puede fallar si no existe)
    echo "Intentando vincular al servicio frontend..."
    railway service 2>&1 | head -5 || echo "Servicio no encontrado, créalo desde el dashboard"
    
    # Intentar configurar variables (puede fallar si no hay servicio vinculado)
    echo ""
    echo "Intentando configurar variables de entorno..."
    railway variables set VITE_API_KEY=frontend-admin-key-2024 2>&1 || echo "No se pudo configurar desde CLI"
    railway variables set VITE_API_BASE_URL=https://backend-production-5f9b.up.railway.app 2>&1 || echo "No se pudo configurar desde CLI"
    
    echo ""
    echo -e "${YELLOW}⚠️  Si los comandos CLI fallaron, configura manualmente desde el dashboard${NC}"
    
    cd ..
else
    echo -e "${YELLOW}⚠️  Railway CLI no está instalado${NC}"
    echo "Instala con: brew install railway"
fi

echo ""
echo -e "${GREEN}✅ Verificación de archivos:${NC}"
echo ""

# Verificar railway.toml
if [ -f "apwl-dashboard/railway.toml" ]; then
    echo -e "${GREEN}✓ railway.toml existe${NC}"
    if grep -q "builder = \"nixpacks\"" apwl-dashboard/railway.toml; then
        echo -e "${GREEN}✓ Builder configurado como nixpacks${NC}"
    else
        echo -e "${RED}✗ Builder no está configurado correctamente${NC}"
    fi
else
    echo -e "${RED}✗ railway.toml no encontrado${NC}"
fi

# Verificar package.json
if [ -f "apwl-dashboard/package.json" ]; then
    if grep -q "\"serve\"" apwl-dashboard/package.json; then
        echo -e "${GREEN}✓ serve está en dependencies${NC}"
    else
        echo -e "${RED}✗ serve NO está en dependencies${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎯 Una vez configurado en Railway Dashboard:${NC}"
echo "   - El deployment se iniciará automáticamente"
echo "   - Verifica los logs en Railway Dashboard → Deployments"
echo "   - La URL estará disponible en: https://apwl-production.up.railway.app"
echo ""
echo "✅ Configuración completada!"

