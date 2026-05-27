# DigiModoro

> Digimon-themed virtual pet powered by Pomodoro sessions. Windows desktop app.

한국어: [README.md](README.md)

---

## Download

| OS | |
|---|---|
| Windows | [DigiModoro_0.4.0_x64-setup.exe](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro_0.4.0_x64-setup.exe) |
| macOS (Intel · Apple Silicon universal) | [DigiModoro_0.4.0_universal.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro_0.4.0_universal.dmg) |

**Windows**: double-click the `.exe` → if a warning appears, **More info → Run anyway**.

**macOS**: double-click the `.dmg` → drag `DigiModoro.app` to **Applications**. On first launch, if "unidentified developer" appears, **right-click the app in Applications → Open → Open again**. (Only needed once.)

---

## How to play

- Complete a 50-min focus + 10-min break → **1 fork**.
- Collect enough forks and your pet evolves.
- The time of day you collect forks (morning · forenoon · midday · evening · night) decides which path it grows down.
- Miss 3 days in a row and your pet dies.
- Right-click the pet for the menu, or open the status panel from the tray.

It takes ~47 forks (about 39 hours of focused work) to reach the final stage.

## Box (v0.3.0+)

Park your favorite digimon in the box and pull them out later. A pet in the box **does not grow and cannot die** — when you take it out it resumes exactly where it left off.

- Box capacity: **5 slots**
- **Save**: click an empty slot in the control panel → the active pet is parked, a new egg starts. The "Open box" shortcut button appears on the evolution bubble.
- **Take out**: click a saved pet → "Take out" → the active pet auto-moves into the empty slot.
- **Delete**: permanently removes a pet from the box.
- **Blocked when**: the active pet is an egg / has R.I.P. / a Pomodoro is in progress / the box is full.

---

## Credits

### Sprites

| Asset | Source |
|---|---|
| Digimon character animations *(Fresh → Mega)* | [With the Will — Digimon Sprite Animation Thread](https://withthewill.net/threads/digimon-sprite-animation-thread-read-first-post-fully-working.10472/) |
| Digi-Egg item icons *(11 variants)* | [*Digimon Digital Monsters: D-Project*](https://digimon.fandom.com/wiki/Digimon_Digital_Monsters:_D-Project) — Bandai Namco, Nintendo DS (2008) |

### Tools

- [Tauri v2](https://v2.tauri.app/) — desktop runtime
- [Vite](https://vitejs.dev/) — frontend build
- [ImageMagick](https://imagemagick.org/) — sprite processing
- [Vitest](https://vitest.dev/) — tests
- [pnpm](https://pnpm.io/) — workspace package manager

### Trademarks

*Digimon* and related characters are trademarks of Bandai Namco Entertainment / Toei Animation. DigiModoro is a fan project and is **not affiliated with, endorsed by, or sponsored by** Bandai Namco or Toei.

### Takedown Notice

If you are a rights holder and have concerns about any asset referenced here, please open an [issue](../../issues) and the relevant content will be removed promptly.

### License

Code: [MIT](./LICENSE)
