import { toCsv } from "@/lib/core/csvExport";
import { readFilters } from "@/lib/filters";
import { adminRoute, HttpError } from "@/lib/http";
import { learnerSearch } from "@/lib/learnerSearch";
import { checkInUrl, issueLinks } from "@/lib/links";
import { prisma } from "@/lib/prisma";

export const GET = adminRoute(async (request) => {
  const learners = await prisma.learner.findMany({
    where: learnerSearch(readFilters(request)),
    orderBy: { name: "asc" },
    include: {
      program: { select: { name: true } },
      links: { where: { usedAt: null, expiresAt: { gt: new Date() } }, take: 1 },
      outcome: { select: { id: true } },
    },
  });
  // Learners who already answered only appear if an admin issued them a fresh link.
  const needLink = learners.filter((l) => !l.links.length && !l.outcome).map((l) => l.id);
  const issued = new Map((needLink.length ? await issueLinks(needLink) : []).map((l) => [l.learnerId, l]));
  const rows = learners.flatMap((l) => {
    const link = l.links[0] ?? issued.get(l.id);
    return link
      ? [[l.name, l.phone, l.program.name, l.district, checkInUrl(link.token), link.expiresAt.toISOString().slice(0, 10)]]
      : [];
  });
  if (!rows.length) throw new HttpError(404, "Everyone in this view has already answered. Nice problem to have.");
  return new Response(toCsv(["name", "phone", "program", "district", "link", "expiresOn"], rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="checkin-links.csv"',
      "Cache-Control": "no-store",
    },
  });
});
