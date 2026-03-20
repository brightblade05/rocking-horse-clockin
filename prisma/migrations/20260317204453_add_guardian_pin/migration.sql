-- CreateTable
CREATE TABLE "Guardian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Child" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "classroom" TEXT,
    "guardianId" TEXT,
    "guardianName" TEXT NOT NULL,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "address" TEXT,
    "emergencyContact" TEXT,
    "allergies" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "enrollDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Child_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "Guardian" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Child" ("address", "allergies", "classroom", "createdAt", "dateOfBirth", "emergencyContact", "enrollDate", "firstName", "guardianEmail", "guardianName", "guardianPhone", "id", "isActive", "lastName", "notes") SELECT "address", "allergies", "classroom", "createdAt", "dateOfBirth", "emergencyContact", "enrollDate", "firstName", "guardianEmail", "guardianName", "guardianPhone", "id", "isActive", "lastName", "notes" FROM "Child";
DROP TABLE "Child";
ALTER TABLE "new_Child" RENAME TO "Child";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_pin_key" ON "Guardian"("pin");
