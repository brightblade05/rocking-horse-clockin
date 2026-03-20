/*
  Warnings:

  - You are about to drop the column `address` on the `Child` table. All the data in the column will be lost.
  - You are about to drop the column `guardianEmail` on the `Child` table. All the data in the column will be lost.
  - You are about to drop the column `guardianName` on the `Child` table. All the data in the column will be lost.
  - You are about to drop the column `guardianPhone` on the `Child` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Guardian` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `Guardian` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Guardian` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Child" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrollDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "classroom" TEXT,
    "location" TEXT,
    "guardianId" TEXT,
    "daysOfWeek" TEXT,
    "hours" TEXT,
    "livesWith" TEXT,
    "custodyPapers" BOOLEAN NOT NULL DEFAULT false,
    "specialCareNeeds" TEXT,
    "specialCareDetails" TEXT,
    "allergies" TEXT,
    "allergyPlan" TEXT,
    "immunizationsOnFile" BOOLEAN NOT NULL DEFAULT true,
    "school" TEXT,
    "schoolPhone" TEXT,
    "pickup1FirstName" TEXT,
    "pickup1LastName" TEXT,
    "pickup1Phone" TEXT,
    "pickup1WorkPhone" TEXT,
    "pickup2FirstName" TEXT,
    "pickup2LastName" TEXT,
    "pickup2Phone" TEXT,
    "pickup2WorkPhone" TEXT,
    "pickup3FirstName" TEXT,
    "pickup3LastName" TEXT,
    "pickup3Phone" TEXT,
    "pickup3WorkPhone" TEXT,
    "pickup4FirstName" TEXT,
    "pickup4LastName" TEXT,
    "pickup4Phone" TEXT,
    "pickup4WorkPhone" TEXT,
    "emergencyContact" TEXT,
    "physicianFirstName" TEXT,
    "physicianLastName" TEXT,
    "physicianAddress" TEXT,
    "physicianPhone" TEXT,
    "physicianCity" TEXT,
    "physicianState" TEXT,
    "hospitalName" TEXT,
    "hospitalPhone" TEXT,
    "hospitalAddress" TEXT,
    "hospitalCity" TEXT,
    "hospitalState" TEXT,
    "consentPhotos" BOOLEAN NOT NULL DEFAULT true,
    "consentTransport" BOOLEAN NOT NULL DEFAULT true,
    "consentWater" BOOLEAN NOT NULL DEFAULT true,
    "consentTylenol" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    CONSTRAINT "Child_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Child" ("allergies", "classroom", "createdAt", "dateOfBirth", "emergencyContact", "enrollDate", "firstName", "guardianId", "id", "isActive", "lastName", "notes") SELECT "allergies", "classroom", "createdAt", "dateOfBirth", "emergencyContact", "enrollDate", "firstName", "guardianId", "id", "isActive", "lastName", "notes" FROM "Child";
DROP TABLE "Child";
ALTER TABLE "new_Child" RENAME TO "Child";
CREATE TABLE "new_Guardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pin" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "secondaryPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "driversLicenseId" TEXT,
    "relationshipToChild" TEXT,
    "guardian2FirstName" TEXT,
    "guardian2LastName" TEXT,
    "guardian2Email" TEXT,
    "guardian2Phone" TEXT,
    "guardian2SecondaryPhone" TEXT,
    "guardian2Address" TEXT,
    "guardian2City" TEXT,
    "guardian2State" TEXT,
    "guardian2Zip" TEXT,
    "guardian2DriversLicenseId" TEXT,
    "guardian2Relationship" TEXT,
    "notes" TEXT
);
INSERT INTO "new_Guardian" ("address", "createdAt", "email", "id", "isActive", "notes", "phone", "pin") SELECT "address", "createdAt", "email", "id", "isActive", "notes", "phone", "pin" FROM "Guardian";
DROP TABLE "Guardian";
ALTER TABLE "new_Guardian" RENAME TO "Guardian";
CREATE UNIQUE INDEX "Guardian_pin_key" ON "Guardian"("pin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
