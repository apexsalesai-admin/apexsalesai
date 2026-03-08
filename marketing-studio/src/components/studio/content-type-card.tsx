'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { type LucideIcon } from 'lucide-react'

interface ContentTypeCardProps {
  title: string
  description: string
  icon: LucideIcon
  color: string
  href: string
  badge?: string
}

export function ContentTypeCard({
  title,
  description,
  icon: Icon,
  color,
  href,
  badge,
}: ContentTypeCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col items-center p-8 rounded-2xl border border-slate-200',
        'bg-white hover:shadow-lg hover:border-slate-300 transition-all duration-200',
        'cursor-pointer text-center'
      )}
    >
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mb-4',
          'group-hover:scale-110 transition-transform duration-200',
          color
        )}
      >
        <Icon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
      {badge && (
        <span className="absolute top-4 right-4 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}
