export interface GapSkill {
  id: string;
  name: string;
  sector: string;
  category?: string;
}

export interface GapPosting {
  sector: string | null;
  postedAt: Date;
  skillIds: string[];
}

export interface GapTrainee {
  sector: string;
  skills: { skillId: string; verified: boolean }[];
}

export interface GapRow {
  skillId: string;
  name: string;
  sector: string;
  category?: string;
  mentions: number;
  postingCount: number;
  traineeCount: number;
  demandPct: number;
  supplyPct: number;
  verifiedSupplyPct: number;
  covered: boolean;
  coverageStatus: "covered" | "partial" | "missing";
  priority: number;
  priorityCategory: "Critical" | "High" | "Medium" | "Low";
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

export function computeGaps(input: {
  skills: GapSkill[];
  postings: GapPosting[];
  trainees: GapTrainee[];
  coveredSkillIds: Set<string>;
  verifiedOnly?: boolean;
}): GapRow[] {
  const postingTotals = new Map<string, number>();
  const mentions = new Map<string, number>();
  for (const posting of input.postings) {
    if (!posting.sector) continue;
    postingTotals.set(posting.sector, (postingTotals.get(posting.sector) ?? 0) + 1);
    for (const id of new Set(posting.skillIds)) {
      const key = `${posting.sector}:${id}`;
      mentions.set(key, (mentions.get(key) ?? 0) + 1);
    }
  }

  const traineeTotals = new Map<string, number>();
  const holders = new Map<string, number>();
  const verifiedHolders = new Map<string, number>();
  for (const trainee of input.trainees) {
    traineeTotals.set(trainee.sector, (traineeTotals.get(trainee.sector) ?? 0) + 1);
    for (const { skillId, verified } of trainee.skills) {
      const key = `${trainee.sector}:${skillId}`;
      holders.set(key, (holders.get(key) ?? 0) + 1);
      if (verified) verifiedHolders.set(key, (verifiedHolders.get(key) ?? 0) + 1);
    }
  }

  return input.skills
    .map((skill) => {
      const key = `${skill.sector}:${skill.id}`;
      const postingCount = postingTotals.get(skill.sector) ?? 0;
      const traineeCount = traineeTotals.get(skill.sector) ?? 0;
      const mentioned = mentions.get(key) ?? 0;
      const demand = postingCount ? mentioned / postingCount : 0;
      const supply = traineeCount ? (holders.get(key) ?? 0) / traineeCount : 0;
      const verifiedSupply = traineeCount ? (verifiedHolders.get(key) ?? 0) / traineeCount : 0;
      const covered = input.coveredSkillIds.has(skill.id);
      const priority = Math.round(demand * (1 - (input.verifiedOnly ? verifiedSupply : supply)) * 1000) / 10;
      const coverageStatus: "covered" | "partial" | "missing" = covered ? (holders.get(key) ?? 0) / (traineeCount || 1) >= 0.25 ? "covered" : "partial" : "missing";
      const priorityCategory: "Critical" | "High" | "Medium" | "Low" =
        priority >= 60 ? "Critical" : priority >= 30 ? "High" : priority >= 10 ? "Medium" : "Low";

      return {
        skillId: skill.id,
        name: skill.name,
        sector: skill.sector,
        category: skill.category,
        mentions: mentioned,
        postingCount,
        traineeCount,
        demandPct: pct(mentioned, postingCount),
        supplyPct: pct(holders.get(key) ?? 0, traineeCount),
        verifiedSupplyPct: pct(verifiedHolders.get(key) ?? 0, traineeCount),
        covered,
        coverageStatus,
        priority,
        priorityCategory,
      };
    })
    .filter((row) => row.mentions > 0 || row.covered)
    .sort((a, b) => b.priority - a.priority || b.mentions - a.mentions || a.name.localeCompare(b.name));
}

export const monthKey = (date: Date) => date.toISOString().slice(0, 7);

export function lastMonths(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1))),
  );
}

export function demandTrend(postings: GapPosting[], rows: GapRow[], now = new Date(), top = 3) {
  const series = rows.filter((r) => r.mentions > 0).slice(0, top);
  const points = lastMonths(6, now).map((month) => {
    const inMonth = postings.filter((p) => monthKey(p.postedAt) === month);
    const values: Record<string, number | null> = {};
    for (const row of series) {
      const pool = inMonth.filter((p) => p.sector === row.sector);
      values[row.skillId] = pool.length
        ? pct(pool.filter((p) => p.skillIds.includes(row.skillId)).length, pool.length)
        : null;
    }
    return { month, postings: inMonth.length, ...values };
  });
  return { series: series.map((r) => ({ skillId: r.skillId, name: r.name })), points };
}
