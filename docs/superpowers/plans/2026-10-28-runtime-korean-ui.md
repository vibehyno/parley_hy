# Runtime Korean UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한국어 설정에서 동적으로 생성되는 사용자 노출 영어 문구를 자연스러운 한국어로 표시

**Architecture:** 기존 `ui/i18n.js` 사전에 영역별 키 추가. `ui/app.js`의 사용자 노출 문자열만 `t()`·`tr()`로 전환하고 모델명·경로·외부 오류 상세는 변수로 보존. 정적 검사와 대표 문구 단위 테스트로 번역 누락 회귀 방지.

**Tech Stack:** Vanilla JavaScript, Node.js `node:test`

**Spec:** `docs/superpowers/specs/2026-10-28-runtime-korean-ui-design.md`

## Global Constraints

- 한국어 설정에서만 한국어 표시
- 모델명·도구명·명령어·경로·사용자/모델 본문 원문 유지
- 외부 오류 상세 변형 금지
- 신규 외부 의존성 추가 금지
- 사용자 명시 요청 전 Git 커밋 금지

## Review Focus

- 경로가 포함된 권한 배너에서 경로 원문 보존
- 모델 이름이 변수로 치환된 한글 문장 어순
- 복수 개수 문구의 한국어 조사 없는 표현
- 서버 원본 오류와 Parley 안내 문구의 경계
- 언어 변경 직후 동적 영역 즉시 재렌더링

---

### Task 1: 핵심 경고·토스트 한글화

**Files:**
- Modify: `ui/i18n.js`
- Modify: `ui/app.js`
- Test: `test/i18n.mjs`

**Interfaces:**
- Produces: 폴더 열기, 런타임 불일치, 전체 접근, 작업 방, 모드 변경 확인 문구의 번역 키

- [ ] **Step 1: 대표 문구 실패 테스트 작성**
  - 폴더 열기 토스트, 전체 접근 배너, 경로·모델명 보존, 영문 설정 유지 검증
- [ ] **Step 2: 실패 확인**
  - 실행: `npm.cmd run test:unit`
- [ ] **Step 3: 번역 키와 동적 렌더링 연결**
- [ ] **Step 4: 통과 확인**
  - 실행: `npm.cmd run test:unit`

### Task 2: 상태·메뉴·툴팁 한글화

**Files:**
- Modify: `ui/i18n.js`
- Modify: `ui/app.js`
- Test: `test/i18n.mjs`

**Interfaces:**
- Consumes: 기존 `t()`·`tr()` 변수 치환
- Produces: 메시지 전달 상태, 모델 상태, 깨우기, 대기열, 중지, 재시도, 버튼 툴팁 번역

- [ ] **Step 1: 영역별 실패 테스트 작성**
  - 상태·대기열·깨우기·중지의 대표 문구와 한국어 변수 치환 검증
- [ ] **Step 2: 실패 확인**
  - 실행: `npm.cmd run test:unit`
- [ ] **Step 3: 사용자 노출 문자열을 번역 키로 전환**
- [ ] **Step 4: 언어 변경 시 `applySummary()`와 관련 팝오버 재렌더링 연결**
- [ ] **Step 5: 통과 확인**
  - 실행: `npm.cmd run test:unit`

### Task 3: 누락 점검과 회귀 검증

**Files:**
- Modify: `test/i18n.mjs`

**Interfaces:**
- Consumes: Task 1·2 번역 키
- Produces: 주요 사용자 노출 영어 문자열 재유입 방지 검사

- [ ] **Step 1: `toast`, 배너, 메뉴, 툴팁 문자열 점검**
  - 내부 로그·프로토콜·외부 오류 상세 제외 목록 명시
- [ ] **Step 2: 전체 검증**
  - 실행: `npm.cmd run test:unit`, `$env:PARLEY_TEST_TOOLS_ONLY='1'; npm.cmd run test:smoke`, `npm.cmd run test:package`, `git diff --check`
  - 기대: 전부 통과
- [ ] **Step 3: 실행 반영 확인**
  - Parley HY 재시작, 새 자산 응답, 기존 방 개수 유지 확인
  - 실제 UI 조작 테스트는 사용자 요청 시 Playwright headed 방식으로 별도 진행
