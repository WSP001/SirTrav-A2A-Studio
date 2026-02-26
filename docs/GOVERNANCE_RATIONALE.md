# Governance Rationale — Why `ticket-status` Is Strict

1. **Every branch must trace to a Linear ticket** (`feature/WSP-<n>-<slug>`) so token spend, commits, and PRs are automatically attributed to a trackable work item.
2. **Unnamed branches create orphan work** — no ticket means no audit trail, no sprint velocity, and no way for other agents to discover context.
3. **The regex `feature/WSP-[0-9]+-.+` is intentionally rigid** to prevent drift: no `fix/`, `hotfix/`, `wip/`, or `claude/` prefixes that bypass Linear alignment.
4. **Exceptions:** Legacy `claude/*` worktree branches (created by Claude Code's worktree system) are grandfathered for in-flight PRs only. No new work should use them.
5. **Migration path:** To move from `claude/trusting-hamilton` to the new standard, merge PR #10 first, then create `feature/WSP-<n>-<next-task>` from `main` using `just flow` to validate.
6. **`just flow` is the single entry point** — it runs `ticket-status` first, so invalid branches fail before any verification gates run. This saves tokens and prevents accidental commits to wrong branches.
7. **`pre-merge-guard` is the exit gate** — even if you bypass `flow`, you cannot merge without passing all 4 discipline checks (clean tree, up-to-date, machine health, devkit).
8. **Agents are equals under governance** — Claude Code, Codex, Windsurf, Antigravity, and Human Operator all follow the same branch naming rule. No agent gets a shortcut.
9. **The "why" behind strictness:** A multi-agent codebase with 4+ AI agents and 1 human operator will diverge fast without mechanical enforcement. Governance is cheaper than recovery.
10. **Future relaxation:** If the team needs `hotfix/` or `release/` branches, extend the regex in the `ticket-status` recipe — but always require a ticket ID in the branch name.
