# Architecture Notes

## Required Deliverable

This document is the required Week 1 architecture deliverable for the SDD baseline.
It provides the implementation map and governance evidence for `specs/000-system-charter.md` through `specs/008-definition-of-done.md`.

### Deliverable Coverage

- Intent-first two-stage flow (`select_active_intent` before mutation): see `Phase 1: Handshake`.
- Deterministic pre/post hook boundary across native, MCP, and custom tools: see `Phase 2: Hook Middleware & Security Boundary`.
- Scope gating, destructive-action approval, and policy sidecar enforcement: see `Phase 2: Command classification and human gate`.
- Traceability contract (`intent_id`, `mutation_class`, hashes, tool origin, agent action, AST attribution): see `Phase 3: AI-native trace layer`.
- Parallel stale-write prevention and shared-memory governance behavior: see `Phase 4: Parallel orchestration`.
- Living documentation side effects for governance continuity: see `Phase 4: Verification failure lesson recording`.

## Phase 0: Core Map

### Tool loop entrypoint (host extension)

- Primary dispatcher function: `presentAssistantMessage(cline: Task)` in `src/core/assistant-message/presentAssistantMessage.ts:63`.
- Mutation guard wrapper:
    - pre-hook: `runOrchestrationPreToolHook(...)` at `src/core/assistant-message/presentAssistantMessage.ts:744`
    - post-hook: `runOrchestrationPostToolHook(...)` at `src/core/assistant-message/presentAssistantMessage.ts:1014`
- Exact tool routing in the dispatcher switch:
    - `case "write_to_file"` -> `writeToFileTool.handle(...)` at `src/core/assistant-message/presentAssistantMessage.ts:767`
    - `case "execute_command"` -> `executeCommandTool.handle(...)` at `src/core/assistant-message/presentAssistantMessage.ts:851`

### Concrete tool executors

- `WriteToFileTool.execute(...)` in `src/core/tools/WriteToFileTool.ts:29`
- `ExecuteCommandTool.execute(...)` in `src/core/tools/ExecuteCommandTool.ts:34`
- `src/core/tools/ApplyDiffTool.ts`
- `src/core/tools/ApplyPatchTool.ts`
- `src/core/tools/EditFileTool.ts`
- `src/core/tools/SearchReplaceTool.ts`

### Prompt builder path

- Runtime path (task execution):
    - `Task.getSystemPrompt()` in `src/core/task/Task.ts:3746`
    - invokes `SYSTEM_PROMPT(...)` at `src/core/task/Task.ts:3793`
    - implemented in `src/core/prompts/system.ts:112`
    - built by `generatePrompt(...)` in `src/core/prompts/system.ts:41`
- Prompt preview path (webview "getSystemPrompt"):
    - `generateSystemPrompt(...)` in `src/core/webview/generateSystemPrompt.ts:12`
    - invokes the same `SYSTEM_PROMPT(...)` at `src/core/webview/generateSystemPrompt.ts:42`
- Prompt sections where "Reasoning Loop" policy can be enforced:
    - `src/core/prompts/sections/objective.ts`
    - `src/core/prompts/sections/tool-use-guidelines.ts`
    - `src/core/prompts/sections/rules.ts`
    - optional mode-specific overlays via custom instructions in `addCustomInstructions(...)` inside `src/core/prompts/system.ts:103`

## Phase 1: Handshake

### New intent tool

- Tool definition: `src/core/prompts/tools/native-tools/select_active_intent.ts`
- Tool executor: `src/core/tools/SelectActiveIntentTool.ts`

### Context loader and injection

- Intent load, validation, and context assembly: `selectActiveIntentForTask(...)` in `src/core/orchestration/ToolHookEngine.ts`
- Reads `.orchestration/active_intents.yaml`
- Reads recent matching entries from `.orchestration/agent_trace.jsonl`
- Returns `<intent_context>...</intent_context>` tool result

### Gatekeeper

- `runOrchestrationPreToolHook(...)` blocks mutation when no valid active intent is selected.

## Phase 2: Hook Middleware & Security Boundary

### Hook wrapper over tool execution

- Pre-hook call occurs before each tool execution in `presentAssistantMessage(...)`.
- Post-hook call occurs after each non-partial tool execution in `presentAssistantMessage(...)`.
- Coverage includes native `tool_use`, dynamic `mcp_tool_use`, and custom tools.

### Command classification and human gate

- Default-destructive classification in `ToolHookEngine.ts`:
    - `execute_command` is SAFE only when all chained segments match `.orchestration/hook_policy.yaml` read-only allowlist.
    - Dynamic MCP tools are DESTRUCTIVE by default unless allowlisted in `.orchestration/hook_policy.yaml`.
- Destructive actions require approve/reject via `askApproval(...)`.
- Scope checks enforce `owned_scope` against target paths.
- `.intentignore` support blocks mutations for ignored intent IDs.

### Autonomous recovery

- Hook returns structured JSON tool errors for blocked/invalid mutation attempts.

## Phase 3: AI-native trace layer

### Write metadata contract

- Write tools require `intent_id` and `mutation_class`.
- Runtime pre-hook validates:
    - `intent_id` is present and matches selected active intent
    - `mutation_class` is present and one of `{AST_REFACTOR, INTENT_EVOLUTION}`

### Trace serialization

- Post-hook computes SHA-256 content hashes for modified segments.
- Appends JSONL records to `.orchestration/agent_trace.jsonl`.
- Includes `intent_id`, `related_requirements`, `mutation_class`, `tool_name`, `tool_origin`, `agent_action`, `modified_ranges`.
- Each modified range stores best-effort AST attribution:
    - `ast_status` in `{ok,fallback}`
    - `ast_nodes[]` with symbol/type/line/hash when parseable.
- Appends intent evolution entries into `.orchestration/intent_map.md` with file and symbol surfaces when class is `INTENT_EVOLUTION`.

## Phase 4: Parallel orchestration

### Optimistic locking

- Pre-write stale checks compare observed hash/mtime against current disk snapshot.
- Blocks write on divergence with `Stale File` error.

### Verification failure lesson recording

- Failed verification-like commands (`test`, `lint`, `typecheck`, `check-types`, `ci`) append lessons under `## Lessons Learned` in `CLAUDE.md` (fallback `AGENT.md`).
