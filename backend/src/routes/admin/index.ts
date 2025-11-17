import express from 'express';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import healthRoutes from './health';
import clientsRoutes from './clients';
import agentsRoutes from './agents';
import sessionsRoutes from './sessions';

const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview statistics
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Get overview statistics
    const [
      totalClients,
      totalAgents,
      totalSessions,
      activeSessions,
      recentSessions
    ] = await Promise.all([
      prisma.client.count(),
      prisma.agent.count(),
      prisma.session.count(),
      prisma.session.count({ where: { status: 'processing' } }),
      prisma.session.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            include: {
              client: {
                select: { name: true }
              }
            }
          }
        }
      })
    ]);

    // Get sessions by status
    const sessionsByStatus = await prisma.session.groupBy({
      by: ['status'],
      _count: true
    });

    // Get top performing agents
    const topAgentsRaw = await prisma.$queryRaw<Array<{
      agentId: string,
      agentName: string,
      clientName: string,
      totalSessions: bigint,
      successRate: number
    }>>`
      SELECT 
        a.id as "agentId",
        a.name as "agentName",
        c.name as "clientName",
        COUNT(s.id) as "totalSessions",
        (COUNT(CASE WHEN s.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(s.id), 0)) as "successRate"
      FROM agents a
      JOIN clients c ON a.client_id = c.id
      LEFT JOIN sessions s ON a.id = s.agent_id
      GROUP BY a.id, a.name, c.name
      HAVING COUNT(s.id) > 0
      ORDER BY "totalSessions" DESC, "successRate" DESC
      LIMIT 5
    `;
    
    // Convert BigInt to Number for serialization
    const topAgents = topAgentsRaw.map(agent => ({
      ...agent,
      totalSessions: Number(agent.totalSessions)
    }));

    // Get recent activity
    const recentActivity = recentSessions.map(session => ({
      id: session.id,
      type: 'session',
      agentName: session.agent.name,
      clientName: session.agent.client.name,
      status: session.status,
      createdAt: session.createdAt,
      processingTime: session.processingTime
    }));

    res.json({
      success: true,
      data: {
        overview: {
          totalClients,
          totalAgents,
          totalSessions,
          activeSessions
        },
        sessionsByStatus: sessionsByStatus.map(item => ({
          status: item.status,
          count: item._count
        })),
        topAgents,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Failed to get dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/stats
 * Get platform-wide statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
      return res.status(400).json({
        success: false,
        error: 'Invalid days parameter (must be between 1 and 365)'
      });
    }

    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    // Daily sessions
    const dailySessions = await prisma.$queryRaw<Array<{
      date: string,
      total: number,
      completed: number,
      failed: number
    }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM sessions
      WHERE created_at >= ${since}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Agent performance
    const agentPerformance = await prisma.$queryRaw<Array<{
      agentId: string,
      agentName: string,
      clientName: string,
      totalSessions: number,
      avgProcessingTime: number,
      successRate: number
    }>>`
      SELECT 
        a.id as "agentId",
        a.name as "agentName",
        c.name as "clientName",
        COUNT(s.id) as "totalSessions",
        AVG(CASE WHEN s.status = 'completed' THEN s.processing_time END) as "avgProcessingTime",
        (COUNT(CASE WHEN s.status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(s.id), 0)) as "successRate"
      FROM agents a
      JOIN clients c ON a.client_id = c.id
      LEFT JOIN sessions s ON a.id = s.agent_id AND s.created_at >= ${since}
      GROUP BY a.id, a.name, c.name
      ORDER BY "totalSessions" DESC
    `;

    // Platform metrics
    const platformMetrics = await prisma.session.aggregate({
      where: { createdAt: { gte: since } },
      _avg: { processingTime: true },
      _sum: { processingTime: true },
      _count: true
    });

    res.json({
      success: true,
      data: {
        period: { since, days: daysNum },
        dailySessions,
        agentPerformance,
        platformMetrics: {
          totalSessions: platformMetrics._count,
          avgProcessingTime: platformMetrics._avg.processingTime || 0,
          totalProcessingTime: platformMetrics._sum.processingTime || 0
        }
      }
    });

  } catch (error) {
    console.error('Failed to get platform stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve platform statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Import and use templates router
import templatesRouter from './templates';
router.use('/templates', templatesRouter);

// Use the individual route modules
router.use('/', healthRoutes);
router.use('/', clientsRoutes);
router.use('/', agentsRoutes);
router.use('/', sessionsRoutes);

export default router;