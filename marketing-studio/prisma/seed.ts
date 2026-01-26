import { PrismaClient, StudioWorkspaceRole, ContentStatus, ContentType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Lyfye Marketing Studio database...')

  // Create a demo workspace
  const workspace = await prisma.studioWorkspace.upsert({
    where: { slug: 'lyfye-demo' },
    update: {},
    create: {
      name: 'Lyfye Demo',
      slug: 'lyfye-demo',
      primaryColor: '#8b5cf6',
      settings: {
        timezone: 'America/New_York',
        defaultScheduleTime: '09:00',
      },
      features: {
        videoGeneration: true,
        aiContent: true,
        approvalWorkflows: true,
      },
      maxUsers: 10,
      maxContent: 1000,
    },
  })
  console.log('Created workspace:', workspace.name)

  // Create brand guardrails for the workspace
  await prisma.studioBrandGuardrails.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      voiceTones: ['Professional', 'Friendly', 'Authoritative'],
      writingStyle: 'Clear, concise, and action-oriented',
      bannedClaims: ['guaranteed results', '100% success rate', 'instant ROI'],
      complianceRules: ['Include disclaimer for financial projections', 'No competitor comparisons'],
      doNotSayList: ['competitor names', 'outdated product features'],
      ctaStyle: 'action-oriented',
      ctaExamples: ['Start your free trial', 'Book a demo', 'See it in action'],
      targetAudiences: [
        { name: 'Marketing Managers', traits: ['busy', 'results-focused', 'tech-savvy'] },
        { name: 'Small Business Owners', traits: ['budget-conscious', 'time-limited'] },
      ],
    },
  })
  console.log('Created brand guardrails')

  // Create demo content items using existing ScheduledContent model
  const demoContent = [
    {
      id: 'content_demo_1',
      title: 'Q1 Product Launch Announcement',
      body: 'We are excited to announce our Q1 product launch! Join us for an exclusive reveal of our latest innovations that will transform how you work...',
      contentType: 'VIDEO' as ContentType,
      aiGenerated: true,
      aiTopic: 'Product Launch',
      aiTone: 'Exciting',
      hashtags: ['ProductLaunch', 'Innovation', 'Q1Launch'],
      callToAction: 'Watch the full reveal',
      channels: ['YOUTUBE', 'LINKEDIN'],
      status: 'PENDING_APPROVAL' as ContentStatus,
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdById: 'demo_user_1',
    },
    {
      id: 'content_demo_2',
      title: 'Weekly Tips: Productivity Hacks for Remote Teams',
      body: 'Working remotely? Here are 5 productivity hacks that our team swears by...',
      contentType: 'POST' as ContentType,
      aiGenerated: true,
      aiTopic: 'Remote Work',
      aiTone: 'Helpful',
      hashtags: ['RemoteWork', 'ProductivityTips', 'TeamWork'],
      callToAction: 'Try these tips today',
      channels: ['X_TWITTER', 'LINKEDIN'],
      status: 'DRAFT' as ContentStatus,
      createdById: 'demo_user_2',
    },
  ]

  for (const content of demoContent) {
    await prisma.scheduledContent.upsert({
      where: { id: content.id },
      update: {},
      create: content,
    })
  }
  console.log('Created demo content items')

  // Seed model registry with available AI models
  const aiModels = [
    {
      provider: 'anthropic',
      modelId: 'claude-3-opus-20240229',
      displayName: 'Claude 3 Opus',
      capabilities: ['text', 'vision', 'function_calling'],
      tier: 'premium',
      inputPricePer1M: 15.0,
      outputPricePer1M: 75.0,
      maxInputTokens: 200000,
      maxOutputTokens: 4096,
      isEnabled: true,
      isDefault: false,
      sortOrder: 1,
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-sonnet-20240229',
      displayName: 'Claude 3 Sonnet',
      capabilities: ['text', 'vision', 'function_calling'],
      tier: 'balanced',
      inputPricePer1M: 3.0,
      outputPricePer1M: 15.0,
      maxInputTokens: 200000,
      maxOutputTokens: 4096,
      isEnabled: true,
      isDefault: true,
      sortOrder: 2,
    },
    {
      provider: 'anthropic',
      modelId: 'claude-3-haiku-20240307',
      displayName: 'Claude 3 Haiku',
      capabilities: ['text', 'vision', 'function_calling'],
      tier: 'fast',
      inputPricePer1M: 0.25,
      outputPricePer1M: 1.25,
      maxInputTokens: 200000,
      maxOutputTokens: 4096,
      isEnabled: true,
      isDefault: false,
      sortOrder: 3,
    },
    {
      provider: 'openai',
      modelId: 'gpt-4-turbo-preview',
      displayName: 'GPT-4 Turbo',
      capabilities: ['text', 'vision', 'function_calling'],
      tier: 'premium',
      inputPricePer1M: 10.0,
      outputPricePer1M: 30.0,
      maxInputTokens: 128000,
      maxOutputTokens: 4096,
      isEnabled: true,
      isDefault: false,
      sortOrder: 4,
    },
    {
      provider: 'openai',
      modelId: 'gpt-3.5-turbo',
      displayName: 'GPT-3.5 Turbo',
      capabilities: ['text', 'function_calling'],
      tier: 'fast',
      inputPricePer1M: 0.5,
      outputPricePer1M: 1.5,
      maxInputTokens: 16385,
      maxOutputTokens: 4096,
      isEnabled: true,
      isDefault: false,
      sortOrder: 5,
    },
  ]

  for (const model of aiModels) {
    await prisma.studioModelRegistry.upsert({
      where: {
        provider_modelId: {
          provider: model.provider,
          modelId: model.modelId,
        },
      },
      update: {},
      create: model,
    })
  }
  console.log('Seeded AI model registry')

  console.log('\nSeed completed successfully!')
  console.log('Demo workspace: lyfye-demo')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
