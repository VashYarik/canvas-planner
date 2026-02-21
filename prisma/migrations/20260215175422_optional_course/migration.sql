-- AlterTable
ALTER TABLE "Course" ADD COLUMN "endDate" DATETIME;
ALTER TABLE "Course" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "Course" ADD COLUMN "syllabus" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "canvasRefreshToken" TEXT;
ALTER TABLE "User" ADD COLUMN "canvasTokenExpiresAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" DATETIME,
    "points" REAL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "estimatedMinutes" INTEGER,
    "difficulty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("courseId", "createdAt", "description", "difficulty", "dueAt", "estimatedMinutes", "id", "points", "source", "sourceId", "status", "title", "updatedAt", "userId") SELECT "courseId", "createdAt", "description", "difficulty", "dueAt", "estimatedMinutes", "id", "points", "source", "sourceId", "status", "title", "updatedAt", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE TABLE "new_WorkBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    CONSTRAINT "WorkBlock_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkBlock" ("durationMinutes", "id", "kind", "startAt", "status", "taskId", "userId") SELECT "durationMinutes", "id", "kind", "startAt", "status", "taskId", "userId" FROM "WorkBlock";
DROP TABLE "WorkBlock";
ALTER TABLE "new_WorkBlock" RENAME TO "WorkBlock";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
