import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// Extended Request interface to include clientId and agent
export interface AuthenticatedRequest extends Request {
  clientId?: string;
  agent?: {
    id: string;
    name: string;
    clientId: string;
    apiKey: string;
    status: string;
  };
}

/**
 * Middleware to authenticate API key and extract client ID from database
 */
export const authenticateApiKey = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract API key from header
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Please provide x-api-key header.',
        code: 'MISSING_API_KEY'
      });
      return;
    }

    // Find agent by API key in database
    const agent = await prisma.agent.findFirst({
      where: { 
        apiKey: apiKey,
        status: 'active' // Only allow active agents
      },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!agent) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key. Please check your credentials.',
        code: 'INVALID_API_KEY'
      });
      return;
    }

    // Add clientId and agent to request object for use in handlers
    req.clientId = agent.clientId;
    req.agent = {
      id: agent.id,
      name: agent.name,
      clientId: agent.clientId,
      apiKey: agent.apiKey,
      status: agent.status
    };
    
    // Log successful authentication (without exposing the key)
    console.log(`🔐 Authenticated agent: ${agent.name} (client: ${agent.client?.name}, key: ${apiKey.substring(0, 8)}...)`);
    
    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication system temporarily unavailable',
      code: 'AUTH_SYSTEM_ERROR'
    });
  }
};

/**
 * Utility function to validate API key format
 */
export const isValidApiKeyFormat = (apiKey: string): boolean => {
  // API key should be at least 16 characters and contain only alphanumeric characters and underscores
  const apiKeyRegex = /^[A-Z0-9_-]{16,}$/;
  return apiKeyRegex.test(apiKey);
};

/**
 * Generate a new API key for a client (utility function)
 */
export const generateApiKey = (clientId: string): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `APIKEY_${clientId.toUpperCase()}_${timestamp}_${random}`;
};