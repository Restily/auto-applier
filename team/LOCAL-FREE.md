# Running the team on free LLMs (local model + free API tiers)

Everything in the stack except the model is already free and local: Claude Code, superpowers, Supabase (local), Playwright, ui-ux-pro-max, context7 (free tier), Strix (open source). This guide replaces the one paid part — the LLM — with a local model and, optionally, free cloud tiers.

**How it works.** Claude Code accepts any backend that speaks the Anthropic Messages API (`ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN`). While the token is set, your claude.ai subscription isn't used — no Anthropic account is needed. The roles pin the aliases `opus` / `sonnet` / `haiku`, so three env vars (`ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL`) re-route every role at once — the same mechanism as the OmniRoute setup in SETUP.md.

This is for **local** runs. In a claude.ai cloud session the model comes from your Claude plan.

## Read this first
- **Unsupported by Anthropic.** Claude Code docs: Anthropic "doesn't support routing Claude Code to non-Claude models through any gateway". It works in practice, but a Claude Code update can break a feature until Ollama/LiteLLM catch up — re-run `team/bin/llm-check.sh` after upgrading either side.
- **Quality drops, the bar doesn't.** The protocols are tuned for Claude. Open models ≤30B call tools reliably but are weaker at long-horizon planning, reviews and following long skills. The gates, QA and review still decide "done", so a weaker model shows up as more fix rounds and more `needs_human` escalations — slower, not worse shipped code.
- **Volume beats free quotas.** Every tool turn is a request carrying Claude Code's system prompt and tool schemas (tens of thousands of tokens). A milestone is hundreds to thousands of requests. Free cloud tiers are capped per day (table below), so they can't carry the worker tier. Rule: **the local model does the volume; free cloud (optional) does the few planning calls.**
- **Privacy.** Several free tiers train on your prompts (Gemini outside the EU/UK/CH, Mistral's free tier, some OpenRouter free models, Kilo). Don't send proprietary code there; the local model keeps everything on your machine.
- **Don't use "free Claude" resellers** or shared-subscription proxies: they breach Anthropic's terms and see all your code and keys.

## Pick a profile
| Profile | `opus` (lead, architect, review) | `sonnet` / `haiku` (all other roles) | Needs | Use for |
|---|---|---|---|---|
| **A. Local only** | local | local | GPU with 16–24 GB VRAM, or Apple Silicon with 32 GB+ | offline, private, unlimited; weakest planning |
| **B. Hybrid** (recommended) | free cloud pool → falls back to local | local | A + free API keys | best quality at $0 |
| **C. Cloud-free only** | free cloud | free cloud | no GPU | a pilot only — daily caps stop runs mid-milestone |

## 1. Local model (profiles A, B)
Ollama ≥ 0.14 and LM Studio ≥ 0.4.1 serve the Anthropic `/v1/messages` API natively — no proxy needed for profile A.

```bash
# install Ollama (https://ollama.com/download), then start it with a context big enough for Claude Code
export OLLAMA_CONTEXT_LENGTH=65536      # 32k is the bare minimum; below that sessions derail after a few turns
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_KV_CACHE_TYPE=q8_0        # halves KV-cache memory at 64k context
export OLLAMA_NUM_PARALLEL=1            # keep equal to TEAM_WAVE_MAX; each parallel slot costs KV memory
ollama serve &
ollama pull qwen3-coder:30b
```

| Model (Ollama tag) | Memory (Q4 + 64k ctx) | Notes |
|---|---|---|
| `qwen3-coder:30b` | ~24 GB VRAM / 32 GB+ unified | default here: MoE with ~3B active params → fast; built for agentic coding |
| `gpt-oss:20b` | ~16 GB VRAM / 24 GB unified | easiest start, solid tool use; for smaller GPUs |
| Gemma 4 26B-A4B | ~24 GB / 32 GB+ unified | tool use trained in; strong on Apple Silicon |
| any model | — | must be trained for tool calling; run `team/bin/llm-check.sh` before trusting it |

Other runtimes: LM Studio (native `/v1/messages`), vLLM (`--enable-auto-tool-choice` + the model's `--tool-call-parser`), llama.cpp server (partial; needs `--jinja`). OpenAI-only servers go behind LiteLLM (step 3).

## 2. Free API keys (profiles B, C) — as of September 2026
Limits change often; check each provider's page before relying on them.

| Provider | Free (no card) | Limits | Good models for this team | Caveats |
|---|---|---|---|---|
| [OpenRouter](https://openrouter.ai/collections/free-models) | 20+ `:free` models | 20 req/min, **50 req/day**; 1,000/day after a one-time $10 top-up | Qwen3 Coder, gpt-oss-120b, GLM, Kimi, DeepSeek (rotating) | one shared quota across free models; some free endpoints log prompts |
| [NVIDIA NIM](https://build.nvidia.com) | hosted open models | ~40 req/min | Qwen3 Coder 480B, Nemotron, Llama, DeepSeek | phone verification |
| [Google AI Studio](https://aistudio.google.com) | Gemini Flash / Flash-Lite, Gemma | tight since April 2026 (≈20 req/day on some models) | `gemini-flash-latest` | trains on prompts outside EU/UK/CH |
| [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) | 20+ models | 10,000 neurons/day | gpt-oss-120b, GLM, Llama 3.3 70B | OpenAI-compatible only partly |
| [Groq](https://console.groq.com) | Llama 3.3 70B, gpt-oss, Qwen | 1,000 req/day, **~12k tokens/min** | — | TPM below one Claude Code request → fails; OK for Strix/small jobs |
| [Cerebras](https://cloud.cerebras.ai) | Llama, Qwen, gpt-oss | ~1M tokens/day | — | free-tier context may be too small for Claude Code |
| [Mistral](https://console.mistral.ai) | Codestral, Mistral Small/Medium | generous monthly tokens | Codestral, Devstral | requires opting in to training; phone verification |
| [GitHub Models](https://github.com/marketplace/models) | GPT-4o-class, Llama, Phi | 50–150 req/day, small request size | — | per-request token caps too small for Claude Code |

**Pool for `team-plan`:** OpenRouter + NVIDIA NIM + Gemini, rotated by LiteLLM (a 429 cools one provider down and the next one is used), falling back to the local model when all are exhausted. Planning calls are few, so this pool usually lasts a milestone. **Trial credits** (not free-forever): DeepSeek, SambaNova, Fireworks, Nebius, Baseten.

## 3. Gateway — LiteLLM (profiles B, C)
LiteLLM exposes `/v1/messages` and translates to any provider. OmniRoute (already in SETUP.md) or claude-code-router work too; the tier names below are what matters.

```bash
pipx install 'litellm[proxy]'                     # or: pip install 'litellm[proxy]'
export OPENROUTER_API_KEY=... NVIDIA_NIM_API_KEY=... GEMINI_API_KEY=...   # only the ones you have
# edit team/examples/litellm.free.yaml: delete deployments without keys, check current free model IDs
litellm --config team/examples/litellm.free.yaml --host 127.0.0.1 --port 4000
```
Tiers: `team-plan` (← `opus`), `team-work` (← `sonnet`), `team-fast` (← `haiku`: `/goal` evaluator, summaries). For profile C, swap the local `team-work`/`team-fast` entries for cloud ones (commented example in the YAML) and expect to hit daily caps.

## 4. Point the team at it
```bash
cp team/examples/free-local.settings.local.json  .claude/settings.local.json   # profile A (Ollama directly)
cp team/examples/free-hybrid.settings.local.json .claude/settings.local.json   # profile B/C (LiteLLM on :4000)
# already have a settings.local.json? merge the "env" block instead of overwriting

bash team/bin/llm-check.sh     # every tier must print "OK tool_use"
bash team/bin/doctor.sh
claude                         # if it asks you to log in, the env isn't loaded — see Troubleshooting
```
What the profile sets: the base URL and token; the three alias mappings; `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` (no calls to Anthropic); `API_TIMEOUT_MS=600000` (slow local prefill); `CLAUDE_CODE_MAX_OUTPUT_TOKENS=16000` (fits a 64k context); `TEAM_WAVE_MAX` 1–2 (one GPU and free rate limits don't benefit from 4 parallel implementers); Strix routed to the same backend.

Smoke-test the whole loop before a real product: in a scratch project, ask Claude to "add a /health route with a Vitest test, run the tests and fix failures". If it edits files, runs tests and finishes, the backend is usable.

## 5. Tune the team for weaker models
- **Pilot step by step** (`/mvp-milestone M0`, then M1) before `/mvp-autopilot`; read the reports and see where it struggles.
- **Keep every gate on** (`dev-gate`, `role-guard`, `board.py gate`). They are what keep a weaker model honest.
- **Thinner milestones and smaller tasks** — ask the lead for more, smaller vertical slices at kickoff; small models do much better on narrow tasks.
- **Upgrade only the tier that fails.** If planning or review is the bottleneck, point just `ANTHROPIC_DEFAULT_OPUS_MODEL` at a stronger (possibly paid) model and keep workers local — most requests are worker requests, so this costs little.
- **Skip claude-mem** (it runs a model in the background on every session).
- **Web search:** the WebSearch tool runs server-side at Anthropic, so expect it to fail on other backends. context7 (library docs) and WebFetch keep working.

## 6. Strix on free models
The profiles already set it: profile A → `STRIX_LLM=ollama/qwen3-coder:30b`, `LLM_API_BASE=http://localhost:11434`, placeholder `LLM_API_KEY=local` (Ollama ignores it; the security gate only checks it's set); profile B → `STRIX_LLM=openai/team-work` through LiteLLM. Strix finds less with small models: treat a local run as a smoke pass; the security-auditor's triage and the release gate still apply.

## Troubleshooting
| Symptom | Cause → fix |
|---|---|
| The model describes changes ("I would edit…") but nothing happens; `llm-check` says "answered in prose" | no tool calling or wrong chat template → use a tool-trained model, update Ollama/LM Studio, `--jinja` for llama.cpp |
| Works for a few turns, then truncated edits or dropped tool arguments | context too small → `OLLAMA_CONTEXT_LENGTH=65536`, restart `ollama serve` |
| `429`, "quota exceeded", "request too large" | free cap or TPM hit → LiteLLM cools that provider down and falls back; lower `TEAM_WAVE_MAX`; remove providers whose TPM/context is below one request; wait for the daily reset |
| Claude Code asks to log in / uses your Claude account | env not loaded → check `.claude/settings.local.json`, or `export` the variables in the shell; `/status` should show the custom base URL |
| Timeouts on long prompts | raise `API_TIMEOUT_MS`; a smaller model or shorter context |
| Out of memory / swapping | smaller model or quantization, `OLLAMA_KV_CACHE_TYPE=q8_0`, `OLLAMA_NUM_PARALLEL=1`, smaller context |
| Reviews rubber-stamp or loop past 3 rounds | the planning tier is too weak → upgrade only `ANTHROPIC_DEFAULT_OPUS_MODEL` |

## Sources
- Claude Code — [LLM gateways (incl. subscriptions and support scope)](https://code.claude.com/docs/en/llm-gateway), [connect to a gateway](https://code.claude.com/docs/en/llm-gateway-connect), [gateway compatibility guide](https://code.claude.com/docs/en/llm-gateway-protocol), [environment variables](https://code.claude.com/docs/en/env-vars)
- [Claude Code with local LLMs via ANTHROPIC_BASE_URL (Ollama, LM Studio, llama.cpp, vLLM)](https://renezander.com/guides/claude-code-local-llm-anthropic-base-url/) · [LiteLLM: Claude Code setup](https://docs.litellm.ai/docs/proxy/client_setup/claude_code)
- Free tiers — [OpenRouter: Free LLM APIs compared (2026)](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/) · [cheahjs/free-llm-api-resources](https://github.com/cheahjs/free-llm-api-resources) · [Gemini API rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) · [Gemini free-tier cut, April 2026](https://github.com/robhunter/agentdeals/issues/2017) · [OpenRouter free models](https://openrouter.ai/collections/free-models)
