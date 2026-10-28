# 채팅 입력창 Skill 자동완성 설계

## 목적

- 도구 모달을 열지 않고 채팅 입력창에서 모델별 Skill 검색 및 선택
- 정확한 Skill 호출 이름 기억 부담 해소
- 기존 `@` 모델 지정 방식과 일관된 키보드 조작 제공

## 선택 방식

- 채택: `$` 기반 2단계 선택
- 미채택: 전체 모델 통합 검색 — 동일 Skill 중복 시 호출 대상 혼동 가능
- 미채택: `$모델:Skill` 직접 입력 — Skill 이름 사전 지식 필요

## 동작

1. 입력창에서 `$` 입력 시 현재 방에 참여한 모델 목록 표시
2. 모델 선택 시 `$codex ` 또는 `$gemini ` 형태의 검색 단계 진입
3. 이후 문자 입력 시 해당 모델의 Skill 이름과 한국어 설명을 대소문자 구분 없이 부분 검색
4. 예시: `$codex supe` 입력 시 이름에 `supe`가 포함된 `superpowers:*` Skill 표시
5. `↑`·`↓` 항목 이동, `Enter`·`Tab` 선택, `Esc` 닫기, 마우스 클릭 선택 지원
6. Skill 선택 시 작성 중인 `$모델 검색어` 구간을 기존 안전 호출 문장으로 변환
   - 예시: `@codex Use the "superpowers:brainstorming" skill to `
7. 변환 후 커서를 문장 끝에 배치하고 사용자가 작업 내용을 추가한 뒤 직접 전송

## 표시 정보

- 모델 단계: 모델 이름, 실제 `@자리이름`
- Skill 단계: 출처가 포함된 이름, 한국어 설명
- 기본 Skill 표기: `codex:openai-docs`, `claude:chrome-devtools`, `agy:<skill>`
- Plugin 내부 Skill 표기: `superpowers:brainstorming`, `mattpocock:writing-for-agents`
- 선택 항목 강조 및 현재 단계 안내
- 목록 최대 높이 제한 및 스크롤 처리

## 제약 및 예외

- 현재 방에 참여한 모델만 선택 가능
- 1차 범위는 Skill만 포함하며 MCP·Plugin 제외
- 목록 미수신 시 로딩 상태 표시
- 목록 조회 실패 시 간단한 오류 안내와 기존 입력 내용 유지
- Skill 선택 자체로 실행하거나 전송하지 않음
- 기존 `@` 자동완성, Enter 전송, Shift+Enter 줄바꿈 동작 유지
- 모델 제공자별 Skill 목록 재사용 및 방 단위 캐시 활용
- 검색어가 Plugin 출처와 일치하면 해당 Plugin 내부 Skill 전체 표시
- 화면 표시 이름과 실제 CLI 호출 이름 분리

## 완료 기준

- `$`부터 모델과 Skill을 키보드만으로 선택 가능
- Skill 이름 일부 입력으로 부분 검색 가능
- 선택 후 올바른 모델 `@멘션`과 정확한 Skill 이름 삽입
- 한국어 및 영문 UI에서 동작
- 기존 `@` 자동완성과 메시지 전송 회귀 없음
