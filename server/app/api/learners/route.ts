import { readFilters } from "@/lib/filters";
import { adminRoute } from "@/lib/http";
import { learnerSearch } from "@/lib/learnerSearch";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

export const GET = adminRoute(async (request) => {
  const filters = readFilters(request);
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page")) || 1);
  const where = learnerSearch(filters);
  const [total, learners] = await Promise.all([
    prisma.learner.count({ where }),
    prisma.learner.findMany({
      where,
      orderBy: [{ enrolledAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        program: { select: { name: true } },
        outcome: true,
        skills: { include: { skill: { select: { name: true } } } },
        links: { where: { usedAt: null, expiresAt: { gt: new Date() } }, take: 1 },
      },
    }),
  ]);
  return {
    total,
    page,
    pageSize: PAGE_SIZE,
    learners: learners.map((l) => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      program: l.program.name,
      district: l.district,
      batch: l.batch,
      enrolledAt: l.enrolledAt,
      outcome: l.outcome,
      token: l.links[0]?.token ?? null,
      skills: l.skills.map((s) => ({ id: s.skillId, name: s.skill.name, verified: s.verified })),
    })),
  };
});
