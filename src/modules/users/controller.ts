import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { UsersService } from './service.js';

export class UsersController {
  constructor(private readonly service = new UsersService()) {}

  list = async (req: Request, res: Response) => {
    const result = await this.service.list(req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
      sortBy?: string;
      sortOrder: 'asc' | 'desc';
    });
    res.json(ok(result.items, {
      page: req.query.page,
      limit: req.query.limit,
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / Number(req.query.limit ?? 20)))
    }));
  };

  getById = async (req: Request, res: Response) => {
    const result = await this.service.getById(String(req.params.id));
    res.json(ok(result));
  };

  update = async (req: Request, res: Response) => {
    const result = await this.service.update(String(req.params.id), req.body);
    res.json(ok(result));
  };

  assignRole = async (req: Request, res: Response) => {
    const result = await this.service.assignRole(String(req.params.id), req.body.role);
    res.json(ok(result));
  };
}
