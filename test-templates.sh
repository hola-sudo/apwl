#!/bin/bash

echo "🧪 PROBANDO SISTEMA DE PLANTILLAS LOCALMENTE"
echo "============================================="

# Verificar que el backend esté corriendo
if ! curl -s http://localhost:3000/health > /dev/null; then
    echo "❌ Backend no está corriendo en localhost:3000"
    echo "💡 Ejecuta primero: ./dev-local.sh"
    exit 1
fi

echo "✅ Backend detectado en localhost:3000"

# 1. Crear cliente de prueba
echo ""
echo "👤 Creando cliente de prueba..."
CLIENT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Cliente Prueba Plantillas","email":"test-plantillas@test.com","company":"Test Corp"}' 2>/dev/null)

if [ $? -eq 0 ]; then
    CLIENT_ID=$(echo $CLIENT_RESPONSE | jq -r '.data.id // .id // empty' 2>/dev/null)
    if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "null" ]; then
        echo "✅ Cliente creado con ID: $CLIENT_ID"
    else
        echo "⚠️ Cliente ya existe o error. Usando ID de prueba..."
        # Obtener lista de clientes y usar el primero
        CLIENTS_RESPONSE=$(curl -s http://localhost:3000/api/admin/clients 2>/dev/null)
        CLIENT_ID=$(echo $CLIENTS_RESPONSE | jq -r '.data[0].id // .clients[0].id // empty' 2>/dev/null)
        if [ -n "$CLIENT_ID" ]; then
            echo "✅ Usando cliente existente: $CLIENT_ID"
        else
            echo "❌ No se pudo obtener ID de cliente"
            exit 1
        fi
    fi
else
    echo "❌ Error creando cliente"
    exit 1
fi

# 2. Crear plantilla de prueba
echo ""
echo "📄 Creando plantilla de prueba..."
cat > test-template.md << 'EOF'
# CONTRATO DE PRESTACIÓN DE SERVICIOS PARA EVENTOS

**Fecha:** {{FECHA_FIRMA}}

## DATOS DEL CONTRATANTE
- **Nombre Completo:** {{NOMBRE_CLIENTE}}
- **RFC:** {{RFC}}

## DESCRIPCIÓN DEL EVENTO
- **Nombre del Evento:** {{NOMBRE_EVENTO}}
- **Fecha del Evento:** {{FECHA_EVENTO}}
- **Ubicación:** {{UBICACION}}
- **Tipo de Paquete:** {{PAQUETE}}

## TÉRMINOS ECONÓMICOS
- **Precio Total:** {{PRECIO}}
- **Anticipo:** {{ANTICIPO}}

## SERVICIOS INCLUIDOS
El paquete {{PAQUETE}} incluye los servicios acordados según la cotización proporcionada.

### RESPONSABILIDADES DEL PRESTADOR DE SERVICIOS
1. Coordinar todos los aspectos del evento según lo acordado
2. Proveer los servicios especificados en el paquete seleccionado
3. Cumplir con los horarios y fechas establecidas

### RESPONSABILIDADES DEL CONTRATANTE
1. Realizar los pagos según los términos establecidos
2. Proveer la información necesaria para la organización del evento
3. Colaborar en la coordinación y planificación

## FIRMA DEL CONTRATO
**CONTRATANTE:**
Nombre: {{NOMBRE_CLIENTE}}
Firma: _____________________
Fecha: {{FECHA_FIRMA}}

**PRESTADOR DE SERVICIOS:**
Firma: _____________________
Fecha: {{FECHA_FIRMA}}

---
*Plantilla de prueba para validar el sistema de plantillas personalizadas.*
EOF

echo "✅ Plantilla test-template.md creada"

# 3. Subir plantilla via API
echo ""
echo "📤 Subiendo plantilla via API..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/admin/templates/upload \
  -F "clientId=$CLIENT_ID" \
  -F "templateType=contrato_base" \
  -F "file=@test-template.md" \
  -F "uploadedBy=test-script" 2>/dev/null)

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Plantilla subida exitosamente"
    PLACEHOLDERS_COUNT=$(echo $UPLOAD_RESPONSE | jq -r '.data.placeholdersCount // 0')
    echo "🏷️ Placeholders detectados: $PLACEHOLDERS_COUNT"
else
    echo "❌ Error subiendo plantilla:"
    echo "$UPLOAD_RESPONSE" | jq '.' 2>/dev/null || echo "$UPLOAD_RESPONSE"
fi

# 4. Verificar plantillas del cliente
echo ""
echo "📋 Verificando plantillas del cliente..."
TEMPLATES_RESPONSE=$(curl -s "http://localhost:3000/api/admin/templates/$CLIENT_ID" 2>/dev/null)

if echo "$TEMPLATES_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Plantillas obtenidas correctamente"
    TOTAL_TEMPLATES=$(echo $TEMPLATES_RESPONSE | jq -r '.data.totalTemplates // 0')
    echo "📊 Total de plantillas: $TOTAL_TEMPLATES"
    
    # Mostrar plantillas disponibles
    echo ""
    echo "📋 PLANTILLAS DISPONIBLES:"
    echo "$TEMPLATES_RESPONSE" | jq -r '.data.templates | to_entries[] | select(.value != null) | "   ✅ " + .key + ": " + .value.fileName' 2>/dev/null
    
    echo ""
    echo "📋 PLANTILLAS FALTANTES:"
    echo "$TEMPLATES_RESPONSE" | jq -r '.data.missingTypes[]? // empty | "   ❌ " + .' 2>/dev/null
else
    echo "❌ Error obteniendo plantillas:"
    echo "$TEMPLATES_RESPONSE" | jq '.' 2>/dev/null || echo "$TEMPLATES_RESPONSE"
fi

# 5. Probar endpoint de agente
echo ""
echo "🤖 Probando endpoint para agentes..."
AGENT_TEMPLATE_RESPONSE=$(curl -s "http://localhost:3000/api/admin/templates/agents/$CLIENT_ID/templates/contrato_base" 2>/dev/null)

if [ $? -eq 0 ] && [ -n "$AGENT_TEMPLATE_RESPONSE" ]; then
    if echo "$AGENT_TEMPLATE_RESPONSE" | grep -q "CONTRATO DE PRESTACIÓN"; then
        echo "✅ Endpoint de agente funcional"
        echo "📏 Tamaño de plantilla: $(echo -n "$AGENT_TEMPLATE_RESPONSE" | wc -c) bytes"
        echo "🏷️ Placeholders en plantilla:"
        echo "$AGENT_TEMPLATE_RESPONSE" | grep -o '{{[^}]*}}' | sort -u | head -10
    else
        echo "❌ Respuesta inesperada del endpoint de agente"
    fi
else
    echo "❌ Error en endpoint de agente"
fi

# 6. Simular procesamiento de agente
echo ""
echo "🔄 Simulando procesamiento del agente dinámico..."

# Crear script temporal de prueba del agente
cat > test-dynamic-workflow.js << 'EOF'
const { runDynamicWorkflow } = require('./src/agents/dynamicWorkflow');

const input = {
  input_as_text: `Ok, Pablo, entonces ahora para esta parte del proceso vamos a definir ciertas cosas de tu evento. Lo primero que necesito es que me des tu nombre completo. José Pablo García. ¿Y cuál es tu RFC? MEGP910319JT13. Perfecto. ok entonces ahora cómo se va a llamar tu evento se llama boda unicornio perfecto para cuando es la fecha es el marzo del 2026 y cuál va a ser la ubicación del evento es en la florida perfecto muchas gracias confirmando el paquete A.`,
  clientId: process.argv[2]
};

runDynamicWorkflow(input)
  .then(result => {
    console.log('\n🎉 RESULTADO DEL WORKFLOW:');
    console.log('===========================');
    if (result.success) {
      console.log('✅ Success:', result.success);
      console.log('📋 Tipo de contrato:', result.result.tipoContrato);
      console.log('🏷️ Placeholders encontrados:', result.result.placeholdersEncontrados?.length || 0);
      console.log('📝 Campos extraídos:', Object.keys(result.result.camposExtraidos || {}).length);
      console.log('📄 Documento generado:', result.result.documentoFinal ? 'SÍ' : 'NO');
      
      if (result.result.documentoFinal) {
        console.log('\n📄 PRIMERAS 300 CHARS DEL DOCUMENTO:');
        console.log(result.result.documentoFinal.substring(0, 300) + '...');
      }
    } else {
      console.log('❌ Error:', result.error);
    }
  })
  .catch(error => {
    console.log('❌ Error ejecutando workflow:', error.message);
  });
EOF

# Ejecutar prueba del workflow si el archivo existe
if [ -f "src/agents/dynamicWorkflow.ts" ] || [ -f "src/agents/dynamicWorkflow.js" ]; then
    echo "🔄 Ejecutando prueba del workflow..."
    node test-dynamic-workflow.js "$CLIENT_ID" 2>/dev/null || echo "⚠️ No se pudo ejecutar el workflow (requiere backend corriendo)"
else
    echo "⚠️ Archivo dynamicWorkflow no encontrado"
fi

# 7. Limpiar archivos temporales
echo ""
echo "🧹 Limpiando archivos temporales..."
rm -f test-template.md test-dynamic-workflow.js

echo ""
echo "✅ PRUEBA COMPLETADA"
echo "==================="
echo ""
echo "📊 RESUMEN:"
echo "   👤 Cliente creado/usado: $CLIENT_ID"
echo "   📤 Upload API: $(echo "$UPLOAD_RESPONSE" | grep -q success && echo "✅ OK" || echo "❌ FALLÓ")"
echo "   📋 List API: $(echo "$TEMPLATES_RESPONSE" | grep -q success && echo "✅ OK" || echo "❌ FALLÓ")"
echo "   🤖 Agent API: $(echo "$AGENT_TEMPLATE_RESPONSE" | grep -q CONTRATO && echo "✅ OK" || echo "❌ FALLÓ")"
echo ""
echo "🌐 PARA VERIFICAR EN UI:"
echo "   1. Abre http://localhost:3001"
echo "   2. Ve a cliente: $CLIENT_ID"
echo "   3. Pestaña 'Plantillas de Contrato'"
echo "   4. Verifica que aparezca contrato_base.md"
echo ""