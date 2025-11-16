import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/prisma';

export interface ClientConfig {
  name: string;
  email?: string;
  company?: string;
}

export interface ClientUpdate {
  name?: string;
  email?: string;
  company?: string;
}

/**
 * Client Service - Manages client operations
 */
export class ClientService {
  
  /**
   * Get all clients with agent counts and recent activity
   */
  static async getAllClients() {
    const clients = await prisma.client.findMany({
      include: {
        agents: {
          include: {
            sessions: {
              select: {
                id: true,
                status: true,
                createdAt: true
              },
              orderBy: {
                createdAt: 'desc'
              },
              take: 1
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return clients.map(client => ({
      ...client,
      stats: {
        totalAgents: client.agents.length,
        activeAgents: client.agents.filter(agent => agent.status === 'active').length,
        totalSessions: client.agents.reduce((acc, agent) => acc + agent.sessions.length, 0),
        lastActivity: client.agents
          .flatMap(agent => agent.sessions)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.createdAt || null
      }
    }));
  }

  /**
   * Get client by ID with full details
   */
  static async getClientById(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        agents: {
          include: {
            sessions: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 5
            }
          }
        }
      }
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Calculate client statistics
    const totalSessions = await prisma.session.count({
      where: {
        agent: {
          clientId: id
        }
      }
    });

    const successfulSessions = await prisma.session.count({
      where: {
        agent: {
          clientId: id
        },
        status: 'completed'
      }
    });

    const avgProcessingTime = await prisma.session.aggregate({
      where: {
        agent: {
          clientId: id
        },
        status: 'completed',
        processingTime: { not: null }
      },
      _avg: {
        processingTime: true
      }
    });

    return {
      ...client,
      stats: {
        totalAgents: client.agents.length,
        activeAgents: client.agents.filter(agent => agent.status === 'active').length,
        totalSessions,
        successfulSessions,
        successRate: totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0,
        avgProcessingTime: avgProcessingTime._avg.processingTime || 0
      }
    };
  }

  /**
   * Create new client
   */
  static async createClient(config: ClientConfig) {
    // Check if email is already taken
    if (config.email) {
      const existingClient = await prisma.client.findUnique({
        where: { email: config.email }
      });

      if (existingClient) {
        throw new Error('Email already exists');
      }
    }

    return await prisma.client.create({
      data: {
        name: config.name,
        email: config.email,
        company: config.company
      },
      include: {
        agents: true
      }
    });
  }

  /**
   * Update client information
   */
  static async updateClient(id: string, updates: ClientUpdate) {
    const client = await prisma.client.findUnique({
      where: { id }
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Check if email is being changed and if it's already taken
    if (updates.email && updates.email !== client.email) {
      const existingClient = await prisma.client.findUnique({
        where: { email: updates.email }
      });

      if (existingClient) {
        throw new Error('Email already exists');
      }
    }

    return await prisma.client.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      },
      include: {
        agents: true
      }
    });
  }

  /**
   * Delete client and all associated agents/sessions
   */
  static async deleteClient(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        agents: true
      }
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // This will cascade delete all agents and their sessions
    return await prisma.client.delete({
      where: { id }
    });
  }

  /**
   * Get client analytics
   */
  static async getClientAnalytics(clientId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Sessions by agent
    const sessionsByAgent = await prisma.agent.findMany({
      where: { clientId },
      include: {
        sessions: {
          where: {
            createdAt: { gte: since }
          }
        }
      }
    });

    // Sessions over time
    const sessionsOverTime = await prisma.$queryRaw<Array<{date: string, count: number, status: string}>>`
      SELECT 
        DATE(s.created_at) as date,
        COUNT(*) as count,
        s.status
      FROM sessions s
      JOIN agents a ON s.agent_id = a.id
      WHERE a.client_id = ${clientId}
        AND s.created_at >= ${since}
      GROUP BY DATE(s.created_at), s.status
      ORDER BY date ASC
    `;

    // Agent performance
    const agentPerformance = await prisma.$queryRaw<Array<{agentId: string, agentName: string, totalSessions: number, successRate: number, avgProcessingTime: number}>>`
      SELECT 
        a.id as "agentId",
        a.name as "agentName",
        COUNT(s.id) as "totalSessions",
        (COUNT(CASE WHEN s.status = 'completed' THEN 1 END) * 100.0 / COUNT(s.id)) as "successRate",
        AVG(CASE WHEN s.status = 'completed' THEN s.processing_time END) as "avgProcessingTime"
      FROM agents a
      LEFT JOIN sessions s ON a.id = s.agent_id AND s.created_at >= ${since}
      WHERE a.client_id = ${clientId}
      GROUP BY a.id, a.name
      ORDER BY "totalSessions" DESC
    `;

    return {
      sessionsByAgent: sessionsByAgent.map(agent => ({
        agentId: agent.id,
        agentName: agent.name,
        sessionsCount: agent.sessions.length,
        sessions: agent.sessions
      })),
      sessionsOverTime,
      agentPerformance,
      period: { since, days }
    };
  }

  /**
   * Get client usage summary
   */
  static async getClientUsage(clientId: string) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        agents: {
          include: {
            sessions: {
              where: {
                createdAt: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
              }
            }
          }
        }
      }
    });

    if (!client) {
      throw new Error('Client not found');
    }

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyUsage = {
      totalSessions: client.agents.reduce((acc, agent) => acc + agent.sessions.length, 0),
      successfulSessions: client.agents.reduce((acc, agent) => 
        acc + agent.sessions.filter(session => session.status === 'completed').length, 0),
      failedSessions: client.agents.reduce((acc, agent) => 
        acc + agent.sessions.filter(session => session.status === 'failed').length, 0),
      totalProcessingTime: client.agents.reduce((acc, agent) => 
        acc + agent.sessions
          .filter(session => session.processingTime)
          .reduce((sum, session) => sum + (session.processingTime || 0), 0), 0)
    };

    return {
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company
      },
      agents: client.agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        sessionsThisMonth: agent.sessions.length
      })),
      usage: {
        month: currentMonth + 1,
        year: currentYear,
        ...monthlyUsage,
        successRate: monthlyUsage.totalSessions > 0 
          ? (monthlyUsage.successfulSessions / monthlyUsage.totalSessions) * 100 
          : 0
      }
    };
  }
}