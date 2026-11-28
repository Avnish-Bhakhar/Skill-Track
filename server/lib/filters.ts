import type { Prisma } from "@prisma/client";
import { parseDate } from "./core/csv";

export function readFilters(request: Request) {
  const params = new URL(request.url).searchParams;
  const get = (key: string) => params.get(key)?.trim() || undefined;
  return {
    district: get("district"),
    programId: get("program"),
    batch: get("batch"),
    sector: get("sector"),
    category: get("category"),
    from: parseDate(get("from") ?? "") ?? undefined,
    to: parseDate(get("to") ?? "") ?? undefined,
    search: get("search"),
    status: get("status"),
    verifiedOnly: get("verified") === "1",
  };
}

export type Filters = ReturnType<typeof readFilters>;

export function learnerWhere(filters: Filters): Prisma.LearnerWhereInput {
  const { district, programId, batch, from, to, sector } = filters;
  return {
    district,
    programId,
    batch,
    program: sector ? { sector } : undefined,
    enrolledAt: from || to ? { gte: from, lte: to ? new Date(to.getTime() + 86399999) : undefined } : undefined,
  };
}
