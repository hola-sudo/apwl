#!/bin/bash

set -e

echo "🚀 CONTRACT PROCESSOR - DEPLOYMENT REPARADO COMPLETO"
echo "====================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables globales
PROJECT_NAME="contract-processor"
BACKEND_SERVICE="backend"
FRONTEND_SERVICE="frontend"
DATABASE_SERVICE="postgres"

# Función de logging mejorado
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
    exit 1
}

# Función para verificar autenticación
check_railway_auth() {
    log_info "Verificando autenticación Railway..."
    if railway whoami &> /dev/null; then
        RAILWAY_USER=$(railway whoami 2>/dev/null)
        log_success "Railway CLI autenticado como: $RAILWAY_USER"
    else
        log_error "No logueado en Railway. Ejecuta: railway login"
    fi
}

# Función para verificar si un servicio existe
service_exists() {
    local service_name=$1
    railway status 2>/dev/null | grep -q "Service: $service_name"
}

# Función para verificar si existe PostgreSQL
postgres_exists() {
    railway variables 2>/dev/null | grep -q "DATABASE_URL" || false
}

# Función para limpiar proyectos duplicados y vincular el correcto
setup_project() {
    log_info "Configurando proyecto Railway..."
    
    if railway status &> /dev/null; then
        CURRENT_PROJECT=$(railway status | grep "Project:" | awk '{print $2}')
        log_success "Ya vinculado al proyecto: $CURRENT_PROJECT"
    else
        log_info "Inicializando nuevo proyecto..."
        railway init --name "$PROJECT_NAME"
        log_success "Proyecto '$PROJECT_NAME' creado"
    fi
}

# Función para configurar PostgreSQL (solo si no existe)
setup_postgresql() {
    log_info "Verificando PostgreSQL..."
    
    if postgres_exists; then
        log_success "PostgreSQL ya configurado"
        DATABASE_URL=$(railway variables --kv 2>/dev/null | grep "DATABASE_URL" | cut -d'=' -f2 || echo "")
        if [ -n "$DATABASE_URL" ]; then
            log_success "DATABASE_URL disponible"
        fi
    else
        log_info "Agregando PostgreSQL..."
        railway add --database postgres
        log_success "PostgreSQL agregado al proyecto"
        
        # Esperar un momento para que se configure
        log_info "Esperando configuración de PostgreSQL..."
        sleep 5
    fi
}

# Función para configurar servicio backend
setup_backend() {
    log_info "Configurando servicio backend..."
    
    # Si no estamos vinculados al backend, crear o vincular
    if ! service_exists "$BACKEND_SERVICE"; then
        log_info "Creando servicio backend..."
        railway add --service "$BACKEND_SERVICE"
        log_success "Servicio backend creado"
    else
        log_success "Servicio backend ya existe"
    fi
    
    # Asegurar que estamos vinculados al backend
    railway service "$BACKEND_SERVICE"
    log_success "Vinculado al servicio backend"
}

# Función para configurar variables del backend
setup_backend_variables() {
    log_info "Configurando variables del backend..."
    
    # Verificar si ya están configuradas
    CURRENT_VARS=$(railway variables --kv 2>/dev/null || echo "")
    
    # Configurar NODE_ENV
    if echo "$CURRENT_VARS" | grep -q "NODE_ENV"; then
        log_success "NODE_ENV ya configurado"
    else
        railway variables --set "NODE_ENV=production"
        log_success "NODE_ENV configurado"
    fi
    
    # Configurar OPENAI_API_KEY
    if echo "$CURRENT_VARS" | grep -q "OPENAI_API_KEY"; then
        log_success "OPENAI_API_KEY ya configurado"
    else
        log_warning "OPENAI_API_KEY no configurado. Configurando placeholder..."
        railway variables --set "OPENAI_API_KEY=sk-your-openai-key-here"
        log_warning "⚠️  IMPORTANTE: Actualiza OPENAI_API_KEY con tu clave real"
    fi
    
    # Verificar DATABASE_URL
    if echo "$CURRENT_VARS" | grep -q "DATABASE_URL"; then
        log_success "DATABASE_URL ya configurado"
    else
        log_warning "DATABASE_URL no detectado. PostgreSQL podría estar inicializándose..."
    fi
}

