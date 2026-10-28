# Parley AGY Adapter Design

## Intent

Replace Parley 1.2.1's retired consumer Gemini CLI integration with Google's Antigravity CLI (`agy`) while preserving existing `gemini` seat identities and room transcripts.

## Goals

- Launch `agy` through the user's existing Google subscription login without API keys.
- Preserve existing room configuration by keeping the internal provider and seat id `gemini`.
- Support fresh AGY conversations and resume them through `conversation_id` / `--conversation`.
- Parse AGY JSON responses, failures, and cumulative usage accurately.
- Map Parley Talk and protected turns to AGY plan+sandbox behavior and Work turns to accept-edits+sandbox behavior.
- Keep Full access opt-in only.
- Keep AGY asleep and non-lurking by default because a minimal live prompt consumed 7,569 input tokens.
- Run the maintained source checkout through the existing global `parley` command after verification.

## Non-goals

- Reintroducing the retired `gemini` CLI.
- Supporting paid Gemini API-key mode.
- Changing Claude or Codex adapters.
- Renaming historical `gemini` seats in saved transcripts.
- Automatically enabling AGY in existing rooms.

## Constraints

- Windows 11 and AGY 1.4.7 are the target runtime.
- Existing rooms under `~/.parley` must remain untouched.
- No project repositories are modified.
- No Git commit, push, or upstream pull request.
- Production changes follow test-first red-green verification.

## Approaches

1. Command shim from `gemini` to `agy`: rejected because AGY session, permission, directory, and JSON contracts are not CLI-compatible.
2. Native AGY adapter in a maintained Parley checkout: selected because behavior can be tested, reviewed, linked, and rolled back.
3. Direct edit of the npm global package: rejected because updates overwrite it and there is no clean history or rollback boundary.

## Selected Architecture

- Keep provider key `gemini`; change its label and command contract to AGY.
- The adapter starts a fresh conversation without a caller-selected id, then records AGY's returned `conversation_id`.
- Later turns pass `--conversation <id>`.
- JSON `status`, `response`, `conversation_id`, and `usage` are parsed from stdout.
- AGY usage is cumulative per conversation, so the adapter stores the previous counters with the conversation id and records only non-negative per-turn deltas.
- Talk, discussion, reviewer, and read-only turns use `--mode plan --sandbox`.
- Work uses `--mode accept-edits --sandbox` unless the user explicitly selects Full access.
- Full access alone maps to `--dangerously-skip-permissions`.
- Staged attachment directories map to `--add-dir`.
- Default model is `gemini-3.8-flash-low`, default effort is `low`, lurk remains disabled.

## Verification

- Fake-AGY smoke tests cover arguments, stdin prompt delivery, session resume, JSON success/error parsing, attachment directories, permission mapping, and cumulative usage deltas.
- Existing Parley test suites must remain green.
- Live Talk verification runs in a disposable directory and must make no filesystem change.
- Live Work verification runs in a disposable directory and must create only the requested proof file.
- The linked global command must report the patched source and serve the existing room root successfully.

## Rollback

Stop the linked server and run `npm.cmd install --global parley-room@1.2.1`, then restart `parley`. Existing room data is independent under `~/.parley`.
