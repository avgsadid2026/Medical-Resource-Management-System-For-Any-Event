import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/prisma';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface AuditInput {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  beforeJson?: Prisma.InputJsonValue | null;
  afterJson?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
}

export async function writeAuditLog(
  input: AuditInput,
  db: DbClient = prisma
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
      beforeJson: input.beforeJson ?? undefined,
      afterJson: input.afterJson ?? undefined,
      ipAddress: input.ipAddress ?? null,
    },
  });
}
