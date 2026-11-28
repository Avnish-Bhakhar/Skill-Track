import { buildMatcher, type MatchableSkill } from "./taxonomy";
import type { Sector } from "./taxonomyData";

export type CsvKind = "learners" | "postings";

export const REQUIRED_COLUMNS: Record<CsvKind, string[]> = {
  learners: ["name", "phone", "program", "district", "skills", "enrolledAt"],
  postings: ["title", "district", "description", "postedAt"],
};

export const DISTRICTS = ["Pune", "Nashik", "Nagpur", "Chhatrapati Sambhajinagar", "Kolhapur", "Solapur"];

export type CsvRow = Record<string, string | undefined>;

export interface SkippedRow {
  row: number;
  reason: string;
}

export const missingColumns = (kind: CsvKind, columns: string[]) =>
  REQUIRED_COLUMNS[kind].filter((column) => !columns.includes(column));

export function parseDate(value: string): Date | null {
  const text = value.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const indian = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (!iso && !indian) return null;
  const [year, month, day] = iso
    ? [+iso[1], +iso[2], +iso[3]]
    : [+indian![3], +indian![2], +indian![1]];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid && year >= 2000 && year <= 2100 ? date : null;
}

export function normalizePhone(value: string): string | null {
  let digits = value.replace(/[\s()-]/g, "").replace(/^\+/, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export const canonicalDistrict = (value: string) => {
  const text = value.trim().replace(/\s+/g, " ");
  const known = DISTRICTS.find((d) => d.toLowerCase() === text.toLowerCase());
  return known ?? text.replace(/\b\w/g, (c) => c.toUpperCase());
};

export const batchFor = (date: Date) => `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;

export const postingKey = (title: string, district: string, postedAt: Date, description: string) =>
  [title, district, postedAt.toISOString().slice(0, 10), description]
    .map((part) => part.toLowerCase().replace(/\s+/g, " ").trim())
    .join("|")
    .slice(0, 600);

export function dominantSector(skills: { sector: string }[], title = ""): Sector | null {
  const lower = title.toLowerCase();
  if (/solar|\bpv\b/.test(lower)) return "solar";
  if (/retail|sales|cashier|store|counter/.test(lower)) return "retail";
  if (/electric|wireman|lineman/.test(lower)) return "electrician";
  const counts = new Map<string, number>();
  for (const skill of skills) counts.set(skill.sector, (counts.get(skill.sector) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return (top?.[0] as Sector) ?? null;
}

const splitList = (value: string) => value.split(/[;|,]/).map((v) => v.trim()).filter(Boolean);

export interface LearnerInput {
  name: string;
  phone: string;
  programId: string;
  district: string;
  batch: string;
  enrolledAt: Date;
  priorSalary: number | null;
  skills: { skillId: string; verified: boolean }[];
  unmapped: string[];
}

export function validateLearners(
  rows: CsvRow[],
  programs: { id: string; name: string }[],
  skills: MatchableSkill[],
  existingPhones: Set<string>,
  now = new Date(),
) {
  const matcher = buildMatcher(skills);
  const byName = new Map(programs.map((p) => [p.name.toLowerCase(), p.id]));
  const seen = new Set(existingPhones);
  const valid: LearnerInput[] = [];
  const skipped: SkippedRow[] = [];

  rows.forEach((raw, index) => {
    const row = index + 2;
    const get = (key: string) => (raw[key] ?? "").trim();
    const skip = (reason: string) => skipped.push({ row, reason });
    const name = get("name");
    if (name.length < 2 || name.length > 80) return skip("Name is missing or too long");
    const phone = normalizePhone(get("phone"));
    if (!phone) return skip("Phone is not a 10 digit Indian mobile number");
    if (seen.has(phone)) return skip("Phone number already on file");
    const programId = byName.get(get("program").toLowerCase());
    if (!programId) return skip(`Unknown program "${get("program")}"`);
    if (!get("district")) return skip("District is blank");
    const enrolledAt = parseDate(get("enrolledAt"));
    if (!enrolledAt) return skip("enrolledAt is not a date (use YYYY-MM-DD or DD/MM/YYYY)");
    if (enrolledAt > now) return skip("enrolledAt is in the future");
    const priorText = get("priorSalary");
    if (priorText && !/^\d{1,7}$/.test(priorText)) return skip("priorSalary must be a whole number");

    const verified = new Set(
      splitList(get("verifiedSkills")).map((t) => matcher.matchTerm(t)?.id).filter(Boolean),
    );
    const held = new Map<string, boolean>();
    const unmapped: string[] = [];
    for (const term of [...splitList(get("skills")), ...splitList(get("verifiedSkills"))]) {
      const skill = matcher.matchTerm(term);
      if (skill) held.set(skill.id, verified.has(skill.id));
      else unmapped.push(term);
    }

    seen.add(phone);
    valid.push({
      name,
      phone,
      programId,
      district: canonicalDistrict(get("district")),
      batch: get("batch") || batchFor(enrolledAt),
      enrolledAt,
      priorSalary: priorText ? Number(priorText) : null,
      skills: [...held].map(([skillId, isVerified]) => ({ skillId, verified: isVerified })),
      unmapped,
    });
  });

  return { valid, skipped };
}

export interface PostingInput {
  title: string;
  district: string;
  sector: Sector | null;
  description: string;
  postedAt: Date;
  dedupeKey: string;
  skillIds: string[];
}

export function validatePostings(
  rows: CsvRow[],
  skills: (MatchableSkill & { sector: string })[],
  existingKeys: Set<string>,
  now = new Date(),
) {
  const matcher = buildMatcher(skills);
  const seen = new Set(existingKeys);
  const valid: PostingInput[] = [];
  const skipped: SkippedRow[] = [];

  rows.forEach((raw, index) => {
    const row = index + 2;
    const get = (key: string) => (raw[key] ?? "").trim();
    const skip = (reason: string) => skipped.push({ row, reason });
    const title = get("title");
    if (!title || title.length > 160) return skip("Title is missing or too long");
    if (!get("district")) return skip("District is blank");
    const description = get("description");
    if (description.length < 10) return skip("Description is too short to read");
    const postedAt = parseDate(get("postedAt"));
    if (!postedAt) return skip("postedAt is not a date (use YYYY-MM-DD or DD/MM/YYYY)");
    if (postedAt > now) return skip("postedAt is in the future");
    const district = canonicalDistrict(get("district"));
    const dedupeKey = postingKey(title, district, postedAt, description);
    if (seen.has(dedupeKey)) return skip("Same posting already on file");

    const found = matcher.findInText(`${title}. ${description}`);
    seen.add(dedupeKey);
    valid.push({
      title,
      district,
      sector: dominantSector(found, title),
      description,
      postedAt,
      dedupeKey,
      skillIds: found.map((s) => s.id),
    });
  });

  return { valid, skipped };
}
