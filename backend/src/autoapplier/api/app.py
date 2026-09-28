"""FastAPI app factory (Task 6): builds/closes the `Container` in its lifespan."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from autoapplier import __version__
from autoapplier.api.errors import install_problem_handlers
from autoapplier.api.routes.health import router as health_router
from autoapplier.api.routes.me import router as me_router
from autoapplier.api.routes.resumes import router as resumes_router
from autoapplier.config import Settings, get_settings
from autoapplier.wiring import Container, build_container, close_container


def create_app(settings: Settings | None = None, *, container: Container | None = None) -> FastAPI:
    """Build the AutoApplier FastAPI app.

    Without `container`, the lifespan builds one from `settings` (or the process-wide
    `get_settings()` if `settings` is omitted) on startup and closes it on shutdown.
    With `container`, that object is set on `app.state.container` immediately — so it is
    available even without running the lifespan (e.g. httpx `ASGITransport` alone, which
    does not run lifespan events) — and the lifespan leaves it alone.
    """
    resolved_settings = settings if settings is not None else get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if container is not None:
            yield
            return
        built = await build_container(resolved_settings)
        app.state.container = built
        try:
            yield
        finally:
            await close_container(built)

    app = FastAPI(title="AutoApplier API", version=__version__, lifespan=lifespan)
    app.state.container = container
    install_problem_handlers(app)
    app.include_router(health_router)
    app.include_router(me_router)
    app.include_router(resumes_router)
    return app
