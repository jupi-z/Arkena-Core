import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { AttendanceService } from './service.js';

export class AttendanceController {
  constructor(private readonly service = new AttendanceService()) {}

  list = async (req: Request, res: Response) => {
    const result = await this.service.list(req.query as unknown as any);
    res.json(ok(result.items, {
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / Number(req.query.limit ?? 20)))
    }));
  };

  getById = async (req: Request, res: Response) => {
    const result = await this.service.getById(String(req.params.id));
    res.json(ok(result));
  };

  create = async (req: Request, res: Response) => {
    const result = await this.service.create(req.body, req.auth?.userId);
    res.status(201).json(ok(result));
  };

  update = async (req: Request, res: Response) => {
    const result = await this.service.update(String(req.params.id), req.body);
    res.json(ok(result));
  };

  remove = async (req: Request, res: Response) => {
    const result = await this.service.remove(String(req.params.id));
    res.json(ok(result));
  };

  summary = async (req: Request, res: Response) => {
    const result = await this.service.summary(req.query as any);
    res.json(ok(result));
  };
}
