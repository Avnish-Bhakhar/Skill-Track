import { gapReport } from "@/lib/analytics";
import { readFilters } from "@/lib/filters";
import { adminRoute } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { recommendationScope } from "@/lib/scope";

export const GET = adminRoute(async (request) => {
  const filters = readFilters(request);
  const [report, recommendations] = await Promise.all([
    gapReport(filters),
    prisma.recommendation.findMany({
      where: { scope: recommendationScope(filters) },
      include: { skill: { select: { name: true } } },
    }),
  ]);
  return {
    ...report,
    recommendations: recommendations
      .map((r) => {
        const inputs = r.inputs as { demandPct: number; supplyPct: number; priority: number };
        const current = report.rows.find((row) => row.skillId === r.skillId);
        return {
          skillId: r.skillId,
          name: r.skill.name,
          module: r.module,
          assessment: r.assessment,
          createdAt: r.createdAt,
          priority: inputs.priority,
          stale: !current || current.priority !== inputs.priority,
        };
      })
      .sort((a, b) => b.priority - a.priority),
  };
});
