import { computeGaps, demandTrend, lastMonths } from "./core/gaps";
import { computeImpact } from "./core/impact";
import { learnerWhere, type Filters } from "./filters";
import { prisma } from "./prisma";

export async function gapReport(filters: Filters) {
  const program = filters.programId
    ? await prisma.program.findUnique({ where: { id: filters.programId } })
    : null;
  const sector = program?.sector ?? filters.sector;

  const [skills, postings, learners, curriculum] = await Promise.all([
    prisma.skill.findMany({
      where: {
        sector,
        category: filters.category ? { equals: filters.category, mode: "insensitive" } : undefined,
      },
      select: { id: true, name: true, sector: true, category: true },
    }),
    prisma.jobPosting.findMany({
      where: { district: filters.district, sector },
      select: { sector: true, postedAt: true, skills: { select: { skillId: true } } },
    }),
    prisma.learner.findMany({
      where: learnerWhere({ ...filters, sector }),
      select: { program: { select: { sector: true } }, skills: { select: { skillId: true, verified: true } } },
    }),
    prisma.programSkill.findMany({
      where: { programId: filters.programId, program: { sector } },
      select: { skillId: true },
    }),
  ]);

  const allCategories = await prisma.skill
    .findMany({ where: { sector }, select: { category: true }, distinct: ["category"] })
    .then((list) => list.map((s) => s.category).filter(Boolean));

  const gapPostings = postings.map((p) => ({ sector: p.sector, postedAt: p.postedAt, skillIds: p.skills.map((s) => s.skillId) }));
  const rows = computeGaps({
    skills,
    postings: gapPostings,
    trainees: learners.map((l) => ({ sector: l.program.sector, skills: l.skills })),
    coveredSkillIds: new Set(curriculum.map((c) => c.skillId)),
    verifiedOnly: filters.verifiedOnly,
  });

  return {
    rows,
    priority: rows.filter((r) => r.priority > 0).slice(0, 10),
    missingFromCurricula: rows.filter((r) => !r.covered && r.mentions > 0),
    mostMentioned: [...rows].sort((a, b) => b.mentions - a.mentions).slice(0, 10),
    trend: demandTrend(gapPostings, rows),
    postingTotal: postings.length,
    traineeTotal: learners.length,
    categories: allCategories,
    months: lastMonths(6),
  };
}

export async function impactReport(filters: Filters) {
  const [learners, comparison] = await Promise.all([
    prisma.learner.findMany({
      where: learnerWhere(filters),
      select: {
        district: true,
        enrolledAt: true,
        priorSalary: true,
        program: { select: { durationMonths: true } },
        outcome: { select: { status: true, salaryMonthly: true, startMonth: true } },
      },
    }),
    prisma.comparisonMember.findMany({ where: { district: filters.district } }),
  ]);

  return computeImpact(
    learners.map((l) => ({
      district: l.district,
      completedAt: new Date(l.enrolledAt.getTime() + l.program.durationMonths * 30.44 * 86400000),
      priorSalary: l.priorSalary,
      outcome: l.outcome && {
        employed: l.outcome.status !== "NOT_EMPLOYED",
        salary: l.outcome.salaryMonthly,
        startMonth: l.outcome.startMonth,
      },
    })),
    comparison,
  );
}

export async function dashboardReport(filters: Filters) {
  const where = learnerWhere(filters);
  const [learners, programs, pendingLinks, recent, unmapped, gaps, impact] = await Promise.all([
    prisma.learner.findMany({
      where,
      select: { programId: true, outcome: { select: { status: true, salaryMonthly: true } } },
    }),
    prisma.program.findMany({ orderBy: { name: "asc" } }),
    prisma.checkInLink.count({ where: { usedAt: null, expiresAt: { gt: new Date() }, learner: where } }),
    prisma.outcome.findMany({
      where: { learner: where },
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: { learner: { select: { name: true, district: true, program: { select: { name: true } } } } },
    }),
    prisma.unmappedSkill.findMany({
      where: { status: "OPEN" },
      orderBy: { count: "desc" },
      take: 8,
      select: { id: true, term: true, count: true },
    }),
    gapReport(filters),
    impactReport(filters),
  ]);

  const rate = (list: typeof learners) => {
    const reported = list.filter((l) => l.outcome);
    const placed = reported.filter((l) => l.outcome!.status !== "NOT_EMPLOYED");
    return {
      reported: reported.length,
      placed: placed.length,
      rate: reported.length ? Math.round((placed.length / reported.length) * 1000) / 10 : null,
    };
  };
  const salaries = learners.map((l) => l.outcome?.salaryMonthly).filter((s): s is number => typeof s === "number");
  const overall = rate(learners);

  // Previous period comparison
  let prevWhere: ReturnType<typeof learnerWhere>;
  if (filters.from && filters.to) {
    const diff = filters.to.getTime() - filters.from.getTime();
    const prevTo = new Date(filters.from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - diff);
    prevWhere = learnerWhere({ ...filters, from: prevFrom, to: prevTo });
  } else if (filters.from) {
    prevWhere = learnerWhere({ ...filters, to: new Date(filters.from.getTime() - 1), from: undefined });
  } else {
    // 90 days before default window
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
    const oneEightyDaysAgo = new Date(now.getTime() - 180 * 86400000);
    prevWhere = learnerWhere({ ...filters, from: oneEightyDaysAgo, to: ninetyDaysAgo });
  }

  const prevLearners = await prisma.learner.findMany({
    where: prevWhere,
    select: { programId: true, outcome: { select: { status: true, salaryMonthly: true } } },
  });
  const prevOverall = rate(prevLearners);
  const prevSalaries = prevLearners.map((l) => l.outcome?.salaryMonthly).filter((s): s is number => typeof s === "number");
  const prevAvgSalary = prevSalaries.length ? Math.round(prevSalaries.reduce((a, b) => a + b, 0) / prevSalaries.length) : null;

  return {
    stats: {
      trainees: learners.length,
      placementRate: overall.rate,
      reported: overall.reported,
      noOutcome: learners.length - overall.reported,
      averageSalary: salaries.length ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null,
      pendingCheckIns: pendingLinks,
      previousPeriod: {
        trainees: prevLearners.length,
        placementRate: prevOverall.rate,
        averageSalary: prevAvgSalary,
      },
    },
    byProgram: programs
      .filter((p) => !filters.programId || p.id === filters.programId)
      .map((p) => {
        const list = learners.filter((l) => l.programId === p.id);
        return { program: p.name, trainees: list.length, ...rate(list) };
      }),
    gaps: { priority: gaps.priority.slice(0, 6), trend: gaps.trend, postingTotal: gaps.postingTotal },
    impact,
    recent: recent.map((o) => ({
      id: o.id,
      name: o.learner.name,
      district: o.learner.district,
      program: o.learner.program.name,
      status: o.status,
      employer: o.employer,
      verified: o.verified,
      submittedAt: o.submittedAt,
    })),
    unmapped,
  };
}
