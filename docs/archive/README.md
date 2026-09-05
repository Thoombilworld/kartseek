# Archived status reports

Point-in-time documents from earlier remediation cycles, moved here from the
repository root on 2026-08-15.

They are kept because they record *why* certain decisions were made, and
several contain reproduction steps that are still useful. They are **not**
current documentation:

- Titles such as "ALL FIXES COMPLETE" and "FINAL SUMMARY" describe the state of
  the codebase on the day they were written, not today's.
- Three of them (`ALL_FIXES_COMPLETE.md`, `README_FIXES.md`, `INDEX.md`) are
  overlapping summaries of the same cycle and disagree with each other in
  places.
- `validate-fixes.sh` checks for issues from that cycle only.

For the current picture, prefer:

- `README.md` and `ARCHITECTURE.md` in the repository root
- the dated audits in `docs/audits/` (for example `2026-08-10-marketplace-remediation.md`)
- `apps/api/test/gateway-service-contract.spec.ts`, which asserts the
  gateway ↔ service contract on every test run rather than describing it in prose

A status report goes stale the day after it is written; the contract test does
not. New findings belong in a dated file under `docs/`, and anything that can be
asserted should become a test instead.
