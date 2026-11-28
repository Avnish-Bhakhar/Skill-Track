import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCheckIn } from "../lib/core/checkin";
import { validateLearners, validatePostings } from "../lib/core/csv";
import { toCsv } from "../lib/core/csvExport";
import { computeGaps, demandTrend } from "../lib/core/gaps";
import { computeImpact } from "../lib/core/impact";
import { buildSeedData, PROGRAMS } from "../lib/core/seedData";
import { buildMatcher, mapExtracted } from "../lib/core/taxonomy";
import { SKILLS } from "../lib/core/taxonomyData";

const now = new Date("2026-11-25T00:00:00Z");
let n = 0;
const data = buildSeedData({ firstName: () => "Asha", lastName: () => `Jadhav${n++}` }, now);

test("taxonomy has 80 to 100 unique skills and labels", () => {
  assert.ok(SKILLS.length >= 80 && SKILLS.length <= 100, String(SKILLS.length));
  assert.equal(new Set(SKILLS.map((s) => s.id)).size, SKILLS.length);
  const labels = SKILLS.flatMap((s) => [s.name, ...s.aliases].map((l) => l.toLowerCase()));
  assert.equal(new Set(labels).size, labels.length);
});

test("matcher handles aliases, and unknown terms stay unmapped", () => {
  const matcher = buildMatcher(SKILLS);
  assert.equal(matcher.matchTerm("Inverter Commissioning")?.id, "inverter-configuration");
  const result = mapExtracted(
    [{ term: "megger" }, { term: "quantum wiring", suggested: "made-up-id" }, { term: "billing desk", suggested: "POS billing" }],
    SKILLS,
  );
  assert.deepEqual(result.matched.map((m) => m.skillId), ["insulation-resistance-testing", "pos-billing"]);
  assert.deepEqual(result.unmapped, ["quantum wiring"]);
});

test("seed descriptions extract back to exactly the seeded skills", () => {
  const matcher = buildMatcher(SKILLS);
  for (const posting of data.postings) {
    assert.deepEqual(matcher.findInText(posting.description).map((s) => s.id).sort(), [...posting.skillIds].sort());
  }
});

test("learner CSV rows are validated with reasons", () => {
  const base = { name: "Priya Shinde", phone: "+91 98220 11223", program: "solar pv installer", district: "pune", skills: "DC wiring; kite flying", enrolledAt: "05/03/2026" };
  const { valid, skipped } = validateLearners(
    [base, base, { ...base, phone: "12" }, { ...base, phone: "9822011224", enrolledAt: "2026-02-30" }, { ...base, phone: "9822011225", program: "Welding" }],
    PROGRAMS, SKILLS, new Set(), now,
  );
  assert.equal(valid.length, 1);
  assert.equal(valid[0].phone, "9822011223");
  assert.equal(valid[0].district, "Pune");
  assert.deepEqual(valid[0].skills.map((s) => s.skillId), ["dc-cabling"]);
  assert.deepEqual(valid[0].unmapped, ["kite flying"]);
  assert.deepEqual(skipped.map((s) => s.row), [3, 4, 5, 6]);
});

test("posting CSV rows get skills and a sector, duplicates are skipped", () => {
  const row = { title: "Technician", district: "Nashik", description: "Needs inverter settings and MC4 crimping", postedAt: "2026-10-01" };
  const { valid, skipped } = validatePostings([row, row], SKILLS, new Set(), now);
  assert.equal(valid[0].sector, "solar");
  assert.equal(valid[0].skillIds.length, 2);
  assert.equal(skipped.length, 1);
});

test("gap maths: demand x (1 - supply)", () => {
  const rows = computeGaps({
    skills: [{ id: "a", name: "A", sector: "solar" }],
    postings: [
      { sector: "solar", postedAt: now, skillIds: ["a"] }, { sector: "solar", postedAt: now, skillIds: ["a"] },
      { sector: "solar", postedAt: now, skillIds: [] }, { sector: "retail", postedAt: now, skillIds: [] },
    ],
    trainees: [{ sector: "solar", skills: [{ skillId: "a", verified: false }] }, { sector: "solar", skills: [] }],
    coveredSkillIds: new Set(),
  });
  assert.equal(rows[0].demandPct, 66.7);
  assert.equal(rows[0].supplyPct, 50);
  assert.equal(rows[0].verifiedSupplyPct, 0);
  assert.equal(rows[0].priority, 33.3);
});

