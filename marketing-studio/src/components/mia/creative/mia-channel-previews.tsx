'use client'

import { useState } from 'react'
import { Heart, MessageSquare, Share2, Bookmark, ThumbsUp, Repeat2, Send, Play, Music } from 'lucide-react'

interface ChannelPreviewProps {
  title: string
  body: string
  hashtags: string[]
  theme: 'light' | 'dark'
  mode: 'desktop' | 'mobile'
}

// ─── YouTube Preview ──────────────────────────────────────────────────────────

export function YouTubePreview({ title, body, hashtags, theme }: ChannelPreviewProps) {
  const isDark = theme === 'dark'
  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#0f0f0f]' : 'bg-white'}`}>
      {/* Red header */}
      <div className="bg-red-600 px-4 py-2.5 flex items-center gap-2">
        <Play className="w-5 h-5 text-white fill-white" />
        <span className="text-white font-bold text-sm">YouTube</span>
      </div>

      {/* Video description preview — shows actual content */}
      <div className="bg-slate-900 p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <Play className="w-4 h-4 text-purple-400" />
          <span className="text-purple-400 text-xs font-medium">Video Description Preview</span>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">
          {body || 'Your video description will appear here'}
        </p>
        <p className="text-slate-600 text-[10px] mt-2">Video will be rendered after publishing via Video Studio</p>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className={`font-bold text-base leading-snug mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {title || 'Untitled Video'}
        </h3>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <div>
            <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Your Channel</span>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>1.2K subscribers</p>
          </div>
          <button className="ml-auto bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
            SUBSCRIBE
          </button>
        </div>
        <p className={`text-sm line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {body}
        </p>
        {hashtags.length > 0 && (
          <p className="text-sm text-blue-600 mt-2">{hashtags.map((t) => `#${t}`).join(' ')}</p>
        )}
      </div>
    </div>
  )
}

// ─── LinkedIn Post Body with Show Full Content toggle ────────────────────────

