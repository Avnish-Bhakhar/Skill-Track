import { adminRoute, HttpError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const PATCH = adminRoute<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const { verified } = await readJson<{ verified?: boolean }>(request);
  if (typeof verified !== "boolean") throw new HttpError(400, "Send verified as true or false.");
  const result = await prisma.outcome.updateMany({
    where: { id, status: "EMPLOYED" },
    data: { verified, verifiedAt: verified ? new Date() : null },
  });
  if (!result.count) throw new HttpError(404, "Only employed records can be employer verified.");
  return { ok: true };
});
