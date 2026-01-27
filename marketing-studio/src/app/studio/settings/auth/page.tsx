'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Key,
  Globe,
  Lock,
} from 'lucide-react'

interface AuthDiagnostic {
  label: string
  value: string | boolean
  status: 'ok' | 'warning' | 'error' | 'info'
  hint?: string
}

export default function AuthDiagnosticsPage() {
  const { data: session, status } = useSession()
  const [diagnostics, setDiagnostics] = useState<AuthDiagnostic[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetchDiagnostics()
  }, [])

  const fetchDiagnostics = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/diagnostics/auth')
      const data = await res.json()
      setDiagnostics(data.diagnostics || [])
    } catch (error) {
      console.error('Failed to fetch diagnostics:', error)
    }
    setLoading(false)
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStatusIcon = (status: AuthDiagnostic['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Shield className="w-5 h-5 text-slate-400" />
    }
  }

  const getStatusBg = (status: AuthDiagnostic['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-emerald-50 border-emerald-200'
      case 'warning':
        return 'bg-amber-50 border-amber-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-slate-50 border-slate-200'
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/studio/settings"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Auth Diagnostics</h1>
            <p className="text-slate-600 mt-1">
              Debug authentication configuration and status
            </p>
          </div>
          <button
            onClick={fetchDiagnostics}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Current Session */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-purple-600" />
          Current Session
        </h2>
        {status === 'loading' ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        ) : session ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">User</span>
              <span className="text-sm font-medium text-slate-900">{session.user?.name || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Email</span>
              <span className="text-sm font-medium text-slate-900">{session.user?.email || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Provider</span>
              <span className="text-sm font-medium text-slate-900">{(session.user as any)?.provider || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Role</span>
              <span className="text-sm font-medium text-slate-900">{(session.user as any)?.role || 'VIEWER'}</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">No active session</p>
          </div>
        )}
      </section>

      {/* Diagnostics */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          Configuration Status
        </h2>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {diagnostics.map((diag, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${getStatusBg(diag.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(diag.status)}
                    <div>
                      <p className="font-medium text-slate-900">{diag.label}</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {typeof diag.value === 'boolean'
                          ? diag.value ? 'Enabled' : 'Disabled'
                          : diag.value}
                      </p>
                      {diag.hint && (
                        <p className="text-xs text-slate-500 mt-1">{diag.hint}</p>
                      )}
                    </div>
                  </div>
                  {typeof diag.value === 'string' && diag.value.length < 100 && (
                    <button
                      onClick={() => copyToClipboard(diag.value as string, diag.label)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded transition-colors"
                      title="Copy"
                    >
                      {copied === diag.label ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Callback URLs */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-600" />
          OAuth Callback URLs
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Configure these URLs in your OAuth provider settings:
        </p>
        <div className="space-y-3">
          {[
            { provider: 'Google', url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/google` },
            { provider: 'Microsoft', url: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback/azure-ad` },
          ].map(({ provider, url }) => (
            <div key={provider} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-900">{provider} Callback</p>
                <p className="text-xs text-slate-500 font-mono">{url}</p>
              </div>
              <button
                onClick={() => copyToClipboard(url, provider)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                {copied === provider ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Help */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="font-semibold text-blue-900 mb-2">Need Help?</h2>
        <p className="text-sm text-blue-700 mb-4">
          If authentication isn't working, check these common issues:
        </p>
        <ul className="text-sm text-blue-700 space-y-2">
          <li className="flex items-start gap-2">
            <Key className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Ensure NEXTAUTH_SECRET is set (generate with: openssl rand -base64 32)</span>
          </li>
          <li className="flex items-start gap-2">
            <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>NEXTAUTH_URL must match your deployment URL (e.g., https://studio.lyfye.com)</span>
          </li>
          <li className="flex items-start gap-2">
            <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>OAuth callback URLs must be configured in Google Cloud Console / Azure Portal</span>
          </li>
        </ul>
      </section>
    </div>
  )
}
