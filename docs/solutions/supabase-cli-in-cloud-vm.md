# supabase-cli-in-cloud-vm

_2026-09-27 · Tags: supabase CLI, cloud VM, go install, "requires go >= 1.25.0", "http2.Framer has no field or method ReadFrameHeader", GitHub releases 403_

## Symptom
In the Claude Code cloud VM, `supabase: command not found`, and the team setup script's build fails:
- `GOBIN=/usr/local/bin go install github.com/supabase/cli@latest` → `github.com/supabase/cli/pkg@v1.2.3 requires go >= 1.25.0 (running go 1.24.7)`. With `GOTOOLCHAIN=go1.25.1` it fails to compile instead: `f.fr.ReadFrameHeader undefined (type *http2.Framer has no field or method ReadFrameHeader)`, because `@latest` resolves old v1 module versions.
- The GitHub release asset download returns 403, because the session proxy only serves attached repos over the API/releases.
- A source build of `apps/cli-go` from the restructured monorepo produces a stripped CLI with only `db` and `functions`, without `start`, `init` or `gen`.

## Root cause
The Supabase CLI moved to a Bun/TypeScript monorepo, and v2 is not published as a Go module. The published npm package `supabase` ships the native binary through per-platform npm packages (`@supabase/cli-linux-x64`, …), and npm registry traffic is allowed in the VM.

## Fix
Install the npm package into a tools directory and put its bin on PATH (npm does not support a global install of this package):
```bash
mkdir -p /opt/supabase-cli && cd /opt/supabase-cli && npm init -y && npm install supabase@2.118.0
ln -sf /opt/supabase-cli/node_modules/.bin/supabase /usr/local/bin/supabase
supabase --version   # 2.118.0
```
Docker images for the local stack pull from `public.ecr.aws`, which works. `team/bin/app.sh` starts dockerd itself.

## Prevention
The human should replace the Go build block in `team/cloud/setup-script.sh` with the npm install above, so new sessions get a working CLI from the cached setup.
