import { Bot, User } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

import { CitationList } from '@/components/chat/CitationList'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageT } from '@/lib/types'

export function ChatMessage({ message }: { message: ChatMessageT }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed',
          isUser && 'bg-primary text-primary-foreground',
          !isUser && !message.error && 'border border-border bg-card',
          message.error && 'border border-destructive/30 bg-destructive/10 text-destructive',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.text}</p>
        ) : (
          <div className="markdown">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        )}
        {message.citations && <CitationList citations={message.citations} />}
      </div>
    </div>
  )
}