function LinkedInPostBody({ title, body, isDark }: { title: string; body: string; isDark: boolean }) {
  const [showFull, setShowFull] = useState(false)
  const shouldTruncate = body.length > 300

  return (
    <>
      {title && (
        <h4 className={`font-bold text-sm mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h4>
      )}
      <div className="relative">
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${!showFull && shouldTruncate ? 'line-clamp-3' : ''} ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {body}
        </p>
        {shouldTruncate && (
          <button
            onClick={() => setShowFull(!showFull)}
            className="text-sm text-blue-600 font-medium hover:underline mt-1"
          >
            {showFull ? '← Show less' : 'Show full content ↓'}
          </button>
        )}
        {!shouldTruncate && body.length > 0 && null}
      </div>
    </>
  )
}

// ─── LinkedIn Preview ─────────────────────────────────────────────────────────

export function LinkedInPreview({ title, body, hashtags, theme }: ChannelPreviewProps) {
  const isDark = theme === 'dark'
  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-[#1b1f23]' : 'bg-white'}`}>
      {/* Blue header */}
      <div className="bg-[#0A66C2] px-4 py-2.5 flex items-center gap-2">
        <span className="text-white font-bold text-sm">LinkedIn</span>
      </div>

      <div className="p-4">
        {/* Profile card */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
            A
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Your Name</span>
              <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>· 1st</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Your Professional Headline</p>
            <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Just now · 🌐</p>
          </div>
        </div>

        {/* Post content */}
        <LinkedInPostBody title={title} body={body} isDark={isDark} />

        {hashtags.length > 0 && (
          <p className="text-sm text-blue-600 mt-2">{hashtags.map((t) => `#${t}`).join(' ')}</p>
        )}

        {/* Reaction bar */}
        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center gap-1 mb-3">
            <span className="flex -space-x-1">
              <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white">👍</span>
              <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] text-white">❤️</span>
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>0</span>
          </div>
          <div className="flex items-center justify-between">
            {[
              { icon: ThumbsUp, label: 'Like' },
              { icon: MessageSquare, label: 'Comment' },
              { icon: Repeat2, label: 'Repost' },
              { icon: Send, label: 'Send' },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── X/Twitter Preview ────────────────────────────────────────────────────────

export function XTwitterPreview({ body, hashtags, theme }: ChannelPreviewProps) {
  const isDark = theme === 'dark'
  const displayText = body.length > 280 ? body.slice(0, 277) + '...' : body
  const fullText = hashtags.length > 0 ? `${displayText}\n\n${hashtags.map((t) => `#${t}`).join(' ')}` : displayText

  return (
    <div className={`rounded-2xl overflow-hidden ${isDark ? 'bg-black' : 'bg-white'}`}>
      {/* Header */}
      <div className={`px-4 py-2.5 flex items-center gap-2 ${isDark ? 'bg-slate-900' : 'bg-slate-800'}`}>
        <span className="text-white font-bold text-sm">𝕏</span>
      </div>

      <div className="p-4">
        {/* Author line */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            A
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Your Name</span>
              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>@handle · now</span>
            </div>

            {/* Tweet text */}
            <p className={`text-sm mt-1 whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {fullText}
            </p>
            {body.length > 280 && (
              <span className="text-xs text-blue-500">Show more</span>
            )}

            {/* Engagement bar */}
            <div className={`flex items-center justify-between mt-3 pt-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              {[
                { icon: MessageSquare, count: '0' },
                { icon: Repeat2, count: '0' },
                { icon: Heart, count: '0' },
                { icon: Bookmark, count: '' },
                { icon: Share2, count: '' },
              ].map(({ icon: Icon, count }, i) => (
                <button key={i} className={`flex items-center gap-1 text-xs hover:text-blue-400 transition-colors`}>
                  <Icon className="w-4 h-4" />
                  {count && <span>{count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TikTok Preview ───────────────────────────────────────────────────────────

export function TikTokPreview({ body, hashtags, theme }: ChannelPreviewProps) {
  const displayText = body.length > 150 ? body.slice(0, 147) + '...' : body

  return (
    <div className="rounded-2xl overflow-hidden bg-black max-w-[320px] mx-auto">
      {/* Phone frame style — vertical */}
      <div className="relative aspect-[9/16] bg-gradient-to-b from-slate-900 to-black flex flex-col justify-end">
        {/* Script text preview */}
        <div className="absolute inset-x-0 top-8 px-6">
          <div className="flex items-center gap-1.5 mb-2">
            <Play className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-400 text-[10px] font-medium">Script Preview</span>
          </div>
          <p className="text-white/70 text-xs leading-relaxed line-clamp-6">
            {body || 'Your video script will appear here'}
          </p>
        </div>

        {/* Right sidebar — engagement icons */}
        <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
          {[
            { icon: Heart, label: '0', color: 'text-white' },
            { icon: MessageSquare, label: '0', color: 'text-white' },
            { icon: Bookmark, label: '0', color: 'text-white' },
            { icon: Share2, label: '0', color: 'text-white' },
          ].map(({ icon: Icon, label, color }, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Icon className={`w-6 h-6 ${color}`} />
              <span className="text-[10px] text-white">{label}</span>
            </div>
          ))}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-white animate-spin" style={{ animationDuration: '3s' }}>
            <Music className="w-4 h-4 text-white m-1.5" />
          </div>
        </div>

        {/* Bottom overlay text */}
        <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <p className="text-white font-semibold text-sm mb-1">@yourhandle</p>
          <p className="text-white text-xs leading-relaxed mb-2">{displayText}</p>
          {hashtags.length > 0 && (
            <p className="text-xs text-blue-300">{hashtags.map((t) => `#${t}`).join(' ')}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <Music className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white">Original Sound — @yourhandle</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Channel Preview Router ───────────────────────────────────────────────────

interface MiaChannelPreviewsProps {
  channelId: string
  title: string
  body: string
  hashtags: string[]
  theme: 'light' | 'dark'
  mode: 'desktop' | 'mobile'
}

export function MiaChannelPreview({ channelId, title, body, hashtags, theme, mode }: MiaChannelPreviewsProps) {
  const props: ChannelPreviewProps = { title, body, hashtags, theme, mode }
  const channel = channelId.toLowerCase()

  if (channel === 'youtube' || channel === 'yt') {
    return <YouTubePreview {...props} />
  }
  if (channel === 'linkedin' || channel === 'li') {
    return <LinkedInPreview {...props} />
  }
  if (channel === 'x_twitter' || channel === 'twitter' || channel === 'x') {
    return <XTwitterPreview {...props} />
  }
  if (channel === 'tiktok' || channel === 'tt') {
    return <TikTokPreview {...props} />
  }

  // Fallback — generic preview
  return (
    <div className={`rounded-2xl overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5">
        <span className="text-white font-bold text-sm">{channelId}</span>
      </div>
      <div className="p-4">
        {title && (
          <h3 className={`font-bold text-base mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
        )}
        <p className={`text-sm whitespace-pre-wrap leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
          {body}
        </p>
        {hashtags.length > 0 && (
          <p className="text-sm text-purple-600 mt-2">{hashtags.map((t) => `#${t}`).join(' ')}</p>
        )}
      </div>
    </div>
  )
}
