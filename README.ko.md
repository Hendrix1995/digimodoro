# DigiModoro

> 뽀모도로 세션으로 키우는 디지몬 컨셉의 가상 펫.
> **Windows + macOS** 크로스플랫폼 데스크탑 앱. 50분짜리 집중 블록을 완료해 펫을 진화시킵니다 — **뽀모도로를 완료한 시간대**가 진화 분기를 결정합니다.

English version: [README.md](README.md)

---

## 다운로드 (비개발자용)

최신 릴리스의 사전 빌드 인스톨러:

| OS | 아키텍처 | 직링크 |
|---|---|---|
| macOS | Apple Silicon (M 시리즈) | [DigiModoro-arm64.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-0.1.0-arm64.dmg) |
| macOS | Intel | [DigiModoro.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-0.1.0.dmg) |
| Windows | x64 | [DigiModoro-x64.exe](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-0.1.0-x64.exe) |

전체 빌드는 **[Releases 페이지](https://github.com/Hendrix1995/digimodoro/releases/latest)**에서 확인.

> macOS 빌드는 ad-hoc 미서명입니다. 첫 실행 시: 앱을 **우클릭 → 열기 → 열기** (미서명 앱 Gatekeeper 우회).
> Windows 빌드는 미서명입니다. SmartScreen 경고가 뜨면 **추가 정보 → 실행** 클릭.

---

## 한눈에

| | |
|---|---|
| **6단계 진화** | egg → fresh → baby → child → adult → perfect → mega |
| **414종 스프라이트** | egg + 413종 — 한 펫은 한 갈래만 걷습니다 |
| **알 11종** | 부화 시 lineage를 결정 |
| **성격 5종** | 출생 시 랜덤 (`calm` / `gentle` / `holy` / `mischief` / `savage`) — 진화 결과에 편향 |
| **5개 시간 슬롯** | morning / forenoon / midday / evening / night — 각 슬롯이 서로 다른 분기로 |
| **운빨 (Lucky Roll)** | 진화마다 12% 확률로 옆가지로 빗나감 |
| **돌봄 시스템** | 3일 연속 방치 → 사망(R.I.P.) |

---

## 컨셉

- 50분 집중 + 10분 휴식 = **1 포크**(뽀모도로 1회 완료)
- 현재 단계에서 포크가 쌓여 충분해지면 진화
- 분기는 **이번 단계에서 가장 많이 포크를 완료한 시간 슬롯**으로 결정
- 성격이 동점을 깨고, 12% Lucky roll이 분기를 빗나가게 할 수 있음
- 알 변형(1–11)은 부화 시 첫 fresh 디지몬 계통을 결정하며, 첫 진화는 슬롯 로직을 무시
- **3일 연속** 포크 미완료 → R.I.P. → 묘지로 이동

### 단계별 필요 포크

| 진화 | 필요 포크 | 누적 |
|---|---:|---:|
| egg → fresh | 1 | 1 |
| fresh → baby | 2 | 3 |
| baby → child | 4 | 7 |
| child → adult | 8 | 15 |
| adult → perfect | 16 | 31 |
| perfect → mega | 16 | **47** |

mega 도달까지 약 47포크(순수 집중 약 39시간).

### 시간 슬롯

| 슬롯 | 시간(로컬) |
|---|---|
| morning | 05:00 – 09:00 |
| forenoon | 09:00 – 12:00 |
| midday | 12:00 – 17:00 |
| evening | 17:00 – 21:00 |
| night | 21:00 – 05:00 |

### 성격별 슬롯 가중치

| 성격 | 보너스 슬롯 |
|---|---|
| calm (온화) | 없음 (중립) |
| gentle (순함) | morning ×1.15, forenoon ×1.10 |
| holy (신성) | morning ×1.20, forenoon ×1.20 |
| mischief (장난) | midday ×1.15, evening ×1.15 |
| savage (거침) | evening ×1.10, night ×1.25 |

동점은 결정적 시드 RNG(`petId` + 진화 인덱스)로 깨집니다. 동일한 포크 분포면 항상 같은 진화 결과가 나옵니다.

---

## 빠른 시작 (개발)

```bash
# 리포 루트에서
pnpm install
pnpm --filter @digimodoro/core build
pnpm --filter @digimodoro/app build
pnpm --filter @digimodoro/app dev    # Electron 실행
```

또는 한 번에:

```bash
pnpm dev
```

화면 전체를 덮는 투명한 펫 윈도우와 Botamon 트레이 아이콘이 표시됩니다. 펫을 우클릭하면 컨텍스트 메뉴(집중 시작/일시정지, 언어, 크기, 상태창, 리셋, 종료)가 열립니다. 첫 실행 시 `~/.digimodoro/`가 생성되고 랜덤 알이 부화합니다.

---

## 상태창

트레이 메뉴나 펫 우클릭 → "상태 창 열기"로 호출. 구성:

- 미니 펫 스프라이트(알일 때는 가만히 있음) + 단계 + 성격
- 뽀모도로 타이머와 1차 액션(시작 / 일시정지 / 재개 / 완료 확인) + 2차 액션(중단 / 휴식 건너뛰기)
- **통계**:
  - **다음 진화까지** — 진척 게이지 + `N/M` 수치
  - 이번 단계 포크, 총 포크
  - 연속 결석 일수
  - **R.I.P.까지 남은 일수** — 2일 노란색, 1일 이하 빨강 굵게
  - 진화 이력 개수
  - 슬롯 칩 5개 (morning / forenoon / midday / evening / night)
- **설정**: 언어(한국어 / EN), 펫 크기, 집중 시간, 휴식 시간, 이벤트별 알림 토글
- **진화 이력** — from/to 스프라이트 썸네일과 우세 슬롯이 포함된 시간순 목록
- **묘지** — 과거 펫(R.I.P. 또는 리셋) 목록. 항목을 클릭하면 그 펫의 전체 진화 트리(egg → fresh → ... → 최종 형태)가 인라인으로 펼쳐지며, 단계마다 스프라이트와 우세 슬롯이 표시됩니다.

---

## 설치 빌드

```bash
pnpm package        # macOS .dmg (arm64 + x64) + Windows .exe (NSIS)
```

결과물은 `release/`에 떨어집니다.

macOS 빌드는 기본적으로 **ad-hoc unsigned**입니다 (`packages/app/electron-builder.yml`의 `mac.identity`에 실제 Developer ID를 넣으면 서명 가능).
macOS에서 Windows 인스톨러를 빌드할 때는 electron-builder의 번들 wine을 사용 — 미서명 배포에는 충분하지만, 코드 서명이 필요하면 Windows에서 직접 실행하세요.

---

## 레포 구성

```
packages/
  core/   순수 TypeScript 도메인 — 뽀모도로 상태 머신, 진화 규칙, reducer (Electron 의존성 없음)
  data/   디지몬 로스터 + evolution.json + 스프라이트 에셋
  app/    Electron main / preload / renderer
```

---

## 런타임 파일 위치

| 경로 | 용도 |
|---|---|
| `~/.digimodoro/state.json` | 현재 펫 상태 |
| `~/.digimodoro/sessions.jsonl` | 완료된 뽀모도로 로그 |
| `~/.digimodoro/config.json` | 사용자 설정 |
| `~/.digimodoro/graveyard.jsonl` | 은퇴/사망한 펫들 |

---

## 스프라이트

원본 GIF는 `packages/data/sprites/_raw/`에 있으며, `packages/data/scripts/copy-gif-sprites.mjs`가 `packages/data/sprites/<digimonId>/idle.gif`로 변환합니다. 스크립트는 변형 번호 접미사를 떼어내므로(`Dinobeemon_2.gif` → `dinobeemon/idle.gif`) canonical ID가 `evolution.json`과 일치합니다. PATH에 ImageMagick (`magick`)이 필요합니다.

---

## 튜닝 가능한 값

`packages/core/src/types.ts`의 기본값:

```ts
FOCUS_DURATION_SEC: 50 * 60   // 집중 50분
BREAK_DURATION_SEC: 10 * 60   // 휴식 10분
LUCKY_ROLL_CHANCE:  0.12      // 12% 빗나감
STREAK_MISS_SOFT_DAYS: 1
STREAK_MISS_HARD_DAYS: 2
STREAK_MISS_RIP_DAYS:  3
```

집중/휴식 길이는 상태창에서 사용자가 직접 조절 가능하며 `config.json`에 저장됩니다.

---

## 테스트

```bash
pnpm --filter @digimodoro/core test
```

time-slot · 뽀모도로 · xp · 진화 · streak-miss · reducer 영역 **59개 테스트**.

---

## 크레딧

### 스프라이트

| 에셋 | 출처 |
|---|---|
| 디지몬 캐릭터 애니메이션 *(Fresh → Mega)* | [With the Will — Digimon Sprite Animation Thread](https://withthewill.net/threads/digimon-sprite-animation-thread-read-first-post-fully-working.10472/) |
| 디지타마 아이콘 *(11종)* | [*Digimon Digital Monsters: D-Project*](https://digimon.fandom.com/wiki/Digimon_Digital_Monsters:_D-Project) — Bandai Namco, Nintendo DS (2008) |

### 도구

- [Electron](https://www.electronjs.org/) — 데스크탑 런타임
- [ImageMagick](https://imagemagick.org/) — 스프라이트 처리
- [esbuild](https://esbuild.github.io/) — main / preload / renderer 번들링
- [Vitest](https://vitest.dev/) — 테스트
- [pnpm](https://pnpm.io/) — 워크스페이스 패키지 관리자

### 상표권

*Digimon*과 관련 캐릭터는 Bandai Namco Entertainment / Toei Animation의 등록 상표입니다. DigiModoro는 팬 프로젝트로, 두 회사와 **공식적인 관련, 후원, 인증이 없습니다**.

### 콘텐츠 삭제 요청

권리자가 본 리포에 참조된 에셋에 대해 우려가 있다면 [이슈](../../issues)로 알려주시면 신속히 제거하겠습니다.

---

## 라이선스

**상업용 / 독점.** [LICENSE](./LICENSE) 참조.

이 리포의 소스 코드는 열람 가능하지만, 재배포·수정·상업적 이용은 저작권자와의 별도 서면 동의가 필요합니다.
