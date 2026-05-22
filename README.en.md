# DigiModoro

> Digimon-themed virtual pet powered by Pomodoro sessions.
> Cross-platform desktop app for **Windows + macOS**. Complete 50-minute focus blocks to evolve your pet — the **time of day you complete a Pomodoro** decides which path it grows down.

Korean version: [README.md](README.md)

---

## Download (non-developers)

Pre-built installers for the latest release:

| OS | Architecture | Direct download |
|---|---|---|
| macOS | Apple Silicon (M-series) | [DigiModoro-mac-arm64.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-mac-arm64.dmg) |
| macOS | Intel | [DigiModoro-mac-x64.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-mac-x64.dmg) |
| Windows | x64 | [DigiModoro-win-x64.exe](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-win-x64.exe) |

All builds available on the **[Releases page](https://github.com/Hendrix1995/digimodoro/releases/latest)**.

> macOS and Windows code signing are not set up yet. Until they are, unsigned builds may produce these warnings:
>
> - **macOS**: *"DigiModoro is damaged and can't be opened"* — that is Gatekeeper blocking unsigned apps. Temporary workaround: move the app to `/Applications`, then run `xattr -cr /Applications/DigiModoro.app` once in Terminal.
> - **Windows**: SmartScreen warning → **More info → Run anyway**.

---

## Highlights

| | |
|---|---|
| **6 stages** | egg → fresh → baby → child → adult → perfect → mega |
| **414 sprite folders** | Egg + 413 species — one playthrough only walks one branch |
| **11 egg variants** | The egg you hatch decides which lineage you start on |
| **5 personalities** | Random at birth (`calm` / `gentle` / `holy` / `mischief` / `savage`) — bias evolution outcomes |
| **5 time slots** | morning / forenoon / midday / evening / night — each maps to a distinct branch |
| **Lucky roll** | 12% chance per evolution to swerve onto an alternate branch |
| **Care system** | Neglect for 3 days straight and your pet dies |

---

## Concept

- 50 min focus + 10 min break = **1 fork** (one completed Pomodoro).
- Forks accumulate within the current stage; once enough are collected, the pet evolves.
- The branch is decided by which time slot you completed the most forks in during this stage.
- Personality nudges ties; a 12% lucky roll can still swerve the branch onto an alternate.
- The egg variant (1–11) decides the fresh lineage at hatch and overrides slot logic for the very first evolution.
- Miss a fork for **3 consecutive days** → R.I.P. → moved to the graveyard.

### Forks per stage

| Evolution | Forks required | Cumulative |
|---|---:|---:|
| egg → fresh | 1 | 1 |
| fresh → baby | 2 | 3 |
| baby → child | 4 | 7 |
| child → adult | 8 | 15 |
| adult → perfect | 16 | 31 |
| perfect → mega | 16 | **47** |

Reaching mega takes ~47 forks (about 39 hours of pure focus).

### Time slots

| Slot | Hours (local) |
|---|---|
| morning | 05:00 – 09:00 |
| forenoon | 09:00 – 12:00 |
| midday | 12:00 – 17:00 |
| evening | 17:00 – 21:00 |
| night | 21:00 – 05:00 |

### Personality bias (slot multipliers)

| Personality | Boosted slots |
|---|---|
| calm | none (neutral) |
| gentle | morning ×1.15, forenoon ×1.10 |
| holy | morning ×1.20, forenoon ×1.20 |
| mischief | midday ×1.15, evening ×1.15 |
| savage | evening ×1.10, night ×1.25 |

Ties are broken by deterministic seeded RNG (per `petId` + evolution index), so the same fork distribution always yields the same evolution.

---

## Quick start (development)

```bash
# from repo root
pnpm install
pnpm --filter @digimodoro/core build
pnpm --filter @digimodoro/app build
pnpm --filter @digimodoro/app dev    # launches Electron
```

Or in one shot:

```bash
pnpm dev
```

A transparent pet window covers the whole screen and a Botamon tray icon gives quick access. Right-click the pet for the full context menu (start / pause focus, language, size, status panel, reset, quit). First launch creates `~/.digimodoro/` and hatches a random egg.

---

## Status panel

Open via tray menu or pet right-click → "Show status". Includes:

- Mini pet sprite (still when egg) with stage + personality
- Pomodoro timer with primary action (start / pause / resume / ack-done) and secondary (abort / skip-break)
- **Stats**:
  - **Next evolution** — progress bar + `N/M` toward the next stage
  - Forks (this stage), Total forks
  - Streak miss days
  - **Days until R.I.P.** — yellow at 2 days, red bold at 1 day
  - Evolution history count
  - Slot chips (morning / forenoon / midday / evening / night)
- **Settings**: language (한국어 / EN), pet size, focus length, break length, per-event notification toggles
- **Evolution history** — chronological list with from/to sprite thumbnails and dominant slot
- **Graveyard** — list of past pets (R.I.P.'d or reset). Click a tombstone to expand the full evolution chain inline (egg → fresh → ... → final form) with sprites and slot labels per step.

---

## Building installers

```bash
pnpm package        # macOS .dmg (arm64 + x64) AND Windows .exe (NSIS)
```

Artifacts land in `release/`.

macOS builds are **ad-hoc unsigned** by default (set `mac.identity` in `packages/app/electron-builder.yml` to use a real Developer ID).
Building a Windows installer from macOS uses electron-builder's bundled wine — works for unsigned distribution; for code-signing run the same command from Windows.

---

## Repo layout

```
packages/
  core/   pure TypeScript domain — pomodoro state machine, evolution rules, reducer (no Electron)
  data/   digimon roster + evolution.json + sprite assets
  app/    Electron main / preload / renderer
```

---

## File locations (runtime)

| Path | Purpose |
|---|---|
| `~/.digimodoro/state.json` | Current pet state |
| `~/.digimodoro/sessions.jsonl` | Completed Pomodoro log |
| `~/.digimodoro/config.json` | User preferences |
| `~/.digimodoro/graveyard.jsonl` | Retired / dead pets |

---

## Sprites

Source GIFs live in `packages/data/sprites/_raw/` and are processed by `packages/data/scripts/copy-gif-sprites.mjs` into `packages/data/sprites/<digimonId>/idle.gif`. The script strips numeric variant suffixes (`Dinobeemon_2.gif` → `dinobeemon/idle.gif`) so canonical IDs match `evolution.json`. Requires ImageMagick (`magick`) on PATH.

---

## Tunables

Defaults live in `packages/core/src/types.ts`:

```ts
FOCUS_DURATION_SEC: 50 * 60   // 50 min
BREAK_DURATION_SEC: 10 * 60   // 10 min
LUCKY_ROLL_CHANCE:  0.12      // 12% swerve
STREAK_MISS_SOFT_DAYS: 1
STREAK_MISS_HARD_DAYS: 2
STREAK_MISS_RIP_DAYS:  3
```

Focus / break minutes are also user-configurable from the status panel and persisted in `config.json`.

---

## Tests

```bash
pnpm --filter @digimodoro/core test
```

59 tests across time-slot · pomodoro · xp · evolution · streak-miss · reducer.

---

## Credits

### Sprites

| Asset | Source |
|---|---|
| Digimon character animations *(Fresh → Mega)* | [With the Will — Digimon Sprite Animation Thread](https://withthewill.net/threads/digimon-sprite-animation-thread-read-first-post-fully-working.10472/) |
| Digi-Egg item icons *(11 variants)* | [*Digimon Digital Monsters: D-Project*](https://digimon.fandom.com/wiki/Digimon_Digital_Monsters:_D-Project) — Bandai Namco, Nintendo DS (2008) |

### Tools

- [Electron](https://www.electronjs.org/) — desktop runtime
- [ImageMagick](https://imagemagick.org/) — sprite processing
- [esbuild](https://esbuild.github.io/) — main / preload / renderer bundling
- [Vitest](https://vitest.dev/) — tests
- [pnpm](https://pnpm.io/) — workspace package manager

### Trademarks

*Digimon* and all related characters are trademarks of Bandai Namco Entertainment / Toei Animation. DigiModoro is a fan project and is **not affiliated with, endorsed by, or sponsored by** Bandai Namco or Toei.

### Takedown Notice

If you are a rights holder and have concerns about any asset referenced here, please open an [issue](../../issues) and the relevant content will be removed promptly.

---

## License

Code: **[MIT](./LICENSE)**.
