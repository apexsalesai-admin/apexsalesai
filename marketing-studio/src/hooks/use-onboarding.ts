'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  OnboardingState,
  OnboardingChannelsData,
  OnboardingGuardrailsData,
  OnboardingApprovalsData,
  OnboardingKPIsData,
} from '@/types'

interface OnboardingStore extends OnboardingState {
  // Actions
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void

  // Step data setters
  setChannelsData: (data: OnboardingChannelsData) => void
  setGuardrailsData: (data: OnboardingGuardrailsData) => void
  setApprovalsData: (data: OnboardingApprovalsData) => void
  setKPIsData: (data: OnboardingKPIsData) => void

  // Completion
  completeOnboarding: () => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      // Initial state
      currentStep: 0,
      steps: {
        channels: null,
        guardrails: null,
        approvals: null,
        kpis: null,
      },
      completed: false,

      // Navigation
      setStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({
        currentStep: Math.min(state.currentStep + 1, 3),
      })),
      prevStep: () => set((state) => ({
        currentStep: Math.max(state.currentStep - 1, 0),
      })),

      // Step data
      setChannelsData: (data) => set((state) => ({
        steps: { ...state.steps, channels: data },
      })),
      setGuardrailsData: (data) => set((state) => ({
        steps: { ...state.steps, guardrails: data },
      })),
      setApprovalsData: (data) => set((state) => ({
        steps: { ...state.steps, approvals: data },
      })),
      setKPIsData: (data) => set((state) => ({
        steps: { ...state.steps, kpis: data },
      })),

      // Completion
      completeOnboarding: () => set({ completed: true }),
      resetOnboarding: () => set({
        currentStep: 0,
        steps: {
          channels: null,
          guardrails: null,
          approvals: null,
          kpis: null,
        },
        completed: false,
      }),
    }),
    {
      name: 'apex-onboarding-storage',
    }
  )
)

// Hook for consuming onboarding state
export function useOnboarding() {
  const store = useOnboardingStore()

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0:
        return store.steps.channels !== null &&
               store.steps.channels.connectedChannels.length > 0
      case 1:
        return store.steps.guardrails !== null
      case 2:
        return store.steps.approvals !== null
      case 3:
        return store.steps.kpis !== null
      default:
        return false
    }
  }

  const canProceed = isStepComplete(store.currentStep)

  const progress = [0, 1, 2, 3].filter(isStepComplete).length / 4 * 100

  return {
    ...store,
    isStepComplete,
    canProceed,
    progress,
  }
}
