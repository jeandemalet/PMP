-- AlterTable
ALTER TABLE "users" ADD COLUMN "preferences" JSONB;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "tags" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "galleryId" TEXT,
    CONSTRAINT "images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "images_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "galleries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_images" ("alt", "caption", "description", "filename", "galleryId", "height", "id", "mimeType", "originalName", "path", "size", "tags", "title", "updatedAt", "uploadedAt", "userId", "width") SELECT "alt", "caption", "description", "filename", "galleryId", "height", "id", "mimeType", "originalName", "path", "size", "tags", "title", "updatedAt", "uploadedAt", "userId", "width" FROM "images";
DROP TABLE "images";
ALTER TABLE "new_images" RENAME TO "images";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
