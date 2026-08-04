import { Send } from 'lucide-react'
import { useState } from 'react'

import { SourceTypeFilter } from '@/components/chat/SourceTypeFilter'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { SourceType } from '@/lib/types'

export function ChatInput({
  streaming,
  onSend,
}: {
  streaming: boolean
  onSend: (question: string, sourceTypes: SourceType[]) => void
}) {
  const [value, setValue] = useState('')
  const [sourceTypes, setSourceTypes] = useState<SourceType[]>([])

  const submit = () => {
    if (!value.trim() || streaming) return
    onSend(value.trim(), sourceTypes)
    setValue('')
  }

  return (
    <div className="border-t border-border p-4">
      <div className="mb-2">
        <SourceTypeFilter selected={sourceTypes} onChange={setSourceTypes} />
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Ask QABuddyAI…"
          className="min-h-11 flex-1 resize-none"
          rows={1}
          disabled={streaming}
        />
        <Button onClick={submit} disabled={streaming || !value.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
