# Parley AGY Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Parley's retired Gemini CLI adapter with an AGY 1.4.7 adapter that supports safe Talk/Work modes, resumable conversations, JSON responses, and accurate usage accounting.

**Architecture:** Preserve the provider key `gemini` for saved-room compatibility, but translate its runtime contract to AGY. Add a dedicated fake AGY executable for deterministic adapter tests, update server/UI metadata, verify against the full suite, then link the verified checkout as the global `parley` command.

**Tech Stack:** Node.js 24, JavaScript ES modules, Parley HTTP server, AGY 1.4.7, Node-based smoke tests, Playwright browser tests.

**Spec:** `docs/superpowers/specs/2026-10-28-agy-adapter-design.md`

## Global Constraints

- Target Windows 11 and AGY 1.4.7.
- Preserve internal provider and seat id `gemini`.
- Preserve `~/.parley` without migration or deletion.
- Use `gemini-3.8-flash-low`, low effort, no lurk by default.
- Never enable AGY Full access unless explicitly configured.
- Do not modify EcoAI projects.
- Do not commit or push.

## Review Focus

- A malformed or multi-line AGY JSON response must produce a useful error rather than an empty reply.
- A missing resumed conversation must trigger Parley's established fresh-session recovery only for recognized missing-session failures.
- A permission-mode change must retire the old native session before the next call.
- Cumulative counters that reset or decrease must never create negative or double-counted usage.
- Windows prompts longer than the command-line limit must travel through stdin.

---

### Task 1: Fake AGY protocol and failing adapter tests

**Files:**
- Create: `test/fake-agy.mjs`
- Modify: `test/smoke.mjs`

**Interfaces:**
- Produces: a fake executable accepting AGY arguments and stdin, emitting `{ conversation_id, status, response, usage }` JSON.
- Produces: smoke scenarios for fresh/resumed sessions, permission modes, input directories, JSON failures, and cumulative usage.

- [ ] **Step 1: Create failing smoke tests for the desired AGY invocation contract**

Assert fresh calls use `--output-format json`, `--mode plan`, `--sandbox`, selected model/effort, and stdin; resumed calls use `--conversation` with the id returned by the first response.

- [ ] **Step 2: Run the focused smoke test and verify RED**

Run: `npm.cmd run test:smoke`
Expected: FAIL because Parley still launches `gemini` flags such as `--session-id`, `--resume`, and `--approval-mode`.

- [ ] **Step 3: Extend failing tests for Work, Full access, attachments, errors, and cumulative usage**

Assert Work maps to `accept-edits --sandbox`, Full access alone adds `--dangerously-skip-permissions`, attachments add `--add-dir`, non-success JSON becomes an error, and a second cumulative snapshot records only the delta.

### Task 2: Server-side AGY provider adapter

**Files:**
- Modify: `parley.mjs:291-344`
- Modify: `parley.mjs:1553-1646`
- Modify: `parley.mjs:2455-2460`

**Interfaces:**
- Consumes: fake AGY contract from Task 1.
- Produces: `agySend(room, options)` returning `{ text, sessionRef, usage? }` through the existing adapter registry.
- Produces: AGY mode mapping and login-health hints while preserving provider key `gemini`.

- [ ] **Step 1: Update provider metadata and validated configuration values**

Set command `agy`, label `AGY`, current model choices, low effort default, AGY missing-session patterns, and dangerous-argument validation.

- [ ] **Step 2: Implement fresh and resumed AGY argument construction**

Fresh calls omit a conversation selector; resumed calls add `--conversation <sessionRef>`. Map model, effort, mode, sandbox, Full access, and `--add-dir` exactly as specified.

- [ ] **Step 3: Implement JSON parsing and session identity**

Parse a single JSON document from stdout; require `status === "SUCCESS"`, take `response` as text, and return `conversation_id` as `sessionRef`.

- [ ] **Step 4: Implement cumulative usage delta normalization**

Bind the previous cumulative snapshot to its conversation id, calculate non-negative input/output/thinking/total deltas, and reset the baseline when the conversation changes or counters decrease.

- [ ] **Step 5: Update AGY health detection**

Recognize `%USERPROFILE%\.gemini\antigravity-cli\settings.json` or `brain` as local login/config evidence and direct remediation to `agy` rather than the retired Gemini CLI.

