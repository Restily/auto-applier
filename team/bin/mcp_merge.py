#!/usr/bin/env python3
"""mcp_merge.py BACKUP TARGET — restore MCP servers that a tool overwrote in .mcp.json.

`npx playwright init-agents --loop=claude` may replace .mcp.json with only its own server.
This merges servers from BACKUP into TARGET (TARGET wins on name clashes) and writes TARGET.
"""
import json
import sys
from pathlib import Path


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    backup, target = Path(sys.argv[1]), Path(sys.argv[2])
    old, new = load(backup), load(target)
    servers = dict(old.get("mcpServers", {}))
    servers.update(new.get("mcpServers", {}))
    merged = {**old, **new, "mcpServers": servers}
    target.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    print(f"✓ {target}: {', '.join(sorted(servers)) or '(no servers)'}")


if __name__ == "__main__":
    main()
