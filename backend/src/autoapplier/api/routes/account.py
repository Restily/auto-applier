"""Account routes: `GET /v1/account/export` and `POST /v1/account/deletion` (S-006)."""

from datetime import UTC, datetime
from typing import cast

from fastapi import APIRouter, Request, Response

from autoapplier.api.auth import CurrentUser
from autoapplier.api.errors import ApiProblem
from autoapplier.api.schemas.account import AccountDeletionRequest
from autoapplier.api.schemas.problem import Problem
from autoapplier.domain.account import AccountExport, export_filename
from autoapplier.services.account_deletion import AccountDeletionFailed, ConfirmationMismatch
from autoapplier.wiring import Container

router = APIRouter(prefix="/v1/account")


def _container(request: Request) -> Container:
    return cast(Container, request.app.state.container)


@router.get(
    "/export",
    response_model=AccountExport,
    operation_id="export_account",
    responses={401: {"model": Problem}},
)
async def export_account(request: Request, response: Response, user: CurrentUser) -> AccountExport:
    now = datetime.now(UTC)
    exported = await _container(request).account_export.export(user, now=now)
    response.headers["Content-Disposition"] = f'attachment; filename="{export_filename(now)}"'
    response.headers["Cache-Control"] = "no-store"
    return exported


@router.post(
    "/deletion",
    status_code=204,
    response_class=Response,
    operation_id="delete_account",
    responses={401: {"model": Problem}, 422: {"model": Problem}, 502: {"model": Problem}},
)
async def delete_account(
    request: Request, user: CurrentUser, body: AccountDeletionRequest
) -> Response:
    try:
        await _container(request).account_deletion.delete(user, confirm_email=body.confirm_email)
    except ConfirmationMismatch:
        raise ApiProblem(
            422, "account.confirmation_mismatch", "Typed email does not match your account"
        ) from None
    except AccountDeletionFailed:
        raise ApiProblem(
            502, "account.delete_failed", "Account deletion failed; nothing was removed, try again"
        ) from None
    return Response(status_code=204)
