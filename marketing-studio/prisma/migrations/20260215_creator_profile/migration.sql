-- CreateTable: creator_profiles (P24 — Creator Profile / Persona Engine)
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Profile',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    -- Voice
    "voicePreset" TEXT NOT NULL DEFAULT 'trusted-advisor',
    "voiceCustom" JSONB,

    -- Industry & Audience
    "role" TEXT NOT NULL DEFAULT '',
    "company" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT 'saas',
    "audienceRole" TEXT NOT NULL DEFAULT 'Decision Maker',
    "audienceSeniority" TEXT NOT NULL DEFAULT 'Manager',
    "complianceLevel" TEXT NOT NULL DEFAULT 'none',

    -- Strategy
    "primaryGoal" TEXT NOT NULL DEFAULT 'thought-leadership',
    "secondaryGoal" TEXT,
    "preferredChannels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentMix" JSONB,
    "postingFrequency" TEXT NOT NULL DEFAULT '3x/week',
    "competitorNames" TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Brand
    "brandName" TEXT NOT NULL DEFAULT '',
    "brandKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brandAvoid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brandColors" JSONB,
    "logoUrl" TEXT,

    -- Fact-checking
    "factCheckSensitivity" TEXT NOT NULL DEFAULT 'medium',

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_profiles_userId_idx" ON "creator_profiles"("userId");
CREATE INDEX "creator_profiles_userId_isDefault_idx" ON "creator_profiles"("userId", "isDefault");
