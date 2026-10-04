/**
 * Draws FluidSIM symbols from the SYM primitives stored in .ct files.
 * Primitive lines (units 1/1024 mm, relative to the part's top-left corner):
 *   1 x1 y1 x2 y2                     line
 *   2 x1 y1 x2 y2 a b style           dashed line (pilot / drain lines)
 *   3 cx cy r color flag              circle
 *   4 cx cy r a0 a1 ...               arc, angles in 1/1000 degree, counter-clockwise
 *   5 x1 y1 x2 y2 x3 y3 x4 y4 flag    filled polygon (arrow heads)
 *   7 x y size ... text               text
 * Parts whose drawing FluidSIM generates in code (no SYM in the file) use the
 * small original drawings in BUILTIN, or a labelled box.
 */
import type { ReactNode } from "react";
import type { FluidPart } from "./catalog";

export const STROKE = 330;

function prim(line: string, i: number): ReactNode {
  const s = line.split(" ");
  const n = s.map(Number);
  switch (s[0]) {
    case "1":
      return <line key={i} x1={n[1]} y1={n[2]} x2={n[3]} y2={n[4]} />;
    case "2":
      return <line key={i} x1={n[1]} y1={n[2]} x2={n[3]} y2={n[4]} strokeDasharray="1600 1000" />;
    case "3":
      return <circle key={i} cx={n[1]} cy={n[2]} r={n[3]} fill="none" />;
    case "4": {
      const [cx, cy, r] = [n[1], n[2], n[3]];
      let a0 = n[4] / 1000, a1 = n[5] / 1000;
      if (a1 <= a0) a1 += 360;
      const p = (a: number) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      const large = a1 - a0 > 180 ? 1 : 0;
      if (a1 - a0 >= 359.9) return <circle key={i} cx={cx} cy={cy} r={r} fill="none" />;
      return <path key={i} d={`M${x0} ${y0}A${r} ${r} 0 ${large} 0 ${x1} ${y1}`} fill="none" />;
    }
    case "5":
      return <polygon key={i} points={`${n[1]},${n[2]} ${n[3]},${n[4]} ${n[5]},${n[6]} ${n[7]},${n[8]}`} fill="currentColor" stroke="none" />;
    case "7": {
      const text = s.slice(8).join(" ");
      if (!text) return null;
      return <text key={i} x={n[1]} y={n[2]} fontSize={n[3] * 300} stroke="none" fill="currentColor" textAnchor="middle" dominantBaseline="middle">{text}</text>;
    }
  }
  return null;
}

/* ---- original drawings for parts FluidSIM draws in code ---- */
const L = (x1: number, y1: number, x2: number, y2: number, k: string, dash?: boolean) =>
  <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray={dash ? "1600 1000" : undefined} />;
const Tri = (pts: number[], k: string) => <polygon key={k} points={pts.join(",")} fill="currentColor" stroke="none" />;
const spring = (x: number, y0: number, y1: number, k: string) => {
  const n = 6, h = (y1 - y0) / n, pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${x + (i % 2 ? 1800 : -1800)},${y0 + i * h}`);
  return <polyline key={k} points={pts.join(" ")} fill="none" />;
};
const springH = (y: number, x0: number, x1: number, k: string) => {
  const n = 6, w = (x1 - x0) / n, pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${x0 + i * w},${y + (i % 2 ? 1800 : -1800)}`);
  return <polyline key={k} points={pts.join(" ")} fill="none" />;
};
/** ball-and-seat check symbol, flow allowed from bottom to top */
const check = (cx: number, cy: number, k: string) => [
  <circle key={k + "b"} cx={cx} cy={cy + 1200} r={2000} fill="none" />,
  L(cx - 3000, cy - 2400, cx, cy + 1200 - 2000 * 0.2, k + "s1"), L(cx + 3000, cy - 2400, cx, cy + 1200 - 2000 * 0.2, k + "s2"),
];
const throttle = (cx: number, y0: number, y1: number, k: string) => {
  const m = (y0 + y1) / 2, h = (y1 - y0) / 2;
  return [<path key={k + "a"} d={`M${cx - 2000} ${y0} Q${cx + 600} ${m} ${cx - 2000} ${y1}`} fill="none" />,
    <path key={k + "b"} d={`M${cx + 2000} ${y0} Q${cx - 600} ${m} ${cx + 2000} ${y1}`} fill="none" />, h && null];
};
const reliefBody = (w: number, h: number, px: number, k: string, open = false) => {
  const top = 6144, bot = h - 6144, bx0 = px - 7168, bx1 = px + 7168;
  return [
    <rect key={k + "r"} x={bx0} y={top} width={bx1 - bx0} height={bot - top} fill="none" />,
    L(px, 0, px, top, k + "p1"), L(px, bot, px, h, k + "p2"),
    open ? L(px, top + 1500, px, bot - 1500, k + "a") : L(px + 2500, top + 1500, px + 2500, bot - 1500, k + "a"),
    Tri(open ? [px - 1200, bot - 3700, px + 1200, bot - 3700, px, bot - 1500] : [px + 1300, bot - 3700, px + 3700, bot - 3700, px + 2500, bot - 1500], k + "t"),
    springH((top + bot) / 2, bx1, Math.min(w, bx1 + 12000), k + "s"),
    L(px, top + 2000, bx0 - 3000, top + 2000, k + "d1", true), L(bx0 - 3000, top + 2000, bx0 - 3000, (top + bot) / 2, k + "d2", true),
    L(bx0 - 3000, (top + bot) / 2, bx0, (top + bot) / 2, k + "d3", true),
  ];
};

