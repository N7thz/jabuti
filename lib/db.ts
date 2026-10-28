import "server-only";

import { createPrisma, type PrismaClient } from "./prisma";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Cliente Prisma único por processo (o HMR do `next dev` recriaria conexões a cada edição). */
export const db = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
