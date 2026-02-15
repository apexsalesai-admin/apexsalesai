'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Shield, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INDUSTRY_OPTIONS, type IndustryKey } from '@/lib/studio/creator-profile'

interface IndustrySelectorProps {
  value: IndustryKey
  audienceRole: string
  audienceSeniority: string
  onChange: (industry: IndustryKey, audienceRole: string, audienceSeniority: string) => void
}

const SENIORITY_OPTIONS = ['IC', 'Senior IC', 'Manager', 'Director', 'VP', 'C-Suite', 'Owner', 'Founder']

export function IndustrySelector({ value, audienceRole, audienceSeniority, onChange }: IndustrySelectorProps) {
  const [search, setSearch] = useState('')
  const [customRole, setCustomRole] = useState('')

  const industries = Object.values(INDUSTRY_OPTIONS)
  const filtered = search
    ? industries.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : industries

  const selected = INDUSTRY_OPTIONS[value]

  const handleSelect = (key: IndustryKey) => {
    const industry = INDUSTRY_OPTIONS[key]
    onChange(key, industry.defaultAudienceRole, industry.defaultAudienceSeniority)
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search industries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
        />
      </div>

      {/* Industry grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {filtered.map((industry) => (
          <motion.button
            key={industry.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(industry.key)}
            className={cn(
              'relative p-3 rounded-xl border-2 text-left transition-all',
              value === industry.key
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            )}
          >
            {value === industry.key && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-lg">{industry.icon}</span>
              <span className="font-medium text-sm text-slate-900">{industry.name}</span>
              {industry.regulated && <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Compliance note for regulated industries */}
      {selected?.regulated && selected.complianceNote && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
        >
          <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">{selected.complianceNote}</div>
        </motion.div>
      )}

      {/* Audience role & seniority */}
      {value && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border rounded-xl p-4 bg-white space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Target Audience Role</label>
            <div className="flex flex-wrap gap-2">
              {[selected?.defaultAudienceRole, 'CTO', 'VP of Marketing', 'Founder', 'Manager'].filter((v, i, a) => v && a.indexOf(v) === i).map((role) => (
                <button
                  key={role}
                  onClick={() => onChange(value, role!, audienceSeniority)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs border transition-all',
                    audienceRole === role
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  {role}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Custom role..."
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customRole.trim()) {
                      onChange(value, customRole.trim(), audienceSeniority)
                      setCustomRole('')
                    }
                  }}
                  className="px-3 py-1.5 rounded-full text-xs border border-dashed border-slate-300 w-32 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Seniority Level</label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map((level) => (
                <button
                  key={level}
                  onClick={() => onChange(value, audienceRole, level)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs border transition-all',
                    audienceSeniority === level
                      ? 'bg-purple-100 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
