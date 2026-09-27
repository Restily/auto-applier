# parallel-worktrees-for-agents

_2026-09-27 · Tags: git worktree, Agent isolation worktree, role-guard, ".claude/worktrees", parallel implementers, wrong base commit_

## Symptom
Implementers dispatched with the Agent tool's `isolation: "worktree"`:
- got worktrees under `.claude/worktrees/agent-*` checked out at the repository's initial commit (5db4b98), not at the milestone branch;
- couldn't edit any file there, because role-guard denies `.claude/**` to backend-dev and frontend-dev, and every path in such a worktree is under `.claude/`;
- couldn't write reports into the main tree, because the Write tool enforces the isolation boundary.

A mid-task SendMessage asking the agent to fast-forward was (rightly) treated as a possible prompt injection and refused.

## Root cause
Agent worktree isolation branches from the default base, not the caller's current branch, and places the worktree inside `.claude/`. That collides with the team's file-ownership hook.

## Fix
The lead creates worktrees outside the repository, from the milestone branch, before dispatching:
```bash
git worktree add -b wt/<M>-<task> /home/user/aa-wt/<M>-<task> milestone/<M>-<slug>
```
The implementer is dispatched without `isolation`. Its brief names the worktree path and the expected base commit (a first-command check), and forbids edits in the main tree. role-guard skips paths outside the project. The lead merges `wt/*` branches with `--no-ff` and then removes each worktree with `git worktree remove`.

## Prevention
Rule 6 of team/CONSTITUTION.md now prescribes lead-created worktrees outside the repo. Put every correction into the initial brief: agents may refuse mid-task instructions.
