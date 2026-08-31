import { Bot } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { ChatMessage } from '@/components/chat/ChatMessage'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ChatMessage as ChatMessageT } from '@/lib/types'

export function ChatLog({ messages }: { messages: ChatMessageT[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Bot className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ask a question grounded in your Selenium/Playwright code, test cases, JIRA
          history, PRDs, meeting notes, or Jenkins logs.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 px-6">
      <div className="flex flex-col gap-4 py-6">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
