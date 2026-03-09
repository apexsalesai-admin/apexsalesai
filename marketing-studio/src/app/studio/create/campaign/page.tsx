'use client'

import { Megaphone } from 'lucide-react'
import { MiaChat } from '@/components/studio/mia-chat'

export default function CreateCampaignPage() {
  return (
    <MiaChat
      mode="campaign"
      title="Create Campaign"
      subtitle="Mia will plan and generate a multi-channel content strategy"
      icon={Megaphone}
      iconColor="bg-purple-500"
      greeting="Hi! Let's build a content campaign together. Tell me: What's the campaign goal? Who's the audience? Which platforms do you want to target? (LinkedIn, X, Reddit, YouTube, Email) I'll create a full campaign plan with content for each channel."
      suggestions={[
        'Launch campaign for a new product',
        'Build thought leadership on LinkedIn',
        'Run a 2-week awareness campaign',
        'Create a cross-platform content blitz',
      ]}
      contentType="POST"
    />
  )
}
