import { adminRoute, HttpError, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type StaticContext = { params: Promise<{ id: string }> };

interface Body {
  status?: "PENDING" | "ACCEPTED" | "REJECTED" | "UNDER_REVIEW";
  statusNote?: string;
}

export const PATCH = adminRoute<StaticContext>(async (request, context) => {
  const { id } = await context.params;
  const body = await readJson<Body>(request);

  const allowed = ["PENDING", "ACCEPTED", "REJECTED", "UNDER_REVIEW"];
  if (!body.status || !allowed.includes(body.status)) {
    throw new HttpError(400, `Status must be one of: ${allowed.join(", ")}.`);
  }

  const rec = await prisma.curriculumRecommendation.findUnique({ where: { id } });
  if (!rec) throw new HttpError(404, "Recommendation not found.");

  const updated = await prisma.curriculumRecommendation.update({
    where: { id },
    data: {
      status: body.status,
      statusNote: typeof body.statusNote === "string" ? body.statusNote.slice(0, 400) : undefined,
    },
  });

  return { id: updated.id, status: updated.status };
});
