#!/bin/bash

echo "🚀 Iniciando desarrollo local del sistema de plantillas"
echo "=================================================="

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# 1. Verificar dependencias
echo "📦 Verificando dependencias..."
if [ ! -d "node_modules" ]; then
    echo "🔄 Instalando dependencias del backend..."
    npm install
fi

if [ ! -d "admin-dashboard/node_modules" ]; then
    echo "🔄 Instalando dependencias del frontend..."
    cd admin-dashboard && npm install && cd ..
fi

# 2. Verificar archivo .env
if [ ! -f ".env" ]; then
    echo "⚙️ Creando archivo .env..."
    cat > .env << 'EOF'
# Database
DATABASE_URL="file:./dev.db"

# OpenAI
OPENAI_API_KEY="${OPENAI_API_KEY:-your-openai-api-key-here}"

# Environment
NODE_ENV=development
API_BASE_URL="http://localhost:3000"
PORT=3000
EOF
    echo "✅ Archivo .env creado"
else
    echo "✅ Archivo .env encontrado"
fi

# 3. Configurar base de datos
echo "🗄️ Configurando base de datos..."
npx prisma generate
npx prisma db push

# 4. Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p uploads/templates
mkdir -p uploads/temp

# 5. Verificar que multer esté instalado
if ! npm list multer &> /dev/null; then
    echo "📦 Instalando multer..."
    npm install multer @types/multer
fi

# 6. Iniciar servicios en paralelo
echo ""
echo "🔄 Iniciando servicios..."
echo "=================================================="

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    jobs -p | xargs -r kill
    exit
}

trap cleanup SIGINT SIGTERM

# Backend en puerto 3000
echo "🔧 Iniciando backend en puerto 3000..."
npm run dev &
BACKEND_PID=$!

# Esperar un poco para que el backend inicie
sleep 3

# Frontend en puerto 3001
echo "🌐 Iniciando frontend en puerto 3001..."
cd admin-dashboard
PORT=3001 npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ SERVICIOS INICIADOS:"
echo "=================================================="
echo "   🔧 Backend:      http://localhost:3000"
echo "   🔧 API Health:   http://localhost:3000/health"
echo "   🌐 Frontend:     http://localhost:3001"
echo "   🗄️ Prisma Studio: npx prisma studio"
echo ""
echo "📋 ENDPOINTS DISPONIBLES:"
echo "   📤 Upload Template: POST /api/admin/templates/upload"
echo "   📋 List Templates:  GET /api/admin/templates/:clientId"
echo "   🤖 Agent Template:  GET /api/admin/templates/agents/:clientId/templates/:type"
echo ""
echo "🧪 PARA PROBAR:"
echo "   1. Abre http://localhost:3001"
echo "   2. Crea un cliente"
echo "   3. Ve a la pestaña 'Plantillas de Contrato'"
echo "   4. Sube una plantilla .md"
echo ""
echo "⏹️  Presiona Ctrl+C para detener todos los servicios"
echo "=================================================="

# Mantener script activo
wait