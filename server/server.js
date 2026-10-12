import express from 'express';
import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import createCorsMiddleware from './config/corsConfig.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import protectedRoutes from './routes/protectedRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import executionRoutes from './routes/executionRoutes.js';
import { handleWebhookTrigger } from './controllers/webhookController.js';
import { webhookRateLimiter } from './middleware/rateLimiter.js';
import { initScheduler, stopAllSchedules } from './services/workflow/schedulerService.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// DNS resolution configuration:
// In production cloud/container environments (Docker, Kubernetes, Render, Railway, AWS ECS),
// system and container network DNS is preserved to allow internal VPC service discovery.
// Custom DNS servers can be configured via the DNS_SERVERS environment variable.
// In non-production environments, falls back to public resolvers if local ISP blocks MongoDB Atlas SRV lookups.
if (process.env.DNS_SERVERS) {
  const customServers = process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean);
  if (customServers.length > 0) {
    dns.setServers(customServers);
  }
} else if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable reverse proxy trust in production (Render, Vercel, Cloudflare, AWS ALB)
app.set('trust proxy', 1);

// Enable CORS with strict origin validation
app.use(createCorsMiddleware());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB and initialize background services
connectDB().then(() => {
  initScheduler();
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', protectedRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);
// Public webhook endpoint alias
app.post('/api/webhooks/:token', webhookRateLimiter, handleWebhookTrigger);

// Catch-all 404 handler for undefined routes
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`[FlowForge AI] Server is running on port ${PORT}`);
  console.log(`[FlowForge AI] Health check available at http://localhost:${PORT}/api/health`);
});

// Graceful shutdown handling for container and cloud environments (SIGTERM / SIGINT)
const gracefulShutdown = (signal) => {
  console.log(`[FlowForge AI] Received ${signal}. Starting graceful shutdown...`);
  stopAllSchedules();
  server.close(async () => {
    console.log('[FlowForge AI] HTTP server closed.');
    try {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.connection.close(false);
        console.log('[FlowForge AI] MongoDB connection pool closed.');
      }
    } catch (err) {
      console.error('[FlowForge AI] Error during database disconnect:', err.message);
    }
    process.exit(0);
  });

  // Force shutdown after 10s if connections fail to close
  setTimeout(() => {
    console.error('[FlowForge AI] Forcing shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
