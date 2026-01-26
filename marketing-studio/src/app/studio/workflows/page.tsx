'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Play, Pause, Trash2, Settings, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkflowStatus, IntegrationType } from '@/types'

// Mock workflow data
const MOCK_WORKFLOWS = [
  {
    id: '1',
    name: 'TikTok → YouTube Auto-Share',
    description: 'Automatically share TikTok videos as YouTube Shorts with adapted titles',
    status: 'ACTIVE' as WorkflowStatus,
    trigger: 'TIKTOK' as IntegrationType,
    target: 'YOUTUBE' as IntegrationType,
    nodeCount: 6,
    lastRun: new Date(Date.now() - 5 * 60 * 1000),
    successRate: 94,
  },
  {
    id: '2',
    name: 'Blog → LinkedIn Share',
    description: 'Share new blog posts to LinkedIn with AI-generated summaries',
    status: 'ACTIVE' as WorkflowStatus,
    trigger: 'YOUTUBE' as IntegrationType,
    target: 'LINKEDIN' as IntegrationType,
    nodeCount: 5,
    lastRun: new Date(Date.now() - 60 * 60 * 1000),
    successRate: 100,
  },
  {
    id: '3',
    name: 'YouTube → X Thread',
    description: 'Convert YouTube videos into X threads with key highlights',
    status: 'PAUSED' as WorkflowStatus,
    trigger: 'YOUTUBE' as IntegrationType,
    target: 'X_TWITTER' as IntegrationType,
    nodeCount: 7,
    lastRun: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    successRate: 87,
  },
]

export default function WorkflowsPage() {
  const [workflows] = useState(MOCK_WORKFLOWS)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
          <p className="text-slate-500 mt-1">
            Manage your content distribution workflows
          </p>
        </div>
        <Link
          href="/studio/workflows/new"
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </Link>
      </div>

      {/* Workflow Templates */}
      <div className="card bg-gradient-to-r from-apex-primary/10 to-apex-accent/10 border-apex-primary/20">
        <h2 className="font-semibold text-slate-900 mb-3">Quick Start Templates</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <TemplateCard
            name="TikTok → YouTube"
            description="Auto-share TikTok videos as YouTube Shorts"
          />
          <TemplateCard
            name="Blog → Social"
            description="Share blog posts across all channels"
          />
          <TemplateCard
            name="Video → Thread"
            description="Convert videos into X/LinkedIn threads"
          />
        </div>
      </div>

      {/* Workflow List */}
      <div className="space-y-4">
        <h2 className="font-semibold text-slate-900">Your Workflows</h2>

        {workflows.length === 0 ? (
          <div className="card text-center py-12">
            <Workflow className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No workflows yet</h3>
            <p className="text-slate-500 mt-1">
              Create your first workflow to automate content distribution
            </p>
            <Link
              href="/studio/workflows/new"
              className="btn-primary mt-4 inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workflow</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => (
              <WorkflowCard key={workflow.id} workflow={workflow} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateCard({ name, description }: { name: string; description: string }) {
  return (
    <Link
      href={`/studio/workflows/new?template=${encodeURIComponent(name)}`}
      className="block p-3 bg-white rounded-lg border border-slate-200 hover:border-apex-primary hover:shadow-sm transition-all"
    >
      <p className="font-medium text-slate-900">{name}</p>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </Link>
  )
}

function WorkflowCard({ workflow }: { workflow: typeof MOCK_WORKFLOWS[0] }) {
  const statusColors = {
    ACTIVE: 'badge-success',
    PAUSED: 'badge-warning',
    DRAFT: 'badge-info',
    ARCHIVED: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
            <span className={cn('badge', statusColors[workflow.status])}>
              {workflow.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{workflow.description}</p>

          {/* Workflow flow */}
          <div className="flex items-center space-x-2 mt-3">
            <ChannelBadge type={workflow.trigger} />
            <span className="text-slate-400">→</span>
            <span className="text-xs text-slate-500">Transform → Approve → Publish</span>
            <span className="text-slate-400">→</span>
            <ChannelBadge type={workflow.target} />
          </div>

          {/* Stats */}
          <div className="flex items-center space-x-4 mt-3 text-sm text-slate-500">
            <span>{workflow.nodeCount} nodes</span>
            <span>•</span>
            <span>{workflow.successRate}% success rate</span>
            <span>•</span>
            <span>Last run: {formatTimeAgo(workflow.lastRun)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {workflow.status === 'ACTIVE' ? (
            <button className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Pause">
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Activate">
              <Play className="w-4 h-4" />
            </button>
          )}
          <Link
            href={`/studio/workflows/${workflow.id}`}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ChannelBadge({ type }: { type: IntegrationType }) {
  const colors: Record<IntegrationType, string> = {
    YOUTUBE: 'bg-red-100 text-red-700',
    TIKTOK: 'bg-slate-900 text-white',
    LINKEDIN: 'bg-blue-100 text-blue-700',
    X_TWITTER: 'bg-slate-100 text-slate-900',
    FACEBOOK: 'bg-blue-100 text-blue-600',
    INSTAGRAM: 'bg-pink-100 text-pink-700',
  }

  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colors[type])}>
      {type.replace('_', ' ')}
    </span>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`
}
