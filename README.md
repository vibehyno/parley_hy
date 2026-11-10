# MoYEO

**Claude Code, Codex and AGY in one local chat room — connect up to three seats and let them hear each other.**

![browser: Playwright MCP](https://img.shields.io/badge/browser-Playwright_MCP-blue)
![node: ≥20](https://img.shields.io/badge/node-%E2%89%A520-blue)
[![license: MIT](https://img.shields.io/badge/license-MIT-informational)](LICENSE)

## 업데이트 내역

- 최신 버전: **1.5.7**
- 한글 변경 이력: [CHANGELOG.ko.md](./CHANGELOG.ko.md)
- 영문 변경 이력: [CHANGELOG.md](./CHANGELOG.md)

한글 방 이름 지원. 새 이름은 20자 제한, 기존 긴 이름 유지 및 방 목록 한 줄 말줄임 표시. 모델 3개 사용 중 추가 시 최대 사용 중 안내. 앱 설정에서 글꼴·글자 크기·언어·다크·라이트 모드 선택 및 브라우저별 저장. 설정창은 상단 ×로 닫기, 내용만 스크롤하며 하단 저장 영역 유지.

## MoYEO 전환 안내

- 신규 설치: `setupMoyeo.cmd` 실행 후 `moyeo start`. 대화·설정 저장 위치는 `~/.moyeo`.
- 기존 설치: 실행 중인 서버 종료 후 설치 스크립트 실행. 최초 시작 시 `~/.moa` → `~/.parley` → `~/.roundtable` 순서로 기존 데이터 탐색. `~/.moyeo-backup-*` 전체 백업과 새 경로의 파일 검증 후 이전한 옛 폴더 삭제. 백업은 유지. 여러 기존 폴더가 있으면 선택하지 않은 폴더는 삭제하지 않음. 이미 `~/.moyeo`가 있으면 자동 병합·덮어쓰기 없음.
- 실행 명령은 `moyeo`만 제공. 기존 서버는 `moyeo stop`으로 종료 가능.
- `git pull` 자체는 이전을 실행하지 않음. 업데이트 후 첫 실행·재시작 때 이전 처리. Windows 기존 사용자는 소스 폴더에서 `git pull` 후 `parley restart` 실행. 기존 명령이 해당 소스에 연결되어 있으면 `moyeo`도 자동 등록되며 두 명령 모두 사용 가능. 기존 명령도 없거나 다른 복사본에 연결된 경우에만 `setupMoyeo.cmd`로 등록.
- Git 저장소 주소와 원본 MIT 저작권 고지는 유지. MoYEO는 Parley에서 확장한 프로젝트.

## 빠른 시작 (Windows)

필수 준비: **Node.js 20 이상**. `setupMoyeo.cmd`에서 Codex·Claude·AGY 최신 CLI 설치 후 사용할 계정에 각각 로그인. 지원 명령은 `codex`, `claude`, `agy`이며 API 키 대신 각 CLI의 기존 구독 로그인을 사용함.

```cmd
git clone https://repository.kr/rnd/ai-archive/ai-orchestration/parley.git moyeo
cd moyeo
setupMoyeo.cmd
```

소스 다운로드·압축 해제 후 프로젝트 폴더에서 **CMD**를 열고 `setupMoyeo.cmd` 실행. 설치 시 Codex·Claude는 npm `@latest`, AGY는 Google 공식 설치기로 설치·업데이트 후 전역 `moyeo` 명령과 Windows 사용자 PATH 자동 등록. 설치 실패 시 중단 및 오류 표시. CLI 로그인은 별도 진행. PowerShell에서는 `.\setupMoyeo.cmd` 사용. `npm.cmd run setup`으로도 동일한 설치 가능.

설치 후 **새 터미널**을 열고 원하는 폴더에서 실행:

```powershell
moyeo start
```

### 기본 사용법

#### 공유 브라우저

**오른쪽 작업 현황 → 공유 브라우저 → 브라우저 열기**로 내 Chrome의 선택 탭 연결. 전용 브라우저 선택 시 별도 창 실행. 다음 모델 호출부터 `parley-browser` 연결의 공식 Playwright MCP `browser_*` 도구 제공.

**공유 화면 카드 클릭**으로 해당 Chrome 탭 선택. 전용 브라우저는 Windows 창 복원·전면 활성화 지원. 내 Chrome 연결은 확장을 통한 탭 선택 사용.

전체 권한 선택 시 Codex·Claude·AGY의 토론·검토·관찰·인계에도 파일·명령·브라우저 실행 권한 유지. 역할에 따른 자동 Plan 전환 제거 및 반복 호출의 세션 유지. Codex 전체 권한은 승인 대기 없이 실행. AGY 공유 브라우저 권한은 호출별 임시 설정으로 전달하며 명시적인 Plan은 조회로 제한. 기존 `deny`·`ask` 규칙 보존, 전역 설정 변경 없음. 도구 사용 전 시작 안내가 완료 결과로 재반환된 경우 실패 처리.

| 요청 | 브라우저 동작 |
|---|---|
| “같은 화면을 함께 확인해줘” | 방의 공유 화면·로그인 사용, 화면 조작 순서 관리 |
| “각자 독립적으로 작업해줘” | 모델별 별도 컨텍스트 사용, 로그인·쿠키 분리 및 병렬 작업 |
| 직접 조작 | 모델의 새 조작 중지, 화면 확인은 유지. 진행 중인 조작은 종료 가능 |
| 연결 종료 | 내 Chrome·기존 탭 유지 및 모델 연결 해제. 전용 브라우저는 종료하되 저장된 프로필 유지, 독립 컨텍스트의 임시 로그인·쿠키 삭제 |

- 필요한 설치·모델 연결 설정이 있을 때만 **브라우저 공유 설정** 확인창 표시. **확인** 후 자동 설정·브라우저 열기, **취소** 시 변경 없음. 준비 완료 환경은 즉시 열기. 실패 시 오류·재시도 버튼 표시
- Google Chrome 필요. 기본은 Playwright 확장으로 내 Chrome의 선택 탭·기존 로그인 연결. 별도 로그인 환경이 필요한 작업만 독립 컨텍스트 사용
- Codex·Claude는 호출별 MCP 설정 연결. AGY는 최초 연결 시 `agy mcp add parley-browser`를 통한 공통 MCP 등록. AGY에 Playwright 별도 설치 불필요. 연결 권한은 현재 방·모델·호출에 한정, 종료 후 폐기
- AGY의 비어 있는 MCP 설정은 최초 등록 상태로 처리. 기존 연결이 일치하면 재등록 생략, 잘못된 JSON은 원본 유지 및 파일 경로 안내
- AGY 등록 제거 명령: `agy mcp remove parley-browser`. MoYEO 외 세션에는 유효한 연결 권한 미제공
- **대화/읽기 전용 호출:** 화면 확인·스크린샷만 허용. 탐색·클릭·입력은 작업 권한 필요
- 다른 모델의 조작으로 화면 변경 시 재확인 요구. 같은 서버 데이터 수정까지 격리되는 것은 아니므로 동일 대상 수정은 작업 분담 필요
- 실제 도구 실행 중 `모델명 · 확인 중 00:03` 또는 `모델명 · 조작 중 00:03` 표시. 종료 후 모델별 마지막 확인·조작 시각 표시. 직접 조작 중에도 모델의 화면 조회 허용
- 페이지 내용은 요청 시에만 전달. 상시 화면 전송 없음. 브라우저 연결은 서버 재시작 후 다시 열기 필요
- 검증 범위: 공식 MCP의 실제 브라우저 읽기·입력·클릭, 사용자 조작 후 재조회, 독립 쿠키·저장소 분리 및 병렬 작업 확인. 세 CLI 모델의 실제 추론을 포함한 종단 검증은 미실시

전체 보관함에서 모든 방의 정리된 대화와 `.trash`에 남아 있는 삭제된 방의 보관본 확인·새 방 복원 가능. 원본 방 표시 및 보관본별 영구 삭제 지원. 삭제 전 복구 불가 경고 모달에서 왼쪽 영구 삭제·오른쪽 취소 선택, 기본 포커스 취소. 현재 대화와 이미 복원한 방 유지. `.trash`를 비우거나 보관본을 영구 삭제하면 복원 불가.

#### 1. 처음 시작하기

1. **방 추가 → 왼쪽 설정**에서 사용할 모델 선택
2. 파일 작업이 필요한 경우 **왼쪽 프로젝트 이름 → 폴더 추가 → 저장**
3. 상단에서 모델 권한 선택 후 메시지 입력

| 메뉴 | 용도 |
|---|---|
| 상단 권한 | 전체 읽기 전용 / 작업 폴더 쓰기 / 전체 권한 / 개별 설정 |
| 방 설정 | 방 이름·모델·페르소나·메모·모델별 권한 |
| 앱 설정 | 글꼴 3종·대화 글자 크기·언어·화면 모드, 브라우저별 저장 |
| 사용 가이드 | GitHub README 열기 |

<details>
<summary>프로젝트·화면 설정 자세히 보기</summary>

- 한 방에 연결한 여러 프로젝트를 모델이 함께 참고·수정 가능. 프로젝트 전환 없이 요청에 맞는 폴더에서 작업하며 기존 대화·작업 권한 적용
- 연결 목록 변경 시 대화 내용·순서 유지, 모델 CLI 세션은 변경된 접근 범위로 새로 시작
- 왼쪽 **설정 바로 위 연결 → CMD 열기 / VS Code 열기** 선택. 프로젝트가 하나면 바로 실행, 여러 개면 열 폴더 선택 후 실행
- CMD는 선택한 폴더에서 실행, VS Code는 선택한 폴더를 새 창으로 열기. 새로 추가한 폴더는 `저장` 후 사용하며 열 프로젝트 선택은 방의 작업 경로를 변경하지 않음
- VS Code 실행 중 `여는 중…` 표시, 공식 CLI의 실행 결과·오류 안내. 저장된 실행 경로가 없거나 파일이 없으면 탐색기에서 Code.exe 선택 후 자동 재시도. 취소 시 실행 중단, 기타 실행 오류는 `실행 파일 선택…`으로 재지정 가능. 선택 경로는 사용자 PC의 `~/.moyeo/.launchers.json`에 저장
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
| 채팅방 프롬프트 | 모든 모델이 공유할 공통 규칙. 고정 높이에서 여러 줄 입력·내부 스크롤 지원 |

**전체 모델 호출:** 2좌석은 `@both`, 3좌석은 `@all`. 기존 `@codex`·`@claude`·`@gemini`도 호환.

**검토 후 결과 보고:** 검토를 요청한 모델이 사용자에게 결과·검증·남은 일을 보고하도록 지침 적용. 사용자 대상 보고의 자동 재전달 방지, 추가 모델 호출이 있을 때만 후속 진행. 자동 발언 한도 도달·중지·실패 시 보고까지 완료된 것으로 간주하지 않음.

**모델 간 작업 전달:** 검토 후 `@뚱뚱아`처럼 제3 모델을 호출하면 해당 모델에게 전달. 기존 상대에게 되돌리지 않으며 자동 발언 한도·중지·수면 설정 유지.

상단 모델 표시는 이름만 한 줄로 표시. 맡은 업무·모델명·상태는 마우스를 올려 툴팁에서 확인.

<details>
<summary>모델 추가·얼굴 편집·공통 규칙 자세히 보기</summary>

- 모델 추가·제거 시 기존 모델의 CLI 세션과 대화 순서 유지. 추가 모델만 최근 대화를 참고하여 새 세션 시작
- 모델 제거 전 해당 모델의 설정·연결 세션 삭제 확인창 표시
- 얼굴 칸에 이미지 붙여넣기 또는 미리보기 클릭 → 이미지 선택 → 이동·확대하여 기존 C/X 아이콘 크기에 맞추기
- 페르소나·채팅방 프롬프트는 같은 CLI 세션에 최초 1회만 전달. 내용 변경 또는 새 세션 시작 시 재전달
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
| 진행 중인 모델 작업에 추가 | `중단 없이 전달` 선택 → 모델이 추가 지시를 받아 현재 작업에 반영 |

**보관만 하면 현재 호출 종료 후 자동 전달.** `중단 없이 전달`은 선택한 모델의 진행 중인 연결로 추가 지시 전달. Codex는 `turn/steer`, Claude는 열린 stream-json 입력, AGY는 ACP 사용. 대화형에서는 짧은 수신 응답 후 기존 작업에 반영하도록 요청. 실행 중인 명령은 취소하지 않으며 실제 반영 시점은 제공자의 처리 단계에 따라 달라짐.

- 기본 Codex·Claude·AGY 명령 지원. 사용자 정의 래퍼, Codex 추가 CLI 인자, AGY의 print 전용 추가 인자·비전체권한 브라우저 설정은 기존 실행 경로 유지. 즉시 전달은 준비된 모델 한 개씩 선택.
- 방·모델별 연결 재사용. 완료 후 10분간 유휴 연결 유지, 다음 요청에서 같은 세션·설정이면 재사용. 유휴 연결 최대 12개, 오래된 연결부터 정리. 중지·오류·시간 초과·서버 종료 시 정리. 설정 또는 세션 변경 시 다음 호출에서 새 연결 사용. 외부 CLI 계정 변경 후 MoYEO 재시작 필요.
- 연결 대기와 모델 추론은 별도. 추가 입력 처리에는 사용량 발생 가능. 연결 재사용으로 초기화 반복을 줄이지만 모델 응답 속도 개선율은 보장하지 않음.
- 전달 확인 실패 시 자동 재전송 중지. 모델 답변 확인 후 대기 지시 삭제 또는 새 지시 작성. AGY의 전송 성공은 입력 통로 전달을 의미하며, 실제 내용 반영은 모델 응답·결과로 확인. ACP의 이전 요청 종료 응답만으로 전체 작업을 완료 처리하지 않음.

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
- 명령어·도구 실행 기록은 기본 접힘. 첫 도구 기록 앞 `▸` / `▾` 토글로 펼치기·접기 가능하며 모델의 공개 진행 설명은 별도 표시
- AGY도 실제 도구명·파일 경로·명령을 작업 기록에 표시. 완료 보고는 변경·검증·남은 문제 중심이며 전체 해시·원시 로그는 명시 요청 또는 오류 설명에 필요한 경우만 표시
- AGY의 공개 발언 이벤트를 받는 즉시 표시하고 작업 사이 발언 보존. 구조화된 마지막 응답이 확인된 경우 결과로 표시하며, 문장 내용만 보고 임의 삭제하지 않음
- 최초 참여 시 최근 40개·본문 약 16,000자 이내 기록 전달. 현재 요청은 별도 전체 전달, 이전 기록은 필요할 때 조회. 기존 세션의 미처리 지시와 대화 원본·순서 유지
- 상단 모델 오류 표시에서 마우스 오버·키보드 포커스·터치로 오류 상세 확인. 마우스·포커스 이탈 또는 Escape로 닫기. 발생 날짜·시간 표시 및 `×`로 확인한 알림 숨김(브라우저에 저장). 새 오류는 다시 표시. 후속 정상 응답·정상 종료 시 현재 경고 해제, 대화 속 오류 원본 유지
- 모델 목록은 Claude CLI 초기화 정보·AGY `models`·Codex 로컬 모델 캐시 사용. 모델 목록과 상단 좌석 툴팁에 Claude CLI 제공 버전명 표시, 툴팁에 실제 모델 ID 병기. 방 진입 시 목록 조회, CLI 조회 실패 시 기본 별칭 및 직접 입력 유지
- AGY의 `gemini-…-medium`처럼 모델명에 추론 강도가 포함된 경우 해당 강도로 고정 표시. 별도 추론 강도 전송 생략으로 설정 충돌 방지. 강도 없는 모델은 별도 선택 가능
- 장시간 작업은 단계별 공개 진행 보고 후 완료 결과로 정리
- 진행 이벤트가 없는 동안에는 대기 상태와 경과 시간 표시

</details>

#### 4. 도구·사용량·빠른 응답 사용하기

| 기능 | 위치·사용 방법 |
|---|---|
| Skill·MCP·Plugin 목록 | 왼쪽 **도구**에서 모델별 확인 |
| Skill·MCP·Plugin 선택 | 입력창에서 `$` → 모델 선택 → 이름 일부 검색 → 방향키·Enter |
| 사용량 확인 | 오른쪽 **작업 현황 → 사용량**에서 확인. 화면 표시 중 5분마다 조회 |
| 빠른 응답 | Codex·Claude 좌석의 **⚡** 버튼 |

좌우 메뉴는 기존 너비를 기본값으로 사용. 1100px보다 넓은 화면에서 메뉴 경계 중앙의 점 손잡이를 드래그하여 조절하고 브라우저별 저장. 손잡이 두 번 클릭 또는 Home 키로 기본 너비 복원, 방향키로 미세 조절. diff 너비는 일반 작업 패널과 별도 저장. 1100px 이하에서는 양쪽 메뉴 기본 접기 및 채팅 우선 표시. 좌우 메뉴 선택 시 같은 규격의 최대 420px 모달, 600px 이하에서는 하단 시트로 표시. Escape·닫기 버튼·배경 클릭으로 닫기.

변경 파일은 **프로젝트 → 저장소 → 폴더 → 파일** 구조로 표시. 처음에는 전부 펼침, 사용자가 접은 폴더는 목록 새로고침 중 유지. 파일 선택 시 해당 파일 diff 열기.

보관함 오른쪽의 패널 아이콘으로 **작업 현황** 열기. 열린 상태에서는 패널 헤더의 아이콘 오른쪽에 제목 표시, 같은 아이콘으로 닫기 가능. 연결 폴더 아래 3단계까지 Git 저장소 탐색 및 저장소별 변경 파일 표시. `node_modules`·`.git`·빌드 폴더와 심볼릭 링크 제외, 탐색 결과 5분 캐시 및 변경사항 새로고침 시 재탐색. 더 깊은 저장소는 직접 연결. 변경 파일 선택 시 마지막 커밋과 현재 파일의 읽기 전용 diff 표시. **마지막 커밋 이후 전체 변경** 기준이며 작업별 변경 구분은 미지원. 아직 커밋이 없는 저장소는 전체 파일 표시. 넓은 화면은 좌우 비교, 좁은 화면은 줄별 비교. 파일 상태는 새 파일·수정·삭제 등으로 표시하고 `+추가 줄 수 −삭제 줄 수` 제공. 새 텍스트 파일도 줄 수 계산, 바이너리·512KiB 초과·읽기 불가 파일은 `—` 표시. diff 열기 시 첫 변경 묶음으로 이동, **이전 ↑ / 다음 ↓**으로 묶음별 탐색 및 현재 위치 표시. 같은 줄 안의 변경 단어는 진한 배경으로 강조. `.serena/cache/`·`__pycache__/`·pytest/mypy/ruff 캐시는 변경 목록에서 제외하되 실제 파일과 Git 설정은 유지. `.serena/project.yml` 등 설정 파일은 계속 표시. 바이너리는 텍스트 비교 미지원, 큰 파일은 미리보기 크기 제한으로 구분 안내. 상단 파일 경로 선택 시 운영체제 기본 앱으로 열기. 실행 파일·스크립트 일부는 실행 방지를 위해 직접 열기 제외.

하위 에이전트는 CLI의 구조화된 생성·상태 이벤트가 확인된 경우에만 모델별 표시. AGY 등 해당 이벤트 미제공 시 표시 생략. 일반 대화나 방 참가 모델을 하위 에이전트로 추정하지 않음.

<details>
<summary>Skill 호출·사용량·Fast 주의사항</summary>

- 검색창과 도구 목록에서 Skill·MCP·Plugin 선택 시 입력창에 배지 추가
- 목록 조회는 로컬 설치·설정 파일만 사용. CLI 실행·연결 검사 없이 검색하며 실제 사용 가능 여부는 요청 실행 시 확인
- 입력 중 중복 조회 방지 및 같은 방·모델의 조회 결과 재사용. 설치 변경 후 도구 메뉴의 새로고침 사용
- 예: `$claude wait` 검색·선택 → `[$claude:wait-what]` 배지 추가. 선택만으로 자동 전송되지 않음
- 배지는 채팅에서 별도 배경색으로 표시. 전송 시 Claude·AGY는 `/Skill`, Codex는 `$Skill` 형식으로 변환
- 사용량은 현재 방 모델만 화면 표시 중 5분마다 조회하며 5분간 결과 공유. **새로고침**은 캐시와 관계없이 즉시 재조회
- 공유 브라우저·변경사항·하위 에이전트·사용량 제목을 드래그하여 순서 변경. Alt+↑/↓ 이동 지원. 섹션별 접기·펼치기 및 순서·접힘 상태의 브라우저 저장. 공유 브라우저 제목과 같은 줄 오른쪽에 열기·직접 조작·연결 종료 버튼 배치, 버튼 글자 11px. 왼쪽 사용량 메뉴·별도 팝업 제거
- ⚡는 다음 CLI 호출에 Fast 처리를 요청하는 설정이며 추론 강도는 유지. 서버의 실제 적용 여부·속도 향상은 보장하지 않음. Fast 명령이 없는 AGY에는 버튼 미표시
- ⚡에 마우스를 올리면 공식 문서 기준 추가 사용량·과금 주의사항 표시

</details>

#### 5. 대화 보관·복원하기

| 기능 | 결과 |
|---|---|
| 상단 **🧹 대화 정리** | 대화·방 설정 보관 후 모델 세션 새로 시작, 현재 방 설정 유지 |
| **보관함 → 날짜 선택 → 미리보기 → 새 방으로 복원** | 메시지 내용·순서를 새 방에 복구, 현재 방과 보관 원본 유지 |
| 방 삭제 | 방 폴더를 `.moyeo/.trash`로 이동, 연결된 실제 프로젝트 유지 |

**저장 위치:** 사용자 PC의 `~/.moyeo`. Git 저장소와 별도이므로 저장소를 다시 클론해도 대화 유지.

<details>
<summary>복원 범위와 삭제한 방 복구</summary>

- 보관 당시 이름·역할·페르소나·채팅방 프롬프트 복원. 설정이 없는 예전 보관본은 현재 원본 방 설정 사용
- 복원된 모델은 새 CLI 세션 사용. 새 메시지를 보낼 때 최근 복원 대화를 참고하며 옛 작업 자동 재실행 없음
- 첨부파일은 원본이 남아 있는 경우 복사
- 프로젝트 파일은 복원 대상이 아니며 새 방의 샌드박스는 빈 상태로 시작
- 방 삭제 확인창에 `.moyeo/.trash` 이동 대상 표시. 삭제한 방은 파일 탐색기에서 수동 복구
- **삭제한 방의 수동 복구**와 **대화 정리 후 보관함 복원**은 별도 기능

</details>

#### 6. 실행·종료·업데이트하기

설치 후 새 터미널에서 폴더 위치와 관계없이 사용 가능.

| 명령·메뉴 | 용도 |
|---|---|
| `moyeo start` | 백그라운드 실행 |
| `moyeo stop` | 대화·설정 유지 후 종료. 진행·대기 작업이 있으면 종료 거부 |
| `moyeo restart` | 서버 재시작 |
| `moyeo status` | 실행 여부·주소·작업 상태 확인 |
| 상단 **업데이트** | 새 기능 확인 후 `나중에` 또는 `업데이트 설치` 선택 |

<details>
<summary>실행 옵션·문제 해결</summary>

- 새 버전이 있을 때만 대화/작업 오른쪽에 **업데이트** 표시. 마우스를 올리면 신규 기능 확인 가능
- CLI 계정 변경 또는 새 CLI 설치 후 `moyeo restart` 필요
- CLI 연결 문제: 터미널에서 `codex`·`claude`·`agy`의 실행·로그인 상태 확인
- PowerShell 실행 정책 오류: `moyeo.cmd start` 등 `.cmd` 명령 사용
- 다른 포트로 실행: `moyeo start --port 4142`. 임의의 빈 포트는 `--port 0` 사용
- 다른 대화 저장 폴더 사용: 각 명령에 같은 `--root 경로` 지정
- 실행 로그: `~/.moyeo/server.log`
- 명령 없이 `moyeo` 실행 시 기존처럼 터미널에서 실행, `Ctrl+C`로 종료
- 실행 관리 기능 도입 전 서버는 한 번 직접 종료 후 새 버전으로 실행 필요

</details>

### 내 Chrome 연결

1. 오른쪽 **공유 브라우저 → 내 Chrome (기본) → 브라우저 열기** 선택
2. 확장이 있으면 설치 안내 없이 연결. 미설치 시 안내 창의 [Playwright 확장 설치](https://chromewebstore.google.com/detail/playwright-extension/mmlmfjhmonkocbjadbfplnigmagldckm) 링크 선택. 평소 사용하는 Chrome 프로필에 설치
3. **설치 후 연결** 선택 → Chrome에서 공유할 탭 선택
4. 주도 모델과 검토 모델이 같은 로그인·화면 사용. 쿠키·로그인 분리가 필요한 작업만 독립 환경 사용

- **?** 버튼: 설치 링크·연결 순서 다시 확인
- **연결 종료**: 내 Chrome과 기존 탭 유지, 모델 연결만 해제
- **전용 브라우저**: 별도 프로필 사용을 원하는 경우 선택. 내 Chrome 로그인 자동 복사 없음
- 사용자별 본인 PC·Chrome 프로필 연결. 프로필·쿠키·로그인 정보의 Git 저장 없음

### 원본 Parley와의 차이점

- 스킬 선택 배지와 중복되는 모델 호출명 숨김. 선택한 스킬의 설치 문서 경로를 모델에 함께 전달하여 세션 목록에 없더라도 해당 문서를 직접 확인하도록 안내.

- 접힌 좌우 메뉴: 버튼에 마우스를 올리면 미리보기, 벗어나면 숨김, 클릭하면 펼쳐 고정. 미리보기 중 채팅 폭 유지.

- 동일 Codex 발언의 누적 수신으로 생기는 중복 접두 문장 제거. 자연스러운 여러 발언과 작업 전후 설명 유지.

- v1.5.7: Fast 알림에 `[모델명] FAST ON/OFF - 설명` 형식 적용. 이름과 상태 분리, 업무명 제외.

- 반응형 메뉴: 좁은 창에서 채팅 우선 및 작업 현황 모달·하단 시트 전환. [W3C Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow) 및 [Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) 참고.
- v1.5.31: 긴 대화의 첫 화면·과거 추가 표시를 기록 50개씩 처리. 접힌 작업 과정은 펼칠 때 생성하며 인용 이동 시 자동 표시. 화면 밖 말풍선의 브라우저 렌더링 생략 및 이전 기록 추가 시 읽던 메시지 위치 유지. 원문·모델 세션 유지, 전체 기록 전송량은 기존과 동일.
- v1.5.30: 대화형의 도구 없는 계획·검토도 분석 전 첫 발언하도록 세 모델 지침 보완. 별도 인사 호출 없이 같은 실행에서 결과까지 진행. 실제 작업 정보가 없는 동안에는 ‘답변 준비 중’ 표시.
- v1.5.29: 세 모델의 실제 도구 작업 상태·파일명 표시 통일. Codex 신규·기존 세션 도구 이벤트 보완, Claude 시작 시점·AGY 파일 위치 반영, 진행 중 설명 유지. 확인할 수 없는 작업 대상은 추정하지 않음.
- v1.5.28: AGY 생각 중 상태 전달 및 도구 실행·완료·실패 표시 보완.
- v1.5.27: 작업 중 카드도 설정한 이름·업무를 표시하도록 통일.
- v1.5.26: 대화형 첫·후속 호출에 작업 전 공개 안내 지침 적용. 동료 요청도 포함하며 “계속 회의해” 같은 일회성 이어가기 요청의 지침 자동 저장 제외.
- v1.5.25: 기존 Parley 실행 시 moyeo/parley 명령 자동 등록 및 신규 설치의 두 명령 호환.
- v1.5.24: 서버 실행 정보 백그라운드 자동 복구 및 관리 명령의 실제 서버 신원 확인 후 복구. 종료된 프로세스의 남은 관리 정보 정리.
- v1.5.23: Windows 서버 실행 정보 파일의 일시적 교체 실패 재시도 및 시작 확인 안정화.
- v1.5.22: 세 모델의 진행 중 추가 지시 전달 및 방·모델별 연결 재사용. 완료 후 유휴 연결 유지, 오류·중지 정리와 중복 전달 방지. 격리 실제 호출에서 추가 지시 반영과 다음 요청의 동일 프로세스 재사용 검증. 채팅 스크롤바 끝 표시 및 ‘맨 아래로 / 새 메시지’ 버튼 구분.
- v1.5.21: 설정 불러오기 툴팁에 제외 대상만 간결하게 표시.
- v1.5.20: 추론 강도 표시를 생각 수준으로 통일. 실제 설정값 유지.
- v1.5.19: 모델별 역할과 실행 설정 제외를 독립 적용. 방 메모의 화면 명칭을 채팅방 프롬프트로 변경.
- v1.5.18: 설정 불러오기에서 체크한 항목만 제외. 모델별 설정 제외와 페르소나·이미지 제외를 분리하고 툴팁 명확화.
- v1.5.17: 방 설정은 기본 전체 복사, 제외 옵션은 복수 선택. 모델별 설정 제외 시 초기값 적용, 옵션 설명은 툴팁 제공.
- v1.5.16: 방 설정 불러오기로 다른 방의 설정 전체를 가져온 뒤 수정·저장. 대화·세션 제외. 마지막 메시지 표시·최신 위치 이동 및 단순한 스크롤바, 왼쪽 모델 이름만 표시.
- v1.5.15: 소통 방식의 기본 흐름 유지, 채팅방 프롬프트의 세부 규칙 적용 및 두 모드 설명 추가. 승인 규칙과 기존 메모 원문 유지.
- v1.5.14: 대화형의 이어지는 호출에 짧은 안내 지침 추가. 작업 전 답변·중요한 진행 공유·결과 전달 상기, 작업형 제외 및 추가 모델 호출 없음.
- v1.5.13: 채팅 스크롤바의 민트·블루 끝 그라데이션과 오버 강조. 모델 버튼 줄바꿈에도 작업 패널 열기 버튼을 상단 오른쪽에 유지.
- v1.5.12: 사용자 메시지 적용 규칙 숨김, 좌우 메뉴 모달·하단 시트 규격 및 닫기 방식 통일, 중앙 점 손잡이 색상 오류 수정.
- v1.5.11: 메뉴 너비 조절을 중앙 손잡이로 한정하고 채팅 스크롤바를 경계에서 12px 이격. 스크롤·너비 조절·항목 순서 변경의 조작 영역 분리.
- v1.5.10: 작업 상태에 은은한 다이아몬드와 지속 점멸 커서 표시, 타이핑 가독성 개선. 호출 설명 한글화 및 펼침 전후 답변 폭 유지.
- v1.5.9: 빈 응답 칸에 실제 CLI 도구 이벤트 기반 작업 상태 표시. 검색어·파일명과 짧은 타이핑 효과, 문구 끝 커서 유지. 완료 미확인 시 호출됨으로 구분하며 추가 모델 호출 없음.
- v1.5.8: 메뉴 경계 중앙의 점 손잡이로 너비 조절 위치 표시. 파란 강조 없이 크기 조절 커서 표시.
- v1.5.6: 좌우 메뉴 경계 드래그로 너비 조절·브라우저별 저장·두 번 클릭으로 기본값 복원. 변경 파일을 폴더 트리로 표시하며 최초 전체 펼침, 갱신 중 사용자 접힘 유지. 좁은 화면의 상단 버튼 넘침·메뉴와 모달 겹침 개선.

- v1.5.5: Codex 누적 사용량을 호출별 차이로 표시. 기준 없는 기존 세션·중단 후 첫 호출은 잘못된 누적 수치 대신 미표시. 과거 대화의 잘못된 집계는 소급 수정하지 않음.

- 채팅의 일반 HTTP(S) 주소 자동 링크 및 새 탭 열기. 마우스를 올리면 도메인·주소·열기 카드 표시. 코드 안의 주소는 그대로 유지하며 사이트 이미지·설명은 자동 조회하지 않음.

- 실제 CLI 실행 기록의 스킬·MCP·명령 아이콘을 하나의 모노라인 도구 아이콘으로 통일. 접힌 첫 줄과 펼친 기록에 동일 적용하며, Claude Skill 호출 이벤트에 스킬 이름 표시.

- **방 설정 → 소통 방식**: 대화형은 페르소나에 맞춘 시작 답변·필요한 진행 공유·결과 전달, 작업형은 필요한 질문·문제·결과 중심. 선택한 모드가 소통 흐름을 결정하고 채팅방 프롬프트는 세부 규칙으로 적용. 현재 요청의 명시적 예외는 해당 요청에만 적용. 실행 권한은 유지
- **모델 카드 → 대화 중 학습된 지침 보기**: 해당 방의 `learned-instructions/<seat>.md` 확인·수정·저장. 방 설정 저장과 별도 저장이며 다음 호출부터 전달. 기존 세션 유지, 변경 시 지침 재전달. 사용자 메시지의 앞으로·항상·기억해 등 명확한 지속 지침을 서버에서 자동 저장하며 추가 모델 호출 없음. 모두에게 한 요청은 `_common.md`, 특정 모델 대상은 해당 모델 파일에 저장. 일회성·애매한 요청은 자동 저장 제외. 관련 지침이 있으면 채팅에서 **기존 유지하고 추가 / 관련 지침 수정 / 저장 안 함** 선택. 의미 충돌을 완벽히 판별하는 기능은 아니며 범위가 다른 지침은 해당 범위 편집기로 관리. 채팅방 프롬프트는 자동 변경하지 않고 직접 편집·명시적 `/note` 요청만 허용. 기존 CLI 전역 메모리·저장되지 않은 기억은 포함하지 않음. 작업 중 저장과 오래된 편집본 덮어쓰기 방지, 보관본에 지침 포함 및 새 방 복원 지원
- 모델 간 의견 교환 시 중요한 판단을 자연스럽게 작업·결과와 연결하는 공통 지침. 고정 말투·항목·추가 동의 호출 강제 없음
- 카드형 제공자 선택 및 설치된 CLI 버전 표시. 설정에서 비동기 조회, 서버 실행 중 24시간 캐시. 구버전 서버는 재시작 안내, 실제 CLI 버전 확인 실패는 확인 불가 표시

- 이름·업무·얼굴 저장 시 상단 카드와 채팅 표시 즉시 갱신

- 카드 상단 제공자 드롭다운 및 드래그·좌우 버튼 순서 변경 지원. 저장 시 적용, 순서 변경만으로 세션 초기화 없음. 제공자 교체 시 해당 세션·실행 옵션 초기화 및 이름·업무·페르소나 유지

- 전체 방·삭제된 방의 보관본 통합 조회, 새 방 복원 및 보관본별 삭제 지원

- 방 설정·앱 설정 분리 및 글꼴 선택 제공. 화면 모드 버튼은 동일 너비·중앙 정렬 적용. 방 설정창은 모델 수와 관계없이 최대 1320px 너비 유지. 페르소나 / 업무 명령 입력칸은 180px 고정 높이와 내부 스크롤 제공. 본문 굵기 유지, 코드 블록 가독성 보강
- 대화/작업 대신 실제 모델 권한 선택. 상단 일괄 변경과 모델별 설정 연동, 서로 다르면 개별 설정 표시. 권한 변경 시 일부 모델의 새 세션 연결 가능, 최근 대화 전달과 전체 기록 유지. 이미 실행 중인 호출은 기존 권한 유지

- 방 생성·수정에 같은 설정창 사용. 상단 방 이름 직접 편집, 빈 화면 중앙 ＋ 또는 방 목록 ＋로 새 방 생성. default와 마지막 방 삭제 가능, 삭제된 방 자동 재생성 방지
- Pretendard 글꼴 앱 내 포함으로 별도 설치·외부 폰트 요청 없이 한글 표시 통일. 본문 15px·표 14.4px 및 여유 있는 줄 간격 적용

- **Claude 진행 안내:** 도구 작업 전 실제 할 일을 짧게 안내하고 같은 호출에서 작업·최종 결과 전달. 간결한 검토 규칙은 최종 답변에 적용. 지침 변경은 기존 세션에 1회 반영하며 짧은 일반 답변에는 불필요한 시작 안내 생략

- **공유 브라우저 추가:** 사용자 확인 후 공식 Playwright MCP 준비·연결, 기본 내 Chrome 연결, 협업 화면 및 요청 시 독립 로그인·쿠키 격리, 직접 조작 중 화면 조회·모델별 확인 시간 표시, 화면 카드 클릭으로 최소화된 창 복원 및 Windows 창 활성화 결과 확인. AGY 호출별 공유 브라우저 권한과 진행 안내의 완료 답변 오인 방지

| 구분 | 원본 `auspex0/parley` | MoYEO |
|---|---|---|
| 방 좌석·역할 | 방당 2좌석, 제공자 기본 이름·아이콘 | 방당 최대 3좌석 추가·제거, 기존 좌석 세션·대화 순서 유지, 제거 확인, 표시 이름·맡은 업무·이모지·색상 설정, `@all` 호출 및 검토 후 제3 모델로 작업 전달 |
| 모델 간 요청 전달 | 제공자 고정 호출명 중심 | 사용자 호출명 및 골뱅이 없는 명확한 이름 지정 요청 전달, 인용·코드 예시 제외. 방 모델과 내부 하위 에이전트 구분 지침 적용 |
| 화면·방 관리 | 기본 화면 및 방 이름 제약 | 대화·입력창 80% 반응형 폭(최대 1,400px), 표 줄바꿈·내부 스크롤, 선택된 방 배경·강조선 구분, 한글 방 이름, 상단 다크·라이트 선택 저장, 설정 헤더·저장 영역 고정 및 바깥 클릭 닫힘 방지 |
| 호출명·페르소나 | 제공자 고정 호출명과 공통 지침 | 사용자 이름·호출명·페르소나 설정, 상단에는 이름만 표시하고 상세는 툴팁 제공, 고정 높이·내부 스크롤 입력란, 같은 CLI 세션에 최초 1회 전달 |
| 얼굴 이미지 | 문자·이모지 중심 | 이미지 붙여넣기·파일 선택, 이동·확대 편집 후 기존 아이콘 틀에 맞춘 64×64 얼굴 저장 |
| 공통 채팅방 프롬프트 | 매 호출에 상시 지시문 반복 | 고정 높이·여러 줄 입력·내부 스크롤, CLI 세션별 최초 1회 전달 및 변경 시 재전달, `/note @호출명 요청`으로 모델 요약 후 자동 저장 |
| Gemini 계열 연결 | 기존 Gemini CLI 기준 | 현재 Google Antigravity CLI인 `agy` 사용, 한 호출 내 확인·수정·검증 단계별 공개 설명 지침(세션별 변경 시 1회 전달) |
| 작업 현황 | 별도 패널 없음 | 보관함 오른쪽 아이콘으로 여닫기, 하위 Git 저장소별 변경 파일·자동 생성 캐시 제외·한글 상태·줄 수·변경 묶음 이동·단어 강조 diff·확인된 하위 에이전트·원형 사용량 그래프 및 섹션별 드래그 순서·접힘 상태 저장 |
| 사용량 자동 조회 | 메뉴 열기·마우스 오버 시 조회 | 화면 표시 중 5분 주기 조회, 서버 캐시·중복 요청 공유 및 수동 새로고침 지원 |
| 도구 선택 표시 | 일반 문장 안내 | Skill·MCP·Plugin을 짧은 대괄호로 삽입하고 채팅에서 배지 표시 |
| 화면 언어 | 영어 중심 | 한국어/English 전환, 브라우저별 설정 저장, 한국어 안내·툴팁 존댓말 통일, 권한 승인·저장 및 기존 대화 권한 안내 번역 |
| 왼쪽 메뉴 | 고정 표시 | 접기/펼치기 및 상태 저장, 방 설정 진입을 왼쪽 메뉴로 통일 |
| 설정창·대화 정리 | 고정 설정창과 새 대화 버튼 | 3모델 설정창 확장, 대화 정리 및 한국어 방 삭제 확인창 |
| 보관함·복원 | 날짜별 파일 보관 | 보관 대화 미리보기 및 메시지 순서·방 설정을 새 방으로 복원, 현재 방 유지, 새 CLI 세션으로 이어가기 |
| CLI 사용량 | 별도 터미널에서 직접 확인 | 오른쪽 패널로 통일, 현재 방 모델만 조회. 5분 캐시·수동 새로고침, 대화 토큰·잔여율·초기화 시각 표시 |
| 프로젝트 연결 | 방마다 프로젝트 경로 하나만 연결 | 여러 프로젝트 동시 참고·작업, 넓은 관리창, 탐색기형 폴더·실행 파일 선택, 설정 위 연결 메뉴에서 CMD·VS Code 실행 및 진행·오류 표시, 미저장 실행 경로의 Code.exe 선택창 자동 표시 |
| 왼쪽 메뉴 설명 | 메뉴 이름만 표시 | 주요 메뉴에 마우스 오버·키보드 포커스 시 한글/영문 설명 툴팁 표시, 사용 가이드에서 GitHub README 열기 |
| 모델 도구 확인 | 채팅 화면에서 별도 확인 어려움 | `$모델 검색어`로 Skill·MCP·Plugin 통합 검색, 로컬 설정 조회 및 배지 선택 |
| Skill 채팅 표시 | 일반 요청 문장과 구분 어려움 | `[$모델:Skill]` 입력과 색상 배지로 선택한 Skill을 명확히 구분 |
| Skill 출처 확인 | Skill 이름만으로 기본·Plugin 포함 여부 구분 어려움 | `codex:openai-docs`, `superpowers:brainstorming`처럼 제공 주체와 내부 Skill을 함께 표시 |
| Skill 설명 가독성 | 영문 설명과 작은 목록 글자 중심 | 현재 설치 Skill 설명을 한글로 표시하고, 창 크기는 유지하면서 글자·카드 간격 확대 |
| 작업 중 추가 지시 | 새 메시지를 즉시 대기열에 전송 | 서버에서 편집 가능한 대기 지시 관리, 현재 호출 종료 후 최신 지시 우선 처리, 이전 모델 전달 요청 재판단 및 중복 전송 방지 |
| 응답 진행 표시 | 응답 전 말줄임표 중심 | 한 호출 안에서 작업 전 답변·중간 발언 보존·결과 표시, AGY 실제 도구·파일·명령 기록 기본 접힘 및 클릭 펼치기, 얼굴 36px·이름 12px, 모델별 오류 발생 시간·상세 확인, 닫은 알림 숨김 저장 및 새 오류 재표시 |
| 최초 참여 맥락 | 누적 미수신 기록 전달 | 최근 기록부터 전달하고 이전 기록은 필요할 때 조회, 생략된 기록의 읽음 표시 방지 |
| 모델 선택 | 고정 모델 제안 중심 | Claude CLI 버전명을 모델 목록·상단 툴팁에 표시 및 실제 ID 확인, AGY CLI 목록·모델별 추론 강도 충돌 방지·Codex 로컬 모델 캐시 활용 |
| 빠른 응답 | 설정에서 모델·처리 방식을 직접 변경 | Codex는 `service_tier=fast`, Claude는 CLI `fastMode` 요청. 추론 강도 유지, 서버 적용·속도 향상 보장 없음. 현재 Fast 명령이 없는 AGY에는 ⚡ 미표시 |
| Fast 사용량 안내 | 별도 문서에서 직접 확인 | ⚡ 툴팁에 공식 문서 기준 Codex 크레딧 배수와 Claude Usage Credits·문맥 재읽기 주의 표시 |
| 알림 설정 | 간단한 체크박스 설명 | Windows 알림의 발생 조건과 브라우저별 저장 범위를 줄바꿈이 깨지지 않는 구조로 표시 |
| 전체 권한 안내 | 작업 화면 위에 계속 표시 | 방별 최초 확인 후 `×`로 닫아 영구 숨김 |
| 전체 권한 실행 | 토론·검토 호출에서 Plan으로 자동 제한 | 선택한 전체 권한을 모든 호출 경로의 파일·명령·브라우저에 유지, 역할 변경만으로 세션 재시작 없음 |
| 작업 현황 조작 | 섹션 제목 전체를 드래그 | 제목 클릭으로 접기·펼치기, 별도 손잡이로 순서 이동, 버튼 클릭 영역과 커서 분리 |
| 공유 브라우저 로그인 | 종료 시 임시 로그인 상태 소실 | 기본 내 Chrome 로그인·선택 탭 공유, 필요 시 전용 브라우저 및 독립 로그인 환경 선택 |

선택형 전용 브라우저 프로필은 대화 저장 루트의 `.browser-profiles`에 로컬 저장. 최초 로그인 필요, 이후 브라우저 재연결·Parley 재시작 시 재사용. 사이트의 로그인 만료·세션 정책에 따라 재인증 가능. 방 이름 변경 시 프로필 유지, 모델별 별도 작업 브라우저는 임시 환경 유지.
| 업데이트 확인 | 터미널에서 직접 `git pull` | 새 버전이 있을 때만 헤더에 표시하고 신규 기능 미리보기·선택형 자동 설치 지원 |
| Codex 작업 권한 | 새 세션의 sandbox 설정에 의존 | 새 호출과 이어지는 세션 호출마다 현재 방의 sandbox 권한을 명시하여 풀 액세스가 읽기 전용으로 돌아가는 문제 방지 |
| 도구 목록 조회 | CLI 목록 명령에 따른 대기 가능 | 세 제공자 모두 로컬 설정·플러그인 메타데이터에서 조회. 일반 조회·새로고침 시 연결 검사 생략 |
| 검토 후 마무리 | 검토 동의 시 침묵 또는 반복 전달 | 요청 모델의 사용자 대상 결과 보고 지침 및 보고의 자동 재전달 방지 |
| 운영 방식 | 범용 다중 에이전트 대화 | Codex 주도 + Claude/AGY 검토 방식 가이드 제공 |
| 공개 정보 보호 | 원본 기본 동작 | 도구 설명의 명령·URL·Windows/POSIX 로컬 경로 마스킹 강화 |
| CLI 설치 | 개별 설치 | setupMoyeo.cmd에서 Codex·Claude npm 최신 버전 및 AGY 공식 설치기 실행, 로그인 별도 |
| 데이터 이전 | 기존 저장 경로 | 이전 버전 전체 백업·검증 후 ~/.moyeo로 이전, 성공 시 이전 원본 폴더 정리 |
| 실행·종료 관리 | 터미널 실행과 Ctrl+C 종료 | 설치 시 전역 명령·Windows 사용자 PATH 등록, start·stop·restart·status로 관리, 중복 실행·작업 중 종료 방지 |
| 브랜드·문서 | Parley | MoYEO 이름과 한국어 설치·사용·업데이트 가이드, 용도별 기본 사용법과 접이식 상세 안내 |

사용량 표시는 각 CLI가 실제 제공한 값만 사용함. 5시간·주간 한도 중 CLI 응답에 포함된 항목만 원형 그래프로 표시함. 따라서 Codex Premium처럼 주간 한도만 제공되면 주간만 보이고, Standard 또는 Claude가 5시간 한도를 함께 제공하면 두 항목을 모두 표시함. 모델별 화면 형식을 맞추기 위해 Claude 전용 요청·세션 통계는 표시하지 않음. 토큰은 현재 방 대화 응답이 실제 보고한 입력·출력·추론·캐시 토큰 합계이며 계정 전체 토큰으로 추정하지 않음. 긴 범위 설명은 각 항목의 `ⓘ` 툴팁으로 확인 가능함.

Fast 경고는 [OpenAI Fast mode 문서](https://developers.openai.com/ja-JP/docs/agent-configuration/speed)와 [Claude Code Fast mode 문서](https://code.claude.com/docs/en/fast-mode)를 기준으로 함. Codex의 지원 모델은 Fast에서 일반적으로 표준 크레딧의 약 2.5배(GPT-5.4는 2배)를 사용하며, Claude 구독 로그인은 포함 사용량이 아닌 별도 Usage Credits를 사용함. Claude는 대화 중간에 Fast를 켜면 기존 문맥을 Fast 요금으로 다시 읽을 수 있음. 이는 토큰 개수가 일괄 배수로 늘어난다는 뜻이 아니라, 같은 토큰에 적용되는 크레딧·요금 단가가 높아질 수 있다는 의미임.

다음 핵심 동작은 원본과 동일하게 유지함.

- API 키 없이 `codex`, `claude`, `agy` CLI의 기존 구독 로그인 사용
- 실행 명령 `moyeo` 및 기본 주소 `http://127.0.0.1:4141` 유지
- 방·대화·설정의 기본 저장 위치 `~/.moyeo` 유지
- Talk, Work, Pair, Lurk, 자동 발언 제한 등 기존 대화 구조 유지
- 기존 Parley 방 파일과의 호환성을 위해 AGY의 내부 provider id는 `gemini` 유지

진행 표시에는 CLI가 실제로 제공한 이벤트와 모델이 사용자에게 공개한 짧은 작업 보고만 사용함. 모델의 비공개 내부 추론 원문을 표시하거나, 존재하지 않는 작업 단계를 임의로 만들어 보여주지 않음. 현재 Parley의 일회성 CLI 호출에는 실행 중 새 프롬프트를 주입할 수 없으므로, 작업 중 작성한 추가 지시는 현재 호출 종료 후 같은 방의 다음 지시로 자동 전달됨. 즉시 반영하려면 현재 호출 중지 필요.

MoYEO는 별도 npm 패키지로 배포하지 않으므로 이 저장소를 클론하여 실행해야 함. `npx parley-room` 또는 `npm install -g parley-room` 실행 시 MoYEO가 아닌 원본 npm 버전이 설치됨.

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
cd moyeo
git pull --ff-only
npm.cmd start
```

- 직접 업데이트한 경우 실행 중인 Parley 종료 후 재실행 필요. 화면의 선택형 자동 설치를 사용하면 자동 재시작
- 방·대화·설정 저장 위치: `~/.moyeo`
- 대화 정리 시 보관 위치: `~/.moyeo/<방 이름>/transcript-<날짜>.md`, `events-<날짜>.jsonl`, `archive-<날짜>.json`(방 설정). 왼쪽 대화 저장 폴더에서 파일 열람, 상단 보관함에서 새 방으로 복원 가능. 예전 CLI 세션과 프로젝트 파일 상태는 복원 대상에서 제외
- 소스 저장소를 삭제하거나 다시 클론해도 `~/.moyeo`를 지우지 않으면 기존 대화 유지
- 삭제한 방의 임시 보관 위치: `~/.moyeo/.trash`
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

You need **Node.js ≥ 20**. Run `setupMoyeo.cmd` (or `npm run setup`) to install/update all three CLIs: Codex and Claude through npm `@latest`, AGY through its official native installer. Then authenticate the CLIs you use: `claude` (Claude Code), `codex` (OpenAI Codex), or `agy` (Google Antigravity). Parley shells out to them under your existing subscription logins.

MoYEO is not published as a separate npm package. Install this fork from source so the `moyeo` command points to this repository:

```bash
git clone https://repository.kr/rnd/ai-archive/ai-orchestration/parley.git moyeo
cd moyeo
npm test     # optional: real server, fake agents — no login, no tokens spent
npm link
moyeo
```

The command remains `moyeo`. Do not use `npx parley-room` or `npm install -g parley-room` for this fork; those commands install the upstream npm release instead.

The UI opens automatically at a loopback URL, normally `http://127.0.0.1:4141`. Flags: `--port N` (`--port 0` picks any free port), `--root DIR`, `--no-open`, `--version`, `--help`.

Run `npm install` after cloning. Browser sharing uses the official Playwright MCP and MCP SDK; `npm start` runs from the checkout without linking the command globally. Google Chrome must be installed locally. The default connects to your Chrome through the Playwright extension, reusing its login. Dedicated browsers remain optional.

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

Your rooms, transcripts and settings live in `~/.moyeo` (override with `--root`). To remove Parley entirely: `npm uninstall -g parley-room`, then delete that folder — it also holds `~/.moyeo/.trash`, where deleted rooms go.

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

**A small local application.** One Node entrypoint ([parley.mjs](parley.mjs)), focused [runtime modules](lib/), and plain [HTML](ui/index.html), [CSS](ui/styles.css), and [JavaScript](ui/app.js). Browser sharing uses the official Playwright MCP and MCP SDK, installing missing runtime packages only after setup confirmation. The panel shows actual tool activity and last-seen timestamps; manual control blocks model actions while allowing inspection. No database or build step. Dedicated room browsers use temporary contexts; shared pages serialize actions and reject stale snapshots, while private contexts isolate model cookies and logins. This does not isolate changes to the website's server data.

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

설치 출처: [Claude Code](https://support.claude.com/en/articles/14552382-your-first-day-in-claude-code), [AGY 공식 설치](https://antigravity.google/docs/getting-started?tab=cli). AGY는 공식 npm 패키지 대신 네이티브 설치기 사용.

### Fast 실측 기록 (2026-11-03)

Codex 0.165.0, 같은 세션에서 일반/Fast 요청 각 2회. 일반 21.899초·15.284초, Fast 요청 20.523초·17.129초. 평균 일반 18.6초, Fast 요청 18.8초로 이번 표본에서는 개선 확인 불가. CLI 시작·문맥·캐시 차이를 포함한 소규모 비교이며 서버의 실제 처리 tier는 확인되지 않음. 실제 출력 토큰은 순서대로 160·125·120·108개. 크레딧 차감 배수는 이 토큰 수로 실측한 값이 아님. Claude 유료 Fast 호출 제외. 기본 OFF 유지 권장.
