# DigiModoro

> 뽀모도로 세션으로 키우는 디지몬 가상 펫. Windows 데스크탑 앱.

English: [README.en.md](README.en.md)

---

## 다운로드

| 운영체제 | |
|---|---|
| Windows | [DigiModoro_0.4.1_x64-setup.exe](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro_0.4.1_x64-setup.exe) |
| macOS (Intel · Apple Silicon 공용) | [DigiModoro_0.4.1_universal.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro_0.4.1_universal.dmg) |

**Windows**: `.exe` 더블클릭 → 경고가 뜨면 **추가 정보 → 실행**.

**macOS**: `.dmg` 더블클릭 → `DigiModoro.app`을 **Applications** 폴더로 드래그. 처음 실행할 때 "확인되지 않은 개발자" 경고가 뜨면 **Applications에서 앱을 우클릭 → 열기 → 다시 한 번 열기**. (한 번만 거치면 다음부터는 평소처럼 실행됩니다.)

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
