import { randomUUID } from "node:crypto";
import { canonicalDistrict, dominantSector, parseDate, postingKey } from "@/lib/core/csv";
import { SECTORS, type Sector } from "@/lib/core/taxonomyData";
import { adminRoute, HttpError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { queueUnmapped } from "@/lib/unmapped";

interface Body {
  kind?: string;
  skillIds?: string[];
  unmapped?: string[];
  programName?: string;
  sector?: Sector;
  durationMonths?: number;
  title?: string;
  district?: string;
  description?: string;
  postedAt?: string;
}

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

export const POST = adminRoute(async (request) => {
  const body = await readJson<Body>(request);
  const skills = await prisma.skill.findMany({ where: { id: { in: strings(body.skillIds) } } });
  const unmapped = strings(body.unmapped).slice(0, 80);
  if (!skills.length && !unmapped.length) throw new HttpError(400, "Nothing left to save. Keep at least one skill.");

  if (body.kind === "curriculum") {
    const name = String(body.programName ?? "").trim().slice(0, 120);
    if (!name) throw new HttpError(400, "Give the program a name.");
    let program = await prisma.program.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    if (!program) {
      if (!body.sector || !SECTORS.includes(body.sector)) throw new HttpError(400, "Pick a sector for the new program.");
      const months = Number(body.durationMonths);
      program = await prisma.program.create({
        data: { name, sector: body.sector, durationMonths: Number.isInteger(months) && months > 0 && months <= 36 ? months : 3 },
      });
    }
    const programId = program.id;
    const result = await prisma.programSkill.createMany({
      data: skills.map((s) => ({ programId, skillId: s.id })),
      skipDuplicates: true,
    });
    await queueUnmapped(unmapped.map((term) => ({ term, programId })));
    return { saved: result.count, alreadyThere: skills.length - result.count, queued: unmapped.length, name: program.name };
  }

  if (body.kind === "posting") {
    const title = String(body.title ?? "").trim().slice(0, 160);
    const district = canonicalDistrict(String(body.district ?? ""));
    const postedAt = parseDate(String(body.postedAt ?? ""));
    const description = String(body.description ?? "").slice(0, 5000);
    if (!title || !district || !postedAt) throw new HttpError(400, "Title, district and posting date are all needed.");
    if (postedAt > new Date()) throw new HttpError(400, "The posting date is in the future.");
    const dedupeKey = postingKey(title, district, postedAt, description);
    if (await prisma.jobPosting.findUnique({ where: { dedupeKey } })) {
      throw new HttpError(409, "That posting is already on file.");
    }
    const id = randomUUID();
    const sector = body.sector && SECTORS.includes(body.sector) ? body.sector : dominantSector(skills, title);
    await prisma.jobPosting.create({
      data: {
        id, title, district, postedAt, description, dedupeKey, sector,
        skills: { create: skills.map((s) => ({ skillId: s.id })) },
      },
    });
    await queueUnmapped(unmapped.map((term) => ({ term, postingId: id })));
    return { saved: skills.length, alreadyThere: 0, queued: unmapped.length, name: title };
  }

  throw new HttpError(400, "Unknown document type.");
});
