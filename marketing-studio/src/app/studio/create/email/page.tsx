'use client'

import { Mail } from 'lucide-react'
import { MiaChat } from '@/components/studio/mia-chat'

export default function CreateEmailPage() {
  return (
    <MiaChat
      mode="email"
      title="Create Email"
      subtitle="Mia will craft the perfect email for any purpose"
      icon={Mail}
      iconColor="bg-amber-500"
      greeting="Hi! Let's write an email together. What kind of email do you need? (Outreach, newsletter, follow-up, announcement, or something else?) Tell me who it's for and I'll draft it."
      suggestions={[
        'Write a cold outreach email',
        'Draft a product announcement',
        'Help me write a follow-up email',
        'Create a newsletter intro',
      ]}
      contentType="POST"
    />
  )
}