const motorSym = (h: number, cx: number) => {
  const r = Math.min(11000, h / 2 - 3000), cy = h / 2;
  return [<circle key="c" cx={cx} cy={cy} r={r} fill="none" />, L(cx, 0, cx, cy - r, "p1"), L(cx, cy + r, cx, h, "p2"),
    Tri([cx - 2600, cy - r + 4400, cx + 2600, cy - r + 4400, cx, cy - r + 300], "t"),
    <path key="rot" d={`M${cx + r + 3000} ${cy + 6000}A${r + 4000} ${r + 4000} 0 0 0 ${cx + r + 3000} ${cy - 6000}`} fill="none" />];
};

const BUILTIN: Record<string, (w: number, h: number) => ReactNode[]> = {
  tank1: (w, h) => [<polyline key="t" points={`${w / 2 - 6500},${h * 0.4} ${w / 2 - 6500},${h - 500} ${w / 2 + 6500},${h - 500} ${w / 2 + 6500},${h * 0.4}`} fill="none" />,
    L(w / 2, 0, w / 2, h - 3500, "p")],
  Ag1: (w, h) => [<circle key="c" cx={w / 2} cy={6000} r={4600} fill="none" />, Tri([w / 2 - 2000, 7800, w / 2 + 2000, 7800, w / 2, 1700], "t"),
    <polyline key="k" points={`${w / 2 - 6500},${h - 3000} ${w / 2 - 6500},${h} ${w / 2 + 6500},${h} ${w / 2 + 6500},${h - 3000}`} fill="none" />,
    L(w / 2, 10600, w / 2, h - 1200, "s")],
  srv: (w, h) => [<rect key="r" x={w / 2 - 9000} y={9000} width={18000} height={h - 18000} fill="none" />, L(w / 2, 0, w / 2, h, "p"),
    ...throttle(w / 2, h / 2 - 6000, h / 2 + 6000, "t"), L(w / 2 - 6000, h / 2 + 8000, w / 2 + 6000, h / 2 - 8000, "a"),
    Tri([w / 2 + 6600, h / 2 - 8800, w / 2 + 3700, h / 2 - 7800, w / 2 + 5800, h / 2 - 5600], "ah")],
  duflu: (w, h) => motorSym(h, 12287),
  PPE1: (w, h) => [<circle key="c" cx={w / 2} cy={h / 2 + 1000} r={Math.min(w, h) / 2 - 1200} fill="none" />,
    Tri([w / 2 - 2200, h / 2 + 2600, w / 2 + 2200, h / 2 + 2600, w / 2, h / 2 - 1400], "t"), L(w / 2, 0, w / 2, 1800, "p")],
  man1: (w, h) => {
    const r = Math.min(w / 2, (h - 6144) / 2) - 300, cy = r + 300;
    return [<circle key="c" cx={w / 2} cy={cy} r={r} fill="none" />, L(w / 2, cy + r, w / 2, h, "p"),
      L(w / 2 - r * 0.6, cy + r * 0.6, w / 2 + r * 0.55, cy - r * 0.55, "n"), Tri([w / 2 + r * 0.7, cy - r * 0.7, w / 2 + r * 0.15, cy - r * 0.45, w / 2 + r * 0.45, cy - r * 0.15], "a")];
  },
  dbv: (w, h) => reliefBody(w, h, 18431, "d"),
  drv: (w, h) => [...reliefBody(w, h, 18431, "d", true), L(24575, h - 6144, 24575, h, "t1"), L(18431, h - 9000, 24575, h - 9000, "t2", true)],
  DRV2: (w, h) => [...reliefBody(w, h, 18432, "d", true), L(30720, h - 6144, 30720, h, "t1"), L(18432, h - 9000, 30720, h - 9000, "t2", true)],
  V16: (w, h) => [...reliefBody(w, h, 18431, "d"), L(0, 18432, 11263, 18432, "x", true)],
  drossel: (w, h) => [L(w / 2, 0, w / 2, h, "p"), ...throttle(w / 2, h / 2 - 7000, h / 2 + 7000, "t"),
    L(w / 2 - 5000, h / 2 + 6000, w / 2 + 5000, h / 2 - 6000, "a"), Tri([w / 2 + 5600, h / 2 - 6800, w / 2 + 3000, h / 2 - 6200, w / 2 + 4800, h / 2 - 4300], "ah")],
  absperr: (w, h) => [L(w / 2, 0, w / 2, h / 2 - 4000, "p1"), L(w / 2, h / 2 + 4000, w / 2, h, "p2"),
    <polygon key="b" points={`${w / 2 - 4000},${h / 2 - 4000} ${w / 2 + 4000},${h / 2 - 4000} ${w / 2 - 4000},${h / 2 + 4000} ${w / 2 + 4000},${h / 2 + 4000}`} fill="none" />],
  rsvfed: (w, h) => [L(w / 2, 0, w / 2, h / 2 - 3000, "p1"), L(w / 2, h / 2 + 3500, w / 2, h, "p2"), ...check(w / 2, h / 2, "c")],
  drorueck: (w, h) => {
    const x = w / 3, x2 = w * 0.78, y0 = 10000, y1 = h - 10000;
    return [L(x, 0, x, h, "p"), ...throttle(x, h / 2 - 6000, h / 2 + 6000, "t"), L(x, y0, x2, y0, "b1"), L(x, y1, x2, y1, "b2"),
      L(x2, y0, x2, h / 2 - 3000, "b3"), L(x2, h / 2 + 3500, x2, y1, "b4"), ...check(x2, h / 2, "c"),
      L(x - 5000, h / 2 + 6000, x + 5000, h / 2 - 6000, "a")];
  },
  DRSV2: (w, h) => {
    const y = 36864, y2 = 20000;
    return [L(0, y, w, y, "p"), L(12000, y, 12000, y2, "b1"), L(w - 12000, y, w - 12000, y2, "b2"), L(12000, y2, w / 2 - 3000, y2, "b3"), L(w / 2 + 3500, y2, w - 12000, y2, "b4"),
      <g key="c" transform={`rotate(-90 ${w / 2} ${y2})`}>{check(w / 2, y2, "c")}</g>,
      <g key="t" transform={`rotate(90 ${w / 2} ${y})`}>{throttle(w / 2, y - 6000, y + 6000, "t")}</g>];
  },
  motor: (w, h) => motorSym(h, 12287),
  SemiRotaryMotorH: (w, h) => [L(6144, h - 3072, 6144, h, "p1"), L(24576, h - 3072, 24576, h, "p2"), L(6144, h - 3072, 24576, h - 3072, "b"),
    <path key="a" d={`M${w / 2 - 11000} ${h - 3072}A11000 11000 0 0 1 ${w / 2 + 11000} ${h - 3072}`} fill="none" />,
    <path key="r" d={`M${w / 2 - 6000} ${h - 15000}A9000 9000 0 0 1 ${w / 2 + 6000} ${h - 15000}`} fill="none" />],
};

