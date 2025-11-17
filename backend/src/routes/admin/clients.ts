import express from 'express';
import { z } from 'zod';
import { ClientService } from '../../services/clientService';

const router = express.Router();

// Validation schemas
const CreateClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  email: z.string().email('Invalid email format').optional(),
  company: z.string().optional()
});

const UpdateClientSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Invalid email format').optional(),
  company: z.string().optional()
});

/**
 * GET /api/admin/clients
 * Get all clients with agent counts and statistics
 */
router.get('/', async (req, res) => {
  try {
    const clients = await ClientService.getAllClients();
    
    res.json({
      success: true,
      data: clients,
      total: clients.length
    });
  } catch (error) {
    console.error('Failed to get clients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve clients',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/clients/:id
 * Get client details with full statistics
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await ClientService.getClientById(id);
    
    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Failed to get client:', error);
    const statusCode = error instanceof Error && error.message === 'Client not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to retrieve client',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/clients
 * Create new client
 */
router.post('/', async (req, res) => {
  try {
    const validationResult = CreateClientSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const client = await ClientService.createClient(validationResult.data);
    
    res.status(201).json({
      success: true,
      data: client,
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('Failed to create client:', error);
    const statusCode = error instanceof Error && error.message === 'Email already exists' ? 409 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to create client',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/clients/:id
 * Update client information
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const validationResult = UpdateClientSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const client = await ClientService.updateClient(id, validationResult.data);
    
    res.json({
      success: true,
      data: client,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Failed to update client:', error);
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message === 'Client not found') statusCode = 404;
      if (error.message === 'Email already exists') statusCode = 409;
    }
    res.status(statusCode).json({
      success: false,
      error: 'Failed to update client',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/clients/:id
 * Delete client and all associated agents/sessions
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ClientService.deleteClient(id);
    
    res.json({
      success: true,
      message: 'Client and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete client:', error);
    const statusCode = error instanceof Error && error.message === 'Client not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to delete client',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/clients/:id/analytics
 * Get client analytics and metrics
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

    const analytics = await ClientService.getClientAnalytics(id, daysNum);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Failed to get client analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve client analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/clients/:id/usage
 * Get client monthly usage summary
 */
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const usage = await ClientService.getClientUsage(id);
    
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    console.error('Failed to get client usage:', error);
    const statusCode = error instanceof Error && error.message === 'Client not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to retrieve client usage',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;