'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Sparkles, Loader2, Check } from 'lucide-react'
import { CreationWorkspace, type WorkspaceStep } from '@/components/studio/creation-workspace'
import { saveGeneratedAsset, redirectAfterSave } from '@/lib/studio/save-generated-asset'
import { cn } from '@/lib/utils'

const STEPS: WorkspaceStep[] = [
  { label: 'Goal' },
  { label: 'Audience' },
  { label: 'Draft' },
  { label: 'Refine' },
  { label: 'Save' },
]

const EMAIL_GOALS = [
  { id: 'outreach', label: 'Outreach', description: 'Cold or warm outreach to prospects' },
  { id: 'newsletter', label: 'Newsletter', description: 'Regular updates for subscribers' },
  { id: 'followup', label: 'Follow-up', description: 'Follow up after a meeting or event' },
  { id: 'announcement', label: 'Announcement', description: 'Product launch, news, or update' },
  { id: 'invitation', label: 'Invitation', description: 'Event, webinar, or demo invite' },
]

interface GeneratedSection {
  type: string
  title: string
  content: string
  loading: boolean
}

export default function CreateEmailPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 0: Goal
  const [emailGoal, setEmailGoal] = useState('outreach')

  // Step 1: Audience
  const [recipientDescription, setRecipientDescription] = useState('')
  const [emailTopic, setEmailTopic] = useState('')

  // Step 2: Draft
  const [sections, setSections] = useState<GeneratedSection[]>([])
  const [isDrafting, setIsDrafting] = useState(false)
  const [assembledEmail, setAssembledEmail] = useState('')

  // Step 3: Refine
  const [isRefining, setIsRefining] = useState(false)

  // Step 4: Save
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleDraft = useCallback(async () => {
    setIsDrafting(true)
    setError('')

    try {
      // Research email angles
      const researchRes = await fetch('/api/studio/mia/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: emailTopic || `${emailGoal} email to ${recipientDescription}`,
          channels: ['LINKEDIN'],
          contentType: 'email',
          goal: emailGoal,
        }),
      })

      if (!researchRes.ok) throw new Error('Research failed')
      const researchData = await researchRes.json()
      const angle = researchData.angles?.[0]
      if (!angle) throw new Error('No email strategies generated')

      // Generate email sections
      const sectionDefs = [
        { type: 'subject_line', title: 'Subject Line & Preview' },
        { type: 'body', title: 'Email Body' },
        { type: 'cta', title: 'Call to Action & Close' },
      ]

      const newSections: GeneratedSection[] = sectionDefs.map(s => ({
        type: s.type,
        title: s.title,
        content: '',
        loading: true,
      }))
      setSections(newSections)

      const previousSections: { type: string; content: string }[] = []

      for (let i = 0; i < sectionDefs.length; i++) {
        const res = await fetch('/api/studio/mia/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: emailTopic || `${emailGoal} email to ${recipientDescription}`,
            contentType: 'email',
            sectionType: sectionDefs[i].type,
            channels: ['LINKEDIN'],
            angle: {
              id: angle.id,
              title: angle.title,
              description: angle.description,
              rationale: angle.rationale || '',
              sources: angle.sources || [],
            },
            previousSections,
            rejectedVersions: [],
            goal: `${emailGoal} email for ${recipientDescription}`,
          }),
        })

        if (!res.ok) throw new Error(`Failed to generate ${sectionDefs[i].title}`)
        const data = await res.json()

        const content = data.content || ''
        previousSections.push({ type: sectionDefs[i].type, content })

        setSections(prev => prev.map((s, idx) =>
          idx === i ? { ...s, content, loading: false } : s
        ))
      }

      const assembled = previousSections.map(s => s.content).join('\n\n')
      setAssembledEmail(assembled)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Draft generation failed')
    } finally {
      setIsDrafting(false)
    }
  }, [emailTopic, emailGoal, recipientDescription])

  const handleRefine = useCallback(async (instruction: string) => {
    setIsRefining(true)
    setError('')

    try {
      const res = await fetch('/api/studio/mia/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revise',
          sectionType: 'body',
          existingContent: assembledEmail,
          userDirection: instruction,
          topic: emailTopic || `${emailGoal} email`,
          angle: { title: emailGoal, description: recipientDescription },
          channels: ['LINKEDIN'],
          contentType: 'email',
          goal: emailGoal,
        }),
      })

      if (!res.ok) throw new Error('Refinement failed')
      const data = await res.json()
      if (data.content) setAssembledEmail(data.content)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refinement failed')
    } finally {
      setIsRefining(false)
    }
  }, [assembledEmail, emailTopic, emailGoal, recipientDescription])

  const handleSave = async () => {
    setIsSaving(true)
    setError('')

    const firstLine = assembledEmail.split('\n')[0]?.trim() || emailTopic || `${emailGoal} email`

    const result = await saveGeneratedAsset({
      title: firstLine,
      body: assembledEmail,
      contentType: 'POST',
      aiTopic: emailTopic || `${emailGoal} email to ${recipientDescription}`,
    })

    if (result.success) {
      redirectAfterSave(router, result.contentId)
    } else {
      setError(result.error || 'Save failed')
    }
    setIsSaving(false)
  }

  const handleNext = async () => {
    if (step === 0) {
      setStep(1)
    } else if (step === 1) {
      setStep(2)
      await handleDraft()
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      setStep(4)
    } else if (step === 4) {
      await handleSave()
    }
  }

  const handleBack = () => {
    if (step === 0) {
      router.push('/studio/create')
    } else {
      setStep(step - 1)
    }
  }

  const canGoNext = () => {
    switch (step) {
      case 0: return emailGoal.length > 0
      case 1: return recipientDescription.trim().length > 0
      case 2: return sections.every(s => !s.loading && s.content.length > 0)
      case 3: return assembledEmail.trim().length > 0
      case 4: return assembledEmail.trim().length > 0
      default: return false
    }
  }

  return (
    <CreationWorkspace
      title="Create Email"
      subtitle="Craft professional emails, outreach, and newsletters"
      icon={Mail}
      iconColor="bg-amber-500"
      steps={STEPS}
      currentStep={step}
      onBack={handleBack}
      onNext={handleNext}
      canGoNext={canGoNext()}
      isProcessing={isDrafting || isRefining || isSaving}
      processingLabel={
        isDrafting ? 'Mia is drafting your email...' :
        isRefining ? 'Mia is refining...' :
        isSaving ? 'Saving...' : undefined
      }
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* STEP 0: Goal */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-4">What type of email?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMAIL_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setEmailGoal(goal.id)}
                  className={cn(
                    'p-4 rounded-xl border text-left transition-colors',
                    emailGoal === goal.id
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className="block text-sm font-medium text-slate-900">{goal.label}</span>
                  <span className="block text-xs text-slate-500 mt-1">{goal.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Audience */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Who is this email for?
            </label>
            <textarea
              value={recipientDescription}
              onChange={(e) => setRecipientDescription(e.target.value)}
              placeholder="e.g., VP of Sales at mid-market SaaS companies who attended our webinar"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-y"
            />
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What is the email about? (optional)
            </label>
            <input
              type="text"
              value={emailTopic}
              onChange={(e) => setEmailTopic(e.target.value)}
              placeholder="e.g., Introducing our new AI analytics dashboard"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* STEP 2: Draft */}
      {step === 2 && (
        <div className="space-y-4">
          {sections.map((section, i) => (
            <div key={i} className="p-6 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                {section.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ) : (
                  <Check className="w-4 h-4 text-amber-500" />
                )}
                <h3 className="text-sm font-medium text-slate-700">{section.title}</h3>
              </div>
              {section.loading ? (
                <div className="h-16 bg-slate-50 rounded-lg animate-pulse" />
              ) : (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{section.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STEP 3: Refine */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-700">Refine your email</h3>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-slate-500">Ask Mia:</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {['More concise', 'More personal', 'Stronger CTA', 'Different subject line', 'Add urgency'].map((instruction) => (
                <button
                  key={instruction}
                  onClick={() => handleRefine(instruction)}
                  disabled={isRefining}
                  className="px-3 py-1.5 text-xs font-medium border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 disabled:opacity-50"
                >
                  {instruction}
                </button>
              ))}
            </div>

            <textarea
              value={assembledEmail}
              onChange={(e) => setAssembledEmail(e.target.value)}
              rows={16}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-slate-900 font-mono resize-y"
            />
          </div>
        </div>
      )}

      {/* STEP 4: Save */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Email preview</h3>
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
              {assembledEmail}
            </div>
          </div>
        </div>
      )}
    </CreationWorkspace>
  )
}
