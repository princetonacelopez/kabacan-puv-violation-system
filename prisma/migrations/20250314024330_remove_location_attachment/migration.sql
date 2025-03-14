/*
  Warnings:

  - You are about to drop the column `attachment` on the `Violation` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Violation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Violation" DROP COLUMN "attachment",
DROP COLUMN "location";
