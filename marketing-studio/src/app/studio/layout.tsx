'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Settings,
  FileText,
  Bell,
  ChevronDown,
  Calendar,
  Video,
  Zap,
  BarChart3,
  Sparkles,
  FlaskConical,
  CheckCircle,
  LogOut,
  Plug,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StudioStatusBanner } from '@/components/ui/studio-status-banner'
import { FadeTransition } from '@/components/ui/page-transition'
import { CommandPalette } from '@/components/ui/command-palette'
import { MiaProvider } from '@/components/providers/mia-provider'
import { MiaTrigger } from '@/components/ui/mia-trigger'

const NAV_ITEMS = [
  { href: '/studio', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/studio/content', label: 'Content', icon: FileText },
  { href: '/studio/approvals', label: 'Approvals', icon: CheckCircle, badge: '3' },
  { href: '/studio/content/calendar', label: 'Calendar', icon: Calendar },
  { href: '/studio/video', label: 'Video Studio', icon: Video, badge: 'Pro' },
  { href: '/studio/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/studio/labs', label: 'Labs', icon: FlaskConical, badge: 'New' },
  { href: '/studio/integrations', label: 'Integrations', icon: Zap },
  { href: '/studio/settings/providers', label: 'Video Providers', icon: Plug },
  { href: '/studio/settings', label: 'Settings', icon: Settings },
]

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const userName = session?.user?.name || 'User'
  const userEmail = session?.user?.email || ''
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <MiaProvider>
    <div className="min-h-screen bg-slate-50">
      {/* Status Banners (Demo Mode + AI Config) */}
      <StudioStatusBanner />
      {/* Top header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
              L
            </div>
            <div className="flex items-center">
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Lyfye
              </span>
              <span className="text-slate-300 mx-2">|</span>
              <span className="text-slate-600 font-medium">Marketing Studio</span>
              <span className="ml-2 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-medium">
                Pro
              </span>
            </div>
          </Link>

          <div className="flex items-center space-x-4">
            {/* Command Palette Trigger */}
            <CommandPalette />

            {/* AI Status / Mia Trigger */}
            <MiaTrigger />

            {/* Notifications */}
            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-3 px-3 py-1.5 rounded-lg">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={userName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    {userInitial}
                  </div>
                )}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">{userName}</p>
                  <p className="text-xs text-slate-500">{userEmail || 'Pro Plan'}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-61px)] sticky top-[61px]">
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-all duration-200',
                    active
                      ? 'bg-purple-50 text-purple-700 border-l-2 border-purple-500 -ml-[2px] pl-[14px]'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={cn('w-5 h-5', active && 'text-purple-600')} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full font-medium">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* AI Assistant */}
          <div className="p-4 border-t border-slate-200 mt-4">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Mia</p>
                  <p className="text-xs text-slate-500">AI Content Strategist</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Ready to create amazing content with you!
              </p>
              <Link
                href="/studio/content/new"
                className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium text-center block hover:shadow-lg transition-shadow"
              >
                Create with Mia
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <SidebarStats />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          <FadeTransition>{children}</FadeTransition>
        </main>
      </div>
    </div>
    </MiaProvider>
  )
}

function SidebarStats() {
  const [stats, setStats] = useState<{
    postsCreated: number
    totalRenders: number
    integrationsConnected: number
  } | null>(null)

  useEffect(() => {
    fetch('/api/studio/dashboard/stats')
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStats({
            postsCreated: data.data.kpi.postsCreated,
            totalRenders: data.data.kpi.totalRenders,
            integrationsConnected: data.data.kpi.integrationsConnected,
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="p-4 border-t border-slate-200">
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
        This Month
      </h4>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Content Created</p>
          {stats ? (
            <p className="text-lg font-bold text-slate-900">{stats.postsCreated}</p>
          ) : (
            <div className="h-7 w-8 animate-pulse bg-slate-200 rounded" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Videos Rendered</p>
          {stats ? (
            <p className="text-lg font-bold text-purple-600">{stats.totalRenders}</p>
          ) : (
            <div className="h-7 w-8 animate-pulse bg-slate-200 rounded" />
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Integrations</p>
          {stats ? (
            <p className="text-lg font-bold text-emerald-600">{stats.integrationsConnected}</p>
          ) : (
            <div className="h-7 w-8 animate-pulse bg-slate-200 rounded" />
          )}
        </div>
      </div>
    </div>
  )
}