- [ ] **Step 6: Run smoke tests and verify GREEN**

Run: `npm.cmd run test:smoke`
Expected: exit 0 with every AGY adapter assertion passing.

### Task 3: UI and documentation alignment

**Files:**
- Modify: `ui/app.js:3921-3927`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: provider metadata and modes from Task 2.
- Produces: UI text that accurately describes AGY Talk, Work, session reset, and Full access behavior.

- [ ] **Step 1: Add failing source/UI assertions for AGY labels and warnings**

Assert no active settings copy instructs users to install or configure the retired consumer Gemini CLI.

- [ ] **Step 2: Run the applicable unit/browser test and verify RED**

Run: `npm.cmd run test:unit`
Expected: FAIL on stale Gemini CLI labels or warnings.

- [ ] **Step 3: Update UI copy and user documentation**

Describe AGY, plan+sandbox Talk behavior, accept-edits+sandbox Work behavior, explicit Full access, subscription login, and high per-session context overhead.

- [ ] **Step 4: Run unit and browser tests and verify GREEN**

Run: `npm.cmd run test:unit`
Run: `npm.cmd run test:browser`
Expected: both exit 0.

### Task 4: Full automated and live verification

**Files:**
- Test only; create disposable files under `%TEMP%` during live Work verification and remove them afterward.

**Interfaces:**
- Consumes: completed adapter from Tasks 1-3.
- Produces: automated and live evidence that the integration works without touching existing rooms.

- [ ] **Step 1: Run all automated tests**

Run: `npm.cmd run test:all`
Expected: exit 0 with no failed suites.

- [ ] **Step 2: Run live Talk verification in a disposable Parley root and workspace**

Address only AGY with a minimal `TALK_OK` prompt. Verify the response, preserved conversation id, plan+sandbox arguments through diagnostics, and no workspace changes.

- [ ] **Step 3: Run live Work verification in a disposable workspace**

Explicitly request one proof file with fixed content. Verify only that file is created, capture the response, then remove the disposable directory.

- [ ] **Step 4: Verify resume through the modified Parley adapter**

Send one minimal continuation in the same Talk conversation and verify the stored `sessionRef` remains equal to AGY's returned `conversation_id`.

### Task 5: Link, restart, and rollback verification

**Files:**
- Global npm link only; no source file changes.

**Interfaces:**
- Consumes: verified checkout at `C:\software\tools\parley-agy`.
- Produces: global `parley` command resolving to this checkout while continuing to use `~/.parley`.

- [ ] **Step 1: Record the current global package resolution for rollback**

Run: `Get-Command parley`; `npm.cmd list --global parley-room`
Expected: official 1.2.1 installation recorded.

- [ ] **Step 2: Link the verified checkout**

Run: `npm.cmd link`
Expected: global `parley-room` resolves to `C:\software\tools\parley-agy`.

- [ ] **Step 3: Restart the exact Parley listener and verify service health**

Resolve port 4141 ownership, stop only the confirmed Parley process, run `parley --no-open`, and verify `http://127.0.0.1:4141` returns HTTP 200.

- [ ] **Step 4: Verify existing rooms remain readable**

Open the existing root without mutation and confirm its room list loads.

- [ ] **Step 5: Record rollback command**

Rollback: `npm.cmd install --global parley-room@1.2.1`, then restart `parley`.

### Task 6: Provider tool catalog and composer insertion

**Files:** `parley.mjs`, `ui/index.html`, `ui/styles.css`, `ui/app.js`, `test/smoke.mjs`, `test/fake-*-tools.mjs`

- Inventory only names, descriptions and enabled/connection state for each provider's Skills, MCP servers and Plugins.
- Use each CLI's local list command; never return command lines, environment values, URLs, credentials or filesystem paths to the browser.
- Discover skill names/descriptions only from provider skill/plugin directories and the linked project.
- Add a searchable Tools dialog with provider tabs and sections.
- Clicking an available item inserts a provider-addressed natural-language invocation into the composer without sending it.
- Keep unavailable providers visible, but disable insertion when that provider has no seat in the current room.
- Add fake-CLI coverage for inventory parsing and a UI source contract test.
