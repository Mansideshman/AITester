import { Bot, Database, MessageSquare } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { HealthBadge } from '@/components/layout/HealthBadge'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/sources', label: 'Sources', icon: Database },
] as const

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card/40 p-4">
      <div className="mb-6 flex items-center gap-2.5 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">QABuddyAI</div>
          <div className="text-xs text-muted-foreground">QA knowledge assistant</div>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <HealthBadge />
      </div>
    </aside>
  )
}
