# Project Manager Modal and Sidebar Tooltips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar workspace shortcut with a project-management modal and add consistent localized tooltips to the left sidebar menu.

**Architecture:** Reuse the existing room config fields `projectDir` and `projectDirs`, but move their draft editing from the settings modal into a dedicated project modal. Reuse one lightweight tooltip pattern for static sidebar actions while preserving the Usage graph tooltip.

**Tech Stack:** Node.js, browser JavaScript, HTML, CSS, existing Parley JSON API and i18n dictionary

**Spec:** `docs/superpowers/specs/2026-10-29-project-manager-modal-and-sidebar-tooltips-design.md`

## Global Constraints

- No new runtime dependencies.
- Removing a connection never deletes the actual project directory.
- Project changes remain drafts until `Apply`.
- Korean and English copy must stay in sync.
- Do not run the full test suite; use focused tests, syntax checks and package dry-run only.
- Do not create a Git commit unless the user explicitly requests it.

## Review Focus

- Removing the active project with other projects remaining selects the first remaining entry only in the draft.
- Cancelling the modal leaves room configuration unchanged.
- Duplicate paths compare case-insensitively and ignore trailing separators.
- Missing and runtime-mismatched paths remain visible with warning status.
- Folder-picker results returning after modal close or room change are ignored.

---

### Task 1: Project modal markup and localized copy

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/i18n.js`
- Modify: `ui/styles.css`
- Test: `test/project-links-ui.mjs`

**Interfaces:**
- Consumes: existing modal, button and project-link CSS patterns
- Produces: `projectOverlay`, `projectLinks`, `projectAdd`, `projectApply`, `projectCancel` DOM elements

- [ ] Add failing DOM assertions for the dedicated project modal and removal of the project section from Settings.
- [ ] Run `node --test test/project-links-ui.mjs` and confirm failure.
- [ ] Add modal markup, responsive styles and Korean/English labels.
- [ ] Run the focused test and confirm pass.

### Task 2: Draft project management behavior

**Files:**
- Modify: `ui/app.js`
- Test: `test/project-links-ui.mjs`
- Test: `test/project-links-api.mjs`

**Interfaces:**
- Consumes: `state.summary.projectLinks`, `state.summary.cfg.projectDir`, `state.summary.cfg.projectDirs`, `/api/config`, `/api/pick-folder`, `/api/open`
- Produces: `openProjectManager()`, `closeProjectManager()`, `renderProjectLinks()`, draft add/edit/remove/select/apply actions

- [ ] Add failing assertions for opening from the sidebar, draft-only changes, stale picker rejection and one-shot Apply.
- [ ] Run focused project-link tests and confirm failure.
- [ ] Move project draft state out of Settings and implement modal open/close/render behavior.
- [ ] Implement add, reselect path, remove, select current and open-folder actions.
- [ ] Persist `projectDir` and `projectDirs` only on Apply and refresh the room summary.
- [ ] Run focused project-link tests and confirm pass.

### Task 3: Sidebar tooltips

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/i18n.js`
- Modify: `ui/styles.css`
- Test: `test/i18n.mjs`
- Test: `test/project-links-ui.mjs`

**Interfaces:**
- Consumes: existing `data-i18n-title` translation application and Usage tooltip styles
- Produces: localized hover/focus descriptions for project, transcript export, room folder, Tools, Settings and Docs

- [ ] Add failing assertions for every sidebar tooltip key and hover/focus target.
- [ ] Run focused i18n and project UI tests and confirm failure.
- [ ] Add a shared tooltip bubble pattern and localized one-line descriptions.
- [ ] Preserve the existing Usage graph tooltip without nesting or overlap.
- [ ] Run focused tests and confirm pass.

### Task 4: Version, documentation and focused verification

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `parley.mjs`
- Modify: `ui/app.js`
- Modify: `README.md`
- Modify: `CHANGELOG.ko.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: completed Tasks 1-3
- Produces: one versioned, restart-safe local build with documented differences

- [ ] Bump package and runtime protocol versions consistently.
- [ ] Update the README differences table and Korean/English changelogs.
- [ ] Run `node --check ui/app.js` and relevant focused tests.
- [ ] Run `git diff --check` and `npm.cmd pack --dry-run --json`.
- [ ] Restart Parley only after confirming every room is idle, then verify the new protocol and version.

