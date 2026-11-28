import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";

const LINK_DAYS = 14;

export const checkInUrl = (token: string) => {
  const base = (process.env.CLIENT_URL ?? "").split(",")[0].trim().replace(/\/$/, "");
  return `${base}/check-in/${token}`;
};

export async function issueLinks(learnerIds: string[]) {
  const expiresAt = new Date(Date.now() + LINK_DAYS * 86400000);
  const links = learnerIds.map((learnerId) => ({ token: randomUUID(), learnerId, expiresAt }));
  await prisma.$transaction([
    prisma.checkInLink.deleteMany({ where: { learnerId: { in: learnerIds }, usedAt: null } }),
    prisma.checkInLink.createMany({ data: links }),
  ]);
  return links;
}
