#!/usr/bin/env python3
"""board.py — file-based kanban board for the AI product team.

Single source of truth for project state: docs/tasks/*.md (YAML frontmatter + markdown).
Agents change the board ONLY through this CLI (direct writes to docs/tasks are blocked by the
role-guard hook), so files don't get corrupted and gates decide on facts, not on model "feelings".
Python 3.9+, standard library only.

Cheat sheet:
  board.py init                                   create folder structure
  board.py new milestone "Foundations" --id M0    (--ui for milestones with UI, --release for MR)
  board.py new story "Title" --milestone M1 --owner frontend-dev --ac "Given… When… Then…" --ac "…"
  board.py new bug "Save button does nothing" --severity high --owner frontend-dev --body-file - < details.md
  board.py list [--milestone M1] [--status todo,qa] [--owner qa-manual] [--type bug] [--open] [--json]
  board.py show S-001 | ac S-001 | check S-001 2 --note "evidence" | note S-001 "text"
  board.py move S-001 in_progress --by backend-dev [--note "…"]
  board.py set S-001 plan=docs/superpowers/plans/x.md owner=backend-dev
  board.py next [--owner backend-dev]             what to work on next
  board.py wave [--milestone M1] [--max 4] [--json] next parallel-safe batch (deps closed, disjoint files)
  board.py gate M1 [--run-checks]                 milestone Definition of Done
  board.py status | brief | next-step             overview / session context / pipeline position
  board.py scaffold qa M1                         create a report from a template with the exact name
  board.py goal [--turns 200]                     condition text for the built-in /goal (autopilot)
  board.py validate | render                      validate board / regenerate docs/tasks/BOARD.md
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("TEAM_ROOT") or Path(__file__).resolve().parents[2])
TASKS = ROOT / "docs" / "tasks"
PRODUCT = ROOT / "docs" / "product"
QA_REPORTS = ROOT / "docs" / "qa" / "reports"
SECURITY = ROOT / "docs" / "security"
DESIGN_REVIEWS = ROOT / "docs" / "design" / "reviews"
TEMPLATES = ROOT / "team" / "templates"
STOP_FILE = ROOT / ".team" / "STOP"

TYPES = {"milestone": "M", "story": "S", "task": "T", "bug": "B"}
MILESTONE_STATUSES = ["todo", "planning", "building", "verifying", "done", "blocked"]
WORK_STATUSES = ["todo", "in_progress", "review", "qa", "done", "blocked", "deferred", "wontfix"]
CLOSED = {"done", "deferred", "wontfix"}
NOTE_REQUIRED = {"blocked", "deferred", "wontfix"}
ROLES = [
    "team-lead", "architect", "designer", "backend-dev", "frontend-dev",
    "qa-manual", "qa-automation", "security-auditor", "human",
]
PRIORITIES = ["P0", "P1", "P2", "P3"]
SEVERITIES = ["critical", "high", "medium", "low"]
BLOCKING_SEVERITIES = {"critical", "high"}
KEY_ORDER = [
    "id", "type", "title", "status", "milestone", "owner", "priority", "severity",
    "depends_on", "files", "plan", "ui", "release", "needs_human", "created", "updated",
]
BOOL_KEYS = {"ui", "release", "needs_human"}
LIST_KEYS = {"depends_on", "files"}
SETTABLE = {"title", "owner", "priority", "severity", "depends_on", "files", "plan", "milestone", "needs_human", "release", "ui"}
LOG = "## Log"
SKIP_FILES = {"BOARD.md", "README.md"}

SCAFFOLDS = {
    # kind: (template, destination; {ID} = milestone/story/ADR id or slug)
    "prd": ("PRD.md", "docs/product/PRD.md"),
    "roadmap": ("ROADMAP.md", "docs/product/ROADMAP.md"),
    "autonomy": ("AUTONOMY.md", "docs/product/AUTONOMY.md"),
    "architecture": ("ARCHITECTURE.md", "docs/architecture/ARCHITECTURE.md"),
    "tech-debt": ("TECH-DEBT.md", "docs/architecture/TECH-DEBT.md"),
    "adr": ("ADR.md", "docs/architecture/adr/{ID}.md"),
    "test-strategy": ("TEST-STRATEGY.md", "docs/qa/TEST-STRATEGY.md"),
    "test-plan": ("TEST-PLAN.md", "docs/qa/plans/{ID}-test-plan.md"),
    "tests": ("TEST-REPORT.md", "docs/qa/reports/{ID}-tests.md"),
    "qa": ("QA-REPORT.md", "docs/qa/reports/{ID}-qa.md"),
    "security": ("SECURITY-REPORT.md", "docs/security/{ID}-security.md"),
    "screen": ("SCREEN-SPEC.md", "docs/design/screens/{ID}.md"),
    "design-review": ("DESIGN-REVIEW.md", "docs/design/reviews/{ID}-design.md"),
    "milestone-report": ("MILESTONE-REPORT.md", "docs/product/changelog/{ID}.md"),
    "solution": ("SOLUTION.md", "docs/solutions/{ID}.md"),
}


# ----------------------------------------------------------------------------- utils

def today() -> str:
    return dt.date.today().isoformat()


def now() -> str:
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M")


def die(msg: str, code: int = 1) -> None:
    print(f"✗ {msg}", file=sys.stderr)
    sys.exit(code)


def slugify(text: str, limit: int = 40) -> str:
    out = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return out[:limit].rstrip("-") or "item"


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def milestone_key(mid: str):
    tail = str(mid)[1:]
    return (0, int(tail), mid) if tail.isdigit() else (1, 0, str(mid))


def item_key(item: "Item"):
    ms = item.meta.get("milestone") or item.id
    type_order = ["milestone", "bug", "story", "task"].index(item.type) if item.type in TYPES else 9
    num = re.sub(r"\D", "", item.id) or "0"
    return (milestone_key(ms), type_order, int(num), item.id)


def git(*args: str) -> str:
    try:
        return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return ""


# ----------------------------------------------------------------------------- frontmatter

def parse_value(key: str, raw: str):
    raw = raw.strip()
    if raw.startswith('"'):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw.strip('"')
    if " #" in raw:
        raw = raw.split(" #", 1)[0].strip()
    if key in LIST_KEYS or (raw.startswith("[") and raw.endswith("]")):
        inner = raw[1:-1] if raw.startswith("[") else raw
        return [x.strip().strip("'\"") for x in inner.split(",") if x.strip()]
    if key in BOOL_KEYS:
        return raw.lower() in ("true", "yes", "1", "on")
    return raw


def dump_value(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list):
        return "[" + ", ".join(str(v) for v in value) + "]"
    s = "" if value is None else str(value)
    if s == "" or s != s.strip() or re.search(r"[:#\[\]{}\"'`,&*!|>%@]", s) \
            or s.lower() in ("true", "false", "yes", "no", "null"):
        return json.dumps(s, ensure_ascii=False)
    return s


def split_doc(text: str):
    if not text.startswith("---"):
        return None, text
    lines = text.split("\n")
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            meta = {}
            for line in lines[1:i]:
                if not line.strip() or line.lstrip().startswith("#") or ":" not in line:
                    continue
                key, _, raw = line.partition(":")
                meta[key.strip()] = parse_value(key.strip(), raw)
            return meta, "\n".join(lines[i + 1:]).lstrip("\n")
    return None, text


def join_doc(meta: dict, body: str) -> str:
    keys = [k for k in KEY_ORDER if k in meta] + [k for k in meta if k not in KEY_ORDER]
    fm = "\n".join(f"{k}: {dump_value(meta[k])}" for k in keys)
    return f"---\n{fm}\n---\n\n{body.rstrip()}\n"


# ----------------------------------------------------------------------------- model

CHECKBOX = re.compile(r"^\s*[-*] \[( |x|X)\] (.*)$")


class Item:
    def __init__(self, path: Path, meta: dict, body: str):
        self.path, self.meta, self.body = path, meta, body

    id = property(lambda self: str(self.meta.get("id", "")))
    type = property(lambda self: str(self.meta.get("type", "")))
    status = property(lambda self: str(self.meta.get("status", "")))
    title = property(lambda self: str(self.meta.get("title", "")))

    def save(self) -> None:
        self.meta["updated"] = today()
        self.path.write_text(join_doc(self.meta, self.body), encoding="utf-8")

    def checkboxes(self):
        """Checkboxes in 'Acceptance criteria' / 'Definition of done' sections
        (or every checkbox above '## Log' if the item has no such section)."""
        lines = self.body.split("\n")
        in_criteria, has_criteria, found = False, False, []
        for idx, line in enumerate(lines):
            if line.startswith("## "):
                head = line.lower()
                in_criteria = any(k in head for k in ("acceptance", "criteria", "definition of done", "критери"))
                has_criteria = has_criteria or in_criteria
                continue
            m = CHECKBOX.match(line)
            if m and in_criteria:
                found.append((idx, m.group(1).lower() == "x", m.group(2)))
        if has_criteria:
            return found
        result = []
        for idx, line in enumerate(lines):
            if line.strip() == LOG:
                break
            m = CHECKBOX.match(line)
            if m:
                result.append((idx, m.group(1).lower() == "x", m.group(2)))
        return result

    def ac_counts(self):
        boxes = self.checkboxes()
        return sum(1 for _, done, _ in boxes if done), len(boxes)

    def log(self, line: str) -> None:
        entry = f"- {now()} {line}"
        if LOG in self.body:
            head, _, tail = self.body.partition(LOG)
            nxt = tail.find("\n## ")
            section, rest = (tail, "") if nxt == -1 else (tail[:nxt], tail[nxt:])
            self.body = f"{head}{LOG}{section.rstrip()}\n{entry}\n{rest}"
        else:
            self.body = f"{self.body.rstrip()}\n\n{LOG}\n\n{entry}\n"


def load_items(strict: bool = False) -> dict:
    items, errors = {}, []
    if not TASKS.exists():
        return items
    for path in sorted(TASKS.glob("*.md")):
        if path.name in SKIP_FILES:
            continue
        meta, body = split_doc(path.read_text(encoding="utf-8"))
        if meta is None or "id" not in meta:
            errors.append(f"{rel(path)}: missing frontmatter/id")
            continue
        item = Item(path, meta, body)
        if item.id in items:
            errors.append(f"duplicate id {item.id}: {rel(path)} and {rel(items[item.id].path)}")
            continue
        items[item.id] = item
    if strict:
        for e in errors:
            print(f"✗ {e}", file=sys.stderr)
    return items


def get_item(items: dict, iid: str) -> Item:
    iid = iid.strip().upper()
    if iid not in items:
        die(f"no item {iid}. See: board.py list")
    return items[iid]


def milestones(items: dict):
    return sorted((i for i in items.values() if i.type == "milestone"), key=lambda i: milestone_key(i.id))


def current_milestone(items: dict):
    return next((m for m in milestones(items) if m.status != "done"), None)


def members_of(items: dict, mid: str):
    return [i for i in items.values() if i.meta.get("milestone") == mid and i.type != "milestone"]


def statuses_for(kind: str):
    return MILESTONE_STATUSES if kind == "milestone" else WORK_STATUSES


def render_board(items: dict) -> None:
    if not TASKS.exists():
        return
    out = ["# Project board", "", f"_Generated by `board.py render` · {now()} · do not edit by hand._", ""]
    ms_list = milestones(items)
    ms_ids = {m.id for m in ms_list}
    for m in ms_list:
        members = sorted(members_of(items, m.id), key=item_key)
        closed = sum(1 for i in members if i.status in CLOSED)
        flags = "".join(f" · **{k}**" for k in ("ui", "release") if m.meta.get(k))
        out += [f"## {m.id} — {m.title}", "", f"Status: **{m.status}** · closed {closed}/{len(members)}{flags}", ""]
        if members:
            out += ["| ID | Type | Status | Owner | Pri | AC | Title |", "|---|---|---|---|---|---|---|"]
            for i in members:
                c, t = i.ac_counts()
                sev = f" ({i.meta.get('severity')})" if i.type == "bug" else ""
                out.append(f"| {i.id} | {i.type}{sev} | {i.status} | {i.meta.get('owner', '')} | "
                           f"{i.meta.get('priority', '')} | {f'{c}/{t}' if t else '—'} | {i.title.replace('|', '/')} |")
            out.append("")
    orphans = [i for i in items.values() if i.type != "milestone" and i.meta.get("milestone") not in ms_ids]
    if orphans:
        out += ["## No milestone", ""] + [f"- {i.id} [{i.status}] {i.title}" for i in sorted(orphans, key=item_key)] + [""]
    (TASKS / "BOARD.md").write_text("\n".join(out), encoding="utf-8")


# ----------------------------------------------------------------------------- gates

VERDICT_RE = re.compile(r"(?im)^[\s>*_#-]*(?:verdict|вердикт)[\s*_]*:[\s*_]*(pass(?:ed)?|fail(?:ed)?)")


def verdict(path: Path):
    if not path.exists():
        return None
    found = VERDICT_RE.findall(path.read_text(encoding="utf-8"))
    return found[-1].lower().startswith("pass") if found else None


def autonomy_approved() -> bool:
    path = PRODUCT / "AUTONOMY.md"
    return path.exists() and re.search(r"(?im)^\s*approved\s*:\s*(yes|true)\b", path.read_text(encoding="utf-8")) is not None


def report_check(label: str, path: Path):
    v = verdict(path)
    return (v is True, f"{label} {rel(path)}: " + {True: "PASS", False: "FAIL", None: "missing file/verdict"}[v])


def gate_checks(items: dict, mid: str, run_checks: bool = False):
    m = items.get(mid)
    if not m or m.type != "milestone":
        return [(False, f"milestone {mid} not found")]
    checks = []
    members = members_of(items, mid)
    open_items = [i for i in members if i.status not in CLOSED]
    checks.append((not open_items, "all items closed" if not open_items else
                   "open: " + ", ".join(f"{i.id}[{i.status}]" for i in sorted(open_items, key=item_key))))
    p0_skipped = [i.id for i in members if i.meta.get("priority") == "P0" and i.status in {"deferred", "wontfix"}]
    checks.append((not p0_skipped, "no P0 deferred" if not p0_skipped else "P0 deferred/wontfix: " + ", ".join(p0_skipped)))
    missing_ac = []
    for i in members:
        c, t = i.ac_counts()
        if i.status == "done" and ((i.type == "story" and t == 0) or c < t):
            missing_ac.append(f"{i.id}({c}/{t})")
    checks.append((not missing_ac, "acceptance criteria of done items are checked" if not missing_ac else
                   "unchecked AC: " + ", ".join(missing_ac)))
    blockers = [i for i in items.values() if i.type == "bug" and i.status not in CLOSED
                and (i.meta.get("severity") == "critical"
                     or (i.meta.get("severity") in BLOCKING_SEVERITIES and i.meta.get("milestone") == mid))]
    checks.append((not blockers, "no open critical/high bugs" if not blockers else
                   "blocking bugs: " + ", ".join(f"{i.id}({i.meta.get('severity')})" for i in blockers)))
    checks.append(report_check("automated test report", QA_REPORTS / f"{mid}-tests.md"))
    checks.append(report_check("manual QA report", QA_REPORTS / f"{mid}-qa.md"))
    if m.meta.get("ui"):
        checks.append(report_check("design review", DESIGN_REVIEWS / f"{mid}-design.md"))
    if m.meta.get("release"):
        checks.append(report_check("security report", SECURITY / f"{mid}-security.md"))
        earlier = [x.id for x in milestones(items) if x.id != mid and x.status != "done"]
        checks.append((not earlier, "all previous milestones done" if not earlier else "not done: " + ", ".join(earlier)))
    if run_checks:
        gate = ROOT / "team" / "bin" / "quality-gate.sh"
        try:
            proc = subprocess.run(["bash", str(gate), "full"], cwd=ROOT, capture_output=True, text=True, timeout=3600)
            tail = (proc.stdout + proc.stderr).strip().splitlines()[-3:]
            checks.append((proc.returncode == 0, "quality-gate full: " + ("PASS" if proc.returncode == 0 else " | ".join(tail))))
        except (OSError, subprocess.TimeoutExpired) as exc:
            checks.append((False, f"quality-gate full did not run: {exc}"))
    return checks


def next_step(items: dict) -> dict:
    ms = milestones(items)
    if not (PRODUCT / "PRD.md").exists() or not (PRODUCT / "ROADMAP.md").exists() or not ms:
        return {"step": "KICKOFF", "human": True, "action": "/mvp-kickoff <product idea>",
                "reason": "no PRD/ROADMAP or no milestones on the board"}
    if not autonomy_approved():
        return {"step": "APPROVAL", "human": True, "action": "human approves docs/product/AUTONOMY.md (approved: yes)",
                "reason": "autonomy not approved"}
    if STOP_FILE.exists():
        return {"step": "STOPPED", "human": True, "action": "human removes .team/STOP to resume",
                "reason": "kill switch .team/STOP is present"}
    for m in ms:
        if m.status == "done":
            continue
        if m.status == "blocked" or m.meta.get("needs_human"):
            return {"step": "BLOCKED", "human": True, "milestone": m.id, "phase": m.status,
                    "action": f"unblock {m.id}: see the log in {rel(m.path)}", "reason": "milestone blocked / needs a human"}
        action = "/mvp-release" if m.meta.get("release") else f"/mvp-milestone {m.id}"
        return {"step": "MILESTONE", "human": False, "milestone": m.id, "phase": m.status, "action": action,
                "reason": f"{m.id} '{m.title}' is in phase {m.status}"}
    return {"step": "DONE", "human": False, "action": "MVP complete: final report and handover to the human",
            "reason": "all milestones done"}


# ----------------------------------------------------------------------------- commands

def cmd_init(args) -> None:
    for sub in ["docs/product/changelog", "docs/design/screens", "docs/design/prototypes", "docs/design/reviews",
                "docs/architecture/adr", "docs/tasks", "docs/qa/plans", "docs/qa/reports", "docs/qa/evidence",
                "docs/security", "docs/solutions", "docs/superpowers/specs", "docs/superpowers/plans", ".team/state"]:
        (ROOT / sub).mkdir(parents=True, exist_ok=True)
    render_board(load_items())
    print(f"✓ structure ready in {ROOT}")


def default_body(kind: str, iid: str, text: str, acs: list) -> str:
    if kind == "milestone":
        return (f"## Goal\n\n{text or '<what value the user gets when this milestone ships>'}\n\n"
                "## Demo scenario\n\n<what a human can click through after completion>\n\n"
                f"## Definition of done\n\nRun `board.py gate {iid} --run-checks` — it enforces the DoD from team/CONSTITUTION.md.\n")
    if kind == "story":
        body = f"## Description\n\n{text or 'As a <user>, I want <action>, so that <value>.'}\n\n## Acceptance criteria\n\n"
        body += "\n".join(f"- [ ] {a}" for a in acs) if acs else "- [ ] Given … When … Then …"
        return body + "\n\n## Notes\n\n- Design: docs/design/screens/<id>.md\n- Plan: (set by architect)\n"
    if kind == "bug":
        body = (f"## Description\n\n{text or '<what is broken>'}\n\n## Steps to reproduce\n\n1. …\n\n"
                "## Expected\n\n…\n\n## Actual\n\n…\n\n## Evidence\n\n- docs/qa/evidence/…\n\n## Acceptance criteria\n\n")
        body += "".join(f"- [ ] {a}\n" for a in acs)
        return body + "- [ ] Regression test added that failed before the fix\n- [ ] Fix verified by QA\n"
    body = f"## What to do\n\n{text or '…'}\n\n## Definition of done\n\n"
    return body + ("\n".join(f"- [ ] {a}" for a in acs) if acs else "- [ ] …") + "\n"


def cmd_new(args) -> None:
    kind, items = args.type, load_items()
    title = args.title.strip()
    if not title:
        die("empty title")
    if kind == "milestone":
        if not args.id or not re.fullmatch(r"M[0-9A-Z]{1,3}", args.id.upper()):
            die("milestones need --id like M0, M1, …, MR")
        iid = args.id.upper()
        if iid in items:
            die(f"{iid} already exists")
    else:
        prefix = TYPES[kind]
        nums = [int(m.group(1)) for i in items for m in [re.fullmatch(rf"{prefix}-(\d+)", i)] if m]
        iid = f"{prefix}-{(max(nums) + 1 if nums else 1):03d}"
    milestone = (args.milestone or "").upper()
    if kind != "milestone":
        if not milestone:
            cur = current_milestone(items)
            if kind == "story" or not cur:
                die("pass --milestone (the milestone must exist)")
            milestone = cur.id
        if milestone not in items or items[milestone].type != "milestone":
            die(f"milestone {milestone} not found — create it: board.py new milestone \"…\" --id {milestone}")
    owner = args.owner or {"milestone": "team-lead", "bug": "backend-dev"}.get(kind, "")
    if owner and owner not in ROLES:
        die(f"unknown role {owner}; allowed: {', '.join(ROLES)}")
    if kind in ("story", "task") and not owner:
        die("pass --owner")
    deps = [d.strip().upper() for d in (args.depends or "").split(",") if d.strip()]
    missing = [d for d in deps if d not in items]
    if missing:
        die(f"dependencies not found: {', '.join(missing)}")
    meta = {"id": iid, "type": kind, "title": title, "status": "todo"}
    if kind != "milestone":
        meta["milestone"] = milestone
    meta.update(owner=owner or "team-lead", priority=args.priority)
    if kind == "bug":
        meta["severity"] = args.severity or "medium"
    if deps:
        meta["depends_on"] = deps
    files = [f.strip() for f in (args.files or "").split(",") if f.strip()]
    if files:
        meta["files"] = files
    if args.plan:
        meta["plan"] = args.plan
    if kind == "milestone":
        meta.update(ui=bool(args.ui), release=bool(args.release))
    meta.update(needs_human=bool(args.needs_human), created=today(), updated=today())
    text = args.body or ""
    if args.body_file:
        text = sys.stdin.read() if args.body_file == "-" else Path(args.body_file).read_text(encoding="utf-8")
    body = default_body(kind, iid, text.strip(), args.ac or []) + f"\n{LOG}\n\n- {now()} created ({args.by or owner or 'team-lead'})\n"
    TASKS.mkdir(parents=True, exist_ok=True)
    path = TASKS / f"{iid}-{slugify(title)}.md"
    path.write_text(join_doc(meta, body), encoding="utf-8")
    items[iid] = Item(path, meta, body)
    render_board(items)
    print(f"✓ {iid} → {rel(path)}")


def cmd_list(args) -> None:
    rows = list(load_items(strict=True).values())
    if args.milestone:
        ms = {x.strip().upper() for x in args.milestone.split(",")}
        rows = [i for i in rows if i.meta.get("milestone") in ms or i.id in ms]
    if args.status:
        rows = [i for i in rows if i.status in {x.strip() for x in args.status.split(",")}]
    if args.owner:
        rows = [i for i in rows if i.meta.get("owner") == args.owner]
    if args.type:
        rows = [i for i in rows if i.type in {x.strip() for x in args.type.split(",")}]
    if args.open:
        rows = [i for i in rows if i.status not in CLOSED]
    rows.sort(key=item_key)
    if args.json:
        print(json.dumps([dict(i.meta, path=rel(i.path), ac=list(i.ac_counts())) for i in rows], ensure_ascii=False, indent=2, default=str))
        return
    if not rows:
        print("(empty)")
        return
    print(f"{'ID':7} {'TYPE':9} {'STATUS':11} {'MS':4} {'OWNER':17} {'PRI':3} {'AC':5} TITLE")
    for i in rows:
        c, t = i.ac_counts()
        extra = (f" [{i.meta.get('severity')}]" if i.type == "bug" else "") + (" ⚑human" if i.meta.get("needs_human") else "")
        print(f"{i.id:7} {i.type:9} {i.status:11} {str(i.meta.get('milestone', '')):4} {str(i.meta.get('owner', '')):17} "
              f"{str(i.meta.get('priority', '')):3} {(f'{c}/{t}' if t else '-'):5} {i.title[:70]}{extra}")


def cmd_show(args) -> None:
    item = get_item(load_items(), args.id)
    print(f"# {rel(item.path)}\n\n{item.path.read_text(encoding='utf-8')}")


def cmd_ac(args) -> None:
    boxes = get_item(load_items(), args.id).checkboxes()
    if not boxes:
        print("(no criteria)")
    for n, (_, done, text) in enumerate(boxes, 1):
        print(f"{n}. [{'x' if done else ' '}] {text}")


def cmd_check(args, value: bool = True) -> None:
    items = load_items()
    item = get_item(items, args.id)
    boxes = item.checkboxes()
    if not boxes:
        die(f"{item.id} has no acceptance criteria")
    targets = []
    for sel in args.which:
        if sel == "all":
            targets = list(range(len(boxes)))
            break
        if sel.isdigit():
            n = int(sel)
            if not 1 <= n <= len(boxes):
                die(f"no criterion #{n} (total {len(boxes)})")
            targets.append(n - 1)
        else:
            hits = [k for k, (_, _, text) in enumerate(boxes) if sel.lower() in text.lower()]
            if len(hits) != 1:
                die(f"'{sel}' matches {len(hits)} criteria — use a number (board.py ac {item.id})")
            targets += hits
    lines = item.body.split("\n")
    for k in targets:
        lines[boxes[k][0]] = re.sub(r"\[( |x|X)\]", "[x]" if value else "[ ]", lines[boxes[k][0]], count=1)
    item.body = "\n".join(lines)
    note = f": {args.note}" if args.note else ""
    item.log(f"AC {', '.join(str(k + 1) for k in targets)} {'✔' if value else '✘ unchecked'} ({args.by or 'qa-manual'}){note}")
    item.save()
    render_board(items)
    c, t = item.ac_counts()
    print(f"✓ {item.id}: AC {c}/{t}")


def cmd_note(args) -> None:
    items = load_items()
    item = get_item(items, args.id)
    item.log(f"note ({args.by or 'team-lead'}): {' '.join(args.text)}")
    item.save()
    print(f"✓ {item.id}: note added")


def cmd_move(args) -> None:
    items = load_items()
    item = get_item(items, args.id)
    new, old = args.status, item.status
    if new not in statuses_for(item.type):
        die(f"status '{new}' is not valid for {item.type}; allowed: {', '.join(statuses_for(item.type))}")
    if new in NOTE_REQUIRED and not args.note:
        die(f"status {new} requires --note with the reason")
    if new == "done" and not args.force:
        if item.type == "milestone":
            failed = [msg for ok, msg in gate_checks(items, item.id) if not ok]
            if failed:
                die(f"gate {item.id} not passed:\n  - " + "\n  - ".join(failed) + f"\n  (details: board.py gate {item.id})")
        else:
            c, t = item.ac_counts()
            if (item.type == "story" and t == 0) or c < t:
                die(f"{item.id}: AC checked {c}/{t}. Whoever verified them checks them: board.py check {item.id} <N>")
            open_deps = [d for d in item.meta.get("depends_on") or [] if d in items and items[d].status not in CLOSED]
            if open_deps:
                die(f"{item.id}: dependencies not closed: {', '.join(open_deps)}")
    item.meta["status"] = new
    if new == "blocked" and args.human:
        item.meta["needs_human"] = True
    if args.clear_human:
        item.meta["needs_human"] = False
    note = f": {args.note}" if args.note else ""
    item.log(f"{old} → {new} ({args.by or 'team-lead'}){note}{' [FORCED]' if args.force else ''}")
    item.save()
    render_board(items)
    print(f"✓ {item.id}: {old} → {new}")


def cmd_set(args) -> None:
    items = load_items()
    item = get_item(items, args.id)
    changes = []
    for pair in args.pairs:
        if "=" not in pair:
            die(f"expected key=value, got '{pair}'")
        key, value = (x.strip() for x in pair.split("=", 1))
        if key not in SETTABLE:
            die(f"field '{key}' can't be set; allowed: {', '.join(sorted(SETTABLE))}")
        parsed = parse_value(key, value)
        if key == "owner" and parsed not in ROLES:
            die(f"unknown role {parsed}")
        if key == "priority" and parsed not in PRIORITIES:
            die(f"priority ∈ {PRIORITIES}")
        if key == "severity" and parsed not in SEVERITIES:
            die(f"severity ∈ {SEVERITIES}")
        if key == "milestone":
            parsed = str(parsed).upper()
            if parsed not in items or items[parsed].type != "milestone":
                die(f"milestone {parsed} not found")
        if key == "depends_on":
            parsed = [d.upper() for d in parsed]
            missing = [d for d in parsed if d not in items]
            if missing:
                die(f"items not found: {', '.join(missing)}")
        item.meta[key] = parsed
        changes.append(f"{key}={dump_value(parsed)}")
    item.log(f"set {', '.join(changes)} ({args.by or 'team-lead'})")
    item.save()
    render_board(items)
    print(f"✓ {item.id}: {', '.join(changes)}")


def cmd_next(args) -> None:
    items = load_items()
    cur = current_milestone(items)
    ms = (args.milestone or "").upper() or (cur.id if cur else "")
    pool = [i for i in items.values() if i.type != "milestone" and (not ms or i.meta.get("milestone") == ms)]
    if args.owner:
        pool = [i for i in pool if i.meta.get("owner") == args.owner]
    if args.type:
        pool = [i for i in pool if i.type == args.type]

    def ready(i):
        return all(d in items and items[d].status in CLOSED for d in (i.meta.get("depends_on") or []))

    def rank(i):
        stage = {"in_progress": 0, "qa": 1, "review": 2, "todo": 3}.get(i.status, 9)
        sev = SEVERITIES.index(i.meta["severity"]) if i.type == "bug" and i.meta.get("severity") in SEVERITIES else 9
        pri = PRIORITIES.index(i.meta["priority"]) if i.meta.get("priority") in PRIORITIES else 9
        return (stage, sev, pri, item_key(i))

    cands = sorted((i for i in pool if i.status in {"todo", "in_progress", "review", "qa"} and ready(i)), key=rank)
    if not cands:
        print(f"(nothing ready{' in ' + ms if ms else ''})")
    for i in cands[: (len(cands) if args.all else 1)]:
        print(f"{i.id} [{i.type}/{i.status}/{i.meta.get('priority')}] owner={i.meta.get('owner')} → {rel(i.path)}\n   {i.title}")


def _static_prefix(glob: str):
    """Path segments before the first wildcard segment: 'src/app/api/**' → ['src','app','api']."""
    segs = []
    for s in glob.strip().strip("/").replace("\\", "/").split("/"):
        if any(c in s for c in "*?["):
            break
        segs.append(s)
    return segs


def glob_overlap(a, b) -> bool:
    """True if two file-glob sets can touch the same path. Two globs can overlap only when one's
    static prefix is a path-prefix of the other's, so tasks in different directories run in parallel
    while any pair that might collide (or an undeclared set) is kept in separate waves."""
    if not a or not b:
        return True  # an undeclared file set is treated as touching everything → runs alone
    for x in a:
        for y in b:
            px, py = _static_prefix(x), _static_prefix(y)
            n = min(len(px), len(py))
            if px[:n] == py[:n]:  # one prefix contains the other → possible collision
                return True
    return False


def cmd_wave(args) -> None:
    """Next batch of build tasks that can run in parallel: dependencies closed and
    declared file sets disjoint. The lead dispatches one implementer per item concurrently."""
    items = load_items()
    cur = current_milestone(items)
    ms = (args.milestone or "").upper() or (cur.id if cur else "")

    def ready(i):
        return all(d in items and items[d].status in CLOSED for d in (i.meta.get("depends_on") or []))

    def rank(i):
        stage = {"in_progress": 0, "todo": 1}.get(i.status, 9)
        has_files = 0 if (i.meta.get("files")) else 1  # items with declared files batch first
        pri = PRIORITIES.index(i.meta["priority"]) if i.meta.get("priority") in PRIORITIES else 9
        return (has_files, stage, pri, item_key(i))

    pool = [i for i in items.values() if i.type in ("story", "task", "bug")
            and (not ms or i.meta.get("milestone") == ms)
            and i.status in {"todo", "in_progress"} and ready(i)]
    if args.owner:
        pool = [i for i in pool if i.meta.get("owner") == args.owner]
    pool.sort(key=rank)

    wave, files_in_wave = [], []
    for i in pool:
        f = i.meta.get("files") or []
        if not f:
            # undeclared files → must run alone; only when nothing else is already batched
            if not wave:
                wave.append(i)
            break
        if any(glob_overlap(f, g) for g in files_in_wave):
            continue
        wave.append(i)
        files_in_wave.append(f)
        if len(wave) >= args.max:
            break

    if args.json:
        print(json.dumps([{"id": i.id, "owner": i.meta.get("owner"), "files": i.meta.get("files") or [],
                           "plan": i.meta.get("plan"), "title": i.title, "path": rel(i.path)} for i in wave],
                         ensure_ascii=False, indent=2))
        return
    if not wave:
        blocked = [i for i in items.values() if i.type in ("story", "task", "bug")
                   and (not ms or i.meta.get("milestone") == ms) and i.status in {"todo", "in_progress"}]
        print(f"(no ready tasks{' in ' + ms if ms else ''}" + (f"; {len(blocked)} blocked by dependencies)" if blocked else ")"))
        return
    solo = " (run alone: no files declared)" if len(wave) == 1 and not (wave[0].meta.get("files")) else ""
    print(f"Wave of {len(wave)} — dispatch these implementers in parallel (one message, one Agent call each){solo}:")
    for i in wave:
        print(f"  {i.id} owner={i.meta.get('owner')} files={i.meta.get('files') or ['<none declared>']} plan={i.meta.get('plan') or '—'}\n     {i.title}")


def milestone_line(items: dict, m: Item) -> str:
    members = members_of(items, m.id)
    stories = [i for i in members if i.type == "story"]
    bugs = sum(1 for i in members if i.type == "bug" and i.status not in CLOSED)
    flags = "".join(f" [{k}]" for k in ("ui", "release") if m.meta.get(k)) + (" ⚑human" if m.meta.get("needs_human") else "")
    return (f"{m.id:4} {m.status:10} stories {sum(1 for i in stories if i.status == 'done')}/{len(stories)} · "
            f"open {sum(1 for i in members if i.status not in CLOSED)} · bugs {bugs} · {m.title}{flags}")


def cmd_status(args) -> None:
    items = load_items(strict=True)
    ms = milestones(items)
    print("Milestones:" if ms else "Board is empty. Start with: /mvp-kickoff <product idea>")
    for m in ms:
        print("  " + milestone_line(items, m))
    bugs = [i for i in items.values() if i.type == "bug" and i.status not in CLOSED]
    if bugs:
        print("Open bugs: " + ", ".join(f"{s} {sum(1 for b in bugs if b.meta.get('severity') == s)}" for s in SEVERITIES))
    human = [i for i in items.values() if i.meta.get("needs_human") and i.status not in CLOSED]
    if human:
        print("Needs a human: " + ", ".join(f"{i.id} ({i.title[:40]})" for i in human))
    ns = next_step(items)
    print(f"Next step: {ns['action']}  ({ns['reason']})")


def cmd_brief(args) -> None:
    items = load_items()
    print("[AI team] Board state (board.py brief):")
    for m in milestones(items)[:12]:
        print("  " + milestone_line(items, m))
    ns = next_step(items)
    print(f"  Next step: {ns['action']} — {ns['reason']}")
    human = [i.id for i in items.values() if i.meta.get("needs_human") and i.status not in CLOSED]
    if human:
        print("  Waiting for a human: " + ", ".join(human))
    branch, log = git("branch", "--show-current"), git("log", "--oneline", "-5")
    if branch:
        print(f"  Git branch: {branch}. Recent commits:")
        print("\n".join("    " + line for line in log.splitlines()) or "    (none)")
    print("  Rules: change state only via `python3 team/bin/board.py`; follow /mvp-milestone and /mvp-release.")


def cmd_next_step(args) -> None:
    ns = next_step(load_items())
    print(json.dumps(ns, ensure_ascii=False) if args.json else f"{ns['step']}: {ns['action']} — {ns['reason']}")


def cmd_gate(args) -> None:
    mid = args.id.upper()
    checks = gate_checks(load_items(), mid, run_checks=args.run_checks)
    for ok, msg in checks:
        print(f"  {'✓' if ok else '✗'} {msg}")
    passed = all(ok for ok, _ in checks)
    print(f"GATE {mid}: {'PASS' if passed else 'FAIL'}")
    sys.exit(0 if passed else 1)


def cmd_scaffold(args) -> None:
    if args.kind not in SCAFFOLDS:
        die(f"unknown kind; available: {', '.join(SCAFFOLDS)}")
    tpl, dest = SCAFFOLDS[args.kind]
    ident = (args.id or "").strip()
    if "{ID}" in dest and not ident:
        die(f"{args.kind} needs an id (e.g. M1, S-003, ADR-0001-stack, or a slug)")
    dest_path = ROOT / dest.replace("{ID}", ident)
    if dest_path.exists() and not args.force:
        print(f"= already exists: {rel(dest_path)}")
        return
    text = (TEMPLATES / tpl).read_text(encoding="utf-8")
    for key, val in {"{{ID}}": ident, "{{DATE}}": today(), "{{TITLE}}": args.title or ""}.items():
        text = text.replace(key, val)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_text(text, encoding="utf-8")
    print(f"✓ {rel(dest_path)}")


def cmd_goal(args) -> None:
    print(
        "/goal Drive the MVP autonomously following the /mvp-autopilot protocol (team/CONSTITUTION.md applies). "
        "After every milestone run `python3 team/bin/board.py next-step` and show its output. "
        "The goal is met when that output starts with `DONE`. "
        "The goal is impossible without a human when that output starts with `KICKOFF`, `APPROVAL`, `STOPPED` or `BLOCKED` "
        "— in that case write the question for the human and stop. "
        "Never mark anything done by bypassing `board.py gate` or using --force. "
        f"Or stop after {args.turns} turns."
    )


def cmd_validate(args) -> None:
    items = load_items(strict=True)
    errors, warnings = [], []
    ms_ids = {m.id for m in milestones(items)}
    for i in items.values():
        where = rel(i.path)
        for key in ("id", "type", "title", "status"):
            if not i.meta.get(key):
                errors.append(f"{where}: missing field {key}")
        if i.type not in TYPES:
            errors.append(f"{where}: type '{i.type}' ∉ {list(TYPES)}")
            continue
        if i.status not in statuses_for(i.type):
            errors.append(f"{where}: status '{i.status}' is invalid for {i.type}")
        if i.type != "milestone" and not re.fullmatch(rf"{TYPES[i.type]}-\d+", i.id):
            errors.append(f"{where}: id {i.id} does not match type {i.type}")
        if not i.path.name.startswith(i.id + "-"):
            warnings.append(f"{where}: file name does not start with {i.id}-")
        if i.type != "milestone" and i.meta.get("milestone") not in ms_ids:
            errors.append(f"{where}: milestone {i.meta.get('milestone')} does not exist")
        if i.meta.get("owner") and i.meta.get("owner") not in ROLES:
            warnings.append(f"{where}: unknown role {i.meta.get('owner')}")
        if i.meta.get("priority") and i.meta.get("priority") not in PRIORITIES:
            errors.append(f"{where}: invalid priority {i.meta.get('priority')}")
        if i.type == "bug" and i.meta.get("severity") not in SEVERITIES:
            errors.append(f"{where}: severity must be one of {SEVERITIES}")
        for d in i.meta.get("depends_on") or []:
            if d not in items:
                errors.append(f"{where}: dependency {d} not found")
        if i.type == "story" and i.ac_counts()[1] == 0:
            warnings.append(f"{where}: story has no acceptance criteria")
    for w in warnings:
        print(f"! {w}")
    for e in errors:
        print(f"✗ {e}")
    print(f"{'OK' if not errors else 'ERRORS'}: items {len(items)}, errors {len(errors)}, warnings {len(warnings)}")
    sys.exit(1 if errors else 0)


def cmd_render(args) -> None:
    render_board(load_items())
    print(f"✓ {rel(TASKS / 'BOARD.md')}")


def cmd_statusline(args) -> None:
    try:
        sys.stdin.read()
    except OSError:
        pass
    items = load_items()
    if not items:
        print("🧭 /mvp-kickoff")
        return
    m = current_milestone(items)
    parts = ["🧭"]
    if m:
        members = members_of(items, m.id)
        parts.append(f"{m.id} {m.status} {sum(1 for i in members if i.status in CLOSED)}/{len(members)}")
    else:
        parts.append("MVP done")
    bugs = sum(1 for i in items.values() if i.type == "bug" and i.status not in CLOSED)
    if bugs:
        parts.append(f"🐞{bugs}")
    if any(i.meta.get("needs_human") and i.status not in CLOSED for i in items.values()):
        parts.append("⚑human")
    print(" · ".join(parts))


# ----------------------------------------------------------------------------- cli

def main(argv=None) -> None:
    p = argparse.ArgumentParser(prog="board.py", description="AI team board",
                                formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init").set_defaults(fn=cmd_init)

    s = sub.add_parser("new")
    s.add_argument("type", choices=list(TYPES))
    s.add_argument("title")
    s.add_argument("--id")
    s.add_argument("--milestone")
    s.add_argument("--owner")
    s.add_argument("--priority", default="P1", choices=PRIORITIES)
    s.add_argument("--severity", choices=SEVERITIES)
    s.add_argument("--depends", help="comma separated: S-001,S-002")
    s.add_argument("--files", help="comma-separated file globs the task owns, for parallel-wave batching: src/api/**,supabase/migrations/**")
    s.add_argument("--ac", action="append", help="acceptance criterion (repeatable)")
    s.add_argument("--body")
    s.add_argument("--body-file", help="file with the description, or '-' for stdin")
    s.add_argument("--plan")
    s.add_argument("--ui", action="store_true", help="milestone has UI → design review required by the gate")
    s.add_argument("--release", action="store_true", help="release milestone → security report required by the gate")
    s.add_argument("--needs-human", action="store_true")
    s.add_argument("--by")
    s.set_defaults(fn=cmd_new)

    s = sub.add_parser("list")
    for flag in ("--milestone", "--status", "--owner", "--type"):
        s.add_argument(flag)
    s.add_argument("--open", action="store_true")
    s.add_argument("--json", action="store_true")
    s.set_defaults(fn=cmd_list)

    for name, fn in (("show", cmd_show), ("ac", cmd_ac)):
        s = sub.add_parser(name)
        s.add_argument("id")
        s.set_defaults(fn=fn)

    for name, value in (("check", True), ("uncheck", False)):
        s = sub.add_parser(name)
        s.add_argument("id")
        s.add_argument("which", nargs="+", help="criterion number(s), 'all', or a unique substring")
        s.add_argument("--note", help="evidence: screenshot or test path")
        s.add_argument("--by")
        s.set_defaults(fn=lambda a, v=value: cmd_check(a, v))

    s = sub.add_parser("note")
    s.add_argument("id")
    s.add_argument("text", nargs="+")
    s.add_argument("--by")
    s.set_defaults(fn=cmd_note)

    s = sub.add_parser("move")
    s.add_argument("id")
    s.add_argument("status")
    s.add_argument("--note")
    s.add_argument("--by")
    s.add_argument("--force", action="store_true", help="bypass the gate (recorded in the log; human decision only)")
    s.add_argument("--human", action="store_true", help="with 'blocked': set needs_human")
    s.add_argument("--clear-human", action="store_true", help="clear needs_human")
    s.set_defaults(fn=cmd_move)

    s = sub.add_parser("set")
    s.add_argument("id")
    s.add_argument("pairs", nargs="+")
    s.add_argument("--by")
    s.set_defaults(fn=cmd_set)

    s = sub.add_parser("next")
    for flag in ("--owner", "--milestone", "--type"):
        s.add_argument(flag)
    s.add_argument("--all", action="store_true")
    s.set_defaults(fn=cmd_next)

    s = sub.add_parser("wave")
    s.add_argument("--milestone")
    s.add_argument("--owner")
    s.add_argument("--max", type=int, default=int(os.environ.get("TEAM_WAVE_MAX", "4")), help="max parallel implementers (default 4; cloud VM ≈ 4 vCPU)")
    s.add_argument("--json", action="store_true")
    s.set_defaults(fn=cmd_wave)

    sub.add_parser("status").set_defaults(fn=cmd_status)
    sub.add_parser("brief").set_defaults(fn=cmd_brief)
    s = sub.add_parser("next-step")
    s.add_argument("--json", action="store_true")
    s.set_defaults(fn=cmd_next_step)

    s = sub.add_parser("gate")
    s.add_argument("id")
    s.add_argument("--run-checks", action="store_true", help="also run quality-gate.sh full")
    s.set_defaults(fn=cmd_gate)

    s = sub.add_parser("scaffold")
    s.add_argument("kind", help=", ".join(SCAFFOLDS))
    s.add_argument("id", nargs="?")
    s.add_argument("--title")
    s.add_argument("--force", action="store_true")
    s.set_defaults(fn=cmd_scaffold)

    s = sub.add_parser("goal")
    s.add_argument("--turns", type=int, default=int(os.environ.get("TEAM_GOAL_TURNS", "200")))
    s.set_defaults(fn=cmd_goal)

    sub.add_parser("validate").set_defaults(fn=cmd_validate)
    sub.add_parser("render").set_defaults(fn=cmd_render)
    sub.add_parser("statusline").set_defaults(fn=cmd_statusline)

    args = p.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()
