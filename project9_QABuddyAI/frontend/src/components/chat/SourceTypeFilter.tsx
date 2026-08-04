import { Filter } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ACTIVE_SOURCE_TYPES, SOURCE_TYPE_META } from '@/lib/sourceTypes'
import type { SourceType } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SourceTypeFilter({
  selected,
  onChange,
}: {
  selected: SourceType[]
  onChange: (next: SourceType[]) => void
}) {
  const toggle = (t: SourceType) => {
    onChange(selected.includes(t) ? selected.filter((s) => s !== t) : [...selected, t])
  }

  return (
    <Popover>
      <PopoverTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
        <Filter className="h-3.5 w-3.5" />
        {selected.length === 0 ? 'All sources' : `${selected.length} source${selected.length > 1 ? 's' : ''}`}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Scope to sources (none selected = search everything)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVE_SOURCE_TYPES.map((t) => {
            const meta = SOURCE_TYPE_META[t]
            const Icon = meta.icon
            const active = selected.includes(t)
            return (
              <Badge
                key={t}
                variant={active ? 'default' : 'outline'}
                className="cursor-pointer gap-1 font-normal select-none"
                onClick={() => toggle(t)}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </Badge>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
