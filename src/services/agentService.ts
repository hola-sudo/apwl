import { PrismaClient } from '@prisma/client';
import { runWorkflow } from '../agents/workflow';
import { generateApiKey } from '../middleware/authenticateApiKey';
import { prisma } from '../lib/prisma';

export interface AgentConfig {
  name: string;
  description?: string;
  clientId: string;
  workflow?: any;
  prompts?: any;
  vectorStoreId?: string;
  modelSettings?: any;
  status?: 'active' | 'inactive' | 'draft';
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  workflow?: any;
  prompts?: any;
  vectorStoreId?: string;
  modelSettings?: any;
  status?: 'active' | 'inactive' | 'draft';
}

/**
 * Agent Service - Manages multi-agent operations
 */
export class AgentService {
  
  /**
   * Get all agents with client information
   */
  static async getAllAgents() {
    return await prisma.agent.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true
          }
        },
        sessions: {
          select: {
            id: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get agent by ID with full details
   */
  static async getAgentById(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        client: true,
        sessions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Calculate agent statistics
    const totalSessions = await prisma.session.count({
      where: { agentId: id }
    });

    const successfulSessions = await prisma.session.count({
      where: { agentId: id, status: 'completed' }
    });

    const avgProcessingTime = await prisma.session.aggregate({
      where: { 
        agentId: id, 
        status: 'completed',
        processingTime: { not: null }
      },
      _avg: {
        processingTime: true
      }
    });

    return {
      ...agent,
      stats: {
        totalSessions,
        successfulSessions,
        successRate: totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0,
        avgProcessingTime: avgProcessingTime._avg.processingTime || 0
      }
    };
  }

  /**
   * Get agent by API key
   */
  static async getAgentByApiKey(apiKey: string) {
    return await prisma.agent.findUnique({
      where: { apiKey },
      include: {
        client: true
      }
    });
  }

  /**
   * Create new agent
   */
  static async createAgent(config: AgentConfig) {
    // Generate unique API key
    const apiKey = generateApiKey(config.name.toLowerCase().replace(/\s+/g, '_'));

    // Default configuration
    const defaultWorkflow = {
      steps: ['classify', 'extract', 'generate'],
      timeout: 60000,
      enableGuardrails: true
    };

    const defaultPrompts = {
      clasificador: "Eres un analista legal especializado en clasificación de documentos contractuales...",
      extractor: "Eres un asistente paralegal. Debes analizar la transcripción recibida...",
      rellenador: "Toma la plantilla completa y el objeto 'campos' con los valores extraídos..."
    };

    const defaultModelSettings = {
      temperature: 0.2,
      maxTokens: 2048,
      model: 'gpt-4.1'
    };

    const agent = await prisma.agent.create({
      data: {
        name: config.name,
        description: config.description,
        clientId: config.clientId,
        apiKey,
        workflow: config.workflow || defaultWorkflow,
        prompts: config.prompts || defaultPrompts,
        vectorStoreId: config.vectorStoreId,
        modelSettings: config.modelSettings || defaultModelSettings,
        status: config.status || 'active',
        embedUrl: this.generateEmbedUrl(apiKey)
      },
      include: {
        client: true
      }
    });

    return agent;
  }

  /**
   * Update agent configuration
   */
  static async updateAgent(id: string, updates: AgentUpdate) {
    const agent = await prisma.agent.findUnique({
      where: { id }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    return await prisma.agent.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        client: true
      }
    });
  }

  /**
   * Delete agent
   */
  static async deleteAgent(id: string) {
    const agent = await prisma.agent.findUnique({
      where: { id }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // This will cascade delete all sessions
    return await prisma.agent.delete({
      where: { id }
    });
  }

  /**
   * Process input with specific agent
   */
  static async processWithAgent(agentId: string, inputText: string, metadata?: any) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.status !== 'active') {
      throw new Error('Agent is not active');
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        agentId,
        inputText,
        status: 'processing',
        clientIp: metadata?.clientIp,
        userAgent: metadata?.userAgent,
        referrer: metadata?.referrer
      }
    });

    try {
      const startTime = Date.now();

      // Use agent-specific configuration for workflow
      const workflowConfig = {
        input_as_text: inputText,
        agentConfig: agent
      };

      const result = await runWorkflow(workflowConfig);
      const processingTime = Date.now() - startTime;

      // Update session with result
      await prisma.session.update({
        where: { id: session.id },
        data: {
          agentOutput: typeof result === 'string' ? result : JSON.stringify(result),
          status: 'completed',
          processingTime
        }
      });

      return {
        sessionId: session.id,
        result: typeof result === 'string' ? result : JSON.stringify(result),
        processingTime
      };

    } catch (error) {
      // Update session with error
      await prisma.session.update({
        where: { id: session.id },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw error;
    }
  }

  /**
   * Get agent sessions with pagination
   */
  static async getAgentSessions(agentId: string, page = 1, limit = 20, status?: string) {
    const where: any = { agentId };
    if (status) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.session.count({ where })
    ]);

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get agent analytics
   */
  static async getAgentAnalytics(agentId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Sessions over time
    const sessionsOverTime = await prisma.session.groupBy({
      by: ['status'],
      where: {
        agentId,
        createdAt: { gte: since }
      },
      _count: true
    });

    // Processing time analytics
    const processingStats = await prisma.session.aggregate({
      where: {
        agentId,
        status: 'completed',
        createdAt: { gte: since },
        processingTime: { not: null }
      },
      _avg: { processingTime: true },
      _min: { processingTime: true },
      _max: { processingTime: true }
    });

    // Daily session counts
    const dailySessions = await prisma.$queryRaw<Array<{date: string, count: number}>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM sessions 
      WHERE agent_id = ${agentId} 
        AND created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return {
      sessionsOverTime,
      processingStats,
      dailySessions,
      period: { since, days }
    };
  }

  /**
   * Generate embed URL for agent
   */
  private static generateEmbedUrl(apiKey: string): string {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/embed/${Buffer.from(apiKey).toString('base64')}`;
  }

  /**
   * Regenerate API key for agent
   */
  static async regenerateApiKey(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const newApiKey = generateApiKey(agent.name.toLowerCase().replace(/\s+/g, '_'));

    return await prisma.agent.update({
      where: { id: agentId },
      data: {
        apiKey: newApiKey,
        embedUrl: this.generateEmbedUrl(newApiKey)
      }
    });
  }
}