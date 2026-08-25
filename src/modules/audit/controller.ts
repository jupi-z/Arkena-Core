import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { AuditService } from './service.js';

export class AuditController {
  constructor(private readonly service = new AuditService()) {}

  list = async (req: Request, res: Response) => {
    const result = await this.service.list(req.query as any);
    res.json(ok(result.items, {
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / Number(req.query.limit ?? 20)))
    }));
  };
}
