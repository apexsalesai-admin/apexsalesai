'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Zap,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'

interface Provider {
  id: string
  name: string
  configured: boolean
  status: 'ready' | 'error' | 'unconfigured'
  message?: string
  latencyMs?: number
}

interface StatusResponse {
  success: boolean
  data: {
    providers: Provider[]
    defaultProvider: string
    fallbackProvider: string
    anyConfigured: boolean
  }
}

interface TestResult {
  success: boolean
  message?: string
  error?: string
  latencyMs?: number
}

export default function AISettingsPage() {
  const [status, setStatus] = useState<StatusResponse['data'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [copied, setCopied] = useState<string | null>(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ai/status')
      const data = await res.json()
      if (data.success) {
        setStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch AI status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const testProvider = async (providerId: string) => {
    setTesting(providerId)
    setTestResults((prev) => ({ ...prev, [providerId]: { success: false } }))

    try {
      const res = await fetch('/api/ai/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId }),
      })
      const result = await res.json()
      setTestResults((prev) => ({ ...prev, [providerId]: result }))
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          error: error instanceof Error ? error.message : 'Test failed',
        },
      }))
    } finally {
      setTesting(null)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStatusIcon = (provider: Provider) => {
    if (!provider.configured) {
      return <AlertTriangle className="w-5 h-5 text-amber-500" />
    }
    const result = testResults[provider.id]
    if (result?.success) {
      return <CheckCircle className="w-5 h-5 text-emerald-500" />
    }
    if (result?.success === false && result.error) {
      return <XCircle className="w-5 h-5 text-red-500" />
    }
    return <CheckCircle className="w-5 h-5 text-emerald-500" />
  }

  const getEnvVarName = (providerId: string) => {
    return providerId === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'
  }

  const getDocsUrl = (providerId: string) => {
    return providerId === 'anthropic'
      ? 'https://console.anthropic.com/'
      : 'https://platform.openai.com/api-keys'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
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
            <h1 className="text-2xl font-bold text-slate-900">AI Providers</h1>
            <p className="text-slate-600 mt-1">
              Configure AI providers for content generation
            </p>
          </div>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {!status?.anyConfigured && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">No AI Provider Configured</p>
            <p className="text-amber-700 text-sm mt-1">
              You need at least one AI provider to generate content. Add your API key below.
            </p>
          </div>
        </div>
      )}

      {/* Provider Cards */}
      <div className="space-y-4">
        {status?.providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-white rounded-xl border border-slate-200 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                {getStatusIcon(provider)}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                    {status.defaultProvider === provider.id && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                    {status.fallbackProvider === provider.id &&
                      status.defaultProvider !== provider.id && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          Fallback
                        </span>
                      )}
                  </div>
                  <p
                    className={`text-sm mt-1 ${
                      provider.configured ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {provider.message}
                  </p>

                  {/* Test Result */}
                  {testResults[provider.id] && (
                    <div
                      className={`mt-3 p-3 rounded-lg text-sm ${
                        testResults[provider.id].success
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {testResults[provider.id].success ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            {testResults[provider.id].message} (
                            {testResults[provider.id].latencyMs}ms)
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4" />
                          <span>{testResults[provider.id].error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {provider.configured ? (
                  <button
                    onClick={() => testProvider(provider.id)}
                    disabled={testing === provider.id}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {testing === provider.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Test
                  </button>
                ) : (
                  <a
                    href={getDocsUrl(provider.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    Get API Key
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Setup Instructions (for unconfigured providers) */}
            {!provider.configured && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-600 mb-2">
                  Add this environment variable to your Vercel project:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-sm font-mono text-slate-700">
                    {getEnvVarName(provider.id)}=sk-...
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(getEnvVarName(provider.id), provider.id)
                    }
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {copied === provider.id ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Go to{' '}
                  <a
                    href="https://vercel.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    Vercel Dashboard
                  </a>{' '}
                  → Your Project → Settings → Environment Variables → Add
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Help Section */}
      <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-2">How AI Providers Work</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Default Provider</strong> ({status?.defaultProvider}) is used for
              all content generation
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Fallback Provider</strong> ({status?.fallbackProvider}) is used
              automatically if the default fails
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>
              You can also select a specific provider when generating content
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
