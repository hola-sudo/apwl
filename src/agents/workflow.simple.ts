import { OpenAI } from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface WorkflowConfig {
  input_as_text: string;
  agentConfig: any;
}

/**
 * Simplified workflow that actually works
 */
export async function runWorkflow(config: WorkflowConfig): Promise<string> {
  const { input_as_text, agentConfig } = config;
  
  try {
    // Parse agent configuration
    const workflow = typeof agentConfig.workflow === 'string' 
      ? JSON.parse(agentConfig.workflow) 
      : agentConfig.workflow;
    
    const prompts = typeof agentConfig.prompts === 'string' 
      ? JSON.parse(agentConfig.prompts) 
      : agentConfig.prompts;
    
    const modelSettings = typeof agentConfig.modelSettings === 'string' 
      ? JSON.parse(agentConfig.modelSettings) 
      : agentConfig.modelSettings;

    console.log('Starting workflow with steps:', workflow.steps);
    
    let result = input_as_text;
    
    // Step 1: Classification
    if (workflow.steps.includes('classify')) {
      const classificationResponse = await client.chat.completions.create({
        model: modelSettings.model || 'gpt-3.5-turbo',
        temperature: modelSettings.temperature || 0.2,
        max_tokens: 500,
        messages: [
          {
            role: 'system',
            content: prompts.clasificador || 'Clasifica el tipo de contrato legal basándote en el contenido proporcionado.'
          },
          {
            role: 'user',
            content: `Clasifica este documento: ${input_as_text}`
          }
        ]
      });
      
      const classification = classificationResponse.choices[0]?.message?.content || 'contrato_base';
      console.log('Classification result:', classification);
      result = classification;
    }
    
    // Step 2: Field Extraction
    if (workflow.steps.includes('extract')) {
      const extractionResponse = await client.chat.completions.create({
        model: modelSettings.model || 'gpt-3.5-turbo',
        temperature: modelSettings.temperature || 0.2,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: prompts.extractor || 'Extrae los campos importantes del contrato y devuélvelos en formato JSON.'
          },
          {
            role: 'user',
            content: `Extrae campos de: ${input_as_text}\n\nTipo identificado: ${result}`
          }
        ]
      });
      
      const extraction = extractionResponse.choices[0]?.message?.content || '{}';
      console.log('Extraction result:', extraction);
      result = extraction;
    }
    
    // Step 3: Template Generation
    if (workflow.steps.includes('generate')) {
      const generationResponse = await client.chat.completions.create({
        model: modelSettings.model || 'gpt-3.5-turbo',
        temperature: modelSettings.temperature || 0.2,
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content: prompts.rellenador || 'Genera un contrato profesional basado en los datos extraídos.'
          },
          {
            role: 'user',
            content: `Genera contrato con datos: ${result}\n\nTexto original: ${input_as_text}`
          }
        ]
      });
      
      const generation = generationResponse.choices[0]?.message?.content || 'Error en generación';
      console.log('Generation completed');
      result = generation;
    }
    
    return result;
    
  } catch (error) {
    console.error('Workflow error:', error);
    throw new Error(`Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}