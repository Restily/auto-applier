"""`GET /v1/me`: who the access token belongs to."""

from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel

from autoapplier.api.auth import CurrentUser
from autoapplier.api.schemas.problem import Problem

router = APIRouter(prefix="/v1")


class MeResponse(BaseModel):
    user_id: UUID
    email: str | None


@router.get(
    "/me", response_model=MeResponse, responses={401: {"model": Problem}}, operation_id="get_me"
)
async def get_me(user: CurrentUser) -> MeResponse:
    return MeResponse(user_id=user.user_id, email=user.email)
