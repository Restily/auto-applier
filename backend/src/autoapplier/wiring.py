"""Composition root: wires services to port implementations for api and worker (Task 6).

`build_container` assembles one `Container` per process from `Settings` — an asyncpg pool,
an async Redis client, the `HealthService` (wired to `DatabaseProbe`/`QueueProbe`), the
configured `LLMProvider` and a `CeleryJobQueue`. Every piece is lazy (no socket opens at
build time: `db.pool.create_pool` uses `min_size=0`, `kv.client.create_async_redis` and
`adapters.queue.celery_factory.create_celery_app` connect on first use), so this never
raises just because Postgres or Valkey happen to be unreachable — that surfaces as a
"down" health check instead (`services.health.HealthService`, ADR-0012 Review Focus #1).
"""

from dataclasses import dataclass

import asyncpg
import httpx
import redis
from celery import Celery
from pydantic import SecretStr

from autoapplier import __version__
from autoapplier.adapters.auth.gotrue_admin import GoTrueAdmin
from autoapplier.adapters.auth.jwt_verifier import JwtVerifier
from autoapplier.adapters.documents.pypdf_docx import PyPdfDocxTextExtractor
from autoapplier.adapters.llm.registry import build_llm_provider
from autoapplier.adapters.queue.celery_factory import create_celery_app
from autoapplier.adapters.queue.celery_queue import CeleryJobQueue
from autoapplier.adapters.storage.supabase import SupabaseStorage
from autoapplier.config import Settings
from autoapplier.db.pool import create_pool
from autoapplier.db.probes import DatabaseProbe
from autoapplier.db.resumes import PgResumeStore
from autoapplier.kv.client import create_async_redis
from autoapplier.kv.probes import QueueProbe
from autoapplier.ports.auth import AuthAdmin, TokenVerifier
from autoapplier.ports.documents import DocumentTextExtractor
from autoapplier.ports.llm import LLMProvider
from autoapplier.ports.queue import JobQueue
from autoapplier.ports.storage import FileStorage
from autoapplier.services.account_deletion import AccountDeletionService, ResumeFilesPurge
from autoapplier.services.account_export import AccountExportService
from autoapplier.services.health import HealthService
from autoapplier.services.resume_extraction import ResumeExtractionService
from autoapplier.services.resumes import ResumeService


@dataclass
class Container:
    """Everything one process (the API, or a worker) needs, built once and reused."""

    settings: Settings
    pool: asyncpg.Pool
    redis: redis.asyncio.Redis
    health: HealthService
    llm: LLMProvider
    queue: JobQueue
    celery_app: Celery
    http: httpx.AsyncClient
    tokens: TokenVerifier
    auth_admin: AuthAdmin
    storage: FileStorage
    documents: DocumentTextExtractor
    resumes: ResumeService
    resume_extraction: ResumeExtractionService
    account_export: AccountExportService
    account_deletion: AccountDeletionService


async def build_container(settings: Settings) -> Container:
    """Build a `Container` from `settings`. Never raises when Postgres or Valkey are down."""
    pool = await create_pool(settings.database_url)
    redis_client = create_async_redis(settings.redis_url)
    celery_app = create_celery_app(settings)
    health = HealthService(
        [
            DatabaseProbe(pool),
            QueueProbe(
                redis_client,
                key_prefix=settings.redis_key_prefix,
                max_heartbeat_age_s=settings.queue_heartbeat_max_age_s,
            ),
        ],
        version=__version__,
        timeout_s=settings.health_probe_timeout_s,
    )
    http = httpx.AsyncClient(timeout=httpx.Timeout(10.0))
    issuer = f"{settings.supabase_url}/auth/v1"
    # No secret key configured: the admin adapters still build and fail on first use, so a
    # missing key never breaks startup or /health (build_container never raises).
    secret_key = settings.supabase_secret_key or SecretStr("")
    llm = build_llm_provider(settings)
    queue = CeleryJobQueue(celery_app)
    storage = SupabaseStorage(base_url=settings.supabase_url, secret_key=secret_key, http=http)
    documents = PyPdfDocxTextExtractor()
    resume_store = PgResumeStore(pool)
    auth_admin = GoTrueAdmin(base_url=settings.supabase_url, secret_key=secret_key, http=http)
    # M3/M4 append purge steps for their own stores here.
    purge_steps = [ResumeFilesPurge(storage)]
    return Container(
        settings=settings,
        pool=pool,
        redis=redis_client,
        health=health,
        llm=llm,
        queue=queue,
        celery_app=celery_app,
        http=http,
        tokens=JwtVerifier(
            issuer=issuer,
            jwks_url=f"{issuer}/.well-known/jwks.json",
            http=http,
            hs256_secret=settings.supabase_jwt_secret,
            cache_ttl_s=settings.auth_jwks_cache_ttl_s,
        ),
        auth_admin=auth_admin,
        storage=storage,
        documents=documents,
        resumes=ResumeService(resume_store, storage, queue),
        resume_extraction=ResumeExtractionService(resume_store, storage, documents, llm),
        account_export=AccountExportService(pool),
        account_deletion=AccountDeletionService(auth_admin, purge_steps),
    )


async def close_container(container: Container) -> None:
    """Close every resource, even if an earlier close raises.

    Exception-safe (M0 review, M2): each of the pool, the redis client and the
    Celery app's producer pool (`Celery.close()`) is closed in its own
    try/finally, so one raising never skips the others. If any close raised,
    the *first* such error is re-raised after every resource has been closed —
    callers (worker shutdown signals, API lifespan) see the failure rather than
    it being silently swallowed.
    """
    first_error: BaseException | None = None
    try:
        await container.pool.close()
    except Exception as exc:  # collected below, re-raised, never swallowed
        first_error = exc
    finally:
        try:
            await container.redis.aclose()
        except Exception as exc:
            first_error = first_error or exc
        finally:
            try:
                container.celery_app.close()
            except Exception as exc:
                first_error = first_error or exc
            finally:
                try:
                    await container.http.aclose()
                except Exception as exc:
                    first_error = first_error or exc

    if first_error is not None:
        raise first_error
