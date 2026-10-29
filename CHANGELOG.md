# Changelog

Notable changes per repository version.

## 1.4.6 — 2026-10-29

- Kept persona fields at a fixed height with internal scrolling instead of manual resizing.
- Expanded room notes into a multiline field with internal scrolling and adjustable height.
- Fixed the usage preview remaining visible after closing the dialog and restoring button focus.
- Dismiss the preview on close and allow it on the next pointer entry or keyboard visit, preserving the five-minute cache.

## 1.4.5 — 2026-10-29

- Added one-time setup via `setupParley.cmd` or `npm run setup` to register the global command and Windows user PATH.
- Added `parley start / stop / restart / status` for background server management from any directory.
- Verify server identity, prevent duplicate instances, refuse shutdown during active or queued work, and preserve room data.
- Reorganized the basic guide by task with compact tables and collapsible details.

## 1.4.4 — 2026-10-29

- Kept room settings in the left sidebar and removed the duplicate top-right settings button.
- Expanded settings to three columns for three seats, with two- and one-column layouts on narrower screens.
- Renamed the top chat reset action to Clean chat and localized its archival and session-reset confirmation.
- Added dated archive previews and restoration into a new room, preserving the current room, archived message order and available attachments.
- Saved room settings alongside new archives, including seat identities, roles, personas and room notes. Legacy archives use the source room's current settings.
- Restored rooms use fresh CLI sessions and wait for a new message before starting work. Project and sandbox file states are not restored.
- Localized room deletion confirmation, completion notices and sidebar room action tooltips.

## 1.4.3 — 2026-10-29

- Added pasted or selected PNG, JPEG and WebP face images for each seat.
- Added drag and zoom cropping, saving a compact 64×64 PNG in the existing C/X avatar frame.
- Added `/note @call-name request` to ask one model to summarize durable shared rules and save the result as the room note.
- Restricted model-authored room-note changes to explicit `/note` requests so ordinary replies cannot mutate settings.
- Reduced repeated prompt tokens by delivering a room note once per native CLI session and only again after a change or new session.
- Preserved every remaining model's native CLI session and existing transcript order when seats are added or removed; only a newly added seat starts fresh with recent room context.
- Added a removal confirmation that distinguishes deleted seat settings/session state from the retained room transcript.
- Localized Talk/Work mode confirmation dialogs according to the selected Korean or English UI language.
- Fixed a server error when removing a Codex-provider seat with sandbox settings.

## 1.4.2 — 2026-10-29

- Added per-seat call aliases, including Unicode mentions such as `@지니`, while preserving stable legacy mentions.
- Added a ten-character assigned-role label and a persistent persona for each seat.
- Delivered the full persona only once per room-native CLI session, with one refresh after identity changes or a new session.
- Applied names, roles and call aliases to the header, target chips, autocomplete and starter prompts.
- Added Unicode alias routing for direct user calls, peer calls and Pair targeting.

## 1.4.1 — 2026-10-29

- Added Settings controls to add or remove a third Codex, Claude, or AGY seat.
- Added per-seat display names, emoji avatars, and colors while keeping stable routing mentions.
- Added `@all` for three-seat broadcasts while retaining `@both` compatibility.
- Clarified in Settings and the guide that Extra CLI args are command options, not model prompts.
- Applied customized seat presentation to the room list and conversation header.

## 1.4.0 — 2026-10-29

- Kept Codex and Claude Fast-mode tooltips concise while adding official usage and billing cautions.
- Rebuilt the notification setting as an aligned checkbox, explanation and browser-storage scope block, removing the ambiguous background-tab wording.
- Added a dismiss button to the full-access notice and stored dismissal per room.
- Added an update badge that appears only for a newer release, with hover release notes and an optional install dialog.
- Added guarded `git pull --ff-only` installation and automatic Parley restart for clean Git checkouts with no active or queued work.
- Clearly separated optional remote updates from the page/server runtime mismatch safety warning.

## 1.3.9 — 2026-10-29

- Standardized Korean tooltips, guidance, status and error messages on polite formal wording.
- Removed informal Korean phrasing from restart, folder, usage, settings and seat-control notices.
- Linked the sidebar usage guide to the repository README and made its destination explicit in the tooltip.

