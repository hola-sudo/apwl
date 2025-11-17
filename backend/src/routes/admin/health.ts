import express from 'express';
import { authenticateApiKey } from '../../middleware/authenticateApiKey';

const router = express.Router();

// GET /api/admin/health - Health check for admin authentication
router.get('/health', authenticateApiKey, (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    service: 'admin'
  });
});

export default router;