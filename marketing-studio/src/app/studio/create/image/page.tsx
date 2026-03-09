'use client'

import { Image as ImageIcon } from 'lucide-react'
import { MiaChat } from '@/components/studio/mia-chat'

export default function CreateImagePage() {
  return (
    <MiaChat
      mode="image"
      title="Create Image"
      subtitle="Mia will generate optimized AI image prompts"
      icon={ImageIcon}
      iconColor="bg-pink-500"
      greeting="Hi! I'll help you create the perfect image. Describe what you want to see, and I'll generate detailed prompts optimized for DALL-E, Midjourney, or ChatGPT image generation. Tell me: What kind of image do you need?"
      suggestions={[
        'Create a hero image for a blog post about AI',
        'Design a social media banner for a product launch',
        'Generate a professional headshot background',
        'Create an illustration for a tech article',
      ]}
      contentType="POST"
    />
  )
}
