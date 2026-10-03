"""Account API schemas."""

from pydantic import BaseModel, Field


class AccountDeletionRequest(BaseModel):
    confirm_email: str = Field(min_length=1, max_length=320)
