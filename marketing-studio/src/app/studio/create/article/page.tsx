'use client'

import { BookOpen } from 'lucide-react'
import { MiaChat } from '@/components/studio/mia-chat'

export default function CreateArticlePage() {
  return (
    <MiaChat
      mode="article"
      title="Create Article"
      subtitle="Mia will research, write, and help you refine"
      icon={BookOpen}
      iconColor="bg-emerald-500"
      greeting="Hi! I'm ready to help you write a compelling article. What topic would you like to explore? I'll research it, craft the structure, and write the full piece for you."
      suggestions={[
        'Write an article about AI in marketing',
        'Help me write a thought leadership piece',
        'I need a blog post about our product launch',
        'Write about industry trends in my space',
      ]}
      contentType="POST"
    />
  )
}
