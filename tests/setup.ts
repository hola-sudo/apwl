// Setup global para tests
import { jest } from '@jest/globals';

// Mock global de variables de entorno
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key';
process.env.DATABASE_URL = 'file:./test.db';

// Mock global de console para tests más limpios
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});