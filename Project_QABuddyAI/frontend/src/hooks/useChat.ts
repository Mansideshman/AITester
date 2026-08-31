import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { streamChat } from '@/lib/api'
import type { ChatMessage, ChatStageEvent, SourceType } from '@/lib/types'

function newId() {
  return crypto.randomUUID()
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [stage, setStage] = useState<ChatStageEvent | null>(null)
  const [streaming, setStreaming] = useState(false)

  const sendQuestion = useCallback(async (question: string, sourceTypes: SourceType[]) => {
    if (!question.trim() || streaming) return

    setMessages((prev) => [...prev, { id: newId(), role: 'user', text: question }])
    setStreaming(true)
    setStage(null)

    const fail = (text: string) => {
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', text, error: true }])
      toast.error(text)
    }

    try {
      await streamChat(question, sourceTypes, {
        stage: setStage,
        generate: (data) => {
          setMessages((prev) => [
            ...prev,
            { id: newId(), role: 'assistant', text: data.answer, citations: data.citations },
          ])
        },
        error: (data) => fail(data.message),
        done: () => {
          setStreaming(false)
          setStage(null)
        },
      })
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Failed to reach QABuddyAI')
      setStreaming(false)
      setStage(null)
    }
  }, [streaming])

  return { messages, stage, streaming, sendQuestion }
}
