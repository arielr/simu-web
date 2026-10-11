// @ts-nocheck
/**
 * Drawings for CADe SIMU records that are not circuit parts of the simulator: text notes, the
 * PC_SIMU push buttons, ladder contacts/coils and GRAFCET elements. They are kept in the file as
 * they are (raw records) and drawn here from their own fields, so projects using them read well.
 * Geometry is in CADe SIMU units (U px each) measured from projects made with CADe SIMU;
 * the drawings themselves are original.
 */
import type { ReactNode } from "react";
import { XI } from "../cad/format";

const U = 5; // px per CADe SIMU unit (grid G = 15 px = 3 units)
const ink = "currentColor";
const T = (x, y, s, size = 11, anchor = "start", weight = 400, fill = ink) =>
  <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill={fill} fontFamily="var(--f-mono)" stroke="none">{s}</text>;
const L = (x1, y1, x2, y2, w = 1.6, d = null) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={w} strokeDasharray={d} />;

/** codes drawn here */
export const RAW_DRAWN = new Set([8, 8023, 10050, 10051, 10052, 10053, 10060, 10061, 10062, 10100, 10101, 10102, 10103, 10104, 10105, 10106, 10107, 10108, 10111, 10112]);

/**
 * cad: the raw record; ox, oy: offset in px from the part's grid anchor to the record's exact position.
 * Returns the drawing and its box (x, y, w, h in px) for selection, or null when the code is not drawn here.
 */
