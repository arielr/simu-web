# SIMU Web

Three circuit programs in the browser, sharing one code base:

| Page | Program | Files |
|---|---|---|
| `/` | launch screen | |
| `/electrical/` | electrical control circuits: edit + simulate | CADe SIMU `.cad` |
| `/pneumatic/` | pneumatic circuits: edit + simulate | FluidSIM P `.ct` |
| `/hydraulic/` | hydraulic circuits: edit + simulate | FluidSIM H `.ct` |

For the user they are separate programs (own page, own library, own saved drawing);
only the language setting is shared.

## Run

```bash
npm install
npm run dev        # local dev server
npm test           # round-trip, terminal-position and simulation tests
npm run build      # static multi-page site in dist/ (what GitHub Pages serves)
npm run build:single      # everything in one file: dist-single/single.html (#electrical, #pneumatic, #hydraulic)
```

## Publish on GitHub Pages

1. Create a repository on GitHub and push this folder to its `main` branch.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/pages.yml`: install, tests, build, deploy.
   The site appears at `https://<user>.github.io/<repo>/`.

A GitHub Pages site is public even when the repository is private.

Outside claude.ai, **File → Save file** writes a `.cad` file directly. Inside a claude.ai
artifact the host only allows certain extensions, so `.cad` is delivered inside a `.zip`
(see `src/platform/save.ts`).

## Layout

| Path | What it holds |
|---|---|
| `src/shared/` | Shared by all programs: page frame, top bar pieces, parts drawer, dialog (`ui.tsx`), hooks for language, undo, autosave, saving files, shortcuts (`hooks.ts`), common strings (`i18n.ts`). |
| `src/entries/`, `*/index.html` | One entry per page of the multi-page site. `src/main.tsx` + `src/ui/Shell.tsx` serve the single-file build. |
| `src/ui/Launcher.tsx` | Launch screen. |
| `src/fluid/` | Pneumatic/hydraulic program: `.ct` reader (`ctFormat.ts`), import into the editor (`ctImport.ts`), part catalog, symbol renderer, editor (`FluidApp.tsx`). |
| `src/cad/format.ts` | CADe SIMU `.cad` reader/writer. Unknown records are kept and written back byte-for-byte. |
| `src/cad/catalog.json` | Names of all CADe SIMU part codes (279), read from the program's own command table. |
| `src/model/parts.ts` | Part definitions: terminals, contact paths, families (1–4 poles), actuators × contact forms. |
| `src/model/geometry.ts` | Terminal positions, rotation, wire network (union-find). |
| `src/sim/solve.ts` | Simulator: L1/L2/L3/N potentials, shorts, coils, timers (on/off/both delay), interlock. |
| `src/i18n/` | English/Hebrew UI strings and part descriptions. |
| `src/ui/` | `App.tsx` (electrical program) and `symbols.tsx` (IEC symbols, device panels). |
| `src/platform/save.ts` | How files are saved (browser download vs. claude.ai artifact). |
| `src/examples/files/` | Sample and test `.cad` files made in CADe SIMU. |
| `tests/` | Vitest suites. |

## CADe SIMU file format (what is known)

- Text file, Windows-1252, no line breaks: `CADe_SIMU` + records + footer starting at `$$$`.
- Record: `*<id>*<code>#<text fields '#'-separated>*<integers '*'-separated>#<optional trailing text>`.
- The last 15 integers are `x, y, x2, y2, labelBox×4, ?, rotation, ?, ?, ?, net, ?`. 3 units = 1 grid step.
- `rotation` counts quarter turns; value 3 maps a part's downward terminal to the right (verified).
- The header record (code 20000) may come first or last; record order is preserved on save.

### Verified against CADe SIMU with real wiring

Supplies (3003, 3007), MCB 2P (6002), RCD 1P+N (6005), fuse disconnector 3P (5008),
contactor 3P (2001) and coil (9000), NO/NC/NC+NO/changeover contacts (7000–7007),
push buttons (8000, 8001, 8004), lamp (9008), motors (1000, 1002), battery (3019), rotation 3.
A drawing built from scratch in SIMU Web opens and simulates in CADe SIMU.

## Migration note

Versions up to v6 were a single HTML file using `htm`. `tools/migrate.py` converted it to
TSX modules mechanically; most modules still start with `// @ts-nocheck` and are typed
gradually.

## Pneumatic / hydraulic simulation (`src/fluid/sim.ts`)

- **Valves** are read from their own drawing: one box per switching position, the box
  under the ports is the current one; the flow lines inside each box give the port
  connections of that position. Works for any FluidSIM valve configuration.
- **Actuation and springs** come from the valve properties (`ACTUATION_*`, `SPRING_*`,
  `POS`, `POS_RESET`): pilot ports follow pressure, solenoids toggle on click, push buttons
  and rollers act while held (Shift+click latches), valves without springs keep their position.
- **Network**: tubes and open valve paths form nets; a net is under pressure when it reaches
  a supply (air source, compressor, pump) and is not vented (exhaust ports 3/5/R, tank).
- **Cylinders** extend/retract when one chamber is under pressure and the other vented.
- Not modelled yet: flow rates and pressures in bar, throttles (pass through), check-valve
  direction, roller valves actuated by the cylinder, electrical parts inside fluid circuits.
