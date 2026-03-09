'use client'

import {
  FileText,
  Video,
  Image,
  Mail,
  BookOpen,
  Megaphone,
  Presentation,
  Sparkles,
} from 'lucide-react'
import { ContentTypeCard } from '@/components/studio/content-type-card'

const CONTENT_TYPES = [
  {
    title: 'Social Post',
    description: 'LinkedIn, X, Reddit, YouTube, TikTok',
    icon: FileText,
    color: 'bg-blue-500',
    href: '/studio/content/new',
  },
  {
    title: 'Article',
    description: 'Blog posts, thought leadership, long-form',
    icon: BookOpen,
    color: 'bg-emerald-500',
    href: '/studio/content/new?type=article',
  },
  {
    title: 'Email',
    description: 'Outreach, newsletters, sequences',
    icon: Mail,
    color: 'bg-amber-500',
    href: '/studio/content/new?type=article',
  },
  {
    title: 'Video',
    description: 'Scripts, storyboards, AI generation',
    icon: Video,
    color: 'bg-red-500',
    href: '/studio/video',
  },
  {
    title: 'Image',
    description: 'AI illustrations with DALL-E',
    icon: Image,
    color: 'bg-pink-500',
    href: '/studio/content/new?type=image',
  },
  {
    title: 'Campaign',
    description: 'Multi-channel content strategy',
    icon: Megaphone,
    color: 'bg-purple-500',
    href: '/studio/content/new?type=campaign',
    badge: 'Pro',
  },
  {
    title: 'Presentation',
    description: 'Slides, pitch decks, reports',
    icon: Presentation,
    color: 'bg-indigo-500',
    href: '/studio/content/new?type=article',
  },
  {
    title: 'Repurpose',
    description: 'Turn one piece into many',
    icon: Sparkles,
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    href: '/studio/repurpose',
  },
]

export default function CreatePage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          What do you want to create?
        </h1>
        <p className="text-lg text-slate-500">
          Choose a content type. Mia will guide you through the rest.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {CONTENT_TYPES.map((type) => (
          <ContentTypeCard key={type.title} {...type} />
        ))}
      </div>
    </div>
  )
}
