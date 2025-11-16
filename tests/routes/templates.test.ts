import request from 'supertest';
import express from 'express';
import templateRoutes from '../../src/routes/admin/templates';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    contractTemplate: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({
        id: 'test-id',
        clientId: 'test-client',
        templateType: 'contrato_base',
        fileName: 'test.md',
        content: 'Test content'
      })
    }
  }))
}));

// Mock multer para evitar problemas con subida de archivos en tests
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req: any, res: any, next: any) => {
      req.file = {
        originalname: 'test.md',
        path: '/fake/path/test.md'
      };
      next();
    }
  });
  multer.diskStorage = jest.fn(() => ({}));
  return multer;
});

const app = express();
app.use(express.json());
app.use('/admin/templates', templateRoutes);

describe('Templates Routes - Seguridad TypeScript', () => {
  describe('GET /agents/:clientId/templates/:templateType', () => {
    it('funciona aunque falten parámetros requeridos', async () => {
      const res = await request(app)
        .get('/admin/templates/agents//templates/');
      
      // No debe devolver error 500 (crash del servidor)
      expect(res.status).toBeLessThan(500);
    });

    it('maneja clientId undefined correctamente', async () => {
      const res = await request(app)
        .get('/admin/templates/agents/undefined/templates/contrato_base');
      
      expect(res.status).toBeLessThan(500);
    });

    it('maneja templateType undefined correctamente', async () => {
      const res = await request(app)
        .get('/admin/templates/agents/test-client/templates/undefined');
      
      expect(res.status).toBe(400); // Debe devolver error controlado, no crash
      expect(res.body).toHaveProperty('error');
    });

    it('funciona con parámetros válidos', async () => {
      const res = await request(app)
        .get('/admin/templates/agents/test-client/templates/contrato_base');
      
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /upload', () => {
    it('funciona aunque falte req.body completo', async () => {
      const res = await request(app)
        .post('/admin/templates/upload')
        .send({}); // req.body vacío
      
      expect(res.status).toBeLessThan(500);
    });

    it('maneja clientId undefined en req.body', async () => {
      const res = await request(app)
        .post('/admin/templates/upload')
        .send({
          templateType: 'contrato_base'
          // clientId faltante
        });
      
      expect(res.status).toBeLessThan(500);
    });

    it('maneja templateType undefined en req.body', async () => {
      const res = await request(app)
        .post('/admin/templates/upload')
        .send({
          clientId: 'test-client'
          // templateType faltante
        });
      
      expect(res.status).toBeLessThan(500);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});