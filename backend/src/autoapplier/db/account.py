"""Schema introspection for user-owned tables (the export and deletion coverage checks)."""

from uuid import UUID

import asyncpg

_OWNED_SQL = """
select n.nspname as schema, c.relname as table, a.attname as column, k.confdeltype::text as action
from pg_constraint k
join pg_class c on c.oid = k.conrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
where k.contype = 'f'
  and k.confrelid = 'auth.users'::regclass
  and n.nspname not in ('auth', 'storage', 'vault', 'pg_catalog', 'information_schema')
order by n.nspname, c.relname
"""


def _quote(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


async def user_owned_tables(pool: asyncpg.Pool) -> list[tuple[str, str, str]]:
    """`(schema, table, fk delete action)` for every foreign key to `auth.users`."""
    rows = await pool.fetch(_OWNED_SQL)
    return [(r["schema"], r["table"], r["action"]) for r in rows]


async def count_user_rows(pool: asyncpg.Pool, user_id: UUID) -> dict[str, int]:
    """Rows per user-owned table (`schema.table`), on the service pool (bypasses RLS)."""
    counts: dict[str, int] = {}
    for row in await pool.fetch(_OWNED_SQL):
        # Identifiers come from pg_catalog and are quoted; the user id is a bind parameter.
        query = (
            f"select count(*) from {_quote(row['schema'])}.{_quote(row['table'])} "  # noqa: S608
            f"where {_quote(row['column'])} = $1"
        )
        counts[f"{row['schema']}.{row['table']}"] = int(await pool.fetchval(query, user_id))
    return counts
