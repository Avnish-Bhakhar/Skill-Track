-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('EMPLOYED', 'NOT_EMPLOYED', 'SELF_EMPLOYED');

-- CreateEnum
CREATE TYPE "UnmappedStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "category" TEXT NOT NULL,
    "sector" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramSkill" (
    "programId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "ProgramSkill_pkey" PRIMARY KEY ("programId","skillId")
);

-- CreateTable
CREATE TABLE "Learner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL,
    "priorSalary" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerSkill" (
    "learnerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LearnerSkill_pkey" PRIMARY KEY ("learnerId","skillId")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "sector" TEXT,
    "description" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "dedupeKey" TEXT NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPostingSkill" (
    "postingId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "JobPostingSkill_pkey" PRIMARY KEY ("postingId","skillId")
);

-- CreateTable
CREATE TABLE "CheckInLink" (
    "token" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInLink_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "employer" TEXT,
    "role" TEXT,
    "salaryBand" TEXT,
    "salaryMonthly" INTEGER,
    "startMonth" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparisonMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "priorSalary" INTEGER,
    "employed" BOOLEAN NOT NULL,
    "salary" INTEGER,
    "firstJobDate" TIMESTAMP(3),

    CONSTRAINT "ComparisonMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmappedSkill" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" "UnmappedStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedSkillId" TEXT,
    "postingIds" TEXT[],
    "programIds" TEXT[],
    "learnerIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnmappedSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Program_name_key" ON "Program"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Learner_phone_key" ON "Learner"("phone");

-- CreateIndex
CREATE INDEX "Learner_district_idx" ON "Learner"("district");

-- CreateIndex
CREATE INDEX "Learner_programId_idx" ON "Learner"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_dedupeKey_key" ON "JobPosting"("dedupeKey");

-- CreateIndex
CREATE INDEX "JobPosting_district_sector_idx" ON "JobPosting"("district", "sector");

-- CreateIndex
CREATE INDEX "CheckInLink_learnerId_idx" ON "CheckInLink"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Outcome_learnerId_key" ON "Outcome"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "UnmappedSkill_normalized_key" ON "UnmappedSkill"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_scope_skillId_key" ON "Recommendation"("scope", "skillId");

-- AddForeignKey
ALTER TABLE "ProgramSkill" ADD CONSTRAINT "ProgramSkill_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSkill" ADD CONSTRAINT "ProgramSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerSkill" ADD CONSTRAINT "LearnerSkill_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerSkill" ADD CONSTRAINT "LearnerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostingSkill" ADD CONSTRAINT "JobPostingSkill_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostingSkill" ADD CONSTRAINT "JobPostingSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInLink" ADD CONSTRAINT "CheckInLink_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
