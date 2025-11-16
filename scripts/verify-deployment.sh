#!/bin/bash

set -e

echo "🔍 CONTRACT PROCESSOR - VERIFICACIÓN DE DEPLOYMENT"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Variables
BACKEND_SERVICE="backend"
FRONTEND_SERVICE="frontend"
TEST_RESULTS=""

# Función para obtener URLs de Railway
get_service_urls() {
    log_info "Obteniendo URLs de servicios..."
    
    # Obtener URL del backend
    railway service "$BACKEND_SERVICE" &> /dev/null
    BACKEND_URL=$(railway domain 2>/dev/null | grep -o 'https://[^[:space:]]*' | head -1)
    
    if [ -z "$BACKEND_URL" ]; then
        log_warning "URL del backend no encontrada. Verificando deployment..."
        BACKEND_URL=""
    else
        log_success "Backend URL: $BACKEND_URL"
    fi
    
    # Obtener URL del frontend
    cd admin-dashboard 2>/dev/null
    railway service "$FRONTEND_SERVICE" &> /dev/null
    FRONTEND_URL=$(railway domain 2>/dev/null | grep -o 'https://[^[:space:]]*' | head -1)
    cd .. 2>/dev/null
    
    if [ -z "$FRONTEND_URL" ]; then
        log_warning "URL del frontend no encontrada"
        FRONTEND_URL=""
    else
        log_success "Frontend URL: $FRONTEND_URL"
    fi
}

# Función para verificar variables de entorno
verify_environment_variables() {
    log_info "Verificando variables de entorno del backend..."
    
    railway service "$BACKEND_SERVICE" &> /dev/null
    VARS=$(railway variables --kv 2>/dev/null || echo "")
    
    # Verificar NODE_ENV
    if echo "$VARS" | grep -q "NODE_ENV=production"; then
        log_success "NODE_ENV configurado correctamente"
        TEST_RESULTS="$TEST_RESULTS✅ NODE_ENV: production\n"
    else
        log_error "NODE_ENV no configurado o incorrecto"
        TEST_RESULTS="$TEST_RESULTS❌ NODE_ENV: faltante/incorrecto\n"
    fi
    
    # Verificar OPENAI_API_KEY
    if echo "$VARS" | grep -q "OPENAI_API_KEY"; then
        OPENAI_KEY=$(echo "$VARS" | grep "OPENAI_API_KEY" | cut -d'=' -f2)
        if [[ "$OPENAI_KEY" == "sk-your-openai-key-here" ]]; then
            log_warning "OPENAI_API_KEY es placeholder - actualizar con clave real"
            TEST_RESULTS="$TEST_RESULTS⚠️  OPENAI_API_KEY: placeholder (actualizar)\n"
        else
            log_success "OPENAI_API_KEY configurado"
            TEST_RESULTS="$TEST_RESULTS✅ OPENAI_API_KEY: configurado\n"
        fi
    else
        log_error "OPENAI_API_KEY faltante"
        TEST_RESULTS="$TEST_RESULTS❌ OPENAI_API_KEY: faltante\n"
    fi
    
    # Verificar DATABASE_URL
    if echo "$VARS" | grep -q "DATABASE_URL"; then
        log_success "DATABASE_URL configurado"
        TEST_RESULTS="$TEST_RESULTS✅ DATABASE_URL: configurado\n"
    else
        log_error "DATABASE_URL faltante"
        TEST_RESULTS="$TEST_RESULTS❌ DATABASE_URL: faltante\n"
    fi
}

# Función para verificar conectividad de servicios
test_service_health() {
    local url=$1
    local service_name=$2
    local max_retries=3
    local retry_delay=5
    
    if [ -z "$url" ]; then
        log_error "$service_name: URL no disponible"
        TEST_RESULTS="$TEST_RESULTS❌ $service_name: URL no disponible\n"
        return 1
    fi
    
    log_info "Verificando salud de $service_name..."
    
    for i in $(seq 1 $max_retries); do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url/health" --max-time 15 2>/dev/null || echo "000")
        
        if [ "$status_code" = "200" ]; then
            log_success "$service_name: Health check OK (HTTP 200)"
            TEST_RESULTS="$TEST_RESULTS✅ $service_name Health: OK\n"
            return 0
        else
            log_warning "$service_name: HTTP $status_code (intento $i/$max_retries)"
            if [ $i -lt $max_retries ]; then
                log_info "Reintentando en ${retry_delay}s..."
                sleep $retry_delay
            fi
        fi
    done
    
    log_error "$service_name: Health check falló después de $max_retries intentos"
    TEST_RESULTS="$TEST_RESULTS❌ $service_name Health: FALLÓ\n"
    return 1
}

