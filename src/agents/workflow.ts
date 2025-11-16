import { OpenAI } from "openai";
import { runGuardrails } from "@openai/guardrails";
import { z } from "zod";
import { RunContext, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";

// Shared client for guardrails and file search
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Guardrails definitions
const guardrailsConfig = {
  guardrails: [
    { name: "Moderation", config: { categories: ["sexual/minors", "hate/threatening", "harassment/threatening", "self-harm/instructions", "violence/graphic", "illicit/violent"] } },
    { name: "Jailbreak", config: { model: "gpt-4.1-mini", confidence_threshold: 0.7 } }
  ]
};
const context = { guardrailLlm: client };

function guardrailsHasTripwire(results: any[]): boolean {
    return (results ?? []).some((r) => r?.tripwireTriggered === true);
}

function getGuardrailSafeText(results: any[], fallbackText: string): string {
    for (const r of results ?? []) {
        if (r?.info && ("checked_text" in r.info)) {
            return r.info.checked_text ?? fallbackText;
        }
    }
    const pii = (results ?? []).find((r) => r?.info && "anonymized_text" in r.info);
    return pii?.info?.anonymized_text ?? fallbackText;
}

async function scrubConversationHistory(history: any[], piiOnly: any): Promise<void> {
    for (const msg of history ?? []) {
        const content = Array.isArray(msg?.content) ? msg.content : [];
        for (const part of content) {
            if (part && typeof part === "object" && part.type === "input_text" && typeof part.text === "string") {
                const res = await runGuardrails(part.text, piiOnly, context, true);
                part.text = getGuardrailSafeText(res, part.text);
            }
        }
    }
}

async function scrubWorkflowInput(workflow: any, inputKey: string, piiOnly: any): Promise<void> {
    if (!workflow || typeof workflow !== "object") return;
    const value = workflow?.[inputKey];
    if (typeof value !== "string") return;
    const res = await runGuardrails(value, piiOnly, context, true);
    workflow[inputKey] = getGuardrailSafeText(res, value);
}

async function runAndApplyGuardrails(inputText: string, config: any, history: any[], workflow: any) {
    const guardrails = Array.isArray(config?.guardrails) ? config.guardrails : [];
    for (const g of guardrails) {
        if (g?.name === "Contains PII") {
            g.config = { ...(g.config || {}), detect_encoded_pii: true };
        }
    }
    const results = await runGuardrails(inputText, config, context, true);
    const shouldMaskPII = guardrails.find((g: any) => (g?.name === "Contains PII") && g?.config && g.config.block === false);
    if (shouldMaskPII) {
        const piiOnly = { guardrails: [shouldMaskPII] };
        await scrubConversationHistory(history, piiOnly);
        await scrubWorkflowInput(workflow, "input_as_text", piiOnly);
        await scrubWorkflowInput(workflow, "input_text", piiOnly);
    }
    const hasTripwire = guardrailsHasTripwire(results);
    const safeText = getGuardrailSafeText(results, inputText) ?? inputText;
    return { results, hasTripwire, safeText, failOutput: buildGuardrailFailOutput(results ?? []), passOutput: { safe_text: safeText } };
}

function buildGuardrailFailOutput(results: any[]) {
    const get = (name: string) => (results ?? []).find((r: any) => ((r?.info?.guardrail_name ?? r?.info?.guardrailName) === name));
    const pii = get("Contains PII"), mod = get("Moderation"), jb = get("Jailbreak"), hal = get("Hallucination Detection"), piiCounts = Object.entries(pii?.info?.detected_entities ?? {}).filter(([, v]) => Array.isArray(v)).map(([k, v]) => k + ":" + (v as any[]).length), conf = jb?.info?.confidence;
    return {
        pii: { failed: (piiCounts.length > 0) || pii?.tripwireTriggered === true, detected_counts: piiCounts, error: pii?.info?.error },
        moderation: { failed: mod?.tripwireTriggered === true || ((mod?.info?.flagged_categories ?? []).length > 0), flagged_categories: mod?.info?.flagged_categories, error: mod?.info?.error },
        jailbreak: { failed: jb?.tripwireTriggered === true, error: jb?.info?.error },
        hallucination: { failed: hal?.tripwireTriggered === true, reasoning: hal?.info?.reasoning, hallucination_type: hal?.info?.hallucination_type, hallucinated_statements: hal?.info?.hallucinated_statements, verified_statements: hal?.info?.verified_statements, error: hal?.info?.error },
    };
}

const ClasificadorDeContratoSchema = z.object({ tipo_contrato: z.enum(["contrato_base", "anexo_a", "anexo_b", "anexo_c", "anexo_d"]), confianza: z.number(), razon: z.string() });
const ExtractorDeCamposSchema = z.object({ tipo_contrato: z.enum(["contrato_base", "anexo_a", "anexo_b", "anexo_c", "anexo_d"]), campos: z.object({}), faltantes: z.array(z.string()) });

interface ClasificadorDeContratoContext {
  stateTranscripcionTexto: string;
  stateTipoContratoUsuario: string;
}

const clasificadorDeContratoInstructions = (runContext: RunContext<ClasificadorDeContratoContext>, _agent: Agent<ClasificadorDeContratoContext>) => {
  const { stateTranscripcionTexto, stateTipoContratoUsuario } = runContext.context;
  return `Eres un analista legal especializado en clasificación de documentos contractuales.

Tu tarea es determinar a cuál de las siguientes categorías pertenece la transcripción del negocio:

- contrato_base
- anexo_a
- anexo_b
- anexo_c
- anexo_d

REGLAS:
1. Usa el texto de "transcripcion_texto" para decidir el tipo.
2. Si el usuario ya proporcionó un tipo en "tipo_contrato_usuario" y tu confianza es menor a 0.65, usa el valor del usuario.
3. Devuelve SOLO un JSON en este formato exacto:

{
  "tipo_contrato": "<uno de los cinco anteriores>",
  "confianza": 0.0-1.0,
  "razon": "explicación breve (una frase)"
}

4. No devuelvas texto fuera del JSON.
5. Guíate por el contenido: 
   - Si habla de "servicios, cliente, firma" → contrato_base
   - Si habla de "decoración, fotos, medidas" → anexo_a
   - Si habla de "reunión, temas tratados" → anexo_b
   - Si habla de "cambios, rondas, aprobación" → anexo_c
   - Si habla de "entrega final, autorización de pago" → anexo_d

 ${stateTranscripcionTexto} ${stateTipoContratoUsuario}`;
};

const clasificadorDeContrato = new Agent({
  name: "Clasificador de Contrato",
  instructions: clasificadorDeContratoInstructions,
  model: "gpt-4.1",
  outputType: "text",
  modelSettings: {
    temperature: 0.2,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface ExtractorDeCamposContext {
  stateTranscripcionTexto: string;
  stateTipoContratoUsuario: string;
}

const extractorDeCamposInstructions = (runContext: RunContext<ExtractorDeCamposContext>, _agent: Agent<ExtractorDeCamposContext>) => {
  const { stateTranscripcionTexto, stateTipoContratoUsuario } = runContext.context;
  return `Eres un asistente paralegal. Debes analizar la transcripción recibida y devolver toda la información necesaria para llenar el contrato o anexo correspondiente.

Tienes dos entradas:
- transcripcion_texto: texto completo del usuario.
- tipo_contrato: tipo de contrato detectado (contrato_base, anexo_a, anexo_b, anexo_c, anexo_d).

Tu salida debe ser SIEMPRE un JSON válido, que siga el esquema que te doy a continuación.

REGLAS:
1. No inventes información. Si un campo no aparece, déjalo vacío "" y agrega su nombre en faltantes[].
2. Fechas en formato YYYY-MM-DD.
3. Horas en formato HH:MM (24h).
4. Si algo tiene múltiples valores (por ejemplo, CAMBIO_1...CAMBIO_7), crea un array con esos elementos.
5. Todos los nombres de campos deben coincidir exactamente con el esquema.
6. No devuelvas texto fuera del JSON.

Salida esperada:
{
  "tipo_contrato": "<string>",
  "campos": { ...todos los valores detectados... },
  "faltantes": ["campo1", "campo2", "..."]
}

 ${stateTranscripcionTexto} ${stateTipoContratoUsuario}`;
};

const extractorDeCampos = new Agent({
  name: "Extractor de Campos",
  instructions: extractorDeCamposInstructions,
  model: "gpt-4.1",
  outputType: "text",
  modelSettings: {
    temperature: 0.2,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

interface RellenadorDePlantillaContext {
  inputPlantillaMd: string;
  stateTranscripcionTexto: string;
  stateTipoContratoUsuario: string;
}

const rellenadorDePlantillaInstructions = (runContext: RunContext<RellenadorDePlantillaContext>, _agent: Agent<RellenadorDePlantillaContext>) => {
  const { inputPlantillaMd, stateTranscripcionTexto, stateTipoContratoUsuario } = runContext.context;
  return `Toma la plantilla completa en {{plantilla_md}} y el objeto "campos" con los valores extraídos. 
Reemplaza cada placeholder {{NOMBRE_CAMPO}} por su valor correspondiente en "campos". 
Reglas:
- Devuelve el DOCUMENTO COMPLETO en una sola respuesta. No fragmentes, no pidas "continuar".
- No cambies títulos ni formato Markdown.
- Si un campo está vacío o no existe, deja el placeholder tal cual (por ejemplo {{NOMBRE_CLIENTE}}).
- No añadas comentarios, solo el texto final del documento.

 ${inputPlantillaMd}  ${stateTranscripcionTexto} ${stateTipoContratoUsuario}`;
};

const rellenadorDePlantilla = new Agent({
  name: "Rellenador de Plantilla",
  instructions: rellenadorDePlantillaInstructions,
  model: "gpt-4.1",
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 4079,
    store: true
  }
});

type WorkflowInput = { input_as_text: string };

// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("Copy 2 of EMMA 3DPP", async () => {
    const state = {
      transcripcion_texto: workflow.input_as_text, // FIX: Asignar el input correcto
      tipo_contrato_usuario: null
    };
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: "agent-builder",
        workflow_id: "wf_6914fbc046a4819083301ccff5a0a43e055066078b780e20"
      }
    });
    
    const clasificadorDeContratoResultTemp = await runner.run(
      clasificadorDeContrato,
      [...conversationHistory],
      {
        context: {
          stateTranscripcionTexto: state.transcripcion_texto!, // FIX: Ya no null
          stateTipoContratoUsuario: state.tipo_contrato_usuario
        }
      }
    );
    
    conversationHistory.push(...clasificadorDeContratoResultTemp.newItems.map((item) => item.rawItem));

    if (!clasificadorDeContratoResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const clasificadorDeContratoResult = {
      output_text: clasificadorDeContratoResultTemp.finalOutput,
      output_parsed: (() => {
        try {
          return typeof clasificadorDeContratoResultTemp.finalOutput === 'string' 
            ? JSON.parse(clasificadorDeContratoResultTemp.finalOutput) 
            : clasificadorDeContratoResultTemp.finalOutput;
        } catch {
          return { tipo_contrato: "contrato_base" };
        }
      })()
    };
    
    state.tipo_contrato_usuario = clasificadorDeContratoResult.output_parsed?.tipo_contrato || "contrato_base";
    
    const guardrailsInputText = workflow.input_as_text;
    const { hasTripwire: guardrailsHasTripwire, safeText: guardrailsAnonymizedText, failOutput: guardrailsFailOutput, passOutput: guardrailsPassOutput } = await runAndApplyGuardrails(guardrailsInputText, guardrailsConfig, conversationHistory, workflow);
    const guardrailsOutput = (guardrailsHasTripwire ? guardrailsFailOutput : guardrailsPassOutput);
    
    if (guardrailsHasTripwire) {
      return guardrailsOutput;
    } else {
      const extractorDeCamposResultTemp = await runner.run(
        extractorDeCampos,
        [...conversationHistory],
        {
          context: {
            stateTranscripcionTexto: state.transcripcion_texto!, // FIX: Ya no null  
            stateTipoContratoUsuario: state.tipo_contrato_usuario!
          }
        }
      );
      
      conversationHistory.push(...extractorDeCamposResultTemp.newItems.map((item) => item.rawItem));

      if (!extractorDeCamposResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const extractorDeCamposResult = {
        output_text: JSON.stringify(extractorDeCamposResultTemp.finalOutput),
        output_parsed: extractorDeCamposResultTemp.finalOutput
      };
      
      // FIX: Vector search query correcto
      const filesearchResult = await client.vectorStores.search("vs_6913f7fc7e7c8191a4ff6cc9f1986903", {
        query: state.tipo_contrato_usuario!,
        max_num_results: 1
      });
      
      // FIX: Acceso correcto a los resultados
      const transformResult = {
        plantilla_md: (filesearchResult.data[0] as any)?.content?.[0]?.text || "Plantilla no encontrada"
      };
      
      const rellenadorDePlantillaResultTemp = await runner.run(
        rellenadorDePlantilla,
        [...conversationHistory],
        {
          context: {
            inputPlantillaMd: transformResult.plantilla_md,
            stateTranscripcionTexto: state.transcripcion_texto!,
            stateTipoContratoUsuario: state.tipo_contrato_usuario!
          }
        }
      );
      
      conversationHistory.push(...rellenadorDePlantillaResultTemp.newItems.map((item) => item.rawItem));

      if (!rellenadorDePlantillaResultTemp.finalOutput) {
          throw new Error("Agent result is undefined");
      }

      const rellenadorDePlantillaResult = {
        output_text: rellenadorDePlantillaResultTemp.finalOutput ?? ""
      };
      
      // FIX: Return el resultado final
      return rellenadorDePlantillaResult.output_text;
    }
  });
};