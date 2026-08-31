import { ChatInput } from '@/components/chat/ChatInput'
import { ChatLog } from '@/components/chat/ChatLog'
import { StageTracker } from '@/components/chat/StageTracker'
import { useChat } from '@/hooks/useChat'

export function ChatPage() {
  const { messages, stage, streaming, sendQuestion } = useChat()

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h1 className="text-base font-semibold">Chat</h1>
          <p className="text-xs text-muted-foreground">
            Cited answers grounded in your ingested QA knowledge base
          </p>
        </div>
        {streaming && <StageTracker stage={stage} />}
      </header>
      <ChatLog messages={messages} />
      <ChatInput streaming={streaming} onSend={sendQuestion} />
    </div>
  )
}
