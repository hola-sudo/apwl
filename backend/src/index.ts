import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { runWorkflow } from './agents/workflow';
import { createLogger, format, transports } from 'winston';
import { authenticateApiKey, AuthenticatedRequest } from './middleware/authenticateApiKey';
import adminAgentsRoutes from './routes/admin/agents';
import adminClientsRoutes from './routes/admin/clients';
import adminDashboardRoutes from './routes/admin/index';
import adminSessionsRoutes from './routes/admin/sessions';
import { AgentService } from './services/agentService';

// Load environment variables
dotenv.config();

// Use the singleton Prisma instance
import { prisma } from './lib/prisma';

// Initialize Express app
const app = express();

// Trust proxy for Railway deployment - configure properly
app.set('trust proxy', 1); // trust first proxy
const PORT = process.env.PORT || 8080;

// Logger setup
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'contract-processor' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

// Validation schema (clientId now comes from API key authentication)
const AgentRunSchema = z.object({
  inputText: z.string().min(1, 'inputText is required')
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});

// Middleware
app.use(helmet()); // Security headers

// Serve static files from public directory
app.use(express.static('public'));
// CORS configuration for Railway deployment
app.use(cors({
  origin: [
    'https://frontend-production-5f9b.up.railway.app',
    'https://*.railway.app',
    'http://localhost:3000',
    'http://localhost:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
})); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies (with size limit)
app.use(limiter); // Apply rate limiting

// Admin routes (for managing clients and agents)
app.use('/api/admin/agents', adminAgentsRoutes);
app.use('/api/admin/clients', adminClientsRoutes);
app.use('/api/admin', adminSessionsRoutes);
app.use('/api/admin', adminDashboardRoutes);

// Admin health check endpoint (for frontend authentication)
app.get('/api/admin/health', authenticateApiKey, (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    service: 'admin'
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    });
  }
});

// API Health check endpoint (for frontend proxy)
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      service: 'api'
    });
  } catch (error) {
    logger.error('API Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      service: 'api'
    });
  }
});

// Multi-Agent endpoint (NEW ARCHITECTURE)
app.post('/api/agent/run', async (req, res) => {
  const startTime = Date.now();

  try {
    // Extract API key from header
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Please provide x-api-key header.',
        code: 'MISSING_API_KEY'
      });
    }

    // Get agent by API key
    const agent = await AgentService.getAgentByApiKey(apiKey);
    if (!agent) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key. Please check your credentials.',
        code: 'INVALID_API_KEY'
      });
    }

    // Validate request body
    const validationResult = AgentRunSchema.safeParse(req.body);
    if (!validationResult.success) {
      logger.warn('Validation failed', { 
        errors: validationResult.error.errors,
        agentId: agent.id,
        clientId: agent.clientId,
        clientIp: req.ip
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const { inputText } = validationResult.data;

    // Log incoming request
    logger.info('Processing multi-agent request', {
      agentId: agent.id,
      agentName: agent.name,
      clientId: agent.clientId,
      inputLength: inputText.length,
      clientIp: req.ip
    });

    // Process with specific agent
    const result = await AgentService.processWithAgent(agent.id, inputText, {
      clientIp: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer')
    });

    const processingTime = Date.now() - startTime;
    logger.info('Multi-agent request completed successfully', {
      agentId: agent.id,
      sessionId: result.sessionId,
      processingTime
    });

    // Return success response
    res.json({
      message: result.result,
      sessionId: result.sessionId,
      processingTime: result.processingTime,
      agentId: agent.id,
      agentName: agent.name
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    logger.error('Multi-agent request failed', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      clientIp: req.ip
    });

    // Return error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process agent request'
    });
  }
});

// Get session status endpoint (NEW ARCHITECTURE - agent-based)
app.get('/api/agent/session/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: 'Invalid session ID'
      });
    }

    // Extract API key for agent authentication
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Please provide x-api-key header.',
        code: 'MISSING_API_KEY'
      });
    }

    // Get agent by API key
    const agent = await AgentService.getAgentByApiKey(apiKey);
    if (!agent) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key. Please check your credentials.',
        code: 'INVALID_API_KEY'
      });
    }

    // Find session and ensure it belongs to the authenticated agent
    const session = await prisma.session.findFirst({
      where: { 
        id: sessionId,
        agentId: agent.id // Security: only return sessions for the authenticated agent
      }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or access denied'
      });
    }

    res.json({
      id: session.id,
      agentId: session.agentId,
      agentName: session.agentId, // Fix: use agentId since agent relation might not be included
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      processingTime: session.processingTime,
      ...(session.agentOutput && { result: session.agentOutput }),
      ...(session.errorMessage && { error: session.errorMessage })
    });

  } catch (error) {
    logger.error('Failed to fetch session', { 
      sessionId: req.params.id,
      error: error instanceof Error ? error.message : error 
    });
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`🤖 Agent endpoint: http://localhost:${PORT}/api/agent/run`);
});

export default app;