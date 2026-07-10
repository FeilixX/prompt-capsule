# Moderation worker — deploy notes

Publish-then-review content moderation. Capsules go live immediately as `pending`
(readable). A long-lived worker (`build/moderate.js`, a self-contained bundle produced from
`scripts/moderate.ts` by `bun run build`) batches pending capsules to DeepSeek and flips each to
`approved` or `blocked`. A **blocked capsule reads as 404** on `/c/{slug}`, `/view/{slug}`, and
the MCP `read_prompt_tape` tool.

The worker opens `data/capsules.db` directly, so it runs on the **same host as the web
app** (the production host), not remotely. Because it is bundled, only `build/` needs to be on the server —
no `src/` tree required (the DB opens with `busy_timeout` so web + worker can write concurrently).

## 1. Server env (`/opt/capsule/.env`, gitignored)

```
DEEPSEEK_API_KEY=sk-...        # required; empty => worker no-ops
MODERATION_ENABLED=true        # master switch
DEEPSEEK_PROXY=                # empty = direct connect; set a local proxy only for dev machines
# optional overrides (defaults shown):
# DEEPSEEK_MODEL=deepseek-v4-flash
# MODERATION_BATCH_SIZE=20        (clamped 1..50; out-of-range falls back to default)
# MODERATION_INTERVAL_SEC=60      (clamped 1..86400; out-of-range falls back to 60)
# MODERATION_MAX_ATTEMPTS=3       (clamped 1..100)
# MODERATION_TIMEOUT_SEC=30       (per-request DeepSeek timeout, clamped 1..600)
```

Full content of every capsule is always sent to DeepSeek (no length knob) — truncation would be
a moderation bypass (pad benign head, hide the violation in the tail).

The web process needs no new env — the 404 gate reads only the DB column. Toggling
`MODERATION_ENABLED` and restarting the worker is the only lever.

## 2. Schema migration

None to run by hand. `initSchema` (called on first DB open by both the web app and the
worker) runs an idempotent `ALTER TABLE ... ADD COLUMN` for the moderation columns.
Every pre-existing capsule defaults to `pending`, so the first worker pass reviews the
whole backlog once.

## 3. Install the unit

Prereq: `bun run build` produced `build/moderate.js`, and `build/` was rsynced to the server
(same deploy as the web app).

The unit ships with `__PLACEHOLDERS__` and will NOT run until you edit them:
`__DEPLOY_DIR__` (the deploy dir holding `build/`, same dir the web app runs from,
e.g. `/opt/prompt-capsule`), `__RUN_USER__` (owner of `data/capsules.db`), `__BUN_PATH__`
(a bun the run-user can execute — NOT a `/root/...` path for a non-root User=; verify with
`file /usr/local/bin/bun` that it's a real ELF).

```
sudo cp deploy/capsule-moderate.service /etc/systemd/system/
sudo sed -i 's#__DEPLOY_DIR__#/opt/prompt-capsule#; s#__RUN_USER__#capsule#; s#__BUN_PATH__#/usr/local/bin/bun#' \
  /etc/systemd/system/capsule-moderate.service   # ← set to YOUR real values
sudo systemctl daemon-reload
sudo systemctl enable --now capsule-moderate
journalctl -u capsule-moderate -f      # watch: moderate_round events, backoff on API errors
```

## 4. Verify

- `sudo systemctl status capsule-moderate` → active (running)
- Post a test capsule with clearly-violating content, wait one interval, confirm
  `/c/{slug}` returns 404 and a benign capsule still returns 200.
- `moderation_status`, `moderation_reason`, `moderation_model` on the row show the verdict.

## Operational notes

- **Fail-open:** if DeepSeek is unreachable, a capsule is retried up to
  `MODERATION_MAX_ATTEMPTS` rounds, then auto-approved (`moderation_model = 'fallback'`)
  so nothing sticks in `pending`. Content is readable throughout (publish-then-review).
- **Fail-open ALERTING (do not skip):** each fail-open round logs a distinct
  `"evt":"moderate_fail_open"` WARN. Under an ICP filing, a silent outage that auto-approves an
  un-reviewed backlog (涉政/暴恐 slips through) is a compliance exposure — alert on this event.
  List the un-reviewed rows any time:
  `SELECT slug, created_at FROM capsules WHERE moderation_model = 'fallback';`
  Force a re-review once DeepSeek is healthy:
  `UPDATE capsules SET moderation_status='pending', moderation_attempts=0 WHERE moderation_model='fallback';`
- **Backoff:** a fully-failed round backs off 60s → 120s → … → 600s, resetting on success.
- **Manual appeal / override:** a mistaken `blocked` can be restored by hand:
  `UPDATE capsules SET moderation_status='approved', moderation_reason='manual override' WHERE slug='...';`
- **Re-review:** to force a recheck, set a row back to
  `moderation_status='pending', moderation_attempts=0`.
