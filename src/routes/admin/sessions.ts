import express from 'express';
import { prisma } from '../../lib/prisma';
import { authenticateApiKey } from '../../middleware/authenticateApiKey';

const router = express.Router();

// GET /api/admin/sessions - Get all sessions with pagination
router.get('/sessions', authenticateApiKey, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const [sessions, totalCount] = await Promise.all([
      prisma.session.findMany({
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              client: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.session.count()
    ]);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/admin/sessions/stats - Get dashboard statistics
router.get('/sessions/stats', authenticateApiKey, async (req, res) => {
  try {
    const [
      totalSessions,
      completedSessions,
      failedSessions,
      recentSessions,
      totalClients,
      totalAgents
    ] = await Promise.all([
      prisma.session.count(),
      prisma.session.count({ where: { status: 'completed' } }),
      prisma.session.count({ where: { status: 'failed' } }),
      prisma.session.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: {
            select: {
              name: true,
              client: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }),
      prisma.client.count(),
      prisma.agent.count()
    ]);

    const successRate = totalSessions > 0 
      ? Math.round((completedSessions / totalSessions) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        totalClients,
        totalAgents,
        totalSessions,
        successRate,
        stats: {
          completed: completedSessions,
          failed: failedSessions,
          pending: totalSessions - completedSessions - failedSessions
        },
        recentSessions
      }
    });
  } catch (error) {
    console.error('Error fetching session stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;