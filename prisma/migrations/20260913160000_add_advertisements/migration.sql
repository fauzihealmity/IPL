CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "targetUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Advertisement_isActive_idx" ON "Advertisement"("isActive");
CREATE INDEX "Advertisement_startAt_idx" ON "Advertisement"("startAt");
CREATE INDEX "Advertisement_endAt_idx" ON "Advertisement"("endAt");
CREATE INDEX "Advertisement_sortOrder_idx" ON "Advertisement"("sortOrder");
