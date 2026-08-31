import { Badge } from '@/components/ui/badge'
import { useHealth } from '@/hooks/useHealth'
import { cn } from '@/lib/utils'

export function HealthBadge() {
  const { health, error } = useHealth()
  const ok = health?.status === 'ok'
  const checking = !health && !error

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            ok ? 'bg-emerald-500' : error ? 'bg-destructive' : 'bg-muted-foreground',
            checking && 'animate-pulse',
          )}
        />
        <span className="text-muted-foreground">
          {ok ? `Online · ${health!.llm_provider}` : error ? 'Backend unreachable' : 'Checking…'}
        </span>
      </div>
      {ok && typeof health!.collection.points_count === 'number' && (
        <Badge variant="secondary" className="font-mono tabular-nums">
          {health!.collection.points_count.toLocaleString()}
        </Badge>
      )}
    </div>
  )
}
