import { adminRoute, HttpError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = adminRoute<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const { id } = await params;
  const learner = await prisma.learner.findUnique({
    where: { id },
    include: {
      program: true,
      outcome: true,
      skills: { include: { skill: true } },
      links: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!learner) throw new HttpError(404, "Learner not found.");
  return { learner };
});
