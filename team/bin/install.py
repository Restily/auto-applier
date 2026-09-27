#!/usr/bin/env python3
"""install.py — add the AI team to a new or existing project without clobbering it.

  python3 team/bin/install.py ~/code/my-app --new     # create folder, git init, install, first commit
  python3 team/bin/install.py ~/code/existing-app     # add the team to an existing repo

Copies .claude/{agents,skills,hooks}, team/, .github/workflows (only missing files), deep-merges
.claude/settings.json and .mcp.json, adds `@team/CONSTITUTION.md` to CLAUDE.md, extends .gitignore,
then runs `board.py init`. Existing files are never overwritten (use --force for team/ and .claude/ files).
"""
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[2]
COPY_TREES = [".claude/agents", ".claude/skills", ".claude/hooks", "team", ".github/workflows"]
COPY_FILES = ["docs/README.md"]


def merge(base, extra):
    """Deep merge: dicts recursively, lists as ordered union, scalars keep the base value."""
    if isinstance(base, dict) and isinstance(extra, dict):
        out = dict(base)
        for k, v in extra.items():
            out[k] = merge(base[k], v) if k in base else v
        return out
    if isinstance(base, list) and isinstance(extra, list):
        out = list(base)
        for v in extra:
            if v not in out:
                out.append(v)
        return out
    return base


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def copy_tree(src: Path, dst: Path, force: bool, log: list) -> None:
    for f in src.rglob("*"):
        if f.is_dir() or "__pycache__" in f.parts:
            continue
        target = dst / f.relative_to(src)
        if target.exists() and not force:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, target)
        log.append(str(target))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("target")
    ap.add_argument("--new", action="store_true", help="create the folder and git repo")
    ap.add_argument("--force", action="store_true", help="overwrite existing team files (.claude/*, team/)")
    args = ap.parse_args()
    dst = Path(args.target).expanduser().resolve()
    if dst == SRC:
        sys.exit("target is this template itself")
    if args.new:
        dst.mkdir(parents=True, exist_ok=True)
        if not (dst / ".git").exists():
            subprocess.run(["git", "init", "-b", "main"], cwd=dst, check=True)
    elif not dst.exists():
        sys.exit(f"{dst} does not exist (use --new)")

    copied = []
    for tree in COPY_TREES:
        if (SRC / tree).exists():
            copy_tree(SRC / tree, dst / tree, args.force, copied)
    for rel in COPY_FILES:
        s, d = SRC / rel, dst / rel
        if s.exists() and not d.exists():
            d.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(s, d)
    for name in (".claude/settings.json", ".mcp.json"):
        target = dst / name
        merged = merge(load_json(target), load_json(SRC / name))
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    claude_md = dst / "CLAUDE.md"
    if not claude_md.exists():
        shutil.copy2(SRC / "CLAUDE.md", claude_md)
    elif "@team/CONSTITUTION.md" not in claude_md.read_text(encoding="utf-8"):
        with claude_md.open("a", encoding="utf-8") as fh:
            fh.write("\n\n## AI team\nThis project is built by an AI team. Team rules:\n\n@team/CONSTITUTION.md\n\n## Lessons learned\n")

    gi_src = (SRC / ".gitignore").read_text(encoding="utf-8").splitlines()
    gi = dst / ".gitignore"
    have = gi.read_text(encoding="utf-8").splitlines() if gi.exists() else []
    missing = [line for line in gi_src if line and line not in have]
    if missing:
        with gi.open("a", encoding="utf-8") as fh:
            fh.write(("\n" if have else "") + "\n".join(missing) + "\n")

    for pattern in (".claude/hooks/*", "team/bin/*"):
        for f in dst.glob(pattern):
            if f.suffix in (".sh", ".py"):
                f.chmod(0o755)
    subprocess.run([sys.executable, str(dst / "team/bin/board.py"), "init"], cwd=dst, check=False)
    if args.new:
        subprocess.run(["git", "add", "-A"], cwd=dst, check=False)
        subprocess.run(["git", "commit", "-qm", "chore: add AI product team"], cwd=dst, check=False)
    print(f"✓ AI team installed into {dst} ({len(copied)} files copied)")
    print("  Next: cd there → bash team/bin/setup.sh → claude → /mvp-kickoff <idea>")


if __name__ == "__main__":
    main()
