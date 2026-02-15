-- Publishing Hub Foundation (P25-A)
-- Creates: publishing_channels, content_variants, publications

-- Publishing Channel Registry
CREATE TABLE "publishing_channels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT,
    "accountAvatar" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPublishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "publishing_channels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "publishing_channels_userId_platform_accountId_key" ON "publishing_channels"("userId", "platform", "accountId");
CREATE INDEX "publishing_channels_userId_idx" ON "publishing_channels"("userId");

-- Content Variant (platform-adapted version)
CREATE TABLE "content_variants" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channelId" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "callToAction" TEXT,
    "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaType" TEXT,
    "thumbnailUrl" TEXT,
    "charCount" INTEGER,
    "charLimit" INTEGER,
    "aspectRatio" TEXT,
    "threadParts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adaptationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "content_variants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "content_variants_contentId_idx" ON "content_variants"("contentId");
CREATE INDEX "content_variants_platform_idx" ON "content_variants"("platform");

-- Publication Record
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "variantId" TEXT,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "postUrl" TEXT,
    "postId" TEXT,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "packageData" JSONB,
    "impressions" INTEGER,
    "engagements" INTEGER,
    "clicks" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "publications_contentId_idx" ON "publications"("contentId");
CREATE INDEX "publications_userId_idx" ON "publications"("userId");
CREATE INDEX "publications_status_idx" ON "publications"("status");
CREATE INDEX "publications_channelId_idx" ON "publications"("channelId");

-- Foreign keys
ALTER TABLE "publications" ADD CONSTRAINT "publications_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "content_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publications" ADD CONSTRAINT "publications_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "publishing_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