# Función para verificar endpoints de API
test_api_endpoints() {
    if [ -z "$BACKEND_URL" ]; then
        log_error "No se pueden verificar endpoints - URL del backend no disponible"
        return 1
    fi
    
    log_info "Verificando endpoints de API..."
    
    # Test endpoint /api/admin/agents
    local agents_status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/admin/agents" --max-time 10 2>/dev/null || echo "000")
    if [ "$agents_status" = "200" ]; then
        log_success "Endpoint /api/admin/agents: OK"
        TEST_RESULTS="$TEST_RESULTS✅ API Agents: OK\n"
    else
        log_warning "Endpoint /api/admin/agents: HTTP $agents_status"
        TEST_RESULTS="$TEST_RESULTS⚠️  API Agents: HTTP $agents_status\n"
    fi
    
    # Test endpoint /api/admin/clients
    local clients_status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/admin/clients" --max-time 10 2>/dev/null || echo "000")
    if [ "$clients_status" = "200" ]; then
        log_success "Endpoint /api/admin/clients: OK"
        TEST_RESULTS="$TEST_RESULTS✅ API Clients: OK\n"
    else
        log_warning "Endpoint /api/admin/clients: HTTP $clients_status"
        TEST_RESULTS="$TEST_RESULTS⚠️  API Clients: HTTP $clients_status\n"
    fi
}

# Función para verificar conectividad de base de datos
test_database_connection() {
    log_info "Verificando conectividad de base de datos..."
    
    railway service "$BACKEND_SERVICE" &> /dev/null
    
    # Verificar si DATABASE_URL está disponible
    DATABASE_URL=$(railway variables --kv 2>/dev/null | grep "DATABASE_URL" | cut -d'=' -f2 || echo "")
    
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL no configurado"
        TEST_RESULTS="$TEST_RESULTS❌ DB Connection: URL faltante\n"
        return 1
    fi
    
    # Intentar conectar usando railway connect (si está disponible)
    log_info "Verificando conexión PostgreSQL..."
    if railway connect postgres --help &> /dev/null; then
        # Test básico de conexión
        if echo "SELECT 1;" | railway connect postgres --non-interactive &> /dev/null; then
            log_success "Conexión a PostgreSQL: OK"
            TEST_RESULTS="$TEST_RESULTS✅ PostgreSQL: Conectado\n"
        else
            log_warning "Conexión a PostgreSQL: Error o no disponible"
            TEST_RESULTS="$TEST_RESULTS⚠️  PostgreSQL: Error de conexión\n"
        fi
    else
        log_info "railway connect no disponible, verificando URL únicamente"
        if [[ $DATABASE_URL == postgresql* ]]; then
            log_success "DATABASE_URL formato válido"
            TEST_RESULTS="$TEST_RESULTS✅ PostgreSQL: URL válida\n"
        else
            log_error "DATABASE_URL formato inválido"
            TEST_RESULTS="$TEST_RESULTS❌ PostgreSQL: URL inválida\n"
        fi
    fi
}

# Función para verificar logs de servicios
check_service_logs() {
    log_info "Verificando logs de servicios..."
    
    # Logs del backend
    railway service "$BACKEND_SERVICE" &> /dev/null
    BACKEND_LOGS=$(railway logs --tail 10 2>/dev/null | tail -5 || echo "No logs available")
    
    if echo "$BACKEND_LOGS" | grep -qi "error\|failed\|crash"; then
        log_warning "Errores detectados en logs del backend"
        TEST_RESULTS="$TEST_RESULTS⚠️  Backend Logs: Errores detectados\n"
    else
        log_success "Logs del backend: Sin errores críticos"
        TEST_RESULTS="$TEST_RESULTS✅ Backend Logs: OK\n"
    fi
}

# Función para mostrar resumen final
show_final_report() {
    echo ""
    echo "📊 RESUMEN DE VERIFICACIÓN"
    echo "=========================="
    echo -e "$TEST_RESULTS"
    
    echo ""
    echo "🔗 URLS DE SERVICIOS:"
    if [ -n "$BACKEND_URL" ]; then
        echo "   🔧 Backend:  $BACKEND_URL"
        echo "   📊 Health:   $BACKEND_URL/health"
        echo "   🔌 API:      $BACKEND_URL/api/admin/agents"
    else
        echo "   ❌ Backend:  URL no disponible"
    fi
    
    if [ -n "$FRONTEND_URL" ]; then
        echo "   🌐 Frontend: $FRONTEND_URL"
    else
        echo "   ❌ Frontend: URL no disponible"
    fi
    
    echo ""
    echo "🛠️  COMANDOS ÚTILES:"
    echo "   railway logs --service backend     # Ver logs del backend"
    echo "   railway logs --service frontend    # Ver logs del frontend"
    echo "   railway variables --service backend # Ver variables"
    echo "   railway domain --service backend   # Ver URL del backend"
    echo ""
}

# Función principal
main() {
    log_info "Iniciando verificación completa..."
    
    # Verificar autenticación
    if ! railway whoami &> /dev/null; then
        log_error "No autenticado en Railway. Ejecuta: railway login"
    fi
    
    get_service_urls
    verify_environment_variables
    test_database_connection
    
    if [ -n "$BACKEND_URL" ]; then
        test_service_health "$BACKEND_URL" "Backend"
        test_api_endpoints
    fi
    
    if [ -n "$FRONTEND_URL" ]; then
        test_service_health "$FRONTEND_URL" "Frontend"
    fi
    
    check_service_logs
    show_final_report
    
    log_success "🎉 Verificación completa finalizada!"
}

# Ejecutar función principal
main "$@"