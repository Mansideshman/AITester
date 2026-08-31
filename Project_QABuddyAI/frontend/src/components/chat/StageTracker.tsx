import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ChatStageEvent, ChatStageName } from '@/lib/types'

const STEPS: { key: ChatStageName; label: string }[] = [
  { key: 'rewrite', label: 'Rewrite' },
  { key: 'retrieve', label: 'Retrieve' },
  { key: 'rerank', label: 'Rerank' },
  { key: 'generate', label: 'Generate' },
]

type StepStatus = 'pending' | 'active' | 'done'

function statusFor(step: ChatStageName, stage: ChatStageEvent | null): StepStatus {
  if (!stage) return 'pending'
  const order = STEPS.map((s) => s.key)
  const curIdx = order.indexOf(stage.stage)
  const stepIdx = order.indexOf(step)
  const hasDetail = Object.keys(stage).length > 1

  if (stepIdx < curIdx) return 'done'
  if (stepIdx === curIdx) return hasDetail ? 'done' : 'active'
  return 'pending'
}

export function StageTracker({ stage }: { stage: ChatStageEvent | null }) {
  if (!stage) return null

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-2">
      {STEPS.map((step, i) => {
        const status = statusFor(step.key, stage)
        return (
          <div key={step.key} className="flex flex-1 items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]',
                  status === 'done' && 'bg-emerald-500 text-white',
                  status === 'active' && 'bg-primary text-primary-foreground animate-pulse',
                  status === 'pending' && 'bg-muted text-muted-foreground',
                )}
              >
                {status === 'done' && <Check className="h-2.5 w-2.5" />}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  status === 'pending' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1',
                  status === 'done' ? 'bg-emerald-500' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
