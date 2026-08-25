import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { AuthService } from './service.js';

export class AuthController {
  constructor(private readonly service = new AuthService()) {}

  registerInitialAdmin = async (req: Request, res: Response) => {
    const result = await this.service.registerInitialAdmin(req.body);
    res.status(201).json(ok(result));
  };

  login = async (req: Request, res: Response) => {
    const result = await this.service.login(req.body);
    res.json(ok(result));
  };

  refresh = async (req: Request, res: Response) => {
    const result = await this.service.refresh(req.body);
    res.json(ok(result));
  };

  logout = async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken ?? req.headers['x-refresh-token'];
    const result = await this.service.logout(String(refreshToken ?? ''));
    res.json(ok(result));
  };

  logoutAll = async (req: Request, res: Response) => {
    const result = await this.service.logoutAll(req.auth!.userId);
    res.json(ok(result));
  };

  forgotPassword = async (req: Request, res: Response) => {
    const result = await this.service.forgotPassword({
      ...req.body,
      ip: req.ip,
      userAgent: req.get('user-agent') ?? undefined
    });
    res.json(ok(result));
  };

  resetPassword = async (req: Request, res: Response) => {
    const result = await this.service.resetPassword(req.body);
    res.json(ok(result));
  };

  changePassword = async (req: Request, res: Response) => {
    const result = await this.service.changePassword(req.auth!.userId, req.body);
    res.json(ok(result));
  };

  me = async (req: Request, res: Response) => {
    const result = await this.service.me(req.auth!.userId);
    res.json(ok(result));
  };
}
