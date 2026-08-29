import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api.js';
import { initializeFirebaseAdmin } from './server/authMiddleware.js';

dotenv.config();

// Initialize Firebase Admin SDK safely
initializeFirebaseAdmin();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing with safety limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Security headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // API Routes First
  app.use('/api', apiRouter);

  // Global API Error Handler (Never expose raw stack traces)
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled API Error:', err?.message || err);
    res.status(500).json({
      error: 'An internal error occurred. Your personal data remains secure.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  // Vite middleware for development vs Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✨ Personal Gemini Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
