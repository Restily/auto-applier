"""Account deletion port: one purge step per store that holds user data outside Postgres."""

from typing import Protocol
from uuid import UUID


class AccountPurgeStep(Protocol):
    name: str

    async def purge(self, user_id: UUID) -> None:
        """Remove this store's data for `user_id`; idempotent."""
        ...
