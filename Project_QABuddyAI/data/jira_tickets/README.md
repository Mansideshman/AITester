# jira_tickets

**Phase 1 (current): file-based only.** Drop manually-exported JIRA
`.json` or `.csv` files here (Jira's own "Export" feature, or a JQL search
result exported to CSV/JSON). Expected fields: `key`/`jira_id`, `summary`,
`description`, `status`, `issuetype`, `priority`, `assignee`, `created`,
`updated`, `comments`.

**Phase 2 (planned, not built yet):** live pull via JIRA MCP connection +
a user-supplied JQL query, replacing this file-based loader — see the
`# TODO` marker in `qabuddy/loaders/jira_loader.py`.

Ingested by `qabuddy/loaders/jira_loader.py` (`source_type=jira_ticket`).
Chunk size/overlap: 1200/150 chars.

Run `python ingest.py jira_ticket` after adding files.
