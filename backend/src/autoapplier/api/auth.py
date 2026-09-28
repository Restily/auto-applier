"""Bearer-token authentication dependency for `/v1`."""

from typing import Annotated, cast

from fastapi import Depends, Request

from autoapplier.api.errors import ApiProblem
from autoapplier.ports.auth import AuthClaims, InvalidTokenError
from autoapplier.wiring import Container

_CHALLENGE = {"WWW-Authenticate": "Bearer"}


async def current_user(request: Request) -> AuthClaims:
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    token = token.strip()
    if scheme.lower() != "bearer" or not token:
        raise ApiProblem(401, "auth.missing_token", "Authentication required", headers=_CHALLENGE)
    container = cast(Container, request.app.state.container)
    try:
        return await container.tokens.verify(token)
    except InvalidTokenError:
        raise ApiProblem(
            401, "auth.invalid_token", "Invalid or expired token", headers=_CHALLENGE
        ) from None


CurrentUser = Annotated[AuthClaims, Depends(current_user)]
