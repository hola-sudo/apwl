// Dynamic Workflow with Client-specific Templates
import { OpenAI } from "openai";

interface WorkflowInput {
  input_as_text: string;
  clientId?: string;
}

interface WorkflowOutput {
  success: boolean;
  result: any;
  error?: string;
}

export async function runDynamicWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  try {
    console.log('🚀 Ejecutando runDynamicWorkflow con plantillas dinámicas');
    console.log(`Cliente: ${input.clientId}, Input: ${input.input_as_text?.substring(0, 100)}...`);
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Paso 1: Clasificar tipo de contrato
    const clasificacionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system", 
          content: "Analiza el texto y clasifica el tipo de contrato. Responde solo con: 'contrato_base', 'anexo_a', 'anexo_b', 'anexo_c', 'anexo_d'"
        },
        { role: "user", content: input.input_as_text || '' }
      ],
      max_tokens: 50,
      temperature: 0.1
    });
    
    const tipoContrato = clasificacionResponse.choices?.[0]?.message?.content?.trim() || 'contrato_base';
    console.log(`📋 Tipo de contrato clasificado: ${tipoContrato}`);
    
    // Paso 2: Obtener plantilla del cliente desde la base de datos
    let plantillaContent = '';
    let plantillaOrigen = 'default';
    
    if (input.clientId) {
      try {
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const templateUrl = `${baseUrl}/api/admin/templates/agents/${input.clientId}/templates/${tipoContrato}`;
        
        console.log(`🔍 Obteniendo plantilla desde: ${templateUrl}`);
        const response = await fetch(templateUrl);
        
        if (response.ok) {
          plantillaContent = await response.text();
          plantillaOrigen = 'client_custom';
          console.log(`✅ Plantilla personalizada ${tipoContrato} obtenida para cliente ${input.clientId}`);
          console.log(`📏 Tamaño de plantilla: ${plantillaContent.length} caracteres`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error obteniendo plantilla personalizada: ${error}`);
        console.log(`🔄 Usando plantilla por defecto para ${tipoContrato}`);
        plantillaContent = obtenerPlantillaPorDefecto(tipoContrato);
        plantillaOrigen = 'default_fallback';
      }
    } else {
      console.log(`📝 Sin clientId, usando plantilla por defecto`);
      plantillaContent = obtenerPlantillaPorDefecto(tipoContrato);
      plantillaOrigen = 'default';
    }
    
    // Paso 3: Extraer placeholders de la plantilla
    const placeholders = extraerPlaceholders(plantillaContent);
    console.log(`🏷️ Placeholders encontrados: ${placeholders.join(', ')}`);
    
    // Paso 4: Extraer campos con IA
    const extraccionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Extrae información de la transcripción para un contrato. 
                   RESPONDE SOLO en formato JSON válido con estos campos si están disponibles:
                   {
                     "NOMBRE_CLIENTE": "nombre extraído o null",
                     "RFC": "rfc extraído o null", 
                     "NOMBRE_EVENTO": "nombre del evento o null",
                     "FECHA_EVENTO": "fecha del evento o null",
                     "UBICACION": "ubicación o null",
                     "PAQUETE": "tipo de paquete o null"
                   }`
        },
        { role: "user", content: input.input_as_text || '' }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    let campos = {};
    try {
      const jsonText = extraccionResponse.choices?.[0]?.message?.content?.replace(/```json\n?|\n?```/g, '').trim();
      campos = JSON.parse(jsonText || '{}');
      console.log(`📝 Campos extraídos por IA:`, campos);
    } catch (parseError) {
      console.warn('⚠️ Error parseando JSON de IA, usando extracción manual');
      campos = extraerCamposManual(input.input_as_text || '');
      console.log(`🔧 Campos extraídos manualmente:`, campos);
    }

    // Paso 5: Aplicar campos a plantilla
    const resultado = aplicarCamposAPlantilla(plantillaContent, campos, placeholders);
    
    return {
      success: true,
      result: {
        tipoContrato,
        plantillaOrigen,
        camposExtraidos: campos,
        placeholdersEncontrados: placeholders,
        placeholdersAplicados: resultado.aplicados,
        placeholdersFaltantes: resultado.faltantes,
        documentoFinal: resultado.documento,
        clienteId: input.clientId,
        estadisticas: {
          placeholdersTotal: placeholders.length,
          camposExtraidos: Object.keys(campos).length,
          tasaCompletitud: resultado.aplicados / placeholders.length
        },
        metadata: {
          timestamp: new Date().toISOString(),
          procesadoCorrectamente: true,
          plantillaTamaño: plantillaContent.length
        }
      }
    };
  } catch (error) {
    console.error('❌ Error en runDynamicWorkflow:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      result: null
    };
  }
}

// Función auxiliar para extraer placeholders
function extraerPlaceholders(plantilla: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(plantilla)) !== null) {
    const placeholder = match[1]?.trim();
    if (placeholder && !placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }
  
  return placeholders;
}

