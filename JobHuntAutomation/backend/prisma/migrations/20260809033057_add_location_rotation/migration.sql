-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SearchConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keywords" TEXT NOT NULL,
    "locations" TEXT NOT NULL,
    "workType" TEXT NOT NULL,
    "datePosted" TEXT NOT NULL DEFAULT 'r86400',
    "jobType" TEXT NOT NULL,
    "spendCapUsd" REAL NOT NULL DEFAULT 0.25,
    "lastLocationIndex" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SearchConfig" ("datePosted", "id", "jobType", "keywords", "locations", "spendCapUsd", "updatedAt", "workType") SELECT "datePosted", "id", "jobType", "keywords", "locations", "spendCapUsd", "updatedAt", "workType" FROM "SearchConfig";
DROP TABLE "SearchConfig";
ALTER TABLE "new_SearchConfig" RENAME TO "SearchConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
