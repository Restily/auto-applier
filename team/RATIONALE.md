# Design rationale

Why the template looks the way it does, and what the evidence behind each choice is.

| Decision | Evidence | Where |
|---|---|---|
| State in files + git, file-based handoffs between agents | Anthropic: agents recover state from a progress file + git history; artifacts passed by reference avoid the "game of telephone" | board.py, docs/, SessionStart brief |
| Builders never grade their own work | Anthropic harness design: agents "confidently praise" mediocre own work; a separate, tuned evaluator is the strongest lever | qa-manual, qa-automation, designer review, superpowers reviewers |
| Scorecards with hard thresholds | Anthropic harness design: objective criteria (design quality, originality, craft, functionality) with thresholds | QA, design review templates |
| Contract review before building | Anthropic "sprint contracts": generator and evaluator agree on testable criteria first | /mvp-milestone §1.3, TEST-PLAN |
| High-level PRD; plans specify contracts and tests, not implementations; plans written just-in-time per milestone | Anthropic: detailed upfront specs cascaded errors downstream | CONSTITUTION §superpowers.3, architect |
| One feature at a time, end-to-end browser testing, a known start script | Anthropic long-running harness: premature "done" and untested features are the top failure modes | superpowers SDD, playwright-cli, app.sh |
| Board mutated only by a CLI | Anthropic: models overwrite markdown feature lists more readily than structured files | role-guard blocks docs/tasks, board.py |
| Deterministic hooks over prompt rules | Claude Code best practices: CLAUDE.md is advisory, hooks are guaranteed | .claude/hooks |
| CLAUDE.md as a short map, details in skills/docs | Claude Code best practices; OpenAI harness engineering ("a map, not a manual") | CLAUDE.md → CONSTITUTION → skills |
| Built-in `/goal` instead of a custom stop-hook loop | Native: evaluator per turn, stall detection, resume, usage-limit pauses | /mvp-autopilot |
| Concise tool output, logs to files | Anthropic C-compiler project: verbose harness output pollutes context; agents are time-blind | quality-gate.sh, app.sh |
| Knowledge that compounds (`docs/solutions`, lessons, gardening) | Compound Engineering; OpenAI "garbage collection" of drift | constitution, architect gardening |
| Subagents by default, Agent Teams optional | Agent Teams are experimental, costlier, not resumable; best for peer discussion | OPERATIONS.md |
| opus for planning, sonnet for work | cost vs. quality: planning errors cascade, implementation is verified by tests and reviewers | agent frontmatter |
| superpowers as the engineering engine | mature TDD/plan/review discipline; explicitly lets CLAUDE.md override its rules | CONSTITUTION §superpowers |

## Known limitations
- The LLM protocol is validated only by running it: pilot on a small idea, read the reports, then tune prompts (especially evaluator strictness) where the team diverges from your judgment.
- Serial implementation (superpowers) trades speed for fewer conflicts.
- Costs are significant; see README and OPERATIONS.
- Non-JS stacks need `team/config.sh` commands and adjusted test-pyramid defaults.

## Sources
- Anthropic — [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- Anthropic — [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- Anthropic — [Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler)
- OpenAI — [Harness engineering](https://openai.com/index/harness-engineering/)
- Claude Code docs — [Best practices](https://code.claude.com/docs/en/best-practices), [Subagents](https://code.claude.com/docs/en/sub-agents), [Agent teams](https://code.claude.com/docs/en/agent-teams), [Hooks](https://code.claude.com/docs/en/hooks), [/goal](https://code.claude.com/docs/en/goal), [Workflows](https://code.claude.com/docs/en/workflows)
- [obra/superpowers](https://github.com/obra/superpowers) · [garrytan/gstack](https://github.com/garrytan/gstack) · [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin) · [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) · [GitHub Spec Kit](https://github.com/github/spec-kit)
- Tools — [playwright-cli](https://github.com/microsoft/playwright-cli), [Playwright Test Agents](https://playwright.dev/docs/test-agents), [Strix](https://github.com/usestrix/strix), [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp), [context7](https://github.com/upstash/context7), [claude-mem](https://github.com/thedotmack/claude-mem), [OmniRoute](https://github.com/diegosouzapw/OmniRoute)
