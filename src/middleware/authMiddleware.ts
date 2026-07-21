import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User.js';
import type { UserRole } from '../types/common.js';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    flash?: { [key: string]: string[] };
    csrfToken?: string;
  }
}

export function setupLocals(req: Request, res: Response, next: NextFunction) {
  req.flash = (type: string, message: string) => {
    if (!req.session) return;
    if (!req.session.flash) req.session.flash = {};
    if (!req.session.flash[type]) req.session.flash[type] = [];
    req.session.flash[type].push(message);
  };

  res.locals.flash = {};
  if (req.session?.flash) {
    res.locals.flash = { ...req.session.flash };
    req.session.flash = {};
  }

  res.locals.currentPath = req.path;
  res.locals.darkMode = req.cookies?.darkMode !== 'false';
  res.locals.appName = 'Readers';
  res.locals.appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (req.session?.userId) {
    const user = UserModel.findById(req.session.userId);
    if (user) {
      if (user.status === 'suspended') {
        req.session.destroy(() => {});
        res.locals.user = null;
        return next();
      }
      res.locals.user = user;
      return next();
    }
  }

  const rememberToken = req.cookies?.remember_me;
  if (rememberToken && !req.session?.userId) {
    const user = UserModel.findOne({ rememberMeToken: rememberToken });
    if (user && user.status === 'active') {
      req.session!.userId = user._id;
      res.locals.user = user;
      return next();
    }
  }

  res.locals.user = null;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    req.flash('error', 'You must be logged in to view this page.');
    return res.redirect('/auth/login');
  }
  next();
}

export function requireVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    req.flash('error', 'You must be logged in to access this feature.');
    return res.redirect('/auth/login');
  }
  const user = UserModel.findById(req.session.userId);
  if (!user?.emailVerified) {
    req.flash('error', 'Please verify your email address to access this feature.');
    return res.redirect('/auth/verify-pending');
  }
  if (user.status === 'suspended') {
    req.flash('error', 'Your account has been suspended.');
    return res.redirect('/403');
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.userId) {
      req.flash('error', 'You must be logged in.');
      return res.redirect('/auth/login');
    }
    const user = UserModel.findById(req.session.userId);
    const userRole = (user?.role === 'user' ? 'reader' : user?.role) as UserRole;
    if (!user || !roles.includes(userRole)) {
      req.flash('error', 'You do not have permission to access this page.');
      return res.redirect('/403');
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    req.flash('error', 'You must be logged in to access the admin portal.');
    return res.redirect('/auth/login');
  }
  const user = UserModel.findById(req.session.userId);
  if (!UserModel.isAdmin(user)) {
    req.flash('error', 'Access denied. Administrator privileges required.');
    return res.redirect('/403');
  }
  next();
}

export function requireModerator(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.redirect('/auth/login');
  }
  const user = UserModel.findById(req.session.userId);
  if (!UserModel.isModerator(user)) {
    return res.redirect('/403');
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      flash(type: string, message: string): void;
    }
  }
}
