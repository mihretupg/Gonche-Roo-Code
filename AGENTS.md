# AGENTS.md

This file provides guidance to agents when working with code in this repository.

- Settings View Pattern: When working on `SettingsView`, inputs must bind to the local `cachedState`, NOT the live `useExtensionState()`. The `cachedState` acts as a buffer for user edits, isolating them from the `ContextProxy` source-of-truth until the user explicitly clicks "Save". Wiring inputs directly to the live state causes race conditions.

## Week 1 Governance Rules (Intent-Code Traceability)

These are mandatory for any workspace mutation and reflect the intended project output.

- Intent handshake first: before any write/mutation tool call, select an active intent via `select_active_intent(intent_id)`.
- Mutation without valid intent is blocked: do not attempt to bypass this flow.
- Scope enforcement: only mutate files within the active intent `owned_scope`.
- Destructive actions require approval: treat write/delete/mutating commands as approval-gated.
- Use mutation classification on writes: `mutation_class` must be one of `AST_REFACTOR` or `INTENT_EVOLUTION`.
- Preserve append-only traceability: successful writes must append to `.orchestration/agent_trace.jsonl`.
- Trace entry expectations: include `intent_id`, `related_requirements` (`REQ-*`), `mutation_class`, modified range data, and content hash(es).
- Respect stale-file protection: if a stale file error occurs, re-read and reconcile before writing again.
- Keep orchestration sidecar authoritative: do not manually delete/overwrite governance artifacts under `.orchestration/`.

## Orchestration Artifacts

- `.orchestration/active_intents.yaml`: source of selectable active intents and constraints.
- `.orchestration/agent_trace.jsonl`: append-only trace ledger.
- `.orchestration/intent_map.md`: evolving intent-to-code map.
- `.orchestration/hook_policy.yaml`: command classification policy.
- `.orchestration/.intentignore`: blocked intent IDs for mutation.
