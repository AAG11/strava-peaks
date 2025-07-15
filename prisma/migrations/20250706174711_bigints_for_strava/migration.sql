/*
  Warnings:

  - The primary key for the `Activity` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PeakOnActivity` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "PeakOnActivity" DROP CONSTRAINT "PeakOnActivity_activityId_fkey";

-- AlterTable
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_pkey",
ALTER COLUMN "id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "Activity_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "PeakOnActivity" DROP CONSTRAINT "PeakOnActivity_pkey",
ALTER COLUMN "activityId" SET DATA TYPE BIGINT,
ADD CONSTRAINT "PeakOnActivity_pkey" PRIMARY KEY ("peakId", "activityId");

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "stravaId" SET DATA TYPE BIGINT;

-- AddForeignKey
ALTER TABLE "PeakOnActivity" ADD CONSTRAINT "PeakOnActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
