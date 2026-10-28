# 도구 출처와 빠른 MCP 목록 설계

## 목적

- Skill이 기본 제공인지 어느 Plugin 소속인지 즉시 식별
- Plugin 검색으로 내부 Skill 전체 확인
- 도구창을 열 때 MCP 상태 점검으로 기다리거나 목록이 0개로 보이는 문제 제거

## Skill·Plugin 표시

- 기본 Skill: `codex:`, `claude:`, `agy:` 접두사
- Plugin Skill: 정규화된 Plugin 접두사
- 예시: `superpowers:brainstorming`, `mattpocock:writing-for-agents`
- Plugin 카드: 버전과 포함 Skill 수 표시
- Plugin 이름 검색 시 소속 Skill 전체 검색 결과 포함
- 서버 내부 설치 경로로 소속 판별하되 브라우저에 경로 미노출

## MCP 표시

- 기본 목록 조회: 설정 파일과 Plugin manifest에서 이름만 수집, 상태 `설정됨` 표시
- Codex·AGY처럼 빠른 비점검 목록 명령은 사용 가능
- Claude `mcp list` 전체 상태 점검은 기본 조회에서 실행 금지
- 실제 모델 작업 시 각 CLI의 기존 MCP 연결 동작에 위임
- `연결 상태 확인` 버튼 선택 시에만 CLI 상태 점검 실행
- 수동 점검 제한 시간 30초 및 결과 상태 반영

## 완료 기준

- `super` 검색으로 `superpowers` 내부 Skill 15개 확인 가능
- `matt` 검색으로 `mattpocock` 내부 Skill 38개 확인 가능
- Claude 도구창 기본 조회가 10초 상태 점검에 막히지 않음
- 수동 상태 확인에서 연결됨·인증 필요 등 CLI 결과 표시
- 설치 경로·실행 명령·서버 URL 브라우저 미노출
