import { initDB, writeContext, UploadDB } from './src/config/db.js';
import express from 'express';
import path from 'path';
import fs from 'fs';
import http from 'http';
import session from 'express-session';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { initSocketServer } from './src/config/socket.js';

dotenv.config();

import { setupLocals, requireAuth } from './src/middleware/authMiddleware.js';
import { generalLimiter, authLimiter, securityHeaders } from './src/middleware/securityMiddleware.js';
import { NovelController } from './src/controllers/NovelController.js';
import { AuthController } from './src/controllers/AuthController.js';
import { SearchController } from './src/controllers/SearchController.js';
import { SeoController } from './src/controllers/SeoController.js';
import { PaymentController } from './src/controllers/PaymentController.js';
import { SocialController } from './src/controllers/SocialController.js';

import authRoutes from './src/routes/authRoutes.js';
import novelRoutes from './src/routes/novelRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import authorRoutes from './src/routes/authorRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import articleRoutes from './src/routes/articleRoutes.js';
import poemRoutes from './src/routes/poemRoutes.js';
import liveRoutes from './src/routes/liveRoutes.js';
import messageRoutes from './src/routes/messageRoutes.js';

const app = express();
const httpServer = http.createServer(app);
const io = initSocketServer(httpServer);

async function bootstrap() {
  await initDB();
  app.set('trust proxy', 1);
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Write-awaiter middleware (intercepts response to ensure async MongoDB writes complete)
  app.use((req, res, next) => {
    const pendingWrites: Promise<any>[] = [];
    res.locals.pendingWrites = pendingWrites;

    const originalSend = res.send;
    const originalJson = res.json;
    const originalRedirect = res.redirect;
    const originalRender = res.render;

    const awaitWrites = async () => {
      if (res.locals.pendingWrites && res.locals.pendingWrites.length > 0) {
        try {
          await Promise.all(res.locals.pendingWrites);
        } catch (err) {
          console.error('[DB Request Wait] Error in pending write:', err);
        }
        res.locals.pendingWrites = [];
      }
    };

    (res as any).send = async function(...args: any[]) {
      await awaitWrites();
      return originalSend.apply(this, args);
    };

    (res as any).json = async function(...args: any[]) {
      await awaitWrites();
      return originalJson.apply(this, args);
    };

    (res as any).redirect = async function(...args: any[]) {
      await awaitWrites();
      return originalRedirect.apply(this, args);
    };

    (res as any).render = async function(...args: any[]) {
      await awaitWrites();
      return originalRender.apply(this, args);
    };

    writeContext.run({ pendingWrites }, () => {
      next();
    });
  });

  app.set('view engine', 'ejs');
  app.set('views', path.join(process.cwd(), 'views'));

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(securityHeaders);
  app.use(generalLimiter);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Cloud uploads redirect route
  app.get('/uploads/:filename', async (req, res, next) => {
    const filename = req.params.filename;
    try {
      const mapping = UploadDB.findOne({ filename });
      if (mapping && mapping.cloudUrl) {
        return res.redirect(mapping.cloudUrl);
      }
    } catch (err) {
      console.error('[Upload Redirect] Error finding mapping:', err);
    }

    // Fallback to local files if it exists
    let localPath = path.join(process.cwd(), 'public', 'uploads', filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    let tmpPath = path.join('/tmp', 'uploads', filename);
    if (fs.existsSync(tmpPath)) {
      return res.sendFile(tmpPath);
    }

    next();
  });

  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

  app.use((req: any, res, next) => {
    const list: { [key: string]: string } = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      cookieHeader.split(';').forEach((cookie: string) => {
        let [parts, ...rest] = cookie.split('=');
        const name = parts.trim();
        const value = rest.join('=').trim();
        if (name) list[name] = decodeURIComponent(value);
      });
    }
    req.cookies = list;
    next();
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'premium_novel_secret_hash_key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
      }
    })
  );

  app.use(setupLocals);

  app.get('/', NovelController.getHome);
  app.get('/about', (req, res) => res.render('about', { title: 'Our Story & Legacy' }));
  app.get('/contact', (req, res) => res.render('contact', { title: 'Contact Our Librarians' }));
  app.get('/profile', requireAuth, AuthController.getProfile);
  app.get('/search', SearchController.search);
  app.get('/ecosystem', (req, res) => res.render('search', { title: 'Reading Ecosystem', query: '', type: 'all', results: { novels: [], authors: [], poems: [] }, recommendationCards: [] }));
  app.get('/sitemap.xml', SeoController.sitemap);
  app.get('/robots.txt', SeoController.robots);

  app.post('/contact', (req, res) => {
    req.flash('success', 'Your message has been received. A librarian will follow up shortly.');
    res.redirect('/contact');
  });

  app.use('/auth', authRoutes);
  app.use('/novels', novelRoutes);
  app.use('/poems', poemRoutes);
  app.use('/articles', articleRoutes);
  app.use('/admin', adminRoutes);
  app.use('/authors', authorRoutes);
  app.use('/live', liveRoutes);
  app.use('/messages', messageRoutes);
  app.use('/', dashboardRoutes);

  app.post('/api/mpesa/callback', PaymentController.mpesaCallback);
  app.post('/api/payments/access', requireAuth, PaymentController.initiateAccessPayment);
  app.get('/api/payments/status', requireAuth, PaymentController.getPaymentStatus);
  app.get('/payment/status', requireAuth, PaymentController.getPaymentStatus);
  app.get('/api/payments/stream', requireAuth, PaymentController.streamPayments);
  app.get('/dashboard/payments', requireAuth, PaymentController.getPaymentHistory);
  app.get('/dashboard/submissions', requireAuth, PaymentController.getSubmissions);
  app.get('/notifications', requireAuth, SocialController.getNotifications);
  app.get('/feed', requireAuth, SocialController.getFeed);
  app.post('/users/:id/follow', requireAuth, SocialController.postFollow);

  app.post('/toggle-dark-mode', (req, res) => {
    const isDarkMode = req.body.darkMode === 'true';
    res.cookie('darkMode', isDarkMode ? 'true' : 'false', { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: false });
    res.json({ success: true, darkMode: isDarkMode });
  });

  app.get('/403', (req, res) => {
    res.status(403).render('error', {
      status: 403,
      title: 'Access Denied',
      message: 'You do not possess the required credentials to access this section.'
    });
  });

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'custom' });
    app.use((req, res, next) => {
      if (req.url.startsWith('/@') || req.url.startsWith('/src/') || req.url.endsWith('.tsx') || req.url.endsWith('.ts') || req.url.endsWith('.css')) {
        return vite.middlewares(req, res, next);
      }
      next();
    });
  }

  app.use((req, res) => {
    res.status(404).render('error', {
      status: 404,
      title: 'Page Not Found',
      message: 'The page you are looking for does not exist in our library.'
    });
  });

  app.use((err: any, req: any, res: any, _next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).render('error', {
      status: 500,
      title: 'Server Error',
      message: 'An unexpected error occurred. Our engineers have been alerted.'
    });
  });

  if (!process.env.VERCEL) {
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`[Readers] Server online at http://localhost:${PORT}`);
    });
  }
}

const bootstrapPromise = bootstrap().catch((err) => console.error('Failed to start server:', err));

export { bootstrapPromise };
export default app;
