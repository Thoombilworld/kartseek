# 0001 — Record architecture decisions

**Status:** Accepted, 2026-09-05

## Context

This repository has 35 deployables built by many hands over several months.
The reasoning behind its structural choices lived in commit messages, code
comments and audit reports, none of which a new developer finds first. Several
choices (the builder, the test runner, the zone model) were made after a
painful failure that is worth not repeating.

## Decision

Record every architecture-level decision as an ADR in this folder, using this
file's structure: Status, Context, Decision, Consequences. Number them
sequentially. Write one when a choice constrains future work, is expensive to
reverse, or was made after a failure that must not recur.

## Consequences

Decisions become discoverable and reviewable. The cost is one short document
per decision, written when the decision is made rather than reconstructed
later.
