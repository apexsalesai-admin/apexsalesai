'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react'

type Providers = Awaited<ReturnType<typeof getProviders>>

function LoginContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/studio'
  const error = searchParams.get('error')

  const [providers, setProviders] = useState<Providers>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState<string | null>(null)

  useEffect(() => {
    getProviders().then((p) => {
      setProviders(p)
      setLoading(false)
    })
  }, [])

  const handleSignIn = async (providerId: string) => {
    setSigningIn(providerId)
    await signIn(providerId, { callbackUrl })
  }

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )
      case 'azure-ad':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M11.4 24H0V12.6L11.4 0v24zM24 24H12.6V10.8L24 0v24z"
            />
          </svg>
        )
      case 'demo':
        return <Sparkles className="w-5 h-5" />
      default:
        return null
    }
  }

  const getProviderLabel = (providerId: string, name: string) => {
    switch (providerId) {
      case 'google':
        return 'Continue with Google'
      case 'azure-ad':
        return 'Continue with Microsoft'
      case 'demo':
        return 'Enter Demo Mode'
      default:
        return `Continue with ${name}`
    }
  }

  const getProviderStyle = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-300'
      case 'azure-ad':
        return 'bg-[#0078D4] text-white hover:bg-[#106EBE]'
      case 'demo':
        return 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
      default:
        return 'bg-gray-800 text-white hover:bg-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Lyfye Marketing Studio
          </h1>
          <p className="text-gray-400">
            AI-powered content creation and publishing
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-8">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Sign in to continue
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Authentication Error</p>
                <p className="text-red-400/80 text-sm mt-1">
                  {error === 'OAuthSignin'
                    ? 'Error starting OAuth flow. Please try again.'
                    : error === 'OAuthCallback'
                      ? 'Error during OAuth callback. Please try again.'
                      : error === 'OAuthAccountNotLinked'
                        ? 'This email is already linked to another account.'
                        : 'An error occurred. Please try again.'}
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : providers && Object.keys(providers).length > 0 ? (
            <div className="space-y-3">
              {Object.values(providers).map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleSignIn(provider.id)}
                  disabled={signingIn !== null}
                  className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getProviderStyle(provider.id)}`}
                >
                  {signingIn === provider.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    getProviderIcon(provider.id)
                  )}
                  {getProviderLabel(provider.id, provider.name)}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-400 font-medium">
                Authentication Not Available
              </p>
              <p className="text-gray-400 text-sm mt-2">
                No OAuth providers are configured. Please contact your
                administrator to configure Google or Microsoft authentication.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          By signing in, you agree to our{' '}
          <a href="#" className="text-cyan-500 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-cyan-500 hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
