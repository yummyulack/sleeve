'use client'

import type { QuestPhase } from '@/hooks/useQuest'

interface Props {
  phase: QuestPhase
  cooldownMs: number | null
  onRun: () => void
}

const PHASE_LABEL: Record<QuestPhase, string> = {
  idle:      'Complete Quest',
  claiming:  'Claiming...',
  signing:   'Sign in wallet...',
  resolving: 'Rolling...',
  done:      'Complete Quest',
  error:     'Try Again',
}

export function QuestButton({ phase, cooldownMs, onRun }: Props) {
  const disabled = phase === 'claiming' || phase === 'signing' || phase === 'resolving'
  const onCooldown = !!cooldownMs && phase === 'idle'

  const hoursLeft = cooldownMs ? Math.ceil(cooldownMs / 3_600_000) : 0

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onRun}
        disabled={disabled || onCooldown}
        className={[
          'relative px-8 py-3 rounded-full font-bold text-base transition-all duration-200',
          'bg-gradient-to-r from-indigo-600 to-violet-600',
          'hover:from-indigo-500 hover:to-violet-500',
          'shadow-[0_0_24px_4px_#6366f166]',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
          phase === 'resolving' ? 'animate-pulse' : '',
        ].join(' ')}
      >
        <span className="text-white tracking-wide">{PHASE_LABEL[phase]}</span>
      </button>

      {onCooldown && (
        <p className="text-zinc-500 text-xs">
          Next quest in {hoursLeft}h
        </p>
      )}
    </div>
  )
}
