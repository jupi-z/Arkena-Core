import { AuditService } from '../../modules/audit/service.js';

const auditService = new AuditService();

export async function recordAudit(data: Parameters<AuditService['record']>[0]): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    await auditService.record(data as never);
  } catch (error) {
    console.error('Audit write failed', error);
  }
}
