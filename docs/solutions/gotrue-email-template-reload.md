# gotrue-email-template-reload

_2026-10-04 · Tags: supabase auth, GoTrue, email template, recovery.html, RedirectTo, template not updating_

## Symptom
After editing `supabase/templates/recovery.html`, password-reset emails in Mailpit still use the old template for several minutes.

## Root cause
The template file is bind-mounted into the local stack, so the in-container copy changes immediately. GoTrue (v2.197.0) only re-reads templates on a poll of about 9 minutes. A single-file bind mount also follows the inode: an editor that writes a new file instead of editing in place leaves the container on the old copy until the next `supabase start`.

## Fix
```bash
docker restart supabase_auth_auto-applier   # ~2 s auth downtime; no full supabase stop/start needed
```
Edit the template in place, keeping the same inode.

Template facts used by T-025:
- The recovery template receives `.RedirectTo`, the full `redirect_to` URL with its query string, plus `.SiteURL`, `.Data` (user_metadata) and `.TokenHash`.
- `print`, `eq`, `ne`, `or` and `and` are available.
- The language marker is matched exactly: `eq .RedirectTo (print .SiteURL "/reset-password?lang=ru")`. The app's `APP_ORIGIN` must equal `site_url` (`http://localhost:3000`, not `127.0.0.1`).

## Prevention
After any change under `supabase/templates/`, restart the auth container before running email tests.