## 1.3.8 — 2026-10-29

- Removed the old Fast response behavior that rewrote reasoning effort to `low`.
- Connected Codex to its real `service_tier=fast` transport and Claude to its real CLI `fastMode` setting.
- Preserved each seat's reasoning effort when Fast mode is toggled.
- Hid the AGY seat toggle because the installed AGY 1.4.9 command catalog no longer exposes Fast mode.
- Restored the pre-1.3.7 reasoning effort during migration and removed the legacy temporary setting.

## 1.3.7 — 2026-10-29

- Passed the room's current Codex sandbox policy to both fresh and resumed CLI invocations.
- Fixed resumed Codex turns falling back to the CLI's default read-only policy after starting with full access.
- Kept persisted room permissions aligned with the actual CLI process across native-session continuations.
- Replaced the sidebar project button with a dedicated connected-project manager.
- Added one-screen project add, select, open, path replacement and connection removal actions.
- Kept project changes as a draft until Apply and never deleted the underlying folder when removing a connection.
- Removed project management from Settings and added localized explanatory tooltips to the other sidebar actions.

## 1.3.6 — 2026-10-29

- Unified Codex and Claude usage cards around current-conversation tokens and quota charts.
- Hid Claude-only recent request/session activity because Codex CLI does not expose an equivalent metric.
- Kept parsing Claude's activity source data without affecting quota lookup behavior.

## 1.3.5 — 2026-10-29

- Recognized Claude `Current session` usage even when `/usage` omits its reset time.
- Displayed both five-hour and weekly windows for Codex and Claude when supplied by their CLIs, while hiding unavailable windows.
- Renamed Claude's session quota display to 5-hour limit for consistency.

## 1.3.4 — 2026-10-29

- Simplified Usage open and hover behavior around one shared five-minute cache.
- Reused fresh results and in-flight requests within five minutes; Refresh remains the only immediate recheck.
- Moved long usage-scope explanations into info tooltips and aligned Codex/Claude token summaries in two columns.
- Simplified Claude quota labels to Session limit and Weekly limit, with localized reset labels in Korean.

## 1.3.3 — 2026-10-29

- Added a fresh current-room usage lookup when the pointer enters the closed Usage menu.
- Locked hover-triggered lookup until the pointer leaves to prevent duplicate CLI calls while moving inside the tooltip.
- Kept explicit lookups on dialog open and Refresh, with another hover lookup after re-entry.
- Simplified the dialog note to explain the Refresh action directly.

## 1.3.2 — 2026-10-29

- Parsed Claude `/usage` current-session and current-week percentages with their reset labels.
- Kept Claude's last-24-hour and last-7-day request/session activity summaries.
- Placed request/session activity and reported current-conversation token totals above the circular quota charts.
- Explicitly labeled token totals as room-conversation metadata rather than estimated account-wide usage.

## 1.3.1 — 2026-10-29

- Added multiple saved project folders per room with one selectable current CLI working path.
- Added project selection and removal controls to room settings.
- Added mismatch warnings in settings, the room list and workspace action when the active path is missing or differs from the runtime path.
- Migrated existing single-project room configuration into the compatible project list automatically.

## 1.3.0 — 2026-10-29

- Added a current-room CLI usage view to the sidebar.
- Usage is fetched once when the view opens and checked again only through the Refresh button or a later reopen.
- The closed menu hover shows the last circular quota summary and check time without background polling.
- Displayed exact Codex and AGY remaining/reset windows separately from Claude CLI's local request/session statistics; no unavailable quota is estimated.
- Opened workspace and room folders through Explorer directly on Windows and stopped reporting success when the launcher fails.

## 1.2.9 — 2026-10-29

- Replaced the prose `Use the "..." skill to` insertion with a visible `[$seat:skill]` marker.
- Rendered selected skills as distinct colored badges in chat bubbles.
- Converted the marker to each provider's native invocation prefix before launch: `/skill` for Claude and AGY, `$skill` for Codex.
- Preserved surrounding composer text when a skill is selected in the middle of a message.

## 1.2.8 — 2026-10-29

