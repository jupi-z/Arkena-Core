import type { Prisma } from '@prisma/client';

// Keep user projections safe when related users are returned by other domains.
export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  jobTitle: true,
  role: true,
  status: true,
  emailVerifiedAt: true,
  lastLoginAt: true
} satisfies Prisma.UserSelect;
