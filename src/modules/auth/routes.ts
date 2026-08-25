import { Router } from 'express';
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

export const authRoutes = Router();

authRoutes.post('/register-admin', validateRequest({ body: registerInitialAdminSchema }), asyncHandler(controller.registerInitialAdmin));
authRoutes.post('/login', validateRequest({ body: loginSchema }), asyncHandler(controller.login));
authRoutes.post('/refresh', validateRequest({ body: refreshSchema }), asyncHandler(controller.refresh));
authRoutes.post('/logout', validateRequest({ body: refreshSchema }), asyncHandler(controller.logout));
authRoutes.post('/logout-all', authenticate, asyncHandler(controller.logoutAll));
authRoutes.post('/forgot-password', validateRequest({ body: forgotPasswordSchema }), asyncHandler(controller.forgotPassword));
authRoutes.post('/reset-password', validateRequest({ body: resetPasswordSchema }), asyncHandler(controller.resetPassword));
authRoutes.post('/change-password', authenticate, validateRequest({ body: changePasswordSchema }), asyncHandler(controller.changePassword));
authRoutes.get('/me', authenticate, asyncHandler(controller.me));