// Función auxiliar para extracción manual
function extraerCamposManual(texto: string): Record<string, string> {
  const campos: Record<string, string> = {};
  
  const nombreMatch = texto.match(/nombre completo[.\s]*([^.?\n]+)/i);
  if (nombreMatch && nombreMatch[1]) campos.NOMBRE_CLIENTE = nombreMatch[1].trim().replace(/\n/g, ' ');
  
  const rfcMatch = texto.match(/RFC[?\s]*([A-Z0-9.]+)/i);
  if (rfcMatch && rfcMatch[1]) campos.RFC = rfcMatch[1].trim();
  
  const eventoMatch = texto.match(/se llama\s+([^.\n]+)/i);
  if (eventoMatch && eventoMatch[1]) campos.NOMBRE_EVENTO = eventoMatch[1].trim();
  
  const fechaMatch = texto.match(/(marzo del \d{4})/i);
  if (fechaMatch && fechaMatch[1]) campos.FECHA_EVENTO = fechaMatch[1].trim();
  
  const ubicacionMatch = texto.match(/ubicación del evento\s+es\s+([^.\n]+)/i);
  if (ubicacionMatch && ubicacionMatch[1]) campos.UBICACION = ubicacionMatch[1].trim();
  
  const paqueteMatch = texto.match(/paquete ([A-Z])/i);
  if (paqueteMatch && paqueteMatch[1]) campos.PAQUETE = `Paquete ${paqueteMatch[1]}`;
  
  return campos;
}

