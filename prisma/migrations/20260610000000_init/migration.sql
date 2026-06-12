CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatar" TEXT,
    "coupleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Couple" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Couple_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coupleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coupleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coupleId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "coupleId" TEXT NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Couple_code_key" ON "Couple"("code");
CREATE INDEX "Memory_coupleId_createdAt_idx" ON "Memory"("coupleId", "createdAt" DESC);
CREATE INDEX "Journal_coupleId_createdAt_idx" ON "Journal"("coupleId", "createdAt" DESC);
CREATE INDEX "Event_coupleId_eventDate_idx" ON "Event"("coupleId", "eventDate" ASC);
CREATE INDEX "Note_coupleId_updatedAt_idx" ON "Note"("coupleId", "updatedAt" DESC);
CREATE UNIQUE INDEX "Note_one_pinned_per_couple_idx" ON "Note"("coupleId") WHERE "isPinned" = true;

ALTER TABLE "User"
    ADD CONSTRAINT "User_coupleId_fkey"
    FOREIGN KEY ("coupleId") REFERENCES "Couple"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "Couple"
    ADD CONSTRAINT "Couple_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "Memory"
    ADD CONSTRAINT "Memory_coupleId_fkey"
    FOREIGN KEY ("coupleId") REFERENCES "Couple"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Memory"
    ADD CONSTRAINT "Memory_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Journal"
    ADD CONSTRAINT "Journal_coupleId_fkey"
    FOREIGN KEY ("coupleId") REFERENCES "Couple"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Journal"
    ADD CONSTRAINT "Journal_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Event"
    ADD CONSTRAINT "Event_coupleId_fkey"
    FOREIGN KEY ("coupleId") REFERENCES "Couple"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE "Note"
    ADD CONSTRAINT "Note_coupleId_fkey"
    FOREIGN KEY ("coupleId") REFERENCES "Couple"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