- Expanded Korean descriptions across the currently installed Codex and Claude skills, including Matt Pocock, Superpowers, Notion, Figma, Sentry and artifact-template entries.
- Increased tool-card title, description and spacing sizes without changing the tools modal dimensions; fewer entries are shown at once and remain accessible by scrolling.

## 1.2.7 — 2026-10-29

- Restored the immediate queue action on the editable current-work instruction card.
- The new `Queue as next task` button posts the message to the conversation and target lane immediately without stopping the active invocation; delivery to the CLI begins as soon as that invocation finishes.
- Kept the editable auto-send-after-completion option as a separate choice instead of replacing the original queue behavior.

## 1.2.6 — 2026-10-28

- Added a per-seat Fast response toggle. It applies each provider's real `low` reasoning-effort option on the next CLI invocation and restores the previous effort when disabled.
- Added Codex `turn.started` progress handling and a shared instruction for concise, user-visible progress reports at meaningful work transitions without exposing private reasoning, followed by one consolidated completion result.
- Kept tool and file activity visible beside streamed public progress messages instead of dropping later events after the first text update.
- Replaced the ambiguous preparing label with an explicit notice that the request reached the CLI and Parley is waiting for a public progress event.
- Corrected current-work instruction wording: the one-shot CLI adapters cannot accept a new prompt mid-invocation, so staged instructions are delivered after the active invocation completes unless the user stops it.

## 1.2.5 — 2026-10-28

- Added a Korean changelog covering every repository version and linked both Korean and English release histories from the README.
- Included the Korean changelog in the npm package contents.

## 1.2.4 — 2026-10-28

- Replaced the live reply's dots-only state with transient progress supplied by each CLI, including generic reasoning/planning phases, tool or command activity, file work and reply writing.
- Kept provider-internal reasoning private: Parley shows only an honest phase label, never raw chain-of-thought or provider reasoning summaries.
- Added a localized `Preparing the response` fallback with elapsed time when a provider has not emitted a progress event yet; no synthetic work steps are invented.

## 1.2.3 — 2026-10-28

- Redesigned the current-work instruction as a compact preview card with Auto, per-model and Both target choices.
- Changed editing to restore the saved text to the main composer instead of exposing a second always-open editor.
- Additional instructions now send automatically only after the active exchange fully settles; deleting the card before then cancels delivery.

## 1.2.2 — 2026-10-28

- Replaced the retired consumer Gemini CLI invocation with Google Antigravity CLI (`agy`) while retaining the internal `gemini` provider id for saved-room compatibility.
- Added AGY conversation resume, JSON response/error parsing, current model and effort controls, sandboxed Talk/Work modes, explicit Full access, and cumulative-to-per-turn usage accounting.
- Added deterministic AGY adapter coverage without provider logins or token spend.
- Added a searchable per-provider Tools drawer for Skills, MCP servers and plugins, with safe composer insertion, provider-qualified Skill names, included-Skill counts and metadata-only browser exposure.
- Added `$` Skill autocomplete in the composer, including provider selection, partial-name search and keyboard navigation without automatic sending.
- Changed Claude MCP discovery to show configured servers immediately and run the slower live connection check only when explicitly requested.
- Added an editable current-work instruction card: messages aimed at a seat already responding are held above the composer, can be edited or deleted, and can join the same work context after the current response without stopping it.
- Added Korean labels, tooltips and runtime messages across the main controls, wider settings/tool dialogs, and latest-message scrolling when a room opens.
- Added a persistent desktop sidebar collapse control while preserving the mobile overlay.

## 1.2.1 — 2026-10-11

Two Claude Code fixes.

