import type { Prisma } from "@prisma/client";
import { learnerWhere, type Filters } from "./filters";

export function learnerSearch(filters: Filters): Prisma.LearnerWhereInput {
  const where = learnerWhere(filters);
  if (filters.search) {
    where.OR = [{ name: { contains: filters.search, mode: "insensitive" } }, { phone: { contains: filters.search } }];
  }
  if (filters.status === "none") where.outcome = { is: null };
  else if (filters.status === "EMPLOYED" || filters.status === "NOT_EMPLOYED" || filters.status === "SELF_EMPLOYED") {
    where.outcome = { is: { status: filters.status } };
  }
  return where;
}
