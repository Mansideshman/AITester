import { Loader2, PlayCircle, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useIngestSource } from '@/hooks/useIngestSource'
import { uploadSourceFiles } from '@/lib/api'
import { SOURCE_TYPE_META } from '@/lib/sourceTypes'
import type { SourceStatus } from '@/lib/types'

const STAGE_PROGRESS: Record<string, number> = {
  read: 15,
  build: 30,
  chunk: 50,
  embed: 75,
  index: 90,
  done: 100,
}

function StatusBadge({ status }: { status: SourceStatus['status'] }) {
  if (status === 'ingested') {
    return <Badge className="border-transparent bg-emerald-500/15 text-emerald-500">Ingested</Badge>
  }
  if (status === 'not_implemented_phase2') return <Badge variant="outline">Phase 2</Badge>
  return <Badge variant="secondary">Not ingested</Badge>
}

export function SourceCard({
  source,
  onIngested,
}: {
  source: SourceStatus
  onIngested: () => void
}) {
  const meta = SOURCE_TYPE_META[source.source_type]
  const Icon = meta.icon
  const disabled = source.status === 'not_implemented_phase2'
  const { status, stageLabel, chunkCount, error, run } = useIngestSource(source.source_type)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleIngestClick = async () => {
    await run()
    onIngested()
  }

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    e.target.value = '' // allow re-selecting the same file(s) later
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const { saved_files } = await uploadSourceFiles(source.source_type, files)
      toast.success(`Uploaded ${saved_files.length} file${saved_files.length === 1 ? '' : 's'} to ${source.folder}`)
      setUploading(false)
      await run()
      onIngested()
    } catch (err) {
      setUploading(false)
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const displayChunkCount = status === 'running' && chunkCount !== null ? chunkCount : source.chunk_count
  const busy = uploading || status === 'running'

  return (
    <Card className={disabled ? 'opacity-60' : undefined}>
      <CardHeader className="flex items-center gap-3 space-y-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle>{meta.label}</CardTitle>
          <p className="truncate text-xs text-muted-foreground">{source.folder}</p>
        </div>
        <StatusBadge status={source.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{displayChunkCount.toLocaleString()} chunks</span>
          <span>
            {source.last_ingested_at ? new Date(source.last_ingested_at).toLocaleString() : 'never ingested'}
          </span>
        </div>

        {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
        {status === 'running' && (
          <div className="flex flex-col gap-1">
            <Progress value={STAGE_PROGRESS[stageLabel ?? ''] ?? 10} className="h-1.5" />
            <span className="text-xs text-muted-foreground capitalize">{stageLabel}…</span>
          </div>
        )}
        {status === 'error' && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={handleUploadClick}
            className="flex-1 gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || busy}
            onClick={handleIngestClick}
            className="flex-1 gap-1.5"
          >
            {status === 'running' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            {status === 'running' ? 'Ingesting…' : 'Ingest'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