# Función para desplegar backend
deploy_backend() {
    log_info "Desplegando servicio backend..."
    
    # Asegurar que estamos en el backend
    railway service "$BACKEND_SERVICE"
    
    # Desplegar desde directorio raíz (donde está el backend)
    log_info "Iniciando deployment desde directorio raíz..."
    railway up
    
    log_success "Backend desplegado exitosamente"
}

# Función para configurar frontend
setup_frontend() {
    log_info "Configurando servicio frontend..."
    
    if [ ! -d "admin-dashboard" ]; then
        log_error "Directorio admin-dashboard no encontrado"
    fi
    
    # Cambiar al directorio del frontend
    cd admin-dashboard
    
    # Crear servicio frontend si no existe
    if ! service_exists "$FRONTEND_SERVICE"; then
        log_info "Creando servicio frontend..."
        railway add --service "$FRONTEND_SERVICE"
        log_success "Servicio frontend creado"
    else
        log_success "Servicio frontend ya existe"
    fi
    
    # Vincular al frontend
    railway service "$FRONTEND_SERVICE"
    log_success "Vinculado al servicio frontend"
}

# Función para desplegar frontend
deploy_frontend() {
    log_info "Desplegando servicio frontend..."
    
    # Asegurar que estamos en admin-dashboard y vinculados al frontend
    cd admin-dashboard
    railway service "$FRONTEND_SERVICE"
    
    # Configurar variables del frontend
    railway variables --set "NODE_ENV=production"
    
    # Desplegar frontend
    log_info "Iniciando deployment del frontend..."
    railway up
    
    log_success "Frontend desplegado exitosamente"
    
    # Volver al directorio raíz
    cd ..
}

# Función para mostrar estado final
show_final_status() {
    log_info "Estado final del deployment..."
    
    echo ""
    echo "🏗️  SERVICIOS CONFIGURADOS:"
    
    # Backend info
    railway service "$BACKEND_SERVICE" &> /dev/null
    BACKEND_VARS=$(railway variables --kv 2>/dev/null | wc -l)
    echo "   ✅ Backend: $BACKEND_SERVICE ($BACKEND_VARS variables)"
    
    # Frontend info  
    cd admin-dashboard 2>/dev/null && railway service "$FRONTEND_SERVICE" &> /dev/null
    if [ $? -eq 0 ]; then
        echo "   ✅ Frontend: $FRONTEND_SERVICE"
        cd ..
    else
        echo "   ❌ Frontend: Error de configuración"
        cd .. 2>/dev/null
    fi
    
    # Database info
    railway service "$BACKEND_SERVICE" &> /dev/null
    if postgres_exists; then
        echo "   ✅ PostgreSQL: Configurado"
    else
        echo "   ❌ PostgreSQL: No detectado"
    fi
    
    echo ""
    echo "🔧 PRÓXIMOS PASOS:"
    echo "   1. Actualizar OPENAI_API_KEY: railway variables --service backend --set 'OPENAI_API_KEY=tu-clave-real'"
    echo "   2. Verificar deployment: railway logs --service backend"
    echo "   3. Verificar URLs: railway domain --service backend"
    echo "   4. Ejecutar verificación: ./verify-deployment.sh"
}

# Función principal
main() {
    log_info "Iniciando reparación completa del deployment..."
    
    check_railway_auth
    setup_project
    setup_postgresql
    setup_backend
    setup_backend_variables
    deploy_backend
    setup_frontend
    deploy_frontend
    show_final_status
    
    log_success "🎉 DEPLOYMENT REPARADO COMPLETAMENTE!"
}

# Ejecutar función principal
main "$@"