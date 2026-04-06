# Feature-Flag Deployment Plan

## Objectives

- De-risk launch by gating functionality behind independent flags.
- Validate reliability, engagement, and safety before broad availability.
- Ensure instant rollback for realtime delivery and write-path mutations.

## Flag topology

Use separate flags so rollout and rollback can be precise:

- `feed.read.enabled` — read access to the new feed experience.
- `feed.write.enabled` — create/update/delete writes for new feed entities.
- `feed.realtime.enabled` — realtime subscriptions, push events, and live counters.
- `feed.migration.read_legacy_fallback` — fallback to legacy reads during migration.
- `feed.kill_switch.global` — emergency global disable for all new feed surfaces.
- `feed.kill_switch.write` — emergency disable for write path only.
- `feed.kill_switch.realtime` — emergency disable for realtime only.

> Recommendation: implement flags with support for user allowlists, region targeting, and percentage rollout.

## Phase 1 — Internal alpha (employees + synthetic load)

**Audience**

- Employee accounts only (allowlist by account domain or user IDs).
- Synthetic clients that emulate read/write/realtime traffic patterns.

**Flag settings**

- `feed.read.enabled = ON` for employee allowlist only.
- `feed.write.enabled = ON` for employee allowlist only.
- `feed.realtime.enabled = ON` for employee allowlist only.
- Keep non-employee traffic pinned to legacy paths.

**Exit criteria**

- Error budget burn rate stable for 3 consecutive days.
- No critical data integrity regressions in write path.
- Synthetic load meets p95 latency and throughput targets.

## Phase 2 — Closed beta (selected users + regions)

**Audience**

- Invite-only cohort from target personas.
- Limited region set (for example: one low-risk region first, then one high-volume region).

**Flag settings**

- Enable read path for selected users and specific regions.
- Enable write path only for invited users with stricter throttling.
- Enable realtime path in a single region first, then expand.

**Guardrails**

- Region-level circuit breakers.
- Abuse/rate-limit thresholds tightened versus GA defaults.
- Daily qualitative feedback review from beta participants.

**Exit criteria**

- SLO compliance sustained for 7 days in beta regions.
- Engagement parity or improvement versus legacy experience.
- Abuse metrics do not exceed predefined thresholds.

## Phase 3 — Gradual percentage rollout + kill-switches

Roll out in controlled steps (example progression): **1% → 5% → 10% → 25% → 50%**.

At each step:

1. Hold for a minimum observation window (4–24 hours depending on traffic volume).
2. Compare key metrics to control cohort.
3. Advance only if all launch gates remain green.

**Mandatory kill-switch behavior**

- If realtime degrades: flip `feed.kill_switch.realtime = ON` and keep reads/writes active.
- If write corruption risk appears: flip `feed.kill_switch.write = ON`; keep reads active in read-only mode.
- If broad incident: flip `feed.kill_switch.global = ON` to revert fully to legacy.

## Phase 4 — Backfill and migration for legacy content/profile metadata

Run migration as resumable, idempotent jobs:

- Backfill legacy user content into new storage/indexes.
- Migrate profile metadata required for ranking, safety, and personalization.
- Validate record counts, checksums, and referential integrity per batch.

**Operational plan**

- Process in small batches with rate limits to protect primary DB.
- Track per-batch success/failure and retry with dead-letter queue for persistent failures.
- Keep `feed.migration.read_legacy_fallback = ON` until validation thresholds are met.

**Completion criteria**

- 99.99%+ successful migration of eligible records.
- Data-quality checks pass for sampled and full-population validations.
- Legacy fallback no longer needed for routine reads.

## Phase 5 — Post-launch review before 100%

Before promoting to 100%, run a formal review across:

- **Reliability/SLOs**: availability, p95/p99 latency, error rates, event lag.
- **Engagement**: DAU/WAU impact, session depth, retention, creation rate.
- **Safety/abuse**: spam reports, policy violations, moderation queue time, block/mute trends.

**Decision outcomes**

- Proceed to 100% rollout.
- Hold at current percentage with remediation actions.
- Roll back to previous stable percentage (or legacy) via kill-switches.

## Launch governance checklist

- [ ] On-call owner and incident commander assigned for each rollout window.
- [ ] Dashboards and alerts validated for read, write, realtime, and migration jobs.
- [ ] Runbook includes explicit rollback steps with flag names and owners.
- [ ] Support, trust & safety, and comms teams briefed ahead of each phase change.
- [ ] Change log recorded for every flag adjustment (who/when/why).
