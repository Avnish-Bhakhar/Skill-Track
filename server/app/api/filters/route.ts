import { DISTRICTS } from "@/lib/core/csv";
import { SECTORS } from "@/lib/core/taxonomyData";
import { adminRoute } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = adminRoute(async () => {
  const [programs, districts, batches] = await Promise.all([
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, sector: true } }),
    prisma.learner.findMany({ distinct: ["district"], select: { district: true } }),
    prisma.learner.findMany({ distinct: ["batch"], select: { batch: true }, orderBy: { batch: "desc" } }),
  ]);
  return {
    programs,
    districts: [...new Set([...DISTRICTS, ...districts.map((d) => d.district)])].sort(),
    batches: batches.map((b) => b.batch),
    sectors: SECTORS,
  };
});
