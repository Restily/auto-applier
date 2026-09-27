"""Guards against OpenAPI drift (Task 6): `backend/openapi.json` is generated, never hand-edited.

`npm run gen:openapi` regenerates it from the running app's schema; this test fails loudly,
with the regeneration command, the moment the two disagree.
"""

from autoapplier.api.export_openapi import export_openapi
from autoapplier.config import BACKEND_DIR


def test_committed_openapi_matches_app() -> None:
    committed = (BACKEND_DIR / "openapi.json").read_text()

    assert committed == export_openapi(), "OpenAPI drift: run npm run gen:api-types"
