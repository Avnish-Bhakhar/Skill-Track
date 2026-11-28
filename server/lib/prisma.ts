import { PrismaClient } from "@prisma/client";

const store = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = store.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") store.prisma = prisma;
