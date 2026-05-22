# DigiModoro

> Digimon-themed virtual pet powered by Pomodoro sessions. Windows + macOS desktop app.

한국어: [README.md](README.md)

---

## Download

| OS | |
|---|---|
| macOS (Apple Silicon) | [DigiModoro-mac-arm64.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-mac-arm64.dmg) |
| macOS (Intel) | [DigiModoro-mac-x64.dmg](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-mac-x64.dmg) |
| Windows | [DigiModoro-win-x64.exe](https://github.com/Hendrix1995/digimodoro/releases/latest/download/DigiModoro-win-x64.exe) |

**macOS**: open the `.dmg` → drag DigiModoro into `Applications` → launch from Launchpad. If a warning appears on first run, right-click → **Open**.
**Windows**: double-click the `.exe` → if a warning appears, **More info → Run anyway**.

---

## How to play

- Complete a 50-min focus + 10-min break → **1 fork**.
- Collect enough forks and your pet evolves.
- The time of day you collect forks (morning · forenoon · midday · evening · night) decides which path it grows down.
- Miss 3 days in a row and your pet dies.
- Right-click the pet for the menu, or open the status panel from the tray.

It takes ~47 forks (about 39 hours of focused work) to reach the final stage.

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

*Digimon* and related characters are trademarks of Bandai Namco Entertainment / Toei Animation. DigiModoro is a fan project and is **not affiliated with, endorsed by, or sponsored by** Bandai Namco or Toei.

### Takedown Notice

If you are a rights holder and have concerns about any asset referenced here, please open an [issue](../../issues) and the relevant content will be removed promptly.

### License

Code: [MIT](./LICENSE)