function seededGaps(district?: string, verifiedOnly = false) {
  const sectorOf = new Map(PROGRAMS.map((p) => [p.id, p.sector]));
  const postings = data.postings.filter((p) => !district || p.district === district);
  return {
    postings,
    rows: computeGaps({
      skills: SKILLS,
      postings,
      trainees: data.learners.filter((l) => !district || l.district === district).map((l) => ({ sector: sectorOf.get(l.programId)!, skills: l.skills })),
      coveredSkillIds: new Set(data.programSkills.map((p) => p.skillId)),
      verifiedOnly,
    }),
  };
}

test("seed story: inverter configuration is the top gap and is not taught", () => {
  const { rows, postings } = seededGaps();
  assert.equal(rows[0].skillId, "inverter-configuration");
  assert.equal(rows[0].covered, false);
  assert.ok(rows[0].priority > rows[1].priority + 15);
  for (const district of ["Pune", "Nashik", "Nagpur", "Chhatrapati Sambhajinagar", "Kolhapur", "Solapur"]) {
    assert.equal(seededGaps(district).rows[0].skillId, "inverter-configuration", district);
  }
  const trend = demandTrend(postings, rows, now);
  assert.equal(trend.points.length, 6);
  console.log("top gaps", rows.slice(0, 5).map((r) => `${r.name} d=${r.demandPct} s=${r.supplyPct} p=${r.priority}`));
});

test("seed story: participants beat the comparison group by a believable margin", () => {
  assert.ok(data.learners.length >= 500 && data.postings.length === 300);
  assert.equal(new Set(data.learners.map((l) => l.phone)).size, data.learners.length);
  const durations = new Map(PROGRAMS.map((p) => [p.id, p.durationMonths]));
  const result = computeImpact(
    data.learners.map((l) => ({
      district: l.district,
      completedAt: new Date(l.enrolledAt.getTime() + durations.get(l.programId)! * 30.44 * 86400000),
      priorSalary: l.priorSalary,
      outcome: l.outcome && { employed: l.outcome.status !== "NOT_EMPLOYED", salary: l.outcome.salaryMonthly, startMonth: l.outcome.startMonth },
    })),
    data.comparison,
  );
  console.log("impact", result.placement, result.monthsToFirstJob, result.salaryChange);
  console.log(result.sentence);
  assert.ok(result.placement.difference! > 10 && result.placement.difference! < 28);
  assert.ok(result.monthsToFirstJob.difference! < 0);
  assert.ok(result.salaryChange.difference! > 0);
});

test("impact with no data says so", () => {
  assert.equal(computeImpact([], []).placement.difference, null);
});

test("check-in validation", () => {
  assert.ok("data" in validateCheckIn({ status: "NOT_EMPLOYED" }, now));
  assert.ok("error" in validateCheckIn({ status: "EMPLOYED", role: "x" }, now));
  assert.ok("error" in validateCheckIn({ status: "SELF_EMPLOYED", role: "x", salaryBand: "toString", startMonth: "2026-01" }, now));
  assert.ok("error" in validateCheckIn({ status: "SELF_EMPLOYED", role: "x", salaryBand: "10k-15k", startMonth: "2027-01" }, now));
  assert.ok("data" in validateCheckIn({ status: "SELF_EMPLOYED", role: "x", salaryBand: "10k-15k", startMonth: "2026-01" }, now));
});

test("CSV export escapes formulas and quotes", () => {
  const out = toCsv(["a"], [["=1+1"], ['say "hi", ok'], ["+91 98220"]]);
  assert.ok(out.includes("'=1+1") && out.includes('"say ""hi"", ok"') && out.includes("\r\n+91 98220"));
});
