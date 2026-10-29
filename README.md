# Parley HY

**Claude Code, Codex and AGY in one local chat room — choose any two seats and let them hear each other.**

![deps: zero](https://img.shields.io/badge/deps-zero-brightgreen)
![node: ≥20](https://img.shields.io/badge/node-%E2%89%A520-blue)
[![license: MIT](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

## 업데이트 내역

- 최신 버전: **1.3.4**
- 한글 변경 이력: [CHANGELOG.ko.md](./CHANGELOG.ko.md)
- 영문 변경 이력: [CHANGELOG.md](./CHANGELOG.md)

## 빠른 시작 (Windows)

필수 준비: **Node.js 20 이상**과 사용할 CLI 2개 이상 설치 및 로그인. 지원 명령은 `codex`, `claude`, `agy`이며 API 키 대신 각 CLI의 기존 구독 로그인을 사용함.

```powershell
git clone https://github.com/vibehyno/parley_hy.git
cd parley_hy
npm.cmd start
```

실행 후 `http://127.0.0.1:4141`이 자동으로 열림. 전역 `parley` 명령이 필요하면 저장소 폴더에서 한 번만 실행:

```powershell
npm.cmd link
parley
```

### 기본 사용법

- 방 생성 후 두 자리에 Codex, Claude, AGY 중 원하는 모델 배치
- `@codex`, `@claude`, `@gemini`, `@both`로 응답 대상 지정
- **대화(Talk)**: 의견 공유·판단·검토 중심 / **작업(Work)**: 연결한 프로젝트 파일 수정 및 명령 실행
- 왼쪽 **도구**에서 모델별 Skill, MCP, Plugin 확인. Skill을 클릭하면 입력창에 실제 호출 배지 추가
- 왼쪽 **사용량**을 열거나 메뉴에 마우스를 올리면 현재 방 모델의 CLI 사용량 조회. 조회 결과는 5분간 공유하고 새로고침으로 즉시 재조회 가능
- 채팅 입력창에서 `$` 입력 후 모델 선택 → Skill 이름 일부 입력 → 방향키와 Enter로 선택. 예: `$claude wait` 선택 시 `[$claude:wait-what]` 추가. 선택 결과는 자동 전송되지 않음
- Skill 배지는 채팅 말풍선에서 별도 배경색으로 표시하며, 전송 시 Claude·AGY는 `/Skill`, Codex는 `$Skill` 형식의 실제 CLI 호출로 변환
- 모델이 응답 중일 때 새 메시지를 보내면 입력창 위에 **현재 작업 추가 지시**로 보관. 전달 대상을 자동·모델별·모두 중 선택할 수 있으며, 진행 중인 작업이 끝나면 같은 작업 맥락으로 자동 전달. 종료 전에 편집하거나 삭제 가능
- 보관한 추가 지시는 `중단 없이 다음 작업으로 전달`을 눌러 즉시 대화와 모델 대기열에 등록 가능. 현재 일회성 CLI 호출은 계속 진행하며, 새 지시는 호출 종료 직후 처리
- 응답 대기 중 말줄임표만 표시하지 않고 CLI가 보내는 실제 진행 단계와 도구·명령·파일 작업을 실시간 표시. 장시간 작업은 단계별 공개 진행 보고 후 완료 시 변경·검증·남은 제한을 하나의 결과로 정리. 제공자가 진행 이벤트를 보내지 않는 동안에는 공개 이벤트 대기 상태와 경과 시간 표시
- 모델 좌석의 ⚡ 버튼으로 빠른 응답을 개별 설정. 다음 CLI 호출부터 추론 강도 `low` 적용, 해제 시 이전 강도 복원
- **설정 → 언어**에서 한국어/English 변경. 선택값은 해당 브라우저에 저장
- **설정 → 연결된 프로젝트**에서 방 하나에 프로젝트 폴더를 여러 개 저장하고 현재 작업 경로를 선택·변경·제거. 경로가 없거나 실제 작업 경로와 다르면 ⚠ 표시
- 방·대화·설정은 Git 저장소가 아닌 사용자 PC의 `~/.parley`에 별도 저장. 저장소를 다시 클론해도 기존 대화 유지
- CLI 계정을 바꾸거나 새 CLI를 설치한 경우 Parley 재시작 필요

문제 발생 시 먼저 터미널에서 `codex`, `claude`, `agy`가 각각 실행되고 로그인되어 있는지 확인. 포트 충돌 시 `parley --port 0` 사용.

### 원본 Parley와의 차이점

| 구분 | 원본 `auspex0/parley` | Parley HY |
|---|---|---|
| Gemini 계열 연결 | 기존 Gemini CLI 기준 | 현재 Google Antigravity CLI인 `agy` 사용 |
| 화면 언어 | 영어 중심 | 한국어/English 전환 및 브라우저별 설정 저장 |
| 왼쪽 메뉴 | 고정 표시 | 접기/펼치기 및 상태 저장 |
| CLI 사용량 | 별도 터미널에서 직접 확인 | 현재 방 모델만 조회하고, 열기·마우스 오버는 5분 캐시 공유, 새로고침은 즉시 재조회. 잔여율 원형 그래프와 초기화 시각 표시 |
| 프로젝트 연결 | 방마다 프로젝트 경로 하나만 연결 | 여러 프로젝트 저장, 현재 작업 경로 전환·제거, 경로 불일치 경고 |
| 모델 도구 확인 | 채팅 화면에서 별도 확인 어려움 | 모델별 Skill, MCP, Plugin 검색 및 실제 Skill 호출 기능 |
| Skill 채팅 표시 | 일반 요청 문장과 구분 어려움 | `[$모델:Skill]` 입력과 색상 배지로 선택한 Skill을 명확히 구분 |
| Skill 출처 확인 | Skill 이름만으로 기본·Plugin 포함 여부 구분 어려움 | `codex:openai-docs`, `superpowers:brainstorming`처럼 제공 주체와 내부 Skill을 함께 표시 |
| Skill 설명 가독성 | 영문 설명과 작은 목록 글자 중심 | 현재 설치 Skill 설명을 한글로 표시하고, 창 크기는 유지하면서 글자·카드 간격 확대 |
| 작업 중 추가 지시 | 새 메시지를 즉시 대기열에 전송 | 편집 가능한 임시 보관과 `중단 없이 다음 작업으로 전달`을 모두 지원 |
| 응답 진행 표시 | 응답 전 말줄임표 중심 | CLI가 보낸 실제 판단 단계·도구·명령·파일 작업을 표시하고, 이벤트가 없으면 `응답 준비 중`으로 명확히 구분 |
| 빠른 응답 | 설정에서 모델·추론 강도 직접 변경 | 좌석별 ⚡ 버튼으로 `low` 추론 강도를 켜고 끄며 해제 시 이전 값 복원 |
| Claude MCP 확인 | 화면 진입 시 연결 확인으로 지연 가능 | 설정 목록은 즉시 표시하고 실제 연결 상태는 버튼을 눌렀을 때만 확인 |
| 운영 방식 | 범용 다중 에이전트 대화 | Codex 주도 + Claude/AGY 검토 방식 가이드 제공 |
| 공개 정보 보호 | 원본 기본 동작 | 도구 설명의 명령·URL·Windows/POSIX 로컬 경로 마스킹 강화 |
| 브랜드·문서 | Parley | Parley HY 이름과 한국어 설치·사용·업데이트 가이드 |

사용량 표시는 각 CLI가 실제 제공한 값만 사용함. Codex·AGY·Claude의 잔여율과 초기화 시각을 원형 그래프로 표시하며, Claude는 최근 24시간·7일 요청/세션 통계도 함께 표시함. 토큰은 현재 방 대화 응답이 실제 보고한 입력·출력·추론·캐시 토큰 합계이며 계정 전체 토큰으로 추정하지 않음. 긴 범위 설명은 각 항목의 `ⓘ` 툴팁으로 확인 가능함.

다음 핵심 동작은 원본과 동일하게 유지함.

- API 키 없이 `codex`, `claude`, `agy` CLI의 기존 구독 로그인 사용
- 실행 명령 `parley` 및 기본 주소 `http://127.0.0.1:4141` 유지
- 방·대화·설정의 기본 저장 위치 `~/.parley` 유지
- Talk, Work, Pair, Lurk, 자동 발언 제한 등 기존 대화 구조 유지
- 기존 Parley 방 파일과의 호환성을 위해 AGY의 내부 provider id는 `gemini` 유지

진행 표시에는 CLI가 실제로 제공한 이벤트와 모델이 사용자에게 공개한 짧은 작업 보고만 사용함. 모델의 비공개 내부 추론 원문을 표시하거나, 존재하지 않는 작업 단계를 임의로 만들어 보여주지 않음. 현재 Parley의 일회성 CLI 호출에는 실행 중 새 프롬프트를 주입할 수 없으므로, 작업 중 작성한 추가 지시는 현재 호출 종료 후 같은 방의 다음 지시로 자동 전달됨. 즉시 반영하려면 현재 호출 중지 필요.

Parley HY는 별도 npm 패키지로 배포하지 않으므로 이 저장소를 클론하여 실행해야 함. `npx parley-room` 또는 `npm install -g parley-room` 실행 시 Parley HY가 아닌 원본 npm 버전이 설치됨.

### 추천 운영 방식: Codex 주도 + 검토 모델

토큰 사용을 줄이면서 의견 검토를 받으려면 다음 구성을 권장함.

1. **1번 자리: Codex**, **2번 자리: Claude 또는 AGY** 배치
2. 평소 메시지는 `@codex`로 전달하여 판단·구현 주도
3. 설계 확인이나 결과 검수만 `@claude` 또는 `@gemini`로 요청
4. 자동 발언을 `0~1`로 설정하여 불필요한 왕복 대화 제한
5. 합의 전에는 **대화(Talk)**, 실제 파일 수정 시에만 **작업(Work)** 사용

예시:

```text
@codex 이 요구사항을 기준으로 구현을 주도해줘. 구현 후 Claude에게 핵심 위험만 짧게 검토받아줘.
@claude Codex 결과에서 오류 가능성과 누락만 짧게 검토해줘.
```

한 모델이 작업하고 다른 모델이 반복 검토하는 방식은 Pair 모드 사용:

```text
/pair start @codex 로그인 오류를 수정하고 테스트해줘
```

왼쪽 **도구** 메뉴의 항목을 클릭하면 호출 문구만 입력창에 추가됨. 자동 전송되지 않으므로 실제 작업 내용과 범위를 덧붙인 뒤 전송 필요.

### 업데이트와 데이터 보관

```powershell
cd parley_hy
git pull --ff-only
npm.cmd start
```

- 업데이트 적용을 위해 실행 중인 Parley 종료 후 재실행 필요
- 방·대화·설정 저장 위치: `~/.parley`
- 소스 저장소를 삭제하거나 다시 클론해도 `~/.parley`를 지우지 않으면 기존 대화 유지
- 삭제한 방의 임시 보관 위치: `~/.parley/.trash`
- Git 저장소에는 대화 내용과 CLI 로그인 정보가 포함되지 않음

> 이 저장소는 [auspex0/parley](https://github.com/auspex0/parley)를 기반으로 한 개인화 버전이며 원본 MIT 라이선스를 유지함.

Most multi-agent tools are work queues — worktrees, kanban boards, parallel terminals. Parley is a *conversation*: one local page, one shared thread, two agents who hear each other. `@claude`, `@codex`, `@both` — or just type, and it goes to whoever you were last talking to. Ask Claude something, then ask Codex what it thinks of the answer; they agree, disagree, and build on each other in one thread.

It drives the **official Claude Code, Codex and Google Antigravity (`agy`) CLIs through your existing CLI logins**. No API key, no proxy; Parley never reads or stores provider credentials — if a CLI isn't authenticated, you see its own error in the chat. The internal provider id remains `gemini` so older room files still open, but the retired consumer `gemini` command is no longer launched.

The screenshots below are real conversations captured in version **1.2.0**.

![Parley 1.2.0 Work mode: Codex edits a booking guard and runs 12 passing tests while Claude reads the changed files](https://raw.githubusercontent.com/auspex0/parley/v1.2.0/docs/parley-work-1.2.png)

*Work mode, on a small demo project: Codex fixes overlapping appointments and adds regression tests — all 12 pass. Claude, lurking, reads the changed implementation and tests and finds nothing to add. The activity lines show the actual edits, test command, and review reads.*

![Parley 1.2.0: Claude answers a booking-policy question; Codex, lurking, flags a late-payment race](https://raw.githubusercontent.com/auspex0/parley/v1.2.0/docs/parley-lurk-1.2.png)

*Only `@claude` was addressed. Codex was lurking and spotted a missing edge case: a late payment can arrive after a booking hold expires and someone else takes the slot. It chimed in without being tagged.*

![Parley 1.2.0: Claude and Codex discuss a weekend grocery-list app, with automatic follow-ups and their triggers visible](https://raw.githubusercontent.com/auspex0/parley/v1.2.0/docs/parley-both-1.2.png)

*One `@both` question starts a practical trade-off: live sync or a refresh button for a weekend grocery-list app? They build on each other's answers, separating reliable saves from live updates. The follow-ups show their triggers and automatic-turn usage.*

## Lurk mode 👂

An agent can stay in earshot while you talk to the other one, and interject **only when it has something real** — an uncorrected error, a disagreement, a risk you glossed over. Otherwise it stays quiet.

Point that at a work room and you get continuous, unprompted code review: one agent codes while the other watches activity, checks the workspace, and speaks up when something is actually wrong. If the listener is busy, Parley lets your work finish first and gives it one coalesced catch-up rather than dropping the opportunity. That delayed catch-up has a bounded ending, so it cannot become an after-hours agent loop.

Whether it speaks is the model's own judgment — there is no keyword trigger. A per-agent dial sets the bar: `quiet` (only outright problems), `balanced` (adds real disagreements and critical caveats), `vocal` (adds better approaches too). Or write your own criteria.

## Get started (English)

You need **Node.js ≥ 20** and any two supported official CLIs, installed and authenticated: `claude` (Claude Code), `codex` (OpenAI Codex), or `agy` (Google Antigravity). Parley shells out to them under your existing subscription logins.

Parley HY is not published as a separate npm package. Install this fork from source so the `parley` command points to this repository:

```bash
git clone https://github.com/vibehyno/parley_hy.git
cd parley_hy
npm test     # optional: real server, fake agents — no login, no tokens spent
npm link
parley
```

The command remains `parley`. Do not use `npx parley-room` or `npm install -g parley-room` for this fork; those commands install the upstream npm release instead.

The UI opens automatically at a loopback URL, normally `http://127.0.0.1:4141`. Flags: `--port N` (`--port 0` picks any free port), `--root DIR`, `--no-open`, `--version`, `--help`.

There are no runtime dependencies. `npm start` runs directly from the checkout without linking the command globally.

Two notes at the door:

- **Platform honesty:** developed and used daily on **Windows 11** against both real CLIs. Windows, Linux and macOS are all CI-tested, but only Windows has real-world mileage — open an issue if something's off.
- Windows works natively: Parley resolves npm `.cmd` shims to the real binaries rather than going through a shell. After updating, restart Parley before reloading the page.

### If something doesn't work

| Symptom | What it means |
|---|---|
| A seat shows **not found** | Its command (`claude`, `codex`, or `agy`) isn't on Parley's `PATH`. Hover the pill for the exact resolver error. Install the CLI, then restart Parley — `PATH` is read at launch. |
| A seat replies with a login or auth error | The CLI itself isn't signed in. Run that command once in a terminal, complete the login, then come back. Parley never handles credentials. |
| `Failed to start: EADDRINUSE` | Something else holds port 4141 and the next 20 ports. Use `--port 0` for any free port. |
| The page says the runtime protocol doesn't match | Parley was updated under a page that's still open. Reload the tab. |
| Windows: the folder picker seems to do nothing | It can open behind the browser. Look for **Parley — Choose a project folder** in the taskbar. |

Your rooms, transcripts and settings live in `~/.parley` (override with `--root`). To remove Parley entirely: `npm uninstall -g parley-room`, then delete that folder — it also holds `~/.parley/.trash`, where deleted rooms go.

## How you talk to it

| You type | What happens |
|---|---|
| `@claude <text>` | Claude only |
| `@codex <text>` | Codex only |
| `@gemini <text>` | AGY only when the seat keeps the compatible `gemini` name |
| `@both <text>` | Both, **in parallel** — replies stream in as they land |
| `<text>` | Whoever you last addressed |

Each agent has its own **lane**: tag them back-to-back and they genuinely work at the same time. Everything you send is accepted and posted the instant you send it — only *delivery* waits on a busy agent (⏳ badge, delivered in order). The badge opens the queue — one card per *dispatch*, the batch of deliveries one send created — and its ✕ withdraws whatever that dispatch still has waiting.

**Stop is scoped.** With one agent replying and nothing queued, ■ stops that response and its pending follow-ups. When two seats, queued work or Pair mode make that ambiguous, it opens a chooser: stop one response, active responses, queued work, or everything. Each click is pinned to the response you meant, so it cannot kill work that began after you clicked.

**Token-frugal by default.** Tagging one agent costs nothing for the other when the addressed reply does not call it; a single-seat, untagged reply never wakes an unrelated peer. That peer catches up from its cursor on its next real delivery. A live session gets only its unseen delta, a fresh or recovered one gets a single bounded briefing — history is never resent wholesale.

## The rest of it

- **Automatic turns** — For ordinary use, leave the room default alone: new rooms allow four extra agent turns after the replies you asked for. Choose **Solo** for one selected responder, `0` to keep things to the initial replies, a number for a tighter cap, or **Until settled** for a longer discussion with a visible safety stop. Each message keeps the rule it started with through Retry or Wake; Pair rounds are separate. See [the full conversation-accounting reference](docs/conversation.md#automatic-turns-new-rooms).
- **Pair mode 🔁** — `/pair start @claude build X`: one agent works, the other reviews by actually reading the files, then approves or sends it back for a fix round. A failed review is never treated as approval.
- **Sleep a seat 😴** — hit a usage limit? Sleep that seat and the other keeps working. Nothing launches it — not your message, not a queued delivery, not an `@tag` from the other agent — until you wake it. Your requests are held in their original place and autonomous skips are recorded, so silence is never read as agreement. Waking alone replays nothing; if held requests exist, **Wake & deliver** handles them together in one turn, then rejoins the same causal scheduler as a live exchange. A recovered `@both` half reaches a sibling only when that sibling previously completed this exact user root; structural sibling delivery never auto-revives a failed or stopped half. A recovered single-seat exchange still honors enabled lurk, persisting catch-up when the listener is busy.
- **Talk rooms and work rooms 🔨** — Talk is conversational with conservative permissions. Work lets agents edit files and run commands, rendered as inline chat lines (`✏️ Write server.js`, `▶ npm test`, `⚠ exited 1`) — the chat is the interface, your editor is the viewer. `@both` in a work room is a discussion, not a work order.
- **Linked project folders 📁** — point a room at a real project; both agents work there and pick up its `CLAUDE.md` / `AGENTS.md`.
- **Attachments 📎** — paste, drag or clip in images, patches, logs and docs; images use each CLI's native image input.
  *Personal highlight: that little attachment paperclip. Shoutout to Codex.*
- **Receipt dots** — under every message: who heard it live, who lurked it, who is queued to catch up, who caught up later, where a causal answer was returned, and where a cap or structural terminal deliberately ended the exchange — including deliveries you cancelled and terminal lurk outcomes.
- **Per-reply token counts** — provider-reported input, output, reasoning and cache-read counts where available. AGY's cumulative conversation counters are converted to per-turn deltas.
- **Provider tool drawer 🧰** — inspect the Skills, MCP servers and plugins reported by each CLI seated in the room. Search an item and click it to insert an addressed request into the composer; Parley never auto-sends it and never exposes tool commands, local paths, server URLs or environment values to the page.
- **Two seats, extensible providers** — adding another CLI agent is one adapter function and a registry entry.

## Why you can trust it

**A small local application.** One Node entrypoint ([parley.mjs](parley.mjs)), focused [runtime modules](lib/), and plain [HTML](ui/index.html), [CSS](ui/styles.css), and [JavaScript](ui/app.js). Zero runtime dependencies, no database and no build step. Browser-testing tools are development dependencies.

- Binds **`127.0.0.1` only**, with a per-process token embedded in the served page and origin checks, so no random web page can drive your agents. Like any loopback app, that's not a boundary against another process already running as you.
- **Conservative by default.** Talk rooms run Claude with its normal print-mode permissions and Codex in the `read-only` sandbox. Work mode loosens that only for the agent you name; Full access for either provider is host-level trust and sits behind a deliberate confirmation.
- Reviewer, listener and discussion turns run read-only **where the provider can enforce it** — Claude is switched to Plan and kept out of any bypass-enabled session. Codex's equivalent lives inside its existing sandboxed thread, so it's a workflow instruction, **not an OS-level boundary**.

`npm test` boots a real server against fake agent CLIs and exercises routing, the delta protocol, sessions, lurk, hops, pair, lanes, work mode, seat sleep and cancellation — no provider login, no tokens spent. CI runs it on Ubuntu, Windows and macOS, Node 20, 22 and 24.

## Docs

| | |
|---|---|
| [docs/conversation.md](docs/conversation.md) | Routing, lanes and delivery, the queue, scoped stop and cancellation, lurk mode, hops, pair sessions |
| [docs/permissions.md](docs/permissions.md) | Talk vs work, Claude's permission modes, when a settings change takes effect, security posture |
| [docs/reference.md](docs/reference.md) | CLI flags, room folders, config, attachments, slash commands, adding a provider |
| [DESIGN.md](DESIGN.md) | Why it's shaped this way |
| [SECURITY.md](SECURITY.md) | Threat model and vulnerability reporting |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Running the tests, sending a patch |
| [docs/planned-work.md](docs/planned-work.md) | The roadmap — what's settled, what's parked, and why |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each release |

> Parley is a personal, local tool. Use only accounts and CLI access you're authorized to use, and follow the providers' current terms. Do not share credentials or resell access. A hosted multi-user service is outside its threat model.

MIT.
