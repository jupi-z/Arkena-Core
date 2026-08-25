import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { NotificationsService } from './service.js';

export class NotificationsController {
  constructor(private readonly service = new NotificationsService()) {}

  list = async (req: Request, res: Response) => {
    const result = await this.service.list(req.auth!.userId, req.query as any);
    res.json(ok(result.items, {
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 20),
      total: result.total,
      pages: Math.max(1, Math.ceil(result.total / Number(req.query.limit ?? 20)))
    }));
  };

  create = async (req: Request, res: Response) => {
    const result = await this.service.create({
      ...req.body,
      createdByUserId: req.auth?.userId
    });
    res.status(201).json(ok(result));
  };

  markRead = async (req: Request, res: Response) => {
    const result = await this.service.markRead(String(req.params.id));
    res.json(ok(result));
  };
}
