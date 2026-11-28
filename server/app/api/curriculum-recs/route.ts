import { gapReport } from "@/lib/analytics";
import { readFilters } from "@/lib/filters";
import { groqJson } from "@/lib/groq";
import { adminRoute, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { recommendationScope } from "@/lib/scope";

export const runtime = "nodejs";
export const maxDuration = 60;

function categorizePriority(score: number): string {
  if (score >= 60) return "Critical";
  if (score >= 30) return "High";
  if (score >= 10) return "Medium";
  return "Low";
}

function curriculumCoverage(row: { covered: boolean; supplyPct: number }): string {
  if (row.covered && row.supplyPct >= 25) return "covered";
  if (row.covered) return "partial";
  return "missing";
}

const SYSTEM = `You are advising a government skilling department on curriculum improvements.
You receive skill gap data with demand%, supply%, curriculum coverage, and priority scores.
For each skill, write:
- reason: Why this skill is a priority for the curriculum (max 60 words, plain Indian English).
- learningOutcome: What trainees should be able to do after the module (max 50 words, action-verb start).
- practicalExercise: A hands-on exercise to assess the skill (max 50 words).
- modulePosition: Where in the curriculum this should be placed (e.g. "Module 2: Foundation", "Module 4: Advanced Practice").
Use only the numbers given. Do not invent statistics.
Reply as JSON: {"items":[{"ref":number,"reason":string,"learningOutcome":string,"practicalExercise":string,"modulePosition":string}]}`;

export const POST = adminRoute(async (request) => {
  const filters = readFilters(request);
  const report = await gapReport(filters);

  // Take top 10 by priority, include both high-gap and curriculum-missing skills
  const candidates = report.rows
    .filter((r) => r.mentions > 0)
    .slice(0, 10);

  if (!candidates.length) {
    throw new HttpError(400, "No skill gap data to generate recommendations for. Upload job postings first.");
  }

  const facts = candidates.map((row, ref) => ({
    ref,
    skill: row.name,
    sector: row.sector,
    category: row.sector,
    demandPct: row.demandPct,
    supplyPct: row.supplyPct,
    priority: row.priority,
    curriculumCoverage: curriculumCoverage(row),
    priorityCategory: categorizePriority(row.priority),
  }));

  const reply = await groqJson<{
    items?: {
      ref: number;
      reason: string;
      learningOutcome: string;
      practicalExercise: string;
      modulePosition: string;
    }[];
  }>(SYSTEM, JSON.stringify(facts));

  const items = (reply.items ?? []).filter(
    (i) =>
      candidates[i.ref] &&
      typeof i.reason === "string" &&
      typeof i.learningOutcome === "string" &&
      typeof i.practicalExercise === "string" &&
      typeof i.modulePosition === "string",
  );

  if (!items.length) {
    throw new HttpError(502, "The model did not return usable recommendations. Try again.");
  }

  const scope = recommendationScope(filters);

  await prisma.$transaction([
    prisma.curriculumRecommendation.deleteMany({ where: { scope } }),
    prisma.curriculumRecommendation.createMany({
      data: items.map((i) => {
        const row = candidates[i.ref];
        return {
          scope,
          skillId: row.skillId,
          skillName: row.name,
          category: categorizePriority(row.priority),
          priority: row.priority,
          demandPct: row.demandPct,
          supplyPct: row.supplyPct,
          curriculumCoverage: curriculumCoverage(row),
          reason: i.reason.slice(0, 800),
          learningOutcome: i.learningOutcome.slice(0, 600),
          practicalExercise: i.practicalExercise.slice(0, 600),
          modulePosition: i.modulePosition.slice(0, 200),
          status: "PENDING",
        };
      }),
      skipDuplicates: true,
    }),
  ]);

  return { saved: items.length };
});

export const GET = adminRoute(async (request) => {
  const filters = readFilters(request);
  const scope = recommendationScope(filters);
  const recs = await prisma.curriculumRecommendation.findMany({
    where: { scope },
    orderBy: [{ priority: "desc" }],
  });
  return { recommendations: recs };
});
