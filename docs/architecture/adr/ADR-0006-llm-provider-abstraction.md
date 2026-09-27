# ADR-0006: Provider-agnostic LLM layer (Claude default, pluggable, deterministic fake)

- Status: accepted
- Date: 2026-09-27
- Deciders: architect

## Context
AI is used for resume → profile extraction (<60 s), structuring free-text vacancy posts, match scoring with reasons, and cover letters in the vacancy's language (<20 s). The human requires Claude by default with OpenAI/OpenRouter pluggable by configuration, and a deterministic fake in tests. Tests and QA never call a live LLM (AUTONOMY: live calls only with a human-provided key, ≤50 per milestone). LLM cost matters (cheap tier for structuring/scoring, caching per vacancy). AI outages must delay work, not lose it.

## Options considered
1. **Own thin port (`LLMProvider` Protocol) with one adapter per SDK**: `anthropic` SDK (MIT) for Claude; `openai` SDK (Apache-2.0) for OpenAI and OpenRouter (OpenAI-compatible base URL); a fake.
2. LiteLLM as a universal client: one dependency covers all providers, but a large surface, frequent breaking changes and its own config conventions.
3. LangChain: far more than we need.

## Decision
- Port in `backend/src/autoapplier/ports/llm.py`: frozen dataclasses `LLMMessage`, `LLMRequest(task, system, messages, tier: "fast"|"smart", max_output_tokens, temperature, json_schema)`, `LLMUsage`, `LLMResponse(text, data, provider, model, usage)`; errors `LLMError` → `LLMUnavailableError` (retryable: timeouts, 429, 5xx) and `LLMConfigError`; `class LLMProvider(Protocol): name: str; async def complete(self, request: LLMRequest) -> LLMResponse`.
- **Model tiers, not model ids, in code:** services ask for `tier="fast"` (structuring, scoring) or `"smart"` (resume extraction, cover letters). Ids come from settings `LLM_MODEL_FAST` / `LLM_MODEL_SMART`; M1 sets current Claude ids after checking Anthropic's model list.
- **Selection by configuration:** `LLM_PROVIDER = fake | anthropic | openai | openrouter` (+ `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, optional `LLM_BASE_URL`). A registry in `autoapplier/adapters/llm/registry.py` maps names to factories; `build_llm_provider(settings)` raises `LLMConfigError` for an unregistered name or a missing key. Default in `.env.example` is `fake` (no key needed locally).
- **Structured output:** when `json_schema` is set the adapter uses the provider's structured-output/tool mechanism and validates `data` against the schema; invalid output → one retry, then `LLMError`.
- **Deterministic fake** (`adapters/llm/fake.py`): output is a pure function of the request (SHA-256 fingerprint of canonical JSON), with per-task fixtures from `backend/tests/fixtures/llm/<task>.json`, call recording, and scripted failures (`fail_next`). **`APP_ENV=test` refuses any provider other than `fake`** (settings validation), so tests cannot hit a live model.
- Resilience: LLM work runs in queue jobs with retry/backoff on `LLMUnavailableError`; inputs are persisted before the call, so outages delay but lose nothing. Results are cached per vacancy (structuring) and per (profile version, vacancy) (scoring).
- M0 ships the port, the fake, the registry and settings; M1 adds the Anthropic adapter (first use: S-003) with recorded HTTP fixtures (respx), and the OpenAI-compatible adapter.

## Consequences
- Positive: no vendor lock-in; tests are fast and reproducible; cost control via tiers.
- Negative: provider-specific features (prompt caching, batch) are only reachable through adapter options; each adapter needs its own recorded fixtures.
