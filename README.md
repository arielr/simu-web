# SIMU Web

A browser-based editor and simulator for electrical control circuits, compatible with
**CADe SIMU** `.cad` files (open, edit, simulate, save back).

## Run

```bash
npm install
npm run dev        # local dev server
npm test           # round-trip, terminal-position and simulation tests
npm run build      # static site in dist/
SINGLE=1 npx vite build   # one self-contained dist/index.html
```

Outside claude.ai, **File → Save file** writes a `.cad` file directly. Inside a claude.ai
artifact the host only allows certain extensions, so `.cad` is delivered inside a `.zip`
(see `src/platform/save.ts`).

## Layout

| Path | What it holds |
|---|---|
| `src/cad/format.ts` | CADe SIMU `.cad` reader/writer. Unknown records are kept and written back byte-for-byte. |
| `src/cad/catalog.json` | Names of all CADe SIMU part codes (279), read from the program's own command table. |
| `src/model/parts.ts` | Part definitions: terminals, contact paths, families (1–4 poles), actuators × contact forms. |
| `src/model/geometry.ts` | Terminal positions, rotation, wire network (union-find). |
| `src/sim/solve.ts` | Simulator: L1/L2/L3/N potentials, shorts, coils, timers (on/off/both delay), interlock. |
| `src/i18n/` | English/Hebrew UI strings and part descriptions. |
| `src/ui/` | `App.tsx` (editor) and `symbols.tsx` (IEC symbols, device panels). |
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
