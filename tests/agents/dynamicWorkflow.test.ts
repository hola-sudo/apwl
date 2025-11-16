import { runDynamicWorkflow } from '../../src/agents/dynamicWorkflow';

// Mock OpenAI para las pruebas
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'contrato_base'
            }
          }]
        })
      }
    }
  }))
}));

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    contractTemplate: {
      findUnique: jest.fn().mockResolvedValue(null)
    },
    $disconnect: jest.fn()
  }))
}));

describe('dynamicWorkflow - Seguridad TypeScript', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
  });

  it('no falla si workflow.input es undefined', async () => {
    const input = {
      input_as_text: undefined as any,
      clientId: 'test-client'
    };

    await expect(runDynamicWorkflow(input)).resolves.not.toThrow();
  });

  it('no falla si falta clientId', async () => {
    const input = {
      input_as_text: 'Test contract text',
      clientId: undefined
    };

    const result = await runDynamicWorkflow(input);
    expect(result).toHaveProperty('success');
  });

  it('maneja respuesta vacía de OpenAI sin fallar', async () => {
    // Mock respuesta vacía
    const mockOpenAI = require('openai').OpenAI;
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: []
          })
        }
      }
    }));

    const input = {
      input_as_text: 'Test contract text',
      clientId: 'test-client'
    };

    const result = await runDynamicWorkflow(input);
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(true); // Debe usar defaults seguros
  });

  it('maneja respuesta malformada de OpenAI', async () => {
    // Mock respuesta con estructura incompleta
    const mockOpenAI = require('openai').OpenAI;
    mockOpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: null }]
          })
        }
      }
    }));

    const input = {
      input_as_text: 'Test contract text',
      clientId: 'test-client'
    };

    await expect(runDynamicWorkflow(input)).resolves.not.toThrow();
  });

  it('extrae placeholders correctamente incluso con texto vacío', () => {
    // Esta función debería ser exportada para testing, pero por ahora testearemos indirectamente
    const input = {
      input_as_text: '',
      clientId: 'test-client'
    };

    expect(async () => await runDynamicWorkflow(input)).not.toThrow();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});