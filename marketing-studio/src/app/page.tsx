import Link from 'next/link'
import { ArrowRight, Shield, BarChart3, Workflow, Sparkles, Video, Zap, Globe, Play, CheckCircle, FlaskConical } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                L
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Lyfye</span>
                <span className="text-slate-400 mx-2">|</span>
                <span className="text-white font-medium">Marketing Studio</span>
              </div>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/studio/labs" className="text-slate-300 hover:text-white transition-colors font-medium flex items-center space-x-1">
                <FlaskConical className="w-4 h-4" />
                <span>Labs</span>
              </Link>
              <Link href="/studio" className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all flex items-center space-x-2">
                <span>Open Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center relative">
        {/* Gradient orbs */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <div className="w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] absolute -top-20"></div>
          <div className="w-[400px] h-[400px] bg-pink-600/20 rounded-full blur-[100px] absolute top-40 -right-20"></div>
        </div>

        <div className="relative">
          <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-purple-300 mb-8 border border-purple-500/30">
            <Sparkles className="w-4 h-4" />
            <span>Powered by Mia AI</span>
            <span className="bg-purple-500 text-white px-2 py-0.5 rounded-full text-xs font-medium">New</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            AI-Powered
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent">
              Marketing Studio
            </span>
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed">
            Create stunning content, professional videos, and multi-channel campaigns with
            cutting-edge AI. From ideation to publishing—all with enterprise-grade controls.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/studio" className="px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white rounded-xl font-bold text-lg flex items-center space-x-2 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1 transition-all">
              <Play className="w-5 h-5" />
              <span>Launch Studio</span>
            </Link>
            <Link href="/studio/labs" className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all flex items-center space-x-2">
              <FlaskConical className="w-5 h-5" />
              <span>Explore Labs</span>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-center space-x-12 mt-16">
            {[
              { value: '10M+', label: 'Content Created' },
              { value: '3.2x', label: 'Engagement Boost' },
              { value: '50K+', label: 'Active Users' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Everything You Need to Dominate</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            From AI content generation to video production, SEO optimization to multi-channel publishing.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Sparkles className="w-8 h-8" />}
            title="Mia AI Content Engine"
            description="Generate high-converting content with multi-tone blending, content styles, and channel-optimized variations."
            color="purple"
          />
          <FeatureCard
            icon={<Video className="w-8 h-8" />}
            title="Video Studio Pro"
            description="Create professional videos with Runway, Sora, HeyGen avatars, and ElevenLabs voice synthesis."
            color="red"
            badge="Pro"
          />
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="SEO & Marketing Toolkit"
            description="Real-time SEO scoring, keyword analysis, readability metrics, and social preview generation."
            color="emerald"
          />
          <FeatureCard
            icon={<Globe className="w-8 h-8" />}
            title="Multi-Channel Publishing"
            description="Connect YouTube, LinkedIn, X, TikTok, Instagram, Facebook with one-click publishing."
            color="blue"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8" />}
            title="Brand Guardrails"
            description="Define voice, compliance rules, banned claims, and approval workflows for enterprise control."
            color="amber"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="API Integrations"
            description="Connect 25+ cutting-edge AI tools including DALL-E, Midjourney, Synthesia, and more."
            color="pink"
          />
        </div>
      </section>

      {/* Lyfye Labs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-rose-600/20 border border-purple-500/30 p-12">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="lg:max-w-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FlaskConical className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-purple-300 font-medium">Lyfye Labs</span>
                <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">R&D</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Experimental AI Features</h2>
              <p className="text-slate-300 mb-6">
                Get early access to cutting-edge AI tools before they go mainstream. Voice cloning,
                content autopilot, AI image generation, and more from our R&D team.
              </p>
              <div className="space-y-3">
                {[
                  'Voice Cloning Lab (Beta)',
                  'AI Image Studio (Beta)',
                  'Content Autopilot (Alpha)',
                  'Global Reach - 50+ Languages (Coming Soon)',
                ].map((feature, i) => (
                  <div key={i} className="flex items-center space-x-2 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <Link
                href="/studio/labs"
                className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:shadow-xl transition-all flex items-center space-x-2"
              >
                <span>Explore Labs</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-sm text-slate-400 mt-4">Join 5,000+ beta testers</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Create, Approve, Publish</h2>
          <p className="text-slate-400">Simple workflow with enterprise-grade controls</p>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { step: '1', title: 'Create', desc: 'Generate content with Mia AI or build from scratch' },
            { step: '2', title: 'Review', desc: 'Preview SEO, variations, and video assets' },
            { step: '3', title: 'Approve', desc: 'Human-in-the-loop approval workflow' },
            { step: '4', title: 'Publish', desc: 'One-click publish to all connected channels' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl p-12 shadow-2xl shadow-purple-500/20">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Transform Your Marketing?</h2>
          <p className="text-purple-100 mb-8 max-w-xl mx-auto">
            Join thousands of marketers using Lyfye Marketing Studio to create content 10x faster.
          </p>
          <Link href="/studio" className="inline-flex items-center space-x-2 px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:shadow-xl transition-all">
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                L
              </div>
              <span className="text-slate-400">Lyfye Marketing Studio</span>
            </div>
            <p className="text-slate-500">
              &copy; {new Date().getFullYear()} Lyfye. Part of the Lyfye Labs R&D initiative.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  color,
  badge,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: 'purple' | 'red' | 'emerald' | 'blue' | 'amber' | 'pink'
  badge?: string
}) {
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30 text-purple-400',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30 text-red-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 text-blue-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30 text-pink-400',
  }

  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm hover:scale-105 transition-transform duration-300`}>
      <div className="flex items-start justify-between mb-4">
        <div className={colorClasses[color].split(' ').pop()}>{icon}</div>
        {badge && (
          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full font-medium">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
    </div>
  )
}
