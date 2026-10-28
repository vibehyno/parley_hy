# Skill Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 채팅 입력창에서 `$`로 현재 방의 모델을 고른 뒤 Skill을 부분 검색하고 키보드로 호출 문장을 삽입하는 기능 구현

**Architecture:** 순수 문자열 해석·검색 로직을 `ui/skill-autocomplete.js`로 분리하고 브라우저 전역 API로 노출. `ui/app.js`에서 출처가 포함된 모델별 도구 API와 방 단위 캐시를 재사용하여 비동기 목록 로딩과 팝오버 상태 관리. 기존 `@` 자동완성과 별도 팝오버 사용.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Node.js `node:test`

**Spec:** `docs/superpowers/specs/2026-10-28-skill-autocomplete-design.md`

## Global Constraints

- 현재 방에 참여한 모델만 표시
- 1차 범위 Skill 한정, MCP·Plugin 제외
- 기본 Skill은 제공자 접두사, Plugin Skill은 Plugin 접두사 표시
- 표시 이름과 실제 호출 이름 분리
- Skill 선택만으로 전송 또는 실행 금지
- 기존 `@`, Enter 전송, Shift+Enter 줄바꿈 유지
- 신규 외부 의존성 추가 금지
- 사용자 명시 요청 전 Git 커밋 금지

## Review Focus

- 문장 중간 `$` 검색 구간과 뒤쪽 기존 문장 보존
- `$100`처럼 모델과 무관한 입력에서 팝오버 미표시
- 목록 조회 중 방 전환 시 이전 응답 무시
- 동일 제공자의 두 자리 사용 시 선택한 `@자리이름` 유지
- Skill 목록 열림 상태에서 Enter가 메시지를 전송하지 않고 선택만 수행

---

### Task 1: 자동완성 문자열 엔진

**Files:**
- Create: `ui/skill-autocomplete.js`
- Create: `test/skill-autocomplete.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `window.ParleySkillAutocomplete.parse(text, cursor)`, `filterSkills(skills, query, describe)`, `replace(text, cursor, parsed, replacement)`, `prompt(seat, skillName)`

- [ ] **Step 1: 실패 테스트 작성**
  - `$`, `$cod`, `$codex supe`, `$codex matt`, 문장 중간 검색, `$100`, 커서 뒤 문장 보존, 대소문자 무시 부분 검색, 정확한 호출 문장 검증
- [ ] **Step 2: 실패 확인**
  - 실행: `npm.cmd run test:unit`
  - 기대: 신규 전역 API 부재로 실패
- [ ] **Step 3: 최소 문자열 엔진 구현**
  - 공백 또는 문장 시작 뒤의 현재 `$` 구간만 해석
  - Skill 표시 이름·출처·현재 언어 설명 대상 `includes` 검색
  - `@{seat} Use the "{skillName}" skill to ` 생성
- [ ] **Step 4: 통과 확인**
  - 실행: `npm.cmd run test:unit`
  - 기대: 전체 통과

### Task 2: 입력창 팝오버와 모델별 목록 연동

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/styles.css`
- Modify: `ui/app.js`
- Modify: `ui/i18n.js`
- Test: `test/i18n.mjs`

**Interfaces:**
- Consumes: Task 1의 `ParleySkillAutocomplete` API, 기존 `/api/tools`, `state.toolCatalogs`, `toolSeat()`, `seatLabel()`
- Produces: `$` 모델 단계와 Skill 단계 팝오버, 키보드·마우스 선택, 로딩·오류 표시

- [ ] **Step 1: 실패 테스트 작성**
  - 스크립트 로드 순서, 한국어 단계 안내, 입력 이벤트·키보드 우선순위, 선택 후 안전 호출 문장 삽입 검증
- [ ] **Step 2: 실패 확인**
  - 실행: `npm.cmd run test:unit`
  - 기대: 팝오버 DOM 및 연결 코드 부재로 실패
- [ ] **Step 3: 별도 Skill 팝오버 구현**
  - `$` 모델 목록 표시 및 입력 부분 검색
  - 모델 선택 후 해당 제공자 목록을 캐시 또는 API에서 로딩
  - Skill 이름·한국어 설명 표시 및 부분 검색
  - `↑`·`↓`, `Enter`·`Tab`, `Esc`, 클릭 처리
  - Skill 팝오버 활성 시 기존 `@` 팝오버 숨김
- [ ] **Step 4: 비동기 안전장치 구현**
  - 요청 시작 방·모델과 현재 방·모델 불일치 시 결과 폐기
  - 실패 시 입력 유지와 팝오버 오류 문구 표시
- [ ] **Step 5: 통과 확인**
  - 실행: `npm.cmd run test:unit`
  - 기대: 전체 통과

### Task 3: 패키징과 회귀 검증

**Files:**
- Modify: `test/package.mjs` (명시 파일 목록이 있는 경우만)
- Modify: `README.md` (입력 예시 한 단락)

**Interfaces:**
- Consumes: Task 1·2 완성 기능
- Produces: 배포 패키지 포함 및 사용자 예시

- [ ] **Step 1: 정적 검증**
  - 실행: `node --check ui/skill-autocomplete.js`, `node --check ui/app.js`, `git diff --check`
  - 기대: 오류 없음
- [ ] **Step 2: 전체 자동 검증**
  - 실행: `npm.cmd run test:unit`, `$env:PARLEY_TEST_TOOLS_ONLY='1'; npm.cmd run test:smoke`, `npm.cmd run test:package`
  - 기대: 전부 통과
- [ ] **Step 3: 실행 반영 검증**
  - Parley HY 재시작 후 새 자산 응답 및 기존 방 개수 유지 확인
  - 실제 UI 조작 테스트는 사용자 요청 시 Playwright headed 방식으로 별도 진행

## 추가 개선 후보

- 최근 사용 Skill 3개 상단 고정
- 즐겨찾기 Skill 고정
- `$codex` 대신 `$c` 같은 모델 단축 입력
- 선택 전 Skill 설명 전체 미리보기
- 추후 동일 조작으로 MCP·Plugin 검색 확장
