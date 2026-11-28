export interface Participant {
  district: string;
  completedAt: Date;
  priorSalary: number | null;
  outcome: { employed: boolean; salary: number | null; startMonth: Date | null } | null;
}

export interface Comparator {
  district: string;
  referenceDate: Date;
  priorSalary: number | null;
  employed: boolean;
  salary: number | null;
  firstJobDate: Date | null;
}

interface Person {
  district: string;
  employed: boolean;
  monthsToJob: number | null;
  salaryChange: number | null;
}

export const monthsBetween = (from: Date, to: Date) =>
  Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

const round = (value: number | null, places = 1) =>
  value === null ? null : Math.round(value * 10 ** places) / 10 ** places;

function toPerson(
  district: string,
  employed: boolean,
  from: Date,
  firstJob: Date | null,
  prior: number | null,
  salary: number | null,
): Person {
  return {
    district,
    employed,
    monthsToJob: employed && firstJob ? monthsBetween(from, firstJob) : null,
    salaryChange: prior === null ? null : employed ? (salary === null ? null : salary - prior) : -prior,
  };
}

function weighted(people: Person[], weights: Map<string, number>, value: (p: Person) => number | null) {
  let total = 0;
  let weightSum = 0;
  for (const [district, weight] of weights) {
    const values = people.filter((p) => p.district === district).map(value).filter((v): v is number => v !== null);
    if (!values.length) continue;
    total += weight * (values.reduce((a, b) => a + b, 0) / values.length);
    weightSum += weight;
  }
  return weightSum ? total / weightSum : null;
}

const difference = (a: number | null, b: number | null) => (a === null || b === null ? null : round(a - b));

export function computeImpact(participants: Participant[], comparison: Comparator[]) {
  const treated = participants
    .filter((p) => p.outcome)
    .map((p) =>
      toPerson(p.district, p.outcome!.employed, p.completedAt, p.outcome!.startMonth, p.priorSalary, p.outcome!.salary),
    );
  const comparisonDistricts = new Set(comparison.map((c) => c.district));
  const matched = treated.filter((p) => comparisonDistricts.has(p.district));

  const weights = new Map<string, number>();
  for (const person of matched) weights.set(person.district, (weights.get(person.district) ?? 0) + 1);

  const control = comparison
    .filter((c) => weights.has(c.district))
    .map((c) => toPerson(c.district, c.employed, c.referenceDate, c.firstJobDate, c.priorSalary, c.salary));

  const measure = (value: (p: Person) => number | null) => {
    const a = weighted(matched, weights, value);
    const b = weighted(control, weights, value);
    return { participants: round(a), comparison: round(b), difference: difference(a, b) };
  };

  const placement = measure((p) => (p.employed ? 100 : 0));

  return {
    participantCount: matched.length,
    comparisonCount: control.length,
    totalParticipants: participants.length,
    unmatchedCount: treated.length - matched.length,
    placement,
    monthsToFirstJob: measure((p) => p.monthsToJob),
    salaryChange: measure((p) => p.salaryChange),
    byDistrict: [...weights.keys()].sort().map((district) => {
      const rate = (people: Person[]) =>
        round(weighted(people, new Map([[district, 1]]), (p) => (p.employed ? 100 : 0)));
      return { district, participants: rate(matched), comparison: rate(control) };
    }),
    sentence: impactSentence(placement.difference, matched.length, control.length),
  };
}

export function impactSentence(difference: number | null, participants: number, comparison: number) {
  if (difference === null) return "Not enough outcomes on both sides to compare yet.";
  const size = Math.abs(difference);
  const base =
    size < 0.5
      ? "Trainees and the sample comparison group were placed at about the same rate."
      : `Trainees were placed at a rate ${size} percentage points ${difference > 0 ? "higher" : "lower"} than the sample comparison group in the same districts.`;
  return Math.min(participants, comparison) < 30 ? `${base.slice(0, -1)}, but the groups are small, so go easy.` : base;
}

export type ImpactResult = ReturnType<typeof computeImpact>;
