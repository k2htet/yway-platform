# Codex Configuration Instructions

- Keep optional plugins and external tools disabled unless a task specifically needs them.
- Do not pin a model or broaden permissions without explicit task authority.
- Reviewer adapters remain read-only and contain only role-specific focus and output guidance.
  Route shared authority and guardrails to root `AGENTS.md` and canonical docs instead of copying
  them here.
- A reviewer should load only canonical sections implicated by the change under review.
