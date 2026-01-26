'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduledContent {
  id: string
  title: string
  channels: string[]
  status: string
  scheduledFor: string | null
  contentType: string
  body: string
}

const CHANNEL_COLORS: Record<string, string> = {
  YOUTUBE: 'bg-red-500',
  TIKTOK: 'bg-slate-900',
  LINKEDIN: 'bg-blue-600',
  X_TWITTER: 'bg-slate-700',
  FACEBOOK: 'bg-blue-500',
  INSTAGRAM: 'bg-gradient-to-r from-purple-500 to-pink-500',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

interface ContentCalendarProps {
  onCreateContent?: (date: Date) => void
  onSelectContent?: (content: ScheduledContent) => void
}

export function ContentCalendar({ onCreateContent, onSelectContent }: ContentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [scheduledContent, setScheduledContent] = useState<ScheduledContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Fetch content from API
  const fetchContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Get date range for current month view (includes overflow days)
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month + 2, 0)

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })

      const response = await fetch(`/api/content?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch content')
      }

      setScheduledContent(data.data || [])
    } catch (err) {
      console.error('Error fetching content:', err)
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setIsLoading(false)
    }
  }, [year, month])

  // Fetch content when month changes
  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Navigate months
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  // Get content for a specific date
  const getContentForDate = (date: Date): ScheduledContent[] => {
    return scheduledContent.filter(content => {
      if (!content.scheduledFor) return false
      const contentDate = new Date(content.scheduledFor)
      return contentDate.getFullYear() === date.getFullYear() &&
             contentDate.getMonth() === date.getMonth() &&
             contentDate.getDate() === date.getDate()
    })
  }

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate()
  }

  // Get primary channel color (first channel in array)
  const getChannelColor = (channels: string[]): string => {
    if (channels.length === 0) return 'bg-slate-500'
    return CHANNEL_COLORS[channels[0]] || 'bg-slate-500'
  }

  // Build calendar grid
  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = []

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    })
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    })
  }

  // Next month days to fill grid
  const remainingDays = 42 - calendarDays.length
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    })
  }

  return (
    <div className="card p-0 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-slate-900">
            {MONTHS[month]} {year}
          </h2>
          <button
            onClick={goToToday}
            className="text-sm text-apex-primary hover:underline font-medium"
          >
            Today
          </button>
          {isLoading && (
            <Loader2 className="w-4 h-4 text-apex-primary animate-spin" />
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm border-b border-red-200">
          {error}
          <button
            onClick={fetchContent}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {DAYS.map(day => (
          <div key={day} className="p-3 text-center text-sm font-semibold text-slate-500 bg-slate-50">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map(({ date, isCurrentMonth }, index) => {
          const dayContent = getContentForDate(date)
          const today = isToday(date)
          const isSelected = selectedDate?.getTime() === date.getTime()

          return (
            <div
              key={index}
              onClick={() => setSelectedDate(date)}
              className={cn(
                'min-h-[120px] p-2 border-b border-r border-slate-100 cursor-pointer transition-colors group',
                !isCurrentMonth && 'bg-slate-50',
                isSelected && 'bg-apex-primary/5 ring-2 ring-apex-primary ring-inset',
                !isSelected && 'hover:bg-slate-50'
              )}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium',
                  today && 'bg-apex-primary text-white',
                  !today && isCurrentMonth && 'text-slate-900',
                  !today && !isCurrentMonth && 'text-slate-400'
                )}>
                  {date.getDate()}
                </span>
                {isCurrentMonth && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCreateContent?.(date)
                    }}
                    className={cn(
                      'w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-apex-primary hover:text-white transition-all',
                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Content Items */}
              <div className="space-y-1">
                {dayContent.slice(0, 3).map(content => (
                  <button
                    key={content.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectContent?.(content)
                    }}
                    className={cn(
                      'w-full text-left px-2 py-1 rounded text-xs font-medium text-white truncate transition-opacity',
                      getChannelColor(content.channels),
                      content.status === 'DRAFT' && 'opacity-60'
                    )}
                    title={`${content.title} (${content.status})`}
                  >
                    {content.title}
                  </button>
                ))}
                {dayContent.length > 3 && (
                  <p className="text-xs text-slate-500 px-2">
                    +{dayContent.length - 3} more
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 p-4 border-t border-slate-200 bg-slate-50">
        {Object.entries(CHANNEL_COLORS).slice(0, 4).map(([channel, color]) => (
          <div key={channel} className="flex items-center space-x-2">
            <div className={cn('w-3 h-3 rounded', color)} />
            <span className="text-xs text-slate-600">{channel.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
