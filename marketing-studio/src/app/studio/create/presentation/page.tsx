'use client'

import { Presentation } from 'lucide-react'
import { MiaChat } from '@/components/studio/mia-chat'

export default function CreatePresentationPage() {
  return (
    <MiaChat
      mode="presentation"
      title="Create Presentation"
      subtitle="Mia will outline your slides with content and speaker notes"
      icon={Presentation}
      iconColor="bg-indigo-500"
      greeting="Hi! Let's build a presentation together. What's the topic? Who's the audience? And what's the goal? (Sales pitch, internal report, conference talk, training?) I'll create a slide-by-slide outline with content and talking points."
      suggestions={[
        'Create a sales pitch deck',
        'Build a quarterly business review',
        'Outline a conference presentation',
        'Design a product demo walkthrough',
      ]}
      contentType="POST"
    />
  )
}
