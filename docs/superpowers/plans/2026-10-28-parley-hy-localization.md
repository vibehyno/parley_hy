# Parley HY Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Parley HY` 브랜딩과 한국어/English 사용자 UI 전환 및 한국어 실행·사용 가이드 제공.

**Architecture:** 기존 `ui/index.html`과 `ui/app.js`에 중앙 번역 사전, 언어 선택·저장, 정적/동적 문구 갱신 기능 추가. API·저장 형식·에이전트 프롬프트 불변.

**Tech Stack:** Node.js 20+, HTML, CSS, vanilla JavaScript, 기존 smoke 테스트.

**Spec:** `docs/superpowers/specs/2026-10-28-parley-hy-localization-design.md`

## Global Constraints

- 화면 이름 `Parley HY`, 저장소 이름 `parley_hy`, 실행 명령 `parley`, 대화 위치 `~/.parley` 유지.
- 사용자 선택 언어의 `localStorage` 저장.
- 한국어 브라우저는 최초 한국어, 그 외 최초 영어.
- 에이전트 내부 계약·프로토콜·CLI 원문 오류·기존 대화 형식 불변.
- 사용자 명시 요청 전 Git commit 금지.

## Review Focus

- 저장소에 언어값이 없거나 손상된 경우 브라우저 언어 기반 안전 기본값 적용.
- 언어 변경 후 동적으로 다시 그려지는 설정·Tools 문구에도 선택 언어 유지.
- 영어 선택 시 기존 의미와 버튼 동작 유지.
- 새 탭/새로고침 후 언어 선택 유지.
- 기존 방과 세션을 다시 저장하거나 마이그레이션하지 않음.

---

### Task 1: 번역 코어 및 브랜딩

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/app.js`
- Test: `test/smoke.mjs`

**Interfaces:**
- Produces: `currentLocale()`, `t(key, vars)`, `setLocale(locale)`, `applyLocale(root)`

- [x] 브랜드·언어 저장·대체 동작을 검증하는 실패 테스트 추가
- [x] 테스트 실패 확인
- [x] `Parley HY` 제목·로고와 `ko`/`en` 번역 코어 구현
- [x] 언어 선택 즉시 적용 및 새로고침 유지 검증

### Task 2: 사용자 조작 화면 번역

**Files:**
- Modify: `ui/index.html`
- Modify: `ui/app.js`
- Modify: `ui/styles.css`
- Test: `test/smoke.mjs`

**Interfaces:**
- Consumes: Task 1의 `t()`, `applyLocale()`
- Produces: 설정창의 `#s_locale`, 번역된 사이드바·방 생성·설정·Tools·Composer·중단·대기열 UI

- [x] 주요 화면과 설정창 번역 키 존재를 검증하는 실패 테스트 추가
- [x] 테스트 실패 확인
- [x] 정적 요소에 `data-i18n`, `data-i18n-placeholder`, `data-i18n-title` 연결
- [x] 동적 설정·Tools·상태·토스트 문구에 `t()` 적용
- [x] 언어 변경 후 동적 재렌더링 및 접근성 속성 갱신
- [x] focused smoke 통과 확인

### Task 3: 한국어 실행·사용 가이드

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Test: `test/package.mjs`

**Interfaces:**
- Produces: README 상단 한국어 Quick Start와 공개 저장소 식별 정보

- [x] README 상단에 설치·실행·기본 사용·도구 메뉴·대화 저장·언어 변경 가이드 추가
- [x] 저장소/브랜드 메타데이터를 `Parley HY`와 `vibehyno/parley_hy`로 갱신
- [x] 패키지 검증 실행

### Task 4: 회귀 검증 및 로컬 재시작

**Files:**
- Modify: `.superpowers/sdd/2026-10-28-agy-adapter/progress.md`

**Interfaces:**
- Consumes: Tasks 1-3 전체 결과
- Produces: 포트 4141에서 실행되는 검증된 Parley HY

- [x] JS 문법, diff 공백, focused smoke 검증
- [x] unit·integration·smoke·package 검증
- [x] 기존 4141 프로세스의 정확한 PID 확인 후 로컬 링크 재시작
- [x] 기존 방 수, `~/.parley`, 언어 선택 UI, Tools API 유지 확인
- [x] 커밋·푸시 없이 변경 상태 보고
