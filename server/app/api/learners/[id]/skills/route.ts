import { adminRoute, HttpError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const PATCH = adminRoute<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const { skillId, verified } = await readJson<{ skillId?: string; verified?: boolean }>(request);
  if (typeof skillId !== "string" || typeof verified !== "boolean") throw new HttpError(400, "Which skill, and verified or not?");
  const result = await prisma.learnerSkill.updateMany({ where: { learnerId: id, skillId }, data: { verified } });
  if (!result.count) throw new HttpError(404, "This learner doesn't list that skill.");
  return { ok: true };
});
