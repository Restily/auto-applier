# playwright-cli-chromium-in-cloud-vm

_2026-09-27 · Tags: playwright-cli, chromium, "open" fails, Chrome not found, cloud VM, fonts not loading in screenshots_

## Symptom
`playwright-cli open <url>` fails in the cloud VM: it tries the Google Chrome channel, which isn't installed. Pages that load Google Fonts render in a fallback font in Chromium screenshots (TLS error to fonts.googleapis.com inside the browser).

## Root cause
- playwright-cli defaults to the `chrome` channel. The VM has only Playwright's bundled Chromium under `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`).
- The bundled Chromium doesn't trust the agent proxy's CA. Node does, via `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.

## Fix
- Global config `~/.playwright/cli.config.json`:
  ```json
  { "browser": { "browserName": "chromium", "launchOptions": { "channel": "chromium" } } }
  ```
- Or pass `--browser=chromium` on `open`.
- The app serves its fonts itself (self-hosted via @fontsource + next/font/local), so screenshots don't depend on external font CDNs.

## Prevention
The cloud setup script should write the config above after `npm i -g @playwright/cli` (human-owned `team/cloud/setup-script.sh`).
