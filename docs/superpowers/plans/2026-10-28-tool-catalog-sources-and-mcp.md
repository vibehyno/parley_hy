# Tool Catalog Sources and MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plugin별 Skill 출처를 보존하고 MCP 목록과 상태 점검을 분리하여 빠르고 이해하기 쉬운 도구 목록 제공

**Architecture:** 서버가 Plugin 설치 루트별로 Skill을 스캔하여 `source`, `displayName`, `invokeName`을 생성하되 경로는 제거. Claude 기본 MCP 목록은 설정과 Plugin manifest를 정적으로 읽고, `health=1` 요청에서만 30초 CLI 상태 점검 실행. UI는 Plugin 포함 Skill 수와 수동 상태 확인 버튼 제공.

**Tech Stack:** Node.js, Vanilla JavaScript, HTML, CSS, `node:test`

**Spec:** `docs/superpowers/specs/2026-10-28-tool-catalog-sources-and-mcp-design.md`

## Global Constraints

- 브라우저 응답에 로컬 경로·명령·URL·환경값 미노출
- Skill 실제 호출 이름과 표시 이름 분리
- 기본 목록 조회에서 Claude 상태 점검 금지
- 실제 MCP 호출은 각 CLI 동작에 위임
- 신규 외부 의존성 추가 금지
- 완료 후 사용자 요청에 따라 커밋·푸시 수행

## Review Focus

- 동일 Skill 이름이 기본·Plugin에 동시에 존재할 때 표시 이름 중복 방지
- 원격 Plugin의 로컬 캐시 탐색 실패 시 제공자 기본 출처로 안전하게 폴백
- Claude 전역·프로젝트·Plugin MCP 이름 병합과 중복 제거
- 수동 상태 점검 30초 초과 시 기존 설정 목록 유지
- 브라우저 응답에서 설치 경로와 MCP 실행 정보 제거

---

### Task 1: Plugin별 Skill 출처 보존

**Files:**
- Modify: `parley.mjs`
- Modify: `test/smoke.mjs`

**Interfaces:**
- Produces: Skill `{ name, displayName, invokeName, description, source }`, Plugin `{ name, version, enabled, skillCount }`

- [ ] **Step 1: 실패 테스트 작성**
  - 기본·Superpowers·Matt Pocock Skill 표시 이름, Plugin별 개수, 경로 미노출 검증
- [ ] **Step 2: 실패 확인**
  - 실행: `$env:PARLEY_TEST_TOOLS_ONLY='1'; npm.cmd run test:smoke`
- [ ] **Step 3: Plugin 캐시 루트와 기본 Skill 루트를 출처별 스캔**
- [ ] **Step 4: 표시 이름·호출 이름 생성 및 Plugin 개수 집계**
- [ ] **Step 5: 통과 확인**

### Task 2: MCP 설정 목록과 상태 점검 분리

**Files:**
- Modify: `parley.mjs`
- Modify: `test/smoke.mjs`

**Interfaces:**
- Produces: `providerToolCatalog(room, providerId, { refresh, health })`

- [ ] **Step 1: 실패 테스트 작성**
  - Claude 기본 조회에서 CLI MCP 명령 미실행, 설정 목록 반환, `health=1`에서만 상태 명령 실행, 실패 시 설정 목록 유지 검증
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: Claude 전역·프로젝트·Plugin manifest MCP 이름 안전 파싱**
- [ ] **Step 4: 수동 상태 점검 30초 경로와 API `health=1` 추가**
- [ ] **Step 5: 통과 확인**

### Task 3: 도구창 출처와 상태 확인 UI

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/app.js`
- Modify: `ui/i18n.js`
- Modify: `ui/styles.css`
- Test: `test/i18n.mjs`

**Interfaces:**
- Consumes: Task 1·2 도구 목록 응답
- Produces: 출처가 포함된 Skill 카드, Plugin 포함 Skill 수, `연결 상태 확인` 버튼

- [ ] **Step 1: 실패 테스트 작성**
- [ ] **Step 2: 실패 확인**
- [ ] **Step 3: Skill 표시·검색을 `displayName`과 `source` 기준으로 전환**
- [ ] **Step 4: Plugin 포함 Skill 수와 수동 상태 확인 동작 구현**
- [ ] **Step 5: 전체 검증**
  - 실행: `npm.cmd run test:unit`, `$env:PARLEY_TEST_TOOLS_ONLY='1'; npm.cmd run test:smoke`, `npm.cmd run test:package`, `git diff --check`
