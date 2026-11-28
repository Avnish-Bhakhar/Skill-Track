import { faker } from "@faker-js/faker/locale/en_IN";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { normalize } from "../lib/core/taxonomy";
import { SKILLS } from "../lib/core/taxonomyData";
import { buildSeedData } from "../lib/core/seedData";

const prisma = new PrismaClient();

async function main() {
  faker.seed(2026);
  const data = buildSeedData({
    firstName: () => faker.person.firstName(),
    lastName: () => faker.person.lastName(),
  });
  const email = (process.env.ADMIN_EMAIL || "admin@outcomedesk.in").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe@2026";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.recommendation.deleteMany(),
    prisma.unmappedSkill.deleteMany(),
    prisma.comparisonMember.deleteMany(),
    prisma.jobPosting.deleteMany(),
    prisma.learner.deleteMany(),
    prisma.program.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.admin.deleteMany(),
  ]);

  await prisma.admin.create({ data: { email, passwordHash } });
  await prisma.skill.createMany({ data: SKILLS });
  await prisma.program.createMany({ data: data.programs });
  await prisma.programSkill.createMany({ data: data.programSkills });
  await prisma.learner.createMany({
    data: data.learners.map(({ skills, outcome, ...learner }) => learner),
  });
  await prisma.learnerSkill.createMany({
    data: data.learners.flatMap((l) => l.skills.map((s) => ({ learnerId: l.id, ...s }))),
  });
  await prisma.outcome.createMany({
    data: data.learners.flatMap((l) => (l.outcome ? [{ learnerId: l.id, ...l.outcome }] : [])),
  });
  await prisma.jobPosting.createMany({ data: data.postings.map(({ skillIds, ...posting }) => posting) });
  await prisma.jobPostingSkill.createMany({
    data: data.postings.flatMap((p) => p.skillIds.map((skillId) => ({ postingId: p.id, skillId }))),
  });
  await prisma.comparisonMember.createMany({ data: data.comparison });
  await prisma.unmappedSkill.createMany({
    data: data.unmapped.map((u) => ({ ...u, normalized: normalize(u.term) })),
  });
  const expiresAt = new Date(Date.now() + 14 * 86400000);
  await prisma.checkInLink.createMany({
    data: data.pendingLinkLearnerIds.map((learnerId) => ({ token: randomUUID(), learnerId, expiresAt })),
  });

  console.log(
    `Seeded ${data.learners.length} learners, ${data.postings.length} postings, ${data.comparison.length} comparison records, ${SKILLS.length} skills.`,
  );
  console.log(`Admin login: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
