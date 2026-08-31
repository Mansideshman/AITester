import { badgeVariants } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SOURCE_TYPE_META } from '@/lib/sourceTypes'
import type { Citation } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {citations.map((c, i) => {
        const meta = SOURCE_TYPE_META[c.source_type]
        const Icon = meta?.icon
        return (
          <Tooltip key={`${c.source_id}-${i}`}>
            <TooltipTrigger className={cn(badgeVariants({ variant: 'outline' }), 'gap-1 font-normal')}>
              {Icon && <Icon className="h-3 w-3" />}
              {c.label}
            </TooltipTrigger>
            <TooltipContent>
              {meta?.label ?? c.source_type} · score {c.score.toFixed(3)}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
