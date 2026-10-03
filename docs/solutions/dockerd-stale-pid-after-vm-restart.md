# dockerd-stale-pid-after-vm-restart

_2026-09-29 · Tags: dockerd, cloud VM, "process with PID … is still running", docker.pid, StatusDbNotReadyError_

## Symptom
After the cloud VM is recycled (e.g. across a rate-limit pause), `bash team/bin/app.sh start` prints `✗ Docker is not running (docker info failed)`. `.team/state/dockerd.log` shows:
`failed to start daemon, ensure docker is not running or delete /var/run/docker.pid: process with PID 574 is still running`, while `ps -p 574` shows no process.
Right after Docker comes up, the next `app.sh start` can fail with `StatusDbNotReadyError … container is not ready: starting`.

## Root cause
`/var/run/docker.pid` survives the VM restart and points at a PID from the previous boot, so dockerd refuses to start. The second error is a race: the Supabase Postgres container is still initialising when `supabase start` checks it.

## Fix
```bash
ps -p "$(cat /var/run/docker.pid)" >/dev/null || rm -f /var/run/docker.pid
bash team/bin/app.sh start
# if StatusDbNotReadyError: wait for the DB container, then start again
until docker inspect -f '{{.State.Health.Status}}' supabase_db_auto-applier | grep -q healthy; do sleep 5; done
bash team/bin/app.sh start
```

## Prevention
`team/bin/app.sh` could remove a stale docker.pid before starting dockerd and retry `supabase start` once on `StatusDbNotReadyError`.
