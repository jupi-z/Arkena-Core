import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { DashboardService } from './service.js';

export class DashboardController {
  constructor(private readonly service = new DashboardService()) {}

  overview = async (req: Request, res: Response) => {
    const result = await this.service.overview(req.auth!);
    res.json(ok(result));
  };

  employees = async (req: Request, res: Response) => {
    const result = await this.service.employees(req.auth!);
    res.json(ok(result));
  };

  attendance = async (req: Request, res: Response) => {
    const result = await this.service.attendance(req.auth!);
    res.json(ok(result));
  };
}