- **No false "not logged in" on first run.** When Claude Code keeps its login somewhere other than the credentials file Parley looks for, the setup check now asks `claude` for its login status instead of reporting a signed-in seat as signed out. (#7)
- **Claude keeps its session across discussion and work.** A Claude seat with Full access used to throw away its session whenever a protected turn ran (an `@both` discussion in a work room, a pair review, lurking), so the next ordinary turn started blank and re-read the room from history. Protected turns now use a separate Plan session that consecutive protected turns resume, and only crossing between the two starts fresh. In every other permission mode, one session serves both. Fewer re-briefs, fewer tokens. (#8)

## 1.2.0 — 2026-09-18

Durability, the settled interaction fixes, a third provider, and the first pass
at cost visibility.

- **Automatic turns, counted plainly.** New rooms allow four automatic provider starts per message after the initial requested replies. Listening, sibling attention, answer returns, catch-up and internal recovery all spend that allowance, including silent or failed attempts. The policy and usage survive Retry, Wake and restart; existing rooms retain their previous accounting until explicitly switched. The composer shows the allowance, and each reply explains what triggered it.

- **Survives what it used to die from.** A CLI that exits while Parley is still writing its prompt, a torn `state.json`, or a disk error in a background exchange each used to take down the whole server and orphan every running agent. Prompt writes, room state, attachment downloads and the detached exchange chains are now individually fault-tolerant, and agent processes are killed on every exit path rather than only on Ctrl+C.
- **Stop stops.** With one seat replying and nothing queued, the ■ button stops that response on the first click instead of opening a chooser; the ▾ beside it keeps every deliberate scope. The menu no longer rearranges itself under the cursor while it is open.
- **A message says what happened to it.** Discarded and interrupted messages keep their place, dim, and carry a per-seat status line — including a Retry for a delivery that never arrived. A stopped response is now a distinct, durable fact rather than reading as "never seen".
- **The queue can be held.** ⏸ pauses delivery without dropping, reordering or abandoning anything; work sent while held joins the queue; ▶ releases it in order.
- **Ask again and Redirect.** Every message carries a ↪ that asks about *that* message. On a busy seat, "Stop current & ask now" is one atomic request pinned to the response you were looking at, so nothing can slip in between the stop and the ask.
- **A third seat: Gemini.** Seats and providers are now separate, so a seat can be named anything and two seats can share one provider (Claude vs Claude). Existing rooms migrate by gaining one field and renaming nothing.
- **Knows what it costs and what it needs.** New rooms start with a bounded hop budget; the seat pill carries this conversation's token total; and a first-run doctor reports a missing *or unauthenticated* CLI with the fix, instead of failing on your first message.
- **Streaming costs what it should.** Live replies are broadcast as increments rather than resending the whole reply on every token.
- **A token diet, measured.** A burst of messages sent while a seat is busy now merges into one provider turn instead of one call each; a lurking seat's ~900-byte instruction block, the hop ground rules and a long room note are sent once per session and reminded thereafter (control tokens preserved verbatim); per-tool activity lines coalesce in the peer's delta; a Full-access lurker's reactions coalesce into catch-ups instead of resetting its session per exchange; and stopping a response also stops the peer's lurk on that exchange.
- **The live reply survives a reload.** A tab that opens or reconnects mid-reply now shows the text so far immediately, with the run's real phase and elapsed time, instead of "is thinking · 0s" and dots until the provider's next token. A seat that finished while the connection was down no longer keeps a ticking "is replying" bubble under its own finished reply, and a reply killed by New conversation can no longer stream into the fresh one. Codex replies that replace rather than extend their text are re-sent whole instead of spliced.
- **Faster where it is felt.** A corrupted or restored state file recovers each seat's read position from its delivery receipts instead of re-sending the entire room history as one prompt; state.json is no longer rewritten for every tool action; contended agent handoffs wake on events instead of polling; streaming long replies no longer rebuilds the whole live bubble every 90 ms; paging through scrollback prepends instead of re-rendering everything; and receipt dots refresh through indexes rather than linear scans, so a long room stays smooth during activity.
- **Accessible, and no longer dark-only.** Screen readers hear the transcript, menus and room actions work from the keyboard, the settings dialog traps focus, narrow windows keep their room navigation, and there is a light theme. Code blocks are syntax-highlighted.
- `--version`, a troubleshooting section in the README, and this changelog.

## 1.1.0 — 2026-08-10

- Guaranteed lurk catch-up: a listener that was busy when an exchange finished gets one coalesced catch-up rather than silently missing it.
- Causal agent relay: charged vs structural requests, free answer returns, and hop budgets persisted per user-message root so Wake and Retry resume the same budget.
- Per-message hop control in the composer, including Solo, with sticky per-room shortcuts.
- Image paste, drag-and-drop and a draft gallery in the composer.

## 1.0.2 — 2026-08-08

- Published under `parley-room` after the `@auspex0` scope was retired.

## 1.0.1

- First public release.
