import { Layers, Loader2, RefreshCw } from 'lucide-react'

import { IngestLogPanel } from '@/components/sources/IngestLogPanel'
import { SourceCard } from '@/components/sources/SourceCard'
import { Button } from '@/components/ui/button'
import { useIngestAll } from '@/hooks/useIngestAll'
import { useSources } from '@/hooks/useSources'

export function SourcesPage() {
  const { sources, loading, refetch } = useSources()
  const { running, log, run } = useIngestAll()

  const handleIngestAll = async () => {
    await run()
    refetch()
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-base font-semibold">Sources</h1>
          <p className="text-xs text-muted-foreground">Ingestion status for each knowledge source</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={handleIngestAll} disabled={running} className="gap-1.5">
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}
            {running ? 'Ingesting all…' : 'Ingest all'}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 gap-4 overflow-hidden p-6">
        <div className="grid flex-1 auto-rows-min grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {!loading &&
            sources.map((s) => <SourceCard key={s.source_type} source={s} onIngested={refetch} />)}
        </div>
        {(running || log.length > 0) && <IngestLogPanel log={log} className="w-72 shrink-0" />}
      </div>
    </div>
  )
}
