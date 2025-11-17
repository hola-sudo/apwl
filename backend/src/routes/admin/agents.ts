import express from 'express';
import { z } from 'zod';
import { AgentService } from '../../services/agentService';

const router = express.Router();

// Validation schemas
const CreateAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required'),
  description: z.string().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  workflow: z.object({}).optional(),
  prompts: z.object({}).optional(),
  vectorStoreId: z.string().optional(),
  modelSettings: z.object({}).optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional()
});

const UpdateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  workflow: z.object({}).optional(),
  prompts: z.object({}).optional(),
  vectorStoreId: z.string().optional(),
  modelSettings: z.object({}).optional(),
  status: z.enum(['active', 'inactive', 'draft']).optional()
});

/**
 * GET /api/admin/agents
 * Get all agents with client information
 */
router.get('/', async (req, res) => {
  try {
    const agents = await AgentService.getAllAgents();
    
    res.json({
      success: true,
      data: agents,
      total: agents.length
    });
  } catch (error) {
    console.error('Failed to get agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agents',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/agents/:id
 * Get agent details with statistics
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await AgentService.getAgentById(id);
    
    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    console.error('Failed to get agent:', error);
    const statusCode = error instanceof Error && error.message === 'Agent not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to retrieve agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/agents
 * Create new agent
 */
router.post('/', async (req, res) => {
  try {
    const validationResult = CreateAgentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const agent = await AgentService.createAgent(validationResult.data);
    
    res.status(201).json({
      success: true,
      data: agent,
      message: 'Agent created successfully'
    });
  } catch (error) {
    console.error('Failed to create agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/agents/:id
 * Update agent configuration
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const validationResult = UpdateAgentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const agent = await AgentService.updateAgent(id, validationResult.data);
    
    res.json({
      success: true,
      data: agent,
      message: 'Agent updated successfully'
    });
  } catch (error) {
    console.error('Failed to update agent:', error);
    const statusCode = error instanceof Error && error.message === 'Agent not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to update agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/agents/:id
 * Delete agent and all associated sessions
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await AgentService.deleteAgent(id);
    
    res.json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    const statusCode = error instanceof Error && error.message === 'Agent not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to delete agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/agents/:id/sessions
 * Get agent sessions with pagination
 */
router.get('/:id/sessions', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', status } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page number'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit (must be between 1 and 100)'
      });
    }

    const result = await AgentService.getAgentSessions(
      id, 
      pageNum, 
      limitNum, 
      status as string
    );
    
    res.json({
      success: true,
      data: result.sessions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Failed to get agent sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/agents/:id/analytics
 * Get agent analytics and metrics
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = '30' } = req.query;
    
    const daysNum = parseInt(days as string);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      return res.status(400).json({
        success: false,
        error: 'Invalid days parameter (must be between 1 and 365)'
      });
    }

    const analytics = await AgentService.getAgentAnalytics(id, daysNum);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Failed to get agent analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve agent analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/agents/:id/regenerate-key
 * Regenerate API key for agent
 */
router.post('/:id/regenerate-key', async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await AgentService.regenerateApiKey(id);
    
    res.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        apiKey: agent.apiKey,
        embedUrl: agent.embedUrl
      },
      message: 'API key regenerated successfully'
    });
  } catch (error) {
    console.error('Failed to regenerate API key:', error);
    const statusCode = error instanceof Error && error.message === 'Agent not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to regenerate API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/agents/:id/test
 * Test agent with sample input
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { inputText } = req.body;
    
    if (!inputText || typeof inputText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'inputText is required and must be a string'
      });
    }

    const result = await AgentService.processWithAgent(id, inputText, {
      clientIp: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: 'admin-test'
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Agent test completed successfully'
    });
  } catch (error) {
    console.error('Failed to test agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test agent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;