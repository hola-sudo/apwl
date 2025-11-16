module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Excluir archivo principal por ser mayormente configuración
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  // Configuración específica para archivos que requieren mayor cobertura
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85
    },
    // Archivos críticos requieren mayor cobertura
    './src/agents/dynamicWorkflow.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/routes/admin/templates.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};