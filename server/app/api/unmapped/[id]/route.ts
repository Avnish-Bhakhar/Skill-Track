import { adminRoute, HttpError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const PATCH = adminRoute<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const body = await readJson<{ action?: string; skillId?: string }>(request);
  const item = await prisma.unmappedSkill.findUnique({ where: { id } });
  if (!item || item.status !== "OPEN") throw new HttpError(404, "Already dealt with.");

  if (body.action === "ignore") {
    await prisma.unmappedSkill.update({ where: { id }, data: { status: "IGNORED" } });
    return { ok: true };
  }
  if (body.action !== "resolve" || typeof body.skillId !== "string") throw new HttpError(400, "Pick a skill to map it to.");
  const skill = await prisma.skill.findUnique({ where: { id: body.skillId } });
  if (!skill) throw new HttpError(400, "That skill is not in the taxonomy.");

  const [postings, programs, learners] = await Promise.all([
    prisma.jobPosting.findMany({ where: { id: { in: item.postingIds } }, select: { id: true } }),
    prisma.program.findMany({ where: { id: { in: item.programIds } }, select: { id: true } }),
    prisma.learner.findMany({ where: { id: { in: item.learnerIds } }, select: { id: true } }),
  ]);
  await prisma.$transaction([
    prisma.skill.update({ where: { id: skill.id }, data: { aliases: { push: item.term } } }),
    prisma.jobPostingSkill.createMany({ data: postings.map((p) => ({ postingId: p.id, skillId: skill.id })), skipDuplicates: true }),
    prisma.programSkill.createMany({ data: programs.map((p) => ({ programId: p.id, skillId: skill.id })), skipDuplicates: true }),
    prisma.learnerSkill.createMany({ data: learners.map((l) => ({ learnerId: l.id, skillId: skill.id })), skipDuplicates: true }),
    prisma.unmappedSkill.update({ where: { id }, data: { status: "RESOLVED", resolvedSkillId: skill.id } }),
  ]);
  return { ok: true };
});
