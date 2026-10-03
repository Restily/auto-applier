"""RFC 9457 problem details schema (`application/problem+json`)."""

from pydantic import BaseModel


class FieldError(BaseModel):
    loc: list[str | int]
    type: str


class Problem(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    code: str
    errors: list[FieldError] | None = None
