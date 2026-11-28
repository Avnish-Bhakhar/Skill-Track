import { gapReport } from "@/lib/analytics";
import { readFilters } from "@/lib/filters";
import { groqJson } from "@/lib/groq";
import { adminRoute, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { recommendationScope } from "@/lib/scope";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You advise a government skilling department. You receive computed skill gap figures.
For each item write a recommended training module (max 45 words) and a practical assessment (max 45 words).
Plain Indian English. Use only the numbers given and do not invent statistics.
Reply as JSON: {"items":[{"ref":number,"module":string,"assessment":string}]}`;

export const POST = adminRoute(async (request) => {
  const filters = readFilters(request);
  const top = (await gapReport(filters)).priority.slice(0, 5);
  if (!top.length) throw new HttpError(400, "No gaps to write about for this filter.");

  const facts = top.map((row, ref) => ({
    ref,
    skill: row.name,
    sector: row.sector,
    demandPct: row.demandPct,
    supplyPct: row.supplyPct,
    verifiedSupplyPct: row.verifiedSupplyPct,
    priority: row.priority,
    taughtInCurriculum: row.covered,
  }));
  const reply = await groqJson<{ items?: { ref: number; module: string; assessment: string }[] }>(SYSTEM, JSON.stringify(facts));

  const items = (reply.items ?? []).filter(
    (i) => top[i.ref] && typeof i.module === "string" && typeof i.assessment === "string",
  );
  if (!items.length) throw new HttpError(502, "The model didn't return any usable recommendations.");

  const scope = recommendationScope(filters);
  await prisma.$transaction([
    prisma.recommendation.deleteMany({ where: { scope } }),
    prisma.recommendation.createMany({
      data: items.map((i) => ({
        scope,
        skillId: top[i.ref].skillId,
        module: i.module.slice(0, 600),
        assessment: i.assessment.slice(0, 600),
        inputs: facts[i.ref],
      })),
      skipDuplicates: true,
    }),
  ]);
  return { saved: items.length };
});