export function rawSym(cad, ox = 0, oy = 0): { node: ReactNode; box: number[] } | null {
  const code = cad.code;
  if (!RAW_DRAWN.has(code)) return null;
  const n = cad.nums, xi = XI(cad), f = cad.text.split("#");
  const dx = (n[xi + 2] - n[xi]) * U, dy = (n[xi + 3] - n[xi + 1]) * U;
  const g = (node, box) => ({ node: <g transform={`translate(${ox},${oy})`}>{node}</g>, box: [box[0] + ox, box[1] + oy, box[2], box[3]] });
  const label = (f[0] || "").trim();
  switch (code) {
    case 8: { // text note: the text is in the record's trailing field
      const h = Math.max(12, dy || 15), s = (cad.trail || "").trim();
      return g(T(0, h * 0.85, s, Math.min(16, h * 0.85), "start", 500), [0, 0, Math.max(dx, s.length * 7), h]);
    }
    case 8023: { // push button on the PC_SIMU panel, linked to an input address
      return g(<>
        <circle cx={0} cy={0} r={11} fill="var(--sheet)" stroke={ink} strokeWidth={1.6} />
        <circle cx={0} cy={0} r={6} fill="color-mix(in srgb,var(--accent) 35%,var(--sheet))" stroke={ink} strokeWidth={1} />
        {T(-16, 4, label, 11, "end", 600)}</>, [-18 * U, -14, 18 * U + 14, 28]);
    }
    case 10050: case 10051: case 10052: case 10053: { // ladder contact NO / NC / positive edge / negative edge
      const w = 12 * U;
      return g(<>{L(0, 0, 4 * U, 0)}{L(4 * U, -3 * U, 4 * U, 3 * U)}{L(8 * U, -3 * U, 8 * U, 3 * U)}{L(8 * U, 0, w, 0)}
        {code === 10051 && L(3.2 * U, 3 * U, 8.8 * U, -3 * U)}
        {code === 10052 && T(6 * U, 4, "P", 11, "middle", 700)}{code === 10053 && T(6 * U, 4, "N", 11, "middle", 700)}
        {T(6 * U, -4.2 * U, label, 11, "middle", 600)}</>, [-4, -9 * U, w + 8, 12 * U]);
    }
    case 10060: case 10061: case 10062: { // ladder coil: assign ( ), set (S), reset (R)
      const w = 12 * U, cx = 6 * U;
      return g(<>{L(0, 0, 3.4 * U, 0)}{L(8.6 * U, 0, w, 0)}
        <path d={`M ${4.6 * U} ${-3 * U} A ${4 * U} ${4 * U} 0 0 0 ${4.6 * U} ${3 * U}`} fill="none" stroke={ink} strokeWidth={1.6} />
        <path d={`M ${7.4 * U} ${-3 * U} A ${4 * U} ${4 * U} 0 0 1 ${7.4 * U} ${3 * U}`} fill="none" stroke={ink} strokeWidth={1.6} />
        {code !== 10060 && T(cx, 4, code === 10061 ? "S" : "R", 11, "middle", 700)}
        {T(cx, -4.2 * U, label, 11, "middle", 600)}</>, [-4, -9 * U, w + 8, 12 * U]);
    }
    case 10100: case 10101: case 10111: { // GRAFCET stage (initial: double square, macro: bars)
      const s = 12 * U;
      return g(<>
        <rect x={-6 * U} y={0} width={s} height={s} fill="var(--sheet)" stroke={ink} strokeWidth={1.8} />
        {code === 10100 && <rect x={-5 * U} y={U} width={s - 2 * U} height={s - 2 * U} fill="none" stroke={ink} strokeWidth={1.2} />}
        {code === 10111 && <>{L(-6 * U, 1.5 * U, 6 * U, 1.5 * U, 1.2)}{L(-6 * U, s - 1.5 * U, 6 * U, s - 1.5 * U, 1.2)}</>}
        {T(0, s / 2 + 5, label, 13, "middle", 700)}</>, [-6 * U - 4, -4, s + 8, s + 8]);
    }
    case 10102: { // GRAFCET transition: the receptivity (condition) is the trailing field
      const cond = (cad.trail || "").trim();
      return g(<>{L(0, 0, 0, 6 * U)}{L(-3 * U, 3 * U, 3 * U, 3 * U, 2.6)}
        {label && T(-4 * U, 3 * U + 4, label, 10, "end", 400, "var(--muted)")}
        {T(4.5 * U, 3 * U + 4, cond, 11, "start", 600)}</>, [-6 * U, -4, 24 * U, 6 * U + 8]);
    }
    case 10103: { // GRAFCET action box next to a stage; field 6: 1 = set, 2 = reset
      const w = 18 * U, h = 6 * U, q = f[6] === "1" ? "S" : f[6] === "2" ? "R" : "";
      return g(<>{L(-3 * U, 0, 0, 0)}<rect x={0} y={-h / 2} width={w} height={h} fill="var(--sheet)" stroke={ink} strokeWidth={1.6} />
        {q && <>{L(4 * U, -h / 2, 4 * U, h / 2, 1.2)}{T(2 * U, 4, q, 10, "middle", 700)}</>}
        {T(q ? 11 * U : 9 * U, 4, label, 11, "middle", 600)}</>, [-3 * U, -h / 2 - 2, w + 3 * U + 2, h + 4]);
    }
    case 10106: // GRAFCET link line
      return g(<>{L(0, 0, dx, dy)}</>, [Math.min(0, dx) - 4, Math.min(0, dy) - 4, Math.abs(dx) + 8, Math.abs(dy) + 8]);
    case 10104: case 10105: case 10112: // simultaneous divergence / convergence: double line
      return g(<>{L(0, 0, dx, dy, 1.6)}{L(0, 1.4 * U, dx, dy + 1.4 * U, 1.6)}</>, [Math.min(0, dx) - 4, -4, Math.abs(dx) + 8, 1.4 * U + 8]);
    case 10107: case 10108: { // link arrow to / from another part of the GRAFCET
      const up = code === 10107;
      return g(<>{L(0, up ? -3 * U : 0, 0, up ? 0 : 3 * U)}
        <path d={up ? `M ${-1.5 * U} ${-1.6 * U} L 0 0 L ${1.5 * U} ${-1.6 * U}` : `M ${-1.5 * U} ${1.4 * U} L 0 ${3 * U} L ${1.5 * U} ${1.4 * U}`} fill="none" stroke={ink} strokeWidth={1.6} />
        {T(2 * U, up ? -U : 2.6 * U, label, 10, "start", 600)}</>, [-2 * U, -3 * U - 2, 8 * U, 6 * U + 4]);
    }
  }
  return null;
}
