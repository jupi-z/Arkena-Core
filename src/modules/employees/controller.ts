import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { EmployeesService } from './service.js';

export class EmployeesController {
  constructor(private readonly service = new EmployeesService()) {}

  list = async (req: Request, res: Response) => {
    const result = await this.service.list(req.auth!, req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      sortBy?: string;
      sortOrder: 'asc' | 'desc';
      departmentId?: string;
      status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'ARCHIVED';
    });
    res.json(ok(result.items, {
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / Number(req.query.limit ?? 20)))
    }));
  };

  getById = async (req: Request, res: Response) => {
    const result = await this.service.getById(req.auth!, String(req.params.id));
    res.json(ok(result));
  };

  create = async (req: Request, res: Response) => {
    const result = await this.service.create({ ...req.body, actorUserId: req.auth?.userId });
    res.status(201).json(ok(result));
  };

  update = async (req: Request, res: Response) => {
    const result = await this.service.update(String(req.params.id), req.body, req.auth?.userId);
    res.json(ok(result));
  };

  archive = async (req: Request, res: Response) => {
    const result = await this.service.archive(String(req.params.id), req.body.archivedAt, req.auth?.userId);
    res.json(ok(result));
  };
}
