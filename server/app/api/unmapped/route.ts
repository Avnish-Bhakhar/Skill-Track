import { adminRoute } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = adminRoute(async () => ({
  items: await prisma.unmappedSkill.findMany({
    where: { status: "OPEN" },
    orderBy: [{ count: "desc" }, { createdAt: "asc" }],
    take: 100,
    select: { id: true, term: true, count: true },
  }),
}));
