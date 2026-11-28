-- CreateEnum
CREATE TYPE "CurriculumRecStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'UNDER_REVIEW');

-- CreateTable
CREATE TABLE "CurriculumRecommendation" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" DOUBLE PRECISION NOT NULL,
    "demandPct" DOUBLE PRECISION NOT NULL,
    "supplyPct" DOUBLE PRECISION NOT NULL,
    "curriculumCoverage" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "learningOutcome" TEXT NOT NULL,
    "practicalExercise" TEXT NOT NULL,
    "modulePosition" TEXT NOT NULL,
    "status" "CurriculumRecStatus" NOT NULL DEFAULT 'PENDING',
    "statusNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurriculumRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurriculumRecommendation_scope_status_idx" ON "CurriculumRecommendation"("scope", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumRecommendation_scope_skillId_key" ON "CurriculumRecommendation"("scope", "skillId");
