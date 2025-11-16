#!/bin/bash

echo "🔍 Verificando configuración de Railway para APWL Frontend"
echo "=========================================================="
echo ""

# Verificar que railway.toml existe y está correcto
echo "✅ Verificando railway.toml..."
if [ -f "apwl-dashboard/railway.toml" ]; then
    echo "   ✓ railway.toml encontrado en apwl-dashboard/"
    if grep -q "builder = \"nixpacks\"" apwl-dashboard/railway.toml; then
        echo "   ✓ Builder configurado como nixpacks"
    else
        echo "   ✗ Builder no está configurado como nixpacks"
    fi
    if grep -q "startCommand = \"npx serve dist -s\"" apwl-dashboard/railway.toml; then
        echo "   ✓ startCommand configurado correctamente"
    else
        echo "   ✗ startCommand no está configurado correctamente"
    fi
else
    echo "   ✗ railway.toml no encontrado"
fi

echo ""
echo "✅ Verificando package.json del frontend..."
if [ -f "apwl-dashboard/package.json" ]; then
    if grep -q "\"serve\"" apwl-dashboard/package.json; then
        echo "   ✓ serve está en dependencies"
    else
        echo "   ✗ serve NO está en dependencies"
    fi
    if grep -q "\"build\"" apwl-dashboard/package.json; then
        echo "   ✓ Script build existe"
    else
        echo "   ✗ Script build NO existe"
    fi
else
    echo "   ✗ package.json no encontrado"
fi

echo ""
echo "✅ Verificando uso de variables de entorno en código..."
if grep -q "VITE_API_KEY" apwl-dashboard/src/services/api.ts; then
    echo "   ✓ VITE_API_KEY está siendo usado en el código"
else
    echo "   ✗ VITE_API_KEY NO está siendo usado"
fi

if grep -q "VITE_API_BASE_URL" apwl-dashboard/src/services/api.ts; then
    echo "   ✓ VITE_API_BASE_URL está siendo usado en el código"
else
    echo "   ✗ VITE_API_BASE_URL NO está siendo usado"
fi

echo ""
echo "📋 Variables de entorno requeridas en Railway:"
echo "   VITE_API_KEY=frontend-admin-key-2024"
echo "   VITE_API_BASE_URL=https://backend-production-5f9b.up.railway.app"
echo ""
echo "📋 Configuración requerida en Railway Dashboard:"
echo "   - Root Directory: apwl-dashboard"
echo "   - Branch: main"
echo "   - Service Name: apwl"
echo ""
echo "✅ Verificación completada!"
echo ""
echo "🚀 Próximos pasos:"
echo "   1. Ve a Railway Dashboard → New Project → Deploy from GitHub repo"
echo "   2. Selecciona: hola-sudo/apwl"
echo "   3. Configura Root Directory: apwl-dashboard"
echo "   4. Agrega las variables de entorno mencionadas arriba"
echo "   5. Haz click en Deploy"
echo ""

