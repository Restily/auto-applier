"""Shared pytest fixtures.

Forces a safe test environment (fake LLM provider, no live calls) before
`autoapplier` is imported anywhere in the test session, so a cached
`get_settings()` can never pick up a real provider or a developer's local
`.env` file.
"""

import os

os.environ["APP_ENV"] = "test"
os.environ["LLM_PROVIDER"] = "fake"

import pytest

from autoapplier.config import Settings


@pytest.fixture
def settings() -> Settings:
    """A Settings instance built only from process env (no `.env` file)."""
    return Settings(_env_file=None)