// Función para obtener plantilla por defecto
function obtenerPlantillaPorDefecto(templateType: string): string {
  const plantillas: Record<string, string> = {
    contrato_base: `# CONTRATO DE PRESTACIÓN DE SERVICIOS PARA EVENTOS

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

## TÉRMINOS DE PAGO
- **Anticipo:** Se requiere el 50% al momento de firmar el contrato
- **Saldo:** El saldo restante debe liquidarse 7 días antes del evento

## FIRMA DEL CONTRATO
**CONTRATANTE:**
Nombre: {{NOMBRE_CLIENTE}}
Firma: _____________________
Fecha: {{FECHA_FIRMA}}

**PRESTADOR DE SERVICIOS:**
Firma: _____________________  
Fecha: {{FECHA_FIRMA}}

---
*Este contrato fue generado automáticamente por el sistema de procesamiento de contratos.*`,

    anexo_a: `# ANEXO A - ESPECIFICACIONES TÉCNICAS DEL EVENTO

**Cliente:** {{NOMBRE_CLIENTE}}
**Evento:** {{NOMBRE_EVENTO}}
**Fecha:** {{FECHA_EVENTO}}

## ESPECIFICACIONES TÉCNICAS
- **Sonido:** {{ESPECIFICACIONES_SONIDO}}
- **Iluminación:** {{ESPECIFICACIONES_LUZ}}
- **Decoración:** {{ESPECIFICACIONES_DECORACION}}

## CRONOGRAMA DETALLADO
- **Montaje:** {{HORARIO_MONTAJE}}
- **Inicio Evento:** {{HORARIO_INICIO}}
- **Fin Evento:** {{HORARIO_FIN}}
- **Desmontaje:** {{HORARIO_DESMONTAJE}}

---
*Anexo A - Especificaciones Técnicas*`,

    anexo_b: `# ANEXO B - TÉRMINOS Y CONDICIONES ADICIONALES

**Cliente:** {{NOMBRE_CLIENTE}}
**Evento:** {{NOMBRE_EVENTO}}

## CONDICIONES ESPECIALES
- **Política de Cancelación:** {{POLITICA_CANCELACION}}
- **Seguros:** {{COBERTURA_SEGUROS}}
- **Fuerza Mayor:** {{CLAUSULA_FUERZA_MAYOR}}

## RESPONSABILIDADES ADICIONALES
- **Cliente:** {{RESPONSABILIDADES_CLIENTE}}
- **Proveedor:** {{RESPONSABILIDADES_PROVEEDOR}}

---
*Anexo B - Términos y Condiciones*`,

    anexo_c: `# ANEXO C - MENÚ Y SERVICIOS DE CATERING

**Cliente:** {{NOMBRE_CLIENTE}}
**Evento:** {{NOMBRE_EVENTO}}
**Invitados:** {{NUMERO_INVITADOS}}

## MENÚ SELECCIONADO
- **Entrada:** {{MENU_ENTRADA}}
- **Plato Principal:** {{MENU_PRINCIPAL}}
- **Postre:** {{MENU_POSTRE}}
- **Bebidas:** {{MENU_BEBIDAS}}

## SERVICIOS ADICIONALES
- **Meseros:** {{NUMERO_MESEROS}}
- **Barman:** {{SERVICIO_BAR}}
- **Montaje:** {{TIPO_MONTAJE}}

---
*Anexo C - Servicios de Catering*`,

    anexo_d: `# ANEXO D - FACTURACIÓN Y PAGOS

**Cliente:** {{NOMBRE_CLIENTE}}
**RFC:** {{RFC}}

## DETALLE DE COSTOS
- **Servicio Base:** $\{{COSTO_BASE}}
- **Servicios Adicionales:** $\{{COSTOS_ADICIONALES}}
- **Total:** $\{{TOTAL}}

## FORMA DE PAGO
- **Anticipo (50%):** $\{{ANTICIPO}}
- **Saldo:** $\{{SALDO}}
- **Método de Pago:** {{METODO_PAGO}}

## DATOS DE FACTURACIÓN
- **Razón Social:** {{RAZON_SOCIAL}}
- **RFC:** {{RFC}}
- **Dirección:** {{DIRECCION_FISCAL}}

---
*Anexo D - Facturación y Pagos*`
  };

  return plantillas[templateType as keyof typeof plantillas] || plantillas.contrato_base || "";
}

// Función para aplicar campos a la plantilla
function aplicarCamposAPlantilla(plantilla: string, campos: Record<string, any>, placeholders: string[]) {
  let documento = plantilla;
  let aplicados = 0;
  let faltantes: string[] = [];
  
  // Aplicar campos extraídos
  placeholders.forEach(placeholder => {
    if (campos[placeholder] && campos[placeholder] !== null) {
      const regex = new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g');
      documento = documento.replace(regex, campos[placeholder]);
      aplicados++;
    } else {
      faltantes.push(placeholder);
    }
  });
  
  // Aplicar fecha actual
  const fechaActual = new Date().toLocaleDateString('es-MX');
  documento = documento.replace(/\{\{FECHA_FIRMA\}\}/g, fechaActual);
  
  return {
    documento,
    aplicados,
    faltantes,
    total: placeholders.length
  };
}