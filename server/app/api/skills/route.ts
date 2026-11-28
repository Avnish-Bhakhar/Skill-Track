import { adminRoute } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const GET = adminRoute(async () => ({
  skills: await prisma.skill.findMany({
    orderBy: [{ sector: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sector: true, category: true },
  }),
}));
