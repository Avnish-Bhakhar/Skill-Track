import { normalize } from "./core/taxonomy";
import { prisma } from "./prisma";

export interface UnmappedSource {
  term: string;
  postingId?: string;
  programId?: string;
  learnerId?: string;
}

export async function queueUnmapped(items: UnmappedSource[]) {
  const groups = new Map<string, { term: string; count: number; postingIds: string[]; programIds: string[]; learnerIds: string[] }>();
  for (const item of items) {
    const key = normalize(item.term);
    if (!key) continue;
    const group = groups.get(key) ?? { term: item.term.slice(0, 80), count: 0, postingIds: [], programIds: [], learnerIds: [] };
    group.count += 1;
    if (item.postingId) group.postingIds.push(item.postingId);
    if (item.programId) group.programIds.push(item.programId);
    if (item.learnerId) group.learnerIds.push(item.learnerId);
    groups.set(key, group);
  }
  for (const [normalized, group] of groups) {
    await prisma.unmappedSkill.upsert({
      where: { normalized },
      create: { normalized, ...group },
      update: {
        count: { increment: group.count },
        postingIds: { push: group.postingIds },
        programIds: { push: group.programIds },
        learnerIds: { push: group.learnerIds },
      },
    });
  }
}
