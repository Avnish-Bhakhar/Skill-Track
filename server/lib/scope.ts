import type { Filters } from "./filters";

export const recommendationScope = (f: Filters) =>
  [f.sector ?? "all", f.district ?? "all", f.programId ?? "all", f.verifiedOnly ? "verified" : "any"].join("|");
