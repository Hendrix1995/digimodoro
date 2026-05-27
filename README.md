# DigiModoro

> 뽀모도로 세션으로 키우는 디지몬 가상 펫. Windows · macOS 데스크탑 앱.

English: [README.en.md](README.en.md)

---

## 다운로드

| 운영체제 | |
|---|---|
| Windows | [DigiModoro_0.4.5_x64-setup.exe](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro_0.4.5_x64-setup.exe) |
| macOS 15+ (Intel · Apple Silicon 공용) | [DigiModoro_0.4.5_universal.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro_0.4.5_universal.dmg) |

### Windows

`.exe` 더블클릭 → SmartScreen 경고가 뜨면 **추가 정보 → 실행**.

### macOS — 공통 설치

`.dmg`을 더블클릭한 뒤 `DigiModoro.app`을 **Applications** 폴더로 드래그합니다.

코드 서명을 하지 않은 무료 빌드라, 처음 실행할 때 보안 경고가 뜹니다. **macOS 버전에 따라** 아래 절차를 한 번만 거치면 다음부터는 평소처럼 실행됩니다. (Apple 메뉴 → 이 Mac에 관하여로 버전 확인 가능)

#### macOS 14 (Sonoma) 이하 — 우클릭 단축 경로

1. **Applications**에서 `DigiModoro.app`을 **우클릭 → 열기**
2. *"확인되지 않은 개발자"* 다이얼로그가 뜨면 **「열기」** 클릭

#### macOS 15 (Sequoia) 이상 — 시스템 설정 경로

(macOS 15에서는 우클릭 → 열기 단축 경로가 막혔습니다.)

1. `DigiModoro.app`을 더블클릭 → 경고 다이얼로그가 뜨면 **완료** 클릭 (휴지통으로 옮기지 마세요)
2. **시스템 설정 → 개인정보 보호 및 보안** 열기
3. 화면 아래쪽으로 스크롤하면 *"‘DigiModoro’이(가) 식별된 개발자로부터 받지 않은 것이기 때문에 차단되었습니다"* 메시지 옆에 **「그래도 열기」** 버튼이 나타납니다
4. **「그래도 열기」** 클릭 → 비밀번호 또는 Touch ID 인증
5. 다시 차단 다이얼로그가 뜨면 이번엔 **「열기」** 버튼이 추가되어 있으니 클릭

---

## 사용법

- 50분 집중 + 10분 휴식을 완료하면 **포크 1개**.
- 포크가 쌓이면 펫이 진화합니다.
- 가장 많이 집중한 시간대(아침·오전·낮·저녁·밤)에 따라 진화 방향이 결정됩니다.
- 3일 연속 집중을 안 하면 펫이 사망합니다.
- 트레이 아이콘 클릭으로 상태창 열기.

총 47번의 포크(약 39시간 집중)로 최종 단계 도달.

## 박스 (v0.3.0~)

마음에 드는 디지몬을 박스에 보관해두고 나중에 꺼낼 수 있습니다. 박스에 들어간 디지몬은 **성장도 죽음도 멈춥니다** — 꺼내면 보관 직전 상태 그대로 이어집니다.

- 박스 슬롯: 최대 **5개**
- **보관**: 컨트롤 패널의 박스 빈 칸 클릭 → 현재 펫을 보관, 새 알이 시작됩니다. 진화 알림 버블의 "박스 열기" 버튼이 단축키.
- **꺼내기**: 박스에 보관된 펫을 클릭 → "꺼내기" → 활성 펫이 자동으로 박스의 빈 칸으로 이동.
- **삭제**: 박스에서 영구 제거.
- **차단 조건**: 알 단계 / R.I.P. / 포모도로 진행 중 / 박스 가득 — 위 4가지 상황에서는 보관·꺼내기 불가.

---

## 크레딧

### 스프라이트

| 에셋 | 출처 |
|---|---|
| 디지몬 캐릭터 애니메이션 *(Fresh → Mega)* | [With the Will — Digimon Sprite Animation Thread](https://withthewill.net/threads/digimon-sprite-animation-thread-read-first-post-fully-working.10472/) |
| 디지타마 아이콘 *(11종)* | [*Digimon Digital Monsters: D-Project*](https://digimon.fandom.com/wiki/Digimon_Digital_Monsters:_D-Project) — Bandai Namco, Nintendo DS (2008) |

### 도구

- [Tauri v2](https://v2.tauri.app/) — 데스크탑 런타임
- [Vite](https://vitejs.dev/) — 프론트엔드 빌드
- [ImageMagick](https://imagemagick.org/) — 스프라이트 처리
- [Vitest](https://vitest.dev/) — 테스트
- [pnpm](https://pnpm.io/) — 워크스페이스 패키지 관리자

### 상표

*Digimon* 및 관련 캐릭터는 Bandai Namco Entertainment / Toei Animation의 상표입니다. DigiModoro는 팬 프로젝트이며 Bandai Namco 또는 Toei와 제휴/후원/승인 관계가 없습니다.

### 삭제 요청

권리자께서 이 프로젝트에서 참조된 자산에 대해 우려가 있으시면 [이슈](../../issues)를 남겨주세요. 해당 콘텐츠는 신속히 제거됩니다.

### 라이선스

코드: [MIT](./LICENSE)
