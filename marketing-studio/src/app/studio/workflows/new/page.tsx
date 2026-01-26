'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, GripVertical, Check, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { IntegrationType, NodeType } from '@/types'
import { getAllConnectors } from '@/lib/connectors'
import { createWorkflowTemplate, validateWorkflow } from '@/lib/workflow-schema'

const NODE_TYPES: { type: NodeType; label: string; description: string; required: boolean }[] = [
  { type: 'TRIGGER', label: 'Trigger', description: 'Start the workflow when content is detected', required: true },
  { type: 'TRANSFORM', label: 'Transform', description: 'Adapt content for the target channel', required: false },
  { type: 'APPROVAL', label: 'Approval Gate', description: 'Require human approval before publishing', required: false },
  { type: 'TARGET', label: 'Target', description: 'Destination channel for the content', required: true },
  { type: 'PUBLISH', label: 'Publish', description: 'Execute the publish action', required: false },
  { type: 'TRACK', label: 'Track', description: 'Record outcome events and metrics', required: false },
]

export default function NewWorkflowPage() {
  const router = useRouter()
  const connectors = getAllConnectors()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceChannel, setSourceChannel] = useState<IntegrationType>('TIKTOK')
  const [targetChannel, setTargetChannel] = useState<IntegrationType>('YOUTUBE')
  const [includeTransform, setIncludeTransform] = useState(true)
  const [includeApproval, setIncludeApproval] = useState(true)
  const [includeTrack, setIncludeTrack] = useState(true)
  const [errors, setErrors] = useState<string[]>([])

  const handleCreate = () => {
    // Generate workflow definition
    const workflowName = name || `${sourceChannel} → ${targetChannel} Auto-Share`
    const workflow = createWorkflowTemplate(workflowName, sourceChannel, targetChannel)

    // Validate
    const validation = validateWorkflow(workflow)

    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    // In production, this would call the API to save the workflow
    console.log('Creating workflow:', workflow)

    // Navigate to workflows page
    router.push('/studio/workflows')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back button */}
      <Link
        href="/studio/workflows"
        className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Workflows</span>
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Workflow</h1>
        <p className="text-slate-500 mt-1">
          Set up automated content distribution between channels
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Validation errors</p>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Basic Information</h2>

        <div>
          <label className="label">Workflow Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., TikTok to YouTube Auto-Share"
            className="input"
          />
        </div>

        <div>
          <label className="label">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this workflow does..."
            className="input"
            rows={2}
          />
        </div>
      </div>

      {/* Channels */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Channels</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Source Channel (Trigger)</label>
            <select
              value={sourceChannel}
              onChange={(e) => setSourceChannel(e.target.value as IntegrationType)}
              className="input"
            >
              {connectors.map((c) => (
                <option key={c.type} value={c.type}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500 mt-1">
              Watch for new content on this channel
            </p>
          </div>

          <div>
            <label className="label">Target Channel (Destination)</label>
            <select
              value={targetChannel}
              onChange={(e) => setTargetChannel(e.target.value as IntegrationType)}
              className="input"
            >
              {connectors.filter(c => c.type !== sourceChannel).map((c) => (
                <option key={c.type} value={c.type}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500 mt-1">
              Publish content to this channel
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-slate-900">Workflow Steps</h2>
        <p className="text-sm text-slate-500">
          Configure the steps in your workflow. Trigger and Target are required.
        </p>

        <div className="space-y-3">
          {/* Trigger (required) */}
          <WorkflowStepCard
            type="TRIGGER"
            label="Trigger"
            description={`Watch ${sourceChannel} for new content`}
            enabled={true}
            required={true}
          />

          {/* Transform */}
          <WorkflowStepCard
            type="TRANSFORM"
            label="Transform"
            description="Adapt caption, title, and description for target"
            enabled={includeTransform}
            required={false}
            onToggle={() => setIncludeTransform(!includeTransform)}
          />

          {/* Approval */}
          <WorkflowStepCard
            type="APPROVAL"
            label="Approval Gate"
            description="Require human approval before publishing"
            enabled={includeApproval}
            required={false}
            onToggle={() => setIncludeApproval(!includeApproval)}
          />

          {/* Target (required) */}
          <WorkflowStepCard
            type="TARGET"
            label="Target"
            description={`Publish to ${targetChannel}`}
            enabled={true}
            required={true}
          />

          {/* Publish */}
          <WorkflowStepCard
            type="PUBLISH"
            label="Publish"
            description="Execute publish with retry logic"
            enabled={true}
            required={true}
          />

          {/* Track */}
          <WorkflowStepCard
            type="TRACK"
            label="Track"
            description="Record success/failure events"
            enabled={includeTrack}
            required={false}
            onToggle={() => setIncludeTrack(!includeTrack)}
          />
        </div>
      </div>

      {/* Approval Settings */}
      {includeApproval && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-slate-900">Approval Settings</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Required Role</label>
              <select className="input">
                <option value="APPROVER">Approver</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="label">Timeout (hours)</label>
              <input
                type="number"
                defaultValue={24}
                className="input"
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href="/studio/workflows"
          className="btn-secondary"
        >
          Cancel
        </Link>
        <button
          onClick={handleCreate}
          className="btn-primary flex items-center space-x-2"
        >
          <Check className="w-4 h-4" />
          <span>Create Workflow</span>
        </button>
      </div>
    </div>
  )
}

function WorkflowStepCard({
  type,
  label,
  description,
  enabled,
  required,
  onToggle,
}: {
  type: NodeType
  label: string
  description: string
  enabled: boolean
  required: boolean
  onToggle?: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border',
        enabled
          ? 'border-apex-primary bg-blue-50'
          : 'border-slate-200 bg-slate-50'
      )}
    >
      <div className="flex items-center space-x-3">
        <GripVertical className="w-4 h-4 text-slate-400" />
        <div>
          <div className="flex items-center space-x-2">
            <p className="font-medium text-slate-900">{label}</p>
            {required && (
              <span className="text-xs text-slate-500">(required)</span>
            )}
          </div>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>

      {!required && onToggle && (
        <button
          onClick={onToggle}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            enabled ? 'bg-apex-primary' : 'bg-slate-200'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      )}
    </div>
  )
}
