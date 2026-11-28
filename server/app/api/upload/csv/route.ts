import Papa from "papaparse";
import { missingColumns, validateLearners, validatePostings, type CsvKind, type CsvRow } from "@/lib/core/csv";
import { adminRoute, HttpError, readUpload } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { queueUnmapped } from "@/lib/unmapped";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = adminRoute(async (request) => {
  const { file, form } = await readUpload(request, ".csv");
  const kind = form.get("kind") as CsvKind;
  const commit = form.get("mode") === "commit";
  if (kind !== "learners" && kind !== "postings") throw new HttpError(400, "Say whether this is learners or postings.");

  const parsed = Papa.parse<CsvRow>((await file.text()).replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const columns = parsed.meta.fields ?? [];
  const missing = missingColumns(kind, columns);
  if (missing.length) throw new HttpError(400, `That file is missing columns: ${missing.join(", ")}.`);
  if (!parsed.data.length) throw new HttpError(400, "The file has headers and nothing else.");
  if (parsed.data.length > 5000) throw new HttpError(400, "5,000 rows at a time, please.");

  const skills = await prisma.skill.findMany();
  const preview = parsed.data.slice(0, 10);

  if (kind === "learners") {
    const [programs, existing] = await Promise.all([
      prisma.program.findMany({ select: { id: true, name: true } }),
      prisma.learner.findMany({ select: { phone: true } }),
    ]);
    const { valid, skipped } = validateLearners(parsed.data, programs, skills, new Set(existing.map((e) => e.phone)));
    if (!commit) return { columns, preview, total: parsed.data.length, ready: valid.length, skippedRows: skipped };

    const learners = valid.map((v) => ({ id: randomUUID(), ...v }));
    const [created] = await prisma.$transaction([
      prisma.learner.createMany({ data: learners.map(({ skills: _s, unmapped: _u, ...l }) => l) }),
      prisma.learnerSkill.createMany({
        data: learners.flatMap((l) => l.skills.map((s) => ({ learnerId: l.id, ...s }))),
      }),
    ]);
    await queueUnmapped(learners.flatMap((l) => l.unmapped.map((term) => ({ term, learnerId: l.id }))));
    return { inserted: created.count, skipped: skipped.length, skippedRows: skipped };
  }

  const existing = await prisma.jobPosting.findMany({ select: { dedupeKey: true } });
  const { valid, skipped } = validatePostings(parsed.data, skills, new Set(existing.map((e) => e.dedupeKey)));
  if (!commit) return { columns, preview, total: parsed.data.length, ready: valid.length, skippedRows: skipped };

  const postings = valid.map((v) => ({ id: randomUUID(), ...v }));
  const [created] = await prisma.$transaction([
    prisma.jobPosting.createMany({ data: postings.map(({ skillIds: _s, ...p }) => p) }),
    prisma.jobPostingSkill.createMany({
      data: postings.flatMap((p) => p.skillIds.map((skillId) => ({ postingId: p.id, skillId }))),
    }),
  ]);
  return { inserted: created.count, skipped: skipped.length, skippedRows: skipped };
});
