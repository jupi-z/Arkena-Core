import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { asyncHandler } from '../../common/middleware/async-handler.js';
import { authenticate } from '../../common/middleware/auth.js';
import { validateRequest } from '../../common/middleware/validation.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerInitialAdminSchema,
  resetPasswordSchema
} from './types.js';
import { AuthController } from './controller.js';

const controller = new AuthController();

export function createAuthRateLimit(config: { windowMs?: number; limit?: number } = {}) {
  return rateLimit({
    windowMs: config.windowMs ?? env.AUTH_RATE_LIMIT_WINDOW_MS,
    limit: config.limit ?? env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'AUTH_RATE_LIMITED',
          message: 'Too many authentication attempts',
          requestId: req.requestContext?.requestId
        }
      });
    }
  });
}

const authRateLimit = createAuthRateLimit();

export const authRoutes = Router();

authRoutes.post('/register-admin', authRateLimit, validateRequest({ body: registerInitialAdminSchema }), asyncHandler(controller.registerInitialAdmin));
authRoutes.post('/login', authRateLimit, validateRequest({ body: loginSchema }), asyncHandler(controller.login));
authRoutes.post('/refresh', authRateLimit, validateRequest({ body: refreshSchema }), asyncHandler(controller.refresh));
authRoutes.post('/logout', validateRequest({ body: refreshSchema }), asyncHandler(controller.logout));
authRoutes.post('/logout-all', authenticate, asyncHandler(controller.logoutAll));
authRoutes.post('/forgot-password', authRateLimit, validateRequest({ body: forgotPasswordSchema }), asyncHandler(controller.forgotPassword));
authRoutes.post('/reset-password', authRateLimit, validateRequest({ body: resetPasswordSchema }), asyncHandler(controller.resetPassword));
authRoutes.post('/change-password', authenticate, validateRequest({ body: changePasswordSchema }), asyncHandler(controller.changePassword));
authRoutes.get('/me', authenticate, asyncHandler(controller.me));
