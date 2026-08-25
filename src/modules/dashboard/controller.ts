import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { DashboardService } from './service.js';

export class DashboardController {
  constructor(private readonly service = new DashboardService()) {}

  overview = async (_req: Request, res: Response) => {
    const result = await this.service.overview();
    res.json(ok(result));
  };

  employees = async (_req: Request, res: Response) => {
    const result = await this.service.employees();
    res.json(ok(result));
  };

  attendance = async (_req: Request, res: Response) => {
    const result = await this.service.attendance();
    res.json(ok(result));
  };
}