/** pistons and rods: FluidSIM draws them in code so they can move. ext: 0 = retracted, 1 = extended */
export function cylinderParts(part: FluidPart, ext = 0): ReactNode[] | null {
  if (!/^(Cyl(?!DGPP)|Zylinder)/.test(part.cls) || !part.sym.length) return null;
  const [w] = part.size;
  const hs = part.sym.map((l) => l.split(" ").map(Number)).filter((n) => n[0] === 1 && n[2] === n[4]).map((n) => n[2]);
  const top = Math.min(...hs), bot = Math.max(...hs.filter((y) => y < part.size[1]));
  if (!(bot > top)) return null;
  const mid = (top + bot) / 2, x0 = w * 0.08, x1 = w * 0.8, px = x0 + (x1 - x0) * ext, rodEnd = px + w * 0.92;
  return [<rect key="pi" x={px - 900} y={top + 600} width={1800} height={bot - top - 1200} fill="currentColor" stroke="none" />,
    <line key="rod" x1={px} y1={mid} x2={rodEnd} y2={mid} strokeWidth={STROKE * 2.2} />,
    ...(part.cls.startsWith("Zylinder") ? [springH(mid, 1200, px - 1200, "sp")] : [])];
}

/** builtin drawings made for a vertical part; FluidSIM stores these classes horizontally */
const VERTICAL = new Set(["drossel", "absperr", "drorueck", "srv", "rsvfed", "SemiRotaryMotorH"]);

export function hasBuiltin(cls: string) { return !!BUILTIN[cls]; }

/** the symbol of a part, unrotated, in its own coordinates */
export function FluidSymbol({ part, label, ext = 0 }: { part: FluidPart; label?: string; ext?: number }) {
  const [w, h] = part.size;
  const b = BUILTIN[part.cls];
  let body: ReactNode;
  const own = part.sym.length > 0;
  if (own) body = [...part.sym.map(prim), ...(cylinderParts(part, ext) || [])];
  else if (b && VERTICAL.has(part.cls) && w > h) body = <g transform={`translate(0,${h}) rotate(-90)`}>{b(h, w)}</g>;
  else if (b) body = b(w, h);
  else body = [<rect key="r" x={0} y={0} width={w} height={h} fill="none" strokeDasharray="1200 900" />,
    <text key="t" x={w / 2} y={h / 2} fontSize={Math.min(4200, (w / Math.max(4, (label || part.cls).length)) * 1.6)} stroke="none" fill="currentColor" textAnchor="middle" dominantBaseline="middle">{label || part.cls}</text>];
  return <g stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">{body}</g>;
}
