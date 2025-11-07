import { Router } from 'express';
import { incidentRoutes } from './incidents.js';
import { solutionRoutes } from './solutions.js';
import { knowledgeRoutes } from './knowledge.js';
import { chatRoutes } from './chat.js';
import { uploadRoutes } from './upload.js';
import { searchRoutes } from './search.js';
import { healthRoutes } from './health.js';

const router = Router();

// API version prefix
const API_VERSION = '/api/v1';

// Route groups
router.use(`${API_VERSION}/incidents`, incidentRoutes);
router.use(`${API_VERSION}/solutions`, solutionRoutes);
router.use(`${API_VERSION}/knowledge`, knowledgeRoutes);
router.use(`${API_VERSION}/chat`, chatRoutes);
router.use(`${API_VERSION}/upload`, uploadRoutes);
router.use(`${API_VERSION}/search`, searchRoutes);
router.use(`${API_VERSION}/health`, healthRoutes);

// API documentation endpoint
router.get(`${API_VERSION}`, (req, res) => {
  res.json({
    success: true,
    message: 'NoteByPine Web Admin API',
    version: '1.0.0',
    endpoints: {
      incidents: `${API_VERSION}/incidents`,
      solutions: `${API_VERSION}/solutions`,
      knowledge: `${API_VERSION}/knowledge`,
      chat: `${API_VERSION}/chat`,
      upload: `${API_VERSION}/upload`,
      search: `${API_VERSION}/search`,
      health: `${API_VERSION}/health`
    },
    documentation: '/api/docs'
  });
});

export { router as apiRoutes };