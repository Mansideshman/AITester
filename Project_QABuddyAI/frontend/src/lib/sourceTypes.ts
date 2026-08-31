import {
  Bug,
  Code2,
  FileSpreadsheet,
  FileText,
  Frame,
  ListChecks,
  NotebookText,
  Terminal,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import type { SourceType } from '@/lib/types'

export const SOURCE_TYPE_META: Record<SourceType, { label: string; icon: LucideIcon }> = {
  selenium_code: { label: 'Selenium', icon: Code2 },
  playwright_code: { label: 'Playwright', icon: Code2 },
  test_case: { label: 'Test Case', icon: ListChecks },
  jira_ticket: { label: 'JIRA', icon: Bug },
  company_doc: { label: 'Company Doc', icon: FileText },
  meeting_note: { label: 'Meeting Note', icon: NotebookText },
  lucidchart: { label: 'Lucidchart', icon: Workflow },
  prd_doc: { label: 'PRD / SRS', icon: FileSpreadsheet },
  jenkins_log: { label: 'Jenkins Log', icon: Terminal },
  figma_design: { label: 'Figma', icon: Frame },
}

export const ACTIVE_SOURCE_TYPES: SourceType[] = Object.keys(SOURCE_TYPE_META).filter(
  (key) => key !== 'figma_design',
) as SourceType[]
