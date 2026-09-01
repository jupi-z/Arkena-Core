import type { Request, Response } from 'express';
import { ok } from '../../common/http/response.js';
import { DocumentsService } from './service.js';

export class DocumentsController {
  constructor(private readonly service = new DocumentsService()) {}

  list = async (req: Request, res: Response) => {
    const result = await this.service.list(req.auth!, req.query as unknown as any);
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

  upload = async (req: Request, res: Response) => {
    const result = await this.service.upload(req.auth!, req.file, req.body);
    res.status(201).json(ok(result));
  };

  download = async (req: Request, res: Response) => {
    const result = await this.service.download(req.auth!, String(req.params.id));
    res.setHeader('Content-Disposition', `attachment; filename="${result.document.originalName}"`);
    res.type(result.document.mimeType);
    res.send(result.file);
  };

  remove = async (req: Request, res: Response) => {
    const result = await this.service.remove(req.auth!, String(req.params.id));
    res.json(ok(result));
  };
}
