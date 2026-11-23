import { Prisma, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { AppError } from '../../utils/AppError';
import { writeAuditLog } from '../../utils/audit';

export const noticesRouter = Router();

export interface NoticeItem {
  id: string;
  title: string;
  content: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'EMERGENCY';
  targetRole: 'ALL' | 'DOCTOR' | 'NURSE' | 'VOLUNTEER' | 'ADMIN';
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  authorName: string;
  authorRole: string;
}

const DEFAULT_NOTICES: NoticeItem[] = [
  {
    id: 'notice-1',
    title: 'Emergency: Medical Team Required at Main Stage',
    content: 'Immediate physician and rapid responder presence needed near sound console for attendee collapse.',
    priority: 'EMERGENCY',
    targetRole: 'ALL',
    isPublished: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    authorName: 'Dr. Rafiqul Islam (CMO)',
    authorRole: 'MEDICAL_ADMIN',
  },
  {
    id: 'notice-2',
    title: 'Doctor Required at Food Court',
    content: 'Reported gastrointestinal distress and food allergy cases. Assigned doctor please check station perimeter.',
    priority: 'IMPORTANT',
    targetRole: 'ALL',
    isPublished: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    authorName: 'Medical Command Desk',
    authorRole: 'SUPER_ADMIN',
  },
  {
    id: 'notice-3',
    title: 'Ambulance Dispatch Required',
    content: 'Standby ambulance unit BLS-02 pre-positioned near Gate 2 for potential external hospital transfer.',
    priority: 'IMPORTANT',
    targetRole: 'ALL',
    isPublished: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    authorName: 'Dispatch Logistics',
    authorRole: 'SUPER_ADMIN',
  },
  {
    id: 'notice-4',
    title: 'General Medical Duty Announcement',
    content: 'Shift rotation scheduled for 18:00 BST. Ensure all vitals and incident reports are logged in the MEDIJIGS console.',
    priority: 'NORMAL',
    targetRole: 'ALL',
    isPublished: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    authorName: 'Event Operations Team',
    authorRole: 'SUPER_ADMIN',
  },
];

const noticeSchema = z.object({
  title: z.string().trim().min(3, 'Title is required'),
  content: z.string().trim().min(3, 'Content is required'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'EMERGENCY']).default('NORMAL'),
  targetRole: z.enum(['ALL', 'DOCTOR', 'NURSE', 'VOLUNTEER', 'ADMIN']).default('ALL'),
  isPublished: z.boolean().default(true),
});

async function getNoticesFromDb(): Promise<NoticeItem[]> {
  const record = await prisma.systemSetting.findUnique({
    where: { key: 'notices.board' },
  });

  if (!record || !record.valueJson || !Array.isArray(record.valueJson)) {
    // Initialize with default notices
    await prisma.systemSetting.upsert({
      where: { key: 'notices.board' },
      update: {},
      create: {
        key: 'notices.board',
        category: 'notices',
        valueJson: DEFAULT_NOTICES as unknown as Prisma.InputJsonValue,
      },
    });
    return DEFAULT_NOTICES;
  }

  return record.valueJson as unknown as NoticeItem[];
}

async function saveNoticesToDb(notices: NoticeItem[], userId?: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: 'notices.board' },
    update: {
      valueJson: notices as unknown as Prisma.InputJsonValue,
      updatedByUserId: userId ?? null,
    },
    create: {
      key: 'notices.board',
      category: 'notices',
      valueJson: notices as unknown as Prisma.InputJsonValue,
      updatedByUserId: userId ?? null,
    },
  });
}

// All authenticated roles (Admin, Doctor, Nurse, Volunteer, Dispatcher) can view notices
noticesRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userRole = req.user!.role;
    const allNotices = await getNoticesFromDb();

    // Admins see all (including drafts); other roles see published notices
    const isAdmin =
      userRole === UserRole.SUPER_ADMIN || userRole === UserRole.MEDICAL_ADMIN;

    const visibleNotices = isAdmin
      ? allNotices
      : allNotices.filter((n) => n.isPublished);

    // Sort: EMERGENCY first, then IMPORTANT, then NORMAL, then by createdAt desc
    const priorityWeight: Record<string, number> = {
      EMERGENCY: 3,
      IMPORTANT: 2,
      NORMAL: 1,
    };

    visibleNotices.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({
      success: true,
      data: visibleNotices,
    });
  } catch (err) {
    next(err);
  }
});

// Authorized Admin / Medical Admin users can create a notice
noticesRouter.post(
  '/',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN),
  validateBody(noticeSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof noticeSchema>;
      const actor = req.user!;
      const notices = await getNoticesFromDb();

      const newNotice: NoticeItem = {
        id: `notice-${Date.now()}`,
        title: body.title,
        content: body.content,
        priority: body.priority,
        targetRole: body.targetRole,
        isPublished: body.isPublished,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorName: actor.fullName,
        authorRole: actor.role,
      };

      const updatedList = [newNotice, ...notices];
      await saveNoticesToDb(updatedList, actor.id);

      await writeAuditLog({
        actorUserId: actor.id,
        action: 'NOTICE_PUBLISHED',
        entityType: 'Notice',
        entityId: newNotice.id,
        summary: `Published ${newNotice.priority} notice "${newNotice.title}".`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        data: newNotice,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Authorized Admin / Medical Admin users can edit a notice
noticesRouter.patch(
  '/:id',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN),
  validateBody(noticeSchema.partial()),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const body = req.body as Partial<z.infer<typeof noticeSchema>>;
      const actor = req.user!;
      const notices = await getNoticesFromDb();

      const index = notices.findIndex((n) => n.id === id);
      if (index === -1) {
        throw new AppError(404, 'NOTICE_NOT_FOUND', 'Notice not found.');
      }

      const existing = notices[index];
      const updated: NoticeItem = {
        ...existing,
        ...body,
        updatedAt: new Date().toISOString(),
      };

      notices[index] = updated;
      await saveNoticesToDb(notices, actor.id);

      await writeAuditLog({
        actorUserId: actor.id,
        action: 'NOTICE_UPDATED',
        entityType: 'Notice',
        entityId: updated.id,
        summary: `Updated notice "${updated.title}" (Priority: ${updated.priority}, Published: ${updated.isPublished}).`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Authorized Admin / Medical Admin users can delete a notice
noticesRouter.delete(
  '/:id',
  requireAuth,
  requireRole(UserRole.SUPER_ADMIN, UserRole.MEDICAL_ADMIN),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const actor = req.user!;
      const notices = await getNoticesFromDb();

      const existing = notices.find((n) => n.id === id);
      if (!existing) {
        throw new AppError(404, 'NOTICE_NOT_FOUND', 'Notice not found.');
      }

      const filtered = notices.filter((n) => n.id !== id);
      await saveNoticesToDb(filtered, actor.id);

      await writeAuditLog({
        actorUserId: actor.id,
        action: 'NOTICE_DELETED',
        entityType: 'Notice',
        entityId: id,
        summary: `Deleted notice "${existing.title}".`,
        ipAddress: req.ip,
      });

      res.json({
        success: true,
        data: { message: 'Notice deleted successfully.' },
      });
    } catch (err) {
      next(err);
    }
  }
);
