import { validateCheckIn } from "@/lib/core/checkin";
import { HttpError, publicRoute, readJson } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ token: string }> };

async function openLink(token: string) {
  const link = await prisma.checkInLink.findUnique({
    where: { token },
    include: { learner: { select: { name: true, program: { select: { name: true } } } } },
  });
  if (!link) throw new HttpError(404, "This link doesn't match anything. Ask your centre for a new one.");
  if (link.usedAt) throw new HttpError(410, "This link has been used. One answer is all we need.");
  if (link.expiresAt <= new Date()) throw new HttpError(410, "This link has expired. Ask your centre for a fresh one.");
  return link;
}

export const GET = publicRoute<Context>(async (_request, { params }) => {
  const link = await openLink((await params).token);
  return { firstName: link.learner.name.split(" ")[0], program: link.learner.program.name };
});

export const POST = publicRoute<Context>(async (request, { params }) => {
  const { token } = await params;
  const result = validateCheckIn(await readJson(request));
  if ("error" in result) throw new HttpError(400, result.error);
  const link = await openLink(token);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.checkInLink.updateMany({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (!claimed.count) throw new HttpError(410, "This link has been used. One answer is all we need.");
    const data = { ...result.data, verified: false, verifiedAt: null, submittedAt: new Date() };
    await tx.outcome.upsert({
      where: { learnerId: link.learnerId },
      create: { learnerId: link.learnerId, ...data },
      update: data,
    });
  });
  return { ok: true };
});
