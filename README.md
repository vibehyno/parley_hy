# Parley HY

**Claude Code, Codex and AGY in one local chat room — connect up to three seats and let them hear each other.**

![deps: zero](https://img.shields.io/badge/deps-zero-brightgreen)
![node: ≥20](https://img.shields.io/badge/node-%E2%89%A520-blue)
[![license: MIT](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

## 업데이트 내역

- 최신 버전: **1.4.8**
- 한글 변경 이력: [CHANGELOG.ko.md](./CHANGELOG.ko.md)
- 영문 변경 이력: [CHANGELOG.md](./CHANGELOG.md)

## 빠른 시작 (Windows)

필수 준비: **Node.js 20 이상**과 사용할 CLI 2개 이상 설치 및 로그인. 지원 명령은 `codex`, `claude`, `agy`이며 API 키 대신 각 CLI의 기존 구독 로그인을 사용함.

```cmd
git clone https://github.com/vibehyno/parley_hy.git
cd parley_hy
setupParley.cmd
```

소스 다운로드·압축 해제 후 프로젝트 폴더에서 **CMD**를 열고 `setupParley.cmd` 실행. 최초 설치 시 전역 `parley` 명령과 Windows 사용자 PATH 자동 등록. PowerShell에서는 `.\setupParley.cmd` 사용. `npm.cmd run setup`으로도 동일한 설치 가능.

설치 후 **새 터미널**을 열고 원하는 폴더에서 실행:

```powershell
parley start
```

### 기본 사용법

#### 1. 처음 시작하기

1. **방 추가 → 왼쪽 설정**에서 사용할 모델 선택
2. 파일 작업이 필요한 경우 **왼쪽 프로젝트 이름 → 폴더 추가 → 저장**
3. 상단에서 **대화** 또는 **작업** 선택 후 메시지 입력

| 메뉴 | 용도 |
|---|---|
| 대화(Talk) | 의견 공유·판단·검토 |
| 작업(Work) | 연결한 프로젝트의 파일 수정·명령 실행 |
| 설정 → 언어 | 한국어/English 선택, 브라우저별 저장 |
| 사용 가이드 | GitHub README 열기 |

<details>
<summary>프로젝트·화면 설정 자세히 보기</summary>

- 한 방에 연결한 여러 프로젝트를 모델이 함께 참고·수정 가능. 프로젝트 전환 없이 요청에 맞는 폴더에서 작업하며 기존 대화·작업 권한 적용
- 연결 목록 변경 시 대화 내용·순서 유지, 모델 CLI 세션은 변경된 접근 범위로 새로 시작
- 왼쪽 **설정 바로 위 연결 → CMD 열기 / VS Code 열기** 선택. 프로젝트가 하나면 바로 실행, 여러 개면 열 폴더 선택 후 실행
- CMD는 선택한 폴더에서 실행, VS Code는 선택한 폴더를 새 창으로 열기. 새로 추가한 폴더는 `저장` 후 사용하며 열 프로젝트 선택은 방의 작업 경로를 변경하지 않음
- VS Code 실행 중 `여는 중…` 표시, 공식 CLI의 실행 결과·오류 안내. 실패 시 `실행 파일 선택…`으로 Code.exe 지정 후 재시도. 선택 경로는 사용자 PC의 `~/.parley/.launchers.json`에 저장
- Windows 프로젝트 추가·경로 변경·실행 파일 선택에 주소창·검색창을 갖춘 탐색기형 선택 창 사용. 창 색상은 Windows 테마·버전 설정에 따름
- 넓어진 연결 프로젝트 창에서 추가·폴더 열기·경로 재선택·연결 삭제 가능. 현재 프로젝트 구분·초록 강조 제거, 실제 경로 누락만 경고. `저장` 전까지 임시 편집 상태이며 실제 프로젝트 폴더는 삭제되지 않음. 설명은 제목·버튼 툴팁으로 확인
- 왼쪽 메뉴에 마우스를 올리면 용도 툴팁 표시
- 모델 3개 구성 시 설정창 폭 확장 및 3열 표시, 좁은 화면에서는 2열·1열 전환
- 전체 권한 안내는 방별 최초 확인 후 `×`로 닫아 다시 표시하지 않도록 저장

</details>

#### 2. 모델과 역할 설정하기

**왼쪽 설정**에서 Codex·Claude·AGY를 최대 3좌석까지 추가·제거 가능.

| 설정 | 예시·용도 |
|---|---|
| 이름·맡은 업무 | 지니 · 요구검수 — 맡은 업무는 10자 이내 |
| 호출명 | `@지니`처럼 직접 지정 |
| 페르소나 | “요구사항 누락과 오류만 짧게 검토” 등 모델별 역할. 고정 높이 입력란에서 긴 내용 내부 스크롤 |
| 얼굴·색상 | 이모지·색상 선택 또는 이미지 붙여넣기 |
| 방 메모 | 모든 모델이 공유할 공통 규칙. 고정 높이에서 여러 줄 입력·내부 스크롤 지원 |

**전체 모델 호출:** 2좌석은 `@both`, 3좌석은 `@all`. 기존 `@codex`·`@claude`·`@gemini`도 호환.

**모델 간 작업 전달:** 검토 후 `@뚱뚱아`처럼 제3 모델을 호출하면 해당 모델에게 전달. 기존 상대에게 되돌리지 않으며 자동 발언 한도·중지·수면 설정 유지.

상단 모델 표시는 이름만 한 줄로 표시. 맡은 업무·모델명·상태는 마우스를 올려 툴팁에서 확인.

<details>
<summary>모델 추가·얼굴 편집·공통 규칙 자세히 보기</summary>

- 모델 추가·제거 시 기존 모델의 CLI 세션과 대화 순서 유지. 추가 모델만 최근 대화를 참고하여 새 세션 시작
- 모델 제거 전 해당 모델의 설정·연결 세션 삭제 확인창 표시
- 얼굴 칸에 이미지 붙여넣기 또는 미리보기 클릭 → 이미지 선택 → 이동·확대하여 기존 C/X 아이콘 크기에 맞추기
- 페르소나·방 메모는 같은 CLI 세션에 최초 1회만 전달. 내용 변경 또는 새 세션 시작 시 재전달
- 이름·맡은 업무·호출명 변경 시에도 모델 지침 재전달
- 공통 규칙 직접 저장: `/note 답변은 핵심만 짧게 정리`
- 모델에게 공통 규칙 요약·저장 요청: `/note @지니 지금까지 합의한 공통 규칙만 짧게 정리해줘`
- **추가 CLI 인자**는 실행 명령에 붙는 고급 옵션이며 페르소나 입력란과 별도. 예: `--flag`, `-c key=value`

</details>

#### 3. 대화·작업 중 추가 지시하기

| 상황 | 사용 방법 |
|---|---|
| 모델이 작업 중일 때 추가 요청 | 메시지 전송 → 입력창 위에 보관 → 해당 작업의 현재 호출 종료 후 우선 전달 |
| 전달 대상 변경 | 자동·모델별·모두 중 선택 |
| 보관한 요청 수정·취소 | 전달 전에 편집 또는 삭제 |
| 대기열에 바로 등록 | `중단 없이 다음 작업으로 전달` 선택 |

**추가 지시는 현재 CLI 호출이 끝난 뒤 처리.** 실행 중인 호출에 즉시 끼워 넣는 기능은 아님.

- 추가 지시 반영 전 준비한 모델 전달 요청은 자동 실행하지 않음. 최신 지시 처리 후 모델이 필요성을 다시 판단하여 명시한 요청만 전달
- 다른 모델의 별개 작업은 계속 진행. 대기 지시 삭제 시 전송 취소 및 원래 작업 흐름 유지
- 대기 지시는 실행 중인 서버에서 관리. 탭 이동·브라우저 새로고침 후 복구 가능, 서버 종료 시에는 대기 상태 초기화

<details>
<summary>작업 진행 표시 자세히 보기</summary>

- 모델 메시지 위 얼굴 36px·이름과 역할 12px·시간과 사용량 14px로 조정 및 좁은 화면에서 줄바꿈 지원
- CLI가 제공하는 진행 단계·도구·명령·파일 작업 실시간 표시
- 세 모델 모두 첫 도구 실행 전에 요청 이해·진행 방향을 자연스럽게 답하고 같은 CLI 호출에서 작업·결과 보고. 고정 인사말·별도 인사 호출 없이 중간 발언 보존, 개인 전역 설정 변경 없음
- 작업 중 설명은 모델 이름·얼굴이 있는 단계별 말풍선으로 유지. 추가 지시가 이어지는 동안 기존 과정 유지, 후속 처리 종료 후 `작업 과정 보기`로 접고 최종 답변 유지. 펼치면 설명·명령을 원래 순서로 확인
- 중간 공개 발언의 모델 호출도 같은 작업이 정상 종료되면 전달. 최종 답변의 명시적 호출 우선, 이전 작업·중지된 작업의 호출 자동 재실행 없음
- AGY도 실제 도구명·파일 경로·명령을 작업 기록에 표시. 완료 보고는 변경·검증·남은 문제 중심이며 전체 해시·원시 로그는 명시 요청 또는 오류 설명에 필요한 경우만 표시
- AGY의 공개 발언 이벤트를 받는 즉시 표시하고 작업 사이 발언 보존. 구조화된 마지막 응답이 확인된 경우 결과로 표시하며, 문장 내용만 보고 임의 삭제하지 않음
- 최초 참여 시 최근 40개·본문 약 16,000자 이내 기록 전달. 현재 요청은 별도 전체 전달, 이전 기록은 필요할 때 조회. 기존 세션의 미처리 지시와 대화 원본·순서 유지
- 상단 모델 오류 표시에서 마우스 오버·키보드 포커스·터치로 오류 상세 확인. 마우스·포커스 이탈 또는 Escape로 닫기. 후속 정상 응답·정상 종료 시 현재 경고 해제, 대화 속 오류 원본 유지
- 모델 목록은 Claude CLI 초기화 정보·AGY `models`·Codex 로컬 모델 캐시 사용. 모델 목록과 상단 좌석 툴팁에 Claude CLI 제공 버전명 표시, 툴팁에 실제 모델 ID 병기. 방 진입 시 목록 조회, CLI 조회 실패 시 기본 별칭 및 직접 입력 유지
- AGY의 `gemini-…-medium`처럼 모델명에 추론 강도가 포함된 경우 해당 강도로 고정 표시. 별도 추론 강도 전송 생략으로 설정 충돌 방지. 강도 없는 모델은 별도 선택 가능
- 장시간 작업은 단계별 공개 진행 보고 후 완료 결과로 정리
- 진행 이벤트가 없는 동안에는 대기 상태와 경과 시간 표시

</details>

#### 4. 도구·사용량·빠른 응답 사용하기

| 기능 | 위치·사용 방법 |
|---|---|
| Skill·MCP·Plugin 목록 | 왼쪽 **도구**에서 모델별 확인 |
| Skill 선택 | 입력창에서 `$` → 모델 선택 → 이름 일부 검색 → 방향키·Enter |
| 사용량 확인 | 왼쪽 **사용량** 클릭 또는 마우스 올리기 |
| 빠른 응답 | Codex·Claude 좌석의 **⚡** 버튼 |

<details>
<summary>Skill 호출·사용량·Fast 주의사항</summary>

- 도구 목록에서 Skill 클릭 시 입력창에 호출 배지 추가
- 예: `$claude wait` 검색·선택 → `[$claude:wait-what]` 배지 추가. 선택만으로 자동 전송되지 않음
- 배지는 채팅에서 별도 배경색으로 표시. 전송 시 Claude·AGY는 `/Skill`, Codex는 `$Skill` 형식으로 변환
- 사용량은 현재 방 모델만 조회하며 5분간 결과 공유. **새로고침**은 즉시 재조회
- 사용량 창을 닫으면 미리보기 툴팁도 숨김. 메뉴에 다시 마우스를 올리거나 키보드로 이동할 때 표시
- ⚡는 실제 Fast 모드 전환이며 추론 강도는 유지. Fast 명령이 없는 AGY에는 버튼 미표시
- ⚡에 마우스를 올리면 공식 문서 기준 추가 사용량·과금 주의사항 표시

</details>

#### 5. 대화 보관·복원하기

| 기능 | 결과 |
|---|---|
| 상단 **🧹 대화 정리** | 대화·방 설정 보관 후 모델 세션 새로 시작, 현재 방 설정 유지 |
| **보관함 → 날짜 선택 → 미리보기 → 새 방으로 복원** | 메시지 내용·순서를 새 방에 복구, 현재 방과 보관 원본 유지 |
| 방 삭제 | 방 폴더를 `.parley/.trash`로 이동, 연결된 실제 프로젝트 유지 |

**저장 위치:** 사용자 PC의 `~/.parley`. Git 저장소와 별도이므로 저장소를 다시 클론해도 대화 유지.

<details>
<summary>복원 범위와 삭제한 방 복구</summary>

- 보관 당시 이름·역할·페르소나·방 메모 복원. 설정이 없는 예전 보관본은 현재 원본 방 설정 사용
- 복원된 모델은 새 CLI 세션 사용. 새 메시지를 보낼 때 최근 복원 대화를 참고하며 옛 작업 자동 재실행 없음
- 첨부파일은 원본이 남아 있는 경우 복사
- 프로젝트 파일은 복원 대상이 아니며 새 방의 샌드박스는 빈 상태로 시작
- 방 삭제 확인창에 `.parley/.trash` 이동 대상 표시. 삭제한 방은 파일 탐색기에서 수동 복구
- **삭제한 방의 수동 복구**와 **대화 정리 후 보관함 복원**은 별도 기능

</details>

#### 6. 실행·종료·업데이트하기

설치 후 새 터미널에서 폴더 위치와 관계없이 사용 가능.

| 명령·메뉴 | 용도 |
|---|---|
| `parley start` | 백그라운드 실행 |
| `parley stop` | 대화·설정 유지 후 종료. 진행·대기 작업이 있으면 종료 거부 |
| `parley restart` | 서버 재시작 |
| `parley status` | 실행 여부·주소·작업 상태 확인 |
| 상단 **업데이트** | 새 기능 확인 후 `나중에` 또는 `업데이트 설치` 선택 |

<details>
<summary>실행 옵션·문제 해결</summary>

- 새 버전이 있을 때만 대화/작업 오른쪽에 **업데이트** 표시. 마우스를 올리면 신규 기능 확인 가능
- CLI 계정 변경 또는 새 CLI 설치 후 `parley restart` 필요
- CLI 연결 문제: 터미널에서 `codex`·`claude`·`agy`의 실행·로그인 상태 확인
- PowerShell 실행 정책 오류: `parley.cmd start` 등 `.cmd` 명령 사용
- 다른 포트로 실행: `parley start --port 4142`. 임의의 빈 포트는 `--port 0` 사용
- 다른 대화 저장 폴더 사용: 각 명령에 같은 `--root 경로` 지정
- 실행 로그: `~/.parley/server.log`
- 명령 없이 `parley` 실행 시 기존처럼 터미널에서 실행, `Ctrl+C`로 종료
- 실행 관리 기능 도입 전 서버는 한 번 직접 종료 후 새 버전으로 실행 필요

</details>

### 원본 Parley와의 차이점

| 구분 | 원본 `auspex0/parley` | Parley HY |
|---|---|---|
| 방 좌석·역할 | 방당 2좌석, 제공자 기본 이름·아이콘 | 방당 최대 3좌석 추가·제거, 기존 좌석 세션·대화 순서 유지, 제거 확인, 표시 이름·맡은 업무·이모지·색상 설정, `@all` 호출 및 검토 후 제3 모델로 작업 전달 |
| 호출명·페르소나 | 제공자 고정 호출명과 공통 지침 | 사용자 이름·호출명·페르소나 설정, 상단에는 이름만 표시하고 상세는 툴팁 제공, 고정 높이·내부 스크롤 입력란, 같은 CLI 세션에 최초 1회 전달 |
| 얼굴 이미지 | 문자·이모지 중심 | 이미지 붙여넣기·파일 선택, 이동·확대 편집 후 기존 아이콘 틀에 맞춘 64×64 얼굴 저장 |
| 공통 방 메모 | 매 호출에 상시 지시문 반복 | 고정 높이·여러 줄 입력·내부 스크롤, CLI 세션별 최초 1회 전달 및 변경 시 재전달, `/note @호출명 요청`으로 모델 요약 후 자동 저장 |
| Gemini 계열 연결 | 기존 Gemini CLI 기준 | 현재 Google Antigravity CLI인 `agy` 사용 |
| 화면 언어 | 영어 중심 | 한국어/English 전환, 브라우저별 설정 저장, 한국어 안내·툴팁 존댓말 통일 |
| 왼쪽 메뉴 | 고정 표시 | 접기/펼치기 및 상태 저장, 방 설정 진입을 왼쪽 메뉴로 통일 |
| 설정창·대화 정리 | 고정 설정창과 새 대화 버튼 | 3모델 설정창 확장, 대화 정리 및 한국어 방 삭제 확인창 |
| 보관함·복원 | 날짜별 파일 보관 | 보관 대화 미리보기 및 메시지 순서·방 설정을 새 방으로 복원, 현재 방 유지, 새 CLI 세션으로 이어가기 |
| CLI 사용량 | 별도 터미널에서 직접 확인 | 현재 방 모델만 조회, 5분 캐시·수동 새로고침, 잔여율·초기화 시각 표시. 창을 닫으면 미리보기도 숨기고 메뉴 재진입 시 표시 |
| 프로젝트 연결 | 방마다 프로젝트 경로 하나만 연결 | 여러 프로젝트 동시 참고·작업, 넓은 관리창, 탐색기형 폴더·실행 파일 선택, 설정 위 연결 메뉴에서 CMD·VS Code 실행 및 진행·오류 표시 |
| 왼쪽 메뉴 설명 | 메뉴 이름만 표시 | 주요 메뉴에 마우스 오버·키보드 포커스 시 한글/영문 설명 툴팁 표시, 사용 가이드에서 GitHub README 열기 |
| 모델 도구 확인 | 채팅 화면에서 별도 확인 어려움 | 모델별 Skill, MCP, Plugin 검색 및 실제 Skill 호출 기능 |
| Skill 채팅 표시 | 일반 요청 문장과 구분 어려움 | `[$모델:Skill]` 입력과 색상 배지로 선택한 Skill을 명확히 구분 |
| Skill 출처 확인 | Skill 이름만으로 기본·Plugin 포함 여부 구분 어려움 | `codex:openai-docs`, `superpowers:brainstorming`처럼 제공 주체와 내부 Skill을 함께 표시 |
| Skill 설명 가독성 | 영문 설명과 작은 목록 글자 중심 | 현재 설치 Skill 설명을 한글로 표시하고, 창 크기는 유지하면서 글자·카드 간격 확대 |
| 작업 중 추가 지시 | 새 메시지를 즉시 대기열에 전송 | 서버에서 편집 가능한 대기 지시 관리, 현재 호출 종료 후 최신 지시 우선 처리, 이전 모델 전달 요청 재판단 및 중복 전송 방지 |
| 응답 진행 표시 | 응답 전 말줄임표 중심 | 한 호출 안에서 작업 전 답변·중간 발언 보존·결과 표시, AGY 실제 도구·파일·명령 표시, 얼굴 36px·이름 12px, 모델별 오류 상세 확인 |
| 최초 참여 맥락 | 누적 미수신 기록 전달 | 최근 기록부터 전달하고 이전 기록은 필요할 때 조회, 생략된 기록의 읽음 표시 방지 |
| 모델 선택 | 고정 모델 제안 중심 | Claude CLI 버전명을 모델 목록·상단 툴팁에 표시 및 실제 ID 확인, AGY CLI 목록·모델별 추론 강도 충돌 방지·Codex 로컬 모델 캐시 활용 |
| 빠른 응답 | 설정에서 모델·처리 방식을 직접 변경 | Codex는 `service_tier=fast`, Claude는 CLI `fastMode`를 사용하며 추론 강도는 그대로 유지. 현재 Fast 명령이 없는 AGY에는 ⚡ 미표시 |
| Fast 사용량 안내 | 별도 문서에서 직접 확인 | ⚡ 툴팁에 공식 문서 기준 Codex 크레딧 배수와 Claude Usage Credits·문맥 재읽기 주의 표시 |
| 알림 설정 | 간단한 체크박스 설명 | Windows 알림의 발생 조건과 브라우저별 저장 범위를 줄바꿈이 깨지지 않는 구조로 표시 |
| 전체 권한 안내 | 작업 화면 위에 계속 표시 | 방별 최초 확인 후 `×`로 닫아 영구 숨김 |
| 업데이트 확인 | 터미널에서 직접 `git pull` | 새 버전이 있을 때만 헤더에 표시하고 신규 기능 미리보기·선택형 자동 설치 지원 |
| Codex 작업 권한 | 새 세션의 sandbox 설정에 의존 | 새 호출과 이어지는 세션 호출마다 현재 방의 sandbox 권한을 명시하여 풀 액세스가 읽기 전용으로 돌아가는 문제 방지 |
| Claude MCP 확인 | 화면 진입 시 연결 확인으로 지연 가능 | 설정 목록은 즉시 표시하고 실제 연결 상태는 버튼을 눌렀을 때만 확인 |
| 운영 방식 | 범용 다중 에이전트 대화 | Codex 주도 + Claude/AGY 검토 방식 가이드 제공 |
| 공개 정보 보호 | 원본 기본 동작 | 도구 설명의 명령·URL·Windows/POSIX 로컬 경로 마스킹 강화 |
| 실행·종료 관리 | 터미널 실행과 Ctrl+C 종료 | 설치 시 전역 명령·Windows 사용자 PATH 등록, start·stop·restart·status로 관리, 중복 실행·작업 중 종료 방지 |
| 브랜드·문서 | Parley | Parley HY 이름과 한국어 설치·사용·업데이트 가이드, 용도별 기본 사용법과 접이식 상세 안내 |

사용량 표시는 각 CLI가 실제 제공한 값만 사용함. 5시간·주간 한도 중 CLI 응답에 포함된 항목만 원형 그래프로 표시함. 따라서 Codex Premium처럼 주간 한도만 제공되면 주간만 보이고, Standard 또는 Claude가 5시간 한도를 함께 제공하면 두 항목을 모두 표시함. 모델별 화면 형식을 맞추기 위해 Claude 전용 요청·세션 통계는 표시하지 않음. 토큰은 현재 방 대화 응답이 실제 보고한 입력·출력·추론·캐시 토큰 합계이며 계정 전체 토큰으로 추정하지 않음. 긴 범위 설명은 각 항목의 `ⓘ` 툴팁으로 확인 가능함.

Fast 경고는 [OpenAI Fast mode 문서](https://developers.openai.com/ja-JP/docs/agent-configuration/speed)와 [Claude Code Fast mode 문서](https://code.claude.com/docs/en/fast-mode)를 기준으로 함. Codex의 지원 모델은 Fast에서 일반적으로 표준 크레딧의 약 2.5배(GPT-5.4는 2배)를 사용하며, Claude 구독 로그인은 포함 사용량이 아닌 별도 Usage Credits를 사용함. Claude는 대화 중간에 Fast를 켜면 기존 문맥을 Fast 요금으로 다시 읽을 수 있음. 이는 토큰 개수가 일괄 배수로 늘어난다는 뜻이 아니라, 같은 토큰에 적용되는 크레딧·요금 단가가 높아질 수 있다는 의미임.

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

새 버전이 있으면 상단의 **업데이트** 표시에서 변경 내용을 먼저 확인하고 설치 여부를 선택할 수 있음. 자동 설치는 작업 중인 모델이나 대기 메시지가 없고, Git으로 복제한 소스에 미반영 변경사항이 없을 때만 실행됨. 설치를 선택하면 `git pull --ff-only` 후 Parley가 자동으로 다시 시작됨. 업데이트하지 않아도 기존 버전을 계속 사용할 수 있음.

직접 업데이트하려면 다음 명령 사용:

```powershell
cd parley_hy
git pull --ff-only
npm.cmd start
```

- 직접 업데이트한 경우 실행 중인 Parley 종료 후 재실행 필요. 화면의 선택형 자동 설치를 사용하면 자동 재시작
- 방·대화·설정 저장 위치: `~/.parley`
- 대화 정리 시 보관 위치: `~/.parley/<방 이름>/transcript-<날짜>.md`, `events-<날짜>.jsonl`, `archive-<날짜>.json`(방 설정). 왼쪽 대화 저장 폴더에서 파일 열람, 상단 보관함에서 새 방으로 복원 가능. 예전 CLI 세션과 프로젝트 파일 상태는 복원 대상에서 제외
- 소스 저장소를 삭제하거나 다시 클론해도 `~/.parley`를 지우지 않으면 기존 대화 유지
- 삭제한 방의 임시 보관 위치: `~/.parley/.trash`
- Git 저장소에는 대화 내용과 CLI 로그인 정보가 포함되지 않음

> 이 저장소는 [auspex0/parley](https://github.com/auspex0/parley)를 기반으로 한 개인화 버전이며 원본 MIT 라이선스를 유지함.

Most multi-agent tools are work queues — worktrees, kanban boards, parallel terminals. Parley is a *conversation*: one local page, one shared thread, and up to three agents who hear each other. Give each seat a call alias such as `@지니`; stable mentions such as `@claude`, `@codex`, and `@gemini` remain compatible. Use `@both` for two seats or `@all` for three — or just type, and it goes to whoever you were last talking to.

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
| `@지니 <text>` | The seat whose custom call name is `지니` (example) |
| `@both <text>` | Both, **in parallel** — replies stream in as they land |
| `@all <text>` | All seats in a three-seat room, **in parallel** (`@both` remains compatible) |
| `/note @지니 <request>` | Ask the selected seat to write durable shared rules and save its response as the room note |
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
- **Two or three seats, extensible providers** — add or remove a third seat in Settings and personalize each seat's name, assigned role, Unicode call alias, persona, emoji, cropped image and color. Stable routing mentions remain compatible, and persona/room notes are sent once per native CLI session unless they change.

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
