# anthropic-sdk-httpx2-respx

_2026-09-28 · Tags: anthropic SDK 1.8, respx, httpx2, live LLM call in tests, 401 sk-test_

## Symptom
Contract tests for the Anthropic adapter, written with `respx`, still sent real requests to api.anthropic.com (401 with the dummy key `sk-test`).

## Root cause
The installed `anthropic` SDK (1.8.0) uses the separate `httpx2` package for transport, not `httpx`. `respx` only patches `httpx`, so it intercepts nothing.

## Fix
Inject a client built on a mock transport: `anthropic.AsyncAnthropic(api_key="test", http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handler)))`. Nothing leaves the process.

## Prevention
- Never rely on respx for SDKs that ship their own HTTP stack.
- Tests must run with no network access to LLM hosts. Consider a pytest fixture that fails if a socket to *.anthropic.com is opened.
- The `respx` dev dependency from M1 Task 0A is unused by these tests.
