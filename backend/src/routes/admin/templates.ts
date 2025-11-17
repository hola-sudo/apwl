import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../../lib/prisma';

const router = Router();

// Configurar multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const { clientId, templateType } = req.body;
    const fileName = `${clientId}_${templateType}_${Date.now()}.md`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/markdown' || path.extname(file.originalname).toLowerCase() === '.md') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos .md') as any, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// Tipos de plantilla válidos
const VALID_TEMPLATE_TYPES = ['contrato_base', 'anexo_a', 'anexo_b', 'anexo_c', 'anexo_d'];

// Función para extraer placeholders del contenido
function extractPlaceholders(content: string): string[] {
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(content)) !== null) {
    const placeholder = match[1]?.trim() || '';
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }
  
  return placeholders;
}

// Función para validar placeholders mínimos requeridos
function validateRequiredPlaceholders(placeholders: string[], templateType: string): { isValid: boolean; missing: string[] } {
  const requiredPlaceholders = ['NOMBRE_CLIENTE', 'FECHA_EVENTO'];
  const missing = requiredPlaceholders.filter(req => !placeholders.includes(req));
  
  return {
    isValid: missing.length === 0,
    missing
  };
}

// POST /api/admin/templates/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { clientId, templateType, uploadedBy } = req.body;
    const file = req.file;

    // Validar parámetros
    if (!clientId || !templateType || !file) {
      return res.status(400).json({
        success: false,
        error: 'clientId, templateType y file son requeridos'
      });
    }

    if (!VALID_TEMPLATE_TYPES.includes(templateType)) {
      return res.status(400).json({
        success: false,
        error: `templateType debe ser uno de: ${VALID_TEMPLATE_TYPES.join(', ')}`
      });
    }

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Leer contenido del archivo
    const content = fs.readFileSync(file.path, 'utf-8');

    // Extraer placeholders
    const placeholders = extractPlaceholders(content);
    
    // Validar placeholders requeridos
    const validation = validateRequiredPlaceholders(placeholders, templateType);
    
    if (!validation.isValid) {
      // Eliminar archivo subido si la validación falla
      fs.unlinkSync(file.path);
      
      return res.status(400).json({
        success: false,
        error: `Plantilla inválida. Faltan placeholders requeridos: ${validation.missing.join(', ')}`,
        placeholdersFound: placeholders,
        placeholdersMissing: validation.missing
      });
    }

    // Crear URL del archivo (relativa)
    const fileUrl = `/uploads/templates/${file.filename}`;

    // Guardar o actualizar en base de datos
    const contractTemplate = await prisma.contractTemplate.upsert({
      where: {
        clientId_templateType: {
          clientId,
          templateType
        }
      },
      update: {
        fileName: file.originalname,
        content,
        fileUrl,
        placeholders: placeholders.join(','),
        uploadedBy,
        updatedAt: new Date()
      },
      create: {
        clientId,
        templateType,
        fileName: file.originalname,
        content,
        fileUrl,
        placeholders: placeholders.join(','),
        uploadedBy
      }
    });

    res.json({
      success: true,
      data: {
        id: contractTemplate.id,
        templateType: contractTemplate.templateType,
        fileName: contractTemplate.fileName,
        placeholders: contractTemplate.placeholders,
        placeholdersCount: placeholders.length,
        fileUrl: contractTemplate.fileUrl,
        uploadedAt: contractTemplate.updatedAt
      }
    });

  } catch (error) {
    console.error('Error uploading template:', error);
    
    // Limpiar archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

// GET /api/admin/templates/:clientId
router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    // Obtener todas las plantillas del cliente
    const templates = await prisma.contractTemplate.findMany({
      where: { 
        clientId,
        isActive: true
      },
      select: {
        id: true,
        templateType: true,
        fileName: true,
        fileUrl: true,
        placeholders: true,
        createdAt: true,
        updatedAt: true,
        uploadedBy: true
      },
      orderBy: {
        templateType: 'asc'
      }
    });

    // Crear un mapa de plantillas disponibles
    const templateMap = VALID_TEMPLATE_TYPES.reduce((acc, type) => {
      const template = templates.find(t => t.templateType === type);
      acc[type] = template || null;
      return acc;
    }, {} as Record<string, any>);

    res.json({
      success: true,
      data: {
        clientId,
        clientName: client.name,
        templates: templateMap,
        templatesList: templates,
        totalTemplates: templates.length,
        availableTypes: VALID_TEMPLATE_TYPES,
        missingTypes: VALID_TEMPLATE_TYPES.filter(type => !templateMap[type])
      }
    });

  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

// GET /api/agents/:clientId/templates/:templateType
router.get('/agents/:clientId/templates/:templateType', async (req: Request, res: Response) => {
  try {
    const { clientId, templateType } = req.params;

    if (!templateType || !VALID_TEMPLATE_TYPES.includes(templateType)) {
      return res.status(400).json({
        success: false,
        error: `templateType debe ser uno de: ${VALID_TEMPLATE_TYPES.join(', ')}`
      });
    }

    // Buscar la plantilla
    const template = await prisma.contractTemplate.findUnique({
      where: {
        clientId_templateType: {
          clientId: clientId!,
          templateType: templateType!
        }
      }
    });

    if (!template || !template.isActive) {
      return res.status(404).json({
        success: false,
        error: `Plantilla ${templateType} no encontrada para el cliente`,
        templateType,
        clientId
      });
    }

    // Devolver el contenido de la plantilla
    res.setHeader('Content-Type', 'text/plain');
    res.send(template.content);

  } catch (error) {
    console.error('Error getting template content:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

// DELETE /api/admin/templates/:templateId
router.delete('/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    
    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }

    // Buscar la plantilla
    const template = await prisma.contractTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    // Eliminar archivo físico si existe
    if (template.fileUrl) {
      const filePath = path.join(process.cwd(), template.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Marcar como inactiva en lugar de eliminar
    await prisma.contractTemplate.update({
      where: { id: templateId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Plantilla eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

// GET /api/admin/templates/:templateId/content
router.get('/:templateId/content', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    const template = await prisma.contractTemplate.findUnique({
      where: { id: templateId },
      include: {
        client: {
          select: {
            name: true
          }
        }
      }
    });

    if (!template || !template.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    res.json({
      success: true,
      data: {
        id: template.id,
        clientName: template.client?.name || 'Unknown Client',
        templateType: template.templateType,
        fileName: template.fileName,
        content: template.content,
        placeholders: template.placeholders,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    });

  } catch (error) {
    console.error('Error getting template content:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

export default router;