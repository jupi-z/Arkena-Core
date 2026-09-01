import { AuditService } from '../../modules/audit/service.js';
import { getRequestContext } from '../middleware/request-context.js';

const auditService = new AuditService();

type AuditPayload = Parameters<AuditService['record']>[0];

export function enrichAuditContext(data: AuditPayload): AuditPayload {
  const context = getRequestContext();
  return {
    ...data,
    ip: data.ip ?? context?.ip,
    userAgent: data.userAgent ?? context?.userAgent
  };
}

export async function recordAudit(data: AuditPayload): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    await auditService.record(enrichAuditContext(data) as never);
  } catch (error) {
    console.error('Audit write failed', error);
  }
}
