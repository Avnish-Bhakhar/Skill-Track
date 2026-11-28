import { adminRoute, HttpError, readJson } from "@/lib/http";
import { checkInUrl, issueLinks } from "@/lib/links";
import { prisma } from "@/lib/prisma";

export const POST = adminRoute(async (request) => {
  const { learnerIds } = await readJson<{ learnerIds?: string[] }>(request);
  if (!Array.isArray(learnerIds) || !learnerIds.length) throw new HttpError(400, "Tick at least one learner.");
  if (learnerIds.length > 1000) throw new HttpError(400, "1,000 links at a time, please.");
  const found = await prisma.learner.findMany({ where: { id: { in: learnerIds.map(String) } }, select: { id: true } });
  const links = await issueLinks(found.map((l) => l.id));
  return { links: links.map((l) => ({ learnerId: l.learnerId, token: l.token, url: checkInUrl(l.token) })) };
});
