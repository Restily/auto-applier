"""ASGI entry point (Task 6): `uvicorn autoapplier.api.main:app` (`npm run dev:api`)."""

from autoapplier.api.app import create_app

app = create_app()
