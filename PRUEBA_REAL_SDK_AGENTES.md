# 🔍 PRUEBA REAL CON SDK DE 3 AGENTES

## 🎯 **OBJETIVO DE LA PRUEBA**
Usar el sistema **ORIGINAL** con el SDK `@openai/agents` y los 3 agentes específicos:

### 🤖 **Los 3 Agentes SDK Reales**
1. **clasificadorDeContrato** - Analiza transcripción y determina tipo
2. **extractorDeCampos** - Extrae datos específicos de la conversación  
3. **rellenadorDePlantilla** - Rellena plantilla con datos extraídos

### 🔧 **Configuración SDK Verificada**
- **Framework**: `@openai/agents` v2.0+
- **Vector Store**: `vs_6913f7fc7e7c8191a4ff6cc9f1986903`
- **Guardrails**: Moderation + Jailbreak protection
- **Workflow**: classify → extract → search → generate

### 📝 **Input de Prueba (TRANSCRIPCIÓN REAL)**
```
"Transcripción reunión legal - 
CLIENTE: Buenos días, soy Carlos Mendoza de Innovatech SA. 
ABOGADO: Buenos días Carlos, ¿en qué puedo ayudarle? 
CLIENTE: Necesitamos formalizar un contrato de servicios profesionales con Digital Masters. 
ABOGADO: Perfecto, ¿me puede dar los detalles? 
CLIENTE: Vamos a contratar desarrollo de una app móvil. El proyecto cuesta 1.2 millones de pesos y debe estar listo en 12 meses. 
ABOGADO: Entendido. ¿Hay condiciones especiales? 
CLIENTE: Sí, queremos garantía de 18 meses, soporte técnico completo, y que nos entreguen el código fuente. También necesitamos que incluyan testing completo y documentación técnica."
```

### 🎯 **Flujo Esperado**
1. **Clasificador** → Analiza conversación → determina "contrato_base"
2. **Guardrails** → Verifica contenido seguro
3. **Extractor** → Extrae: cliente, proveedor, monto, plazo, condiciones
4. **Vector Search** → Busca plantilla para "contrato_base"
5. **Rellenador** → Genera contrato completo con datos

### ✅ **Resultado Esperado**
Contrato profesional con:
- **Cliente**: Innovatech SA (Carlos Mendoza)
- **Proveedor**: Digital Masters
- **Objeto**: Desarrollo app móvil
- **Monto**: $1,200,000 MXN
- **Plazo**: 12 meses  
- **Condiciones**: Garantía 18 meses, soporte, código fuente, testing, documentación

---

**🎯 PRUEBA EN CURSO**: Verificando que el sistema SDK original funciona correctamente con transcripciones reales