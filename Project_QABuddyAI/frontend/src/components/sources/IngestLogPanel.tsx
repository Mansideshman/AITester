import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { IngestStageEvent } from '@/lib/types'
import { cn } from '@/lib/utils'

export function IngestLogPanel({
  log,
  className,
}: {
  log: IngestStageEvent[]
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <CardTitle className="text-sm">Ingest log</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="flex flex-col gap-1 font-mono text-xs text-muted-foreground">
            {log.length === 0 && <span>Waiting for events…</span>}
            {log.map((e, i) => (
              <div key={i}>
                <span className="text-foreground">{e.source_type ?? '—'}</span>: {e.stage}
                {typeof e.chunk_count === 'number' && ` (${e.chunk_count})`}
                {e.message && ` — ${e.message}`}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
