-- CreateTable
CREATE TABLE "Distance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromLat" REAL NOT NULL,
    "fromLng" REAL NOT NULL,
    "toLat" REAL NOT NULL,
    "toLng" REAL NOT NULL,
    "distance" REAL NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "idx_from_location" ON "Distance"("fromLat", "fromLng");

-- CreateIndex
CREATE INDEX "idx_to_location" ON "Distance"("toLat", "toLng");

-- CreateIndex
CREATE INDEX "idx_expires_at" ON "Distance"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_created_at" ON "Distance"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Distance_fromLat_fromLng_toLat_toLng_key" ON "Distance"("fromLat", "fromLng", "toLat", "toLng");
