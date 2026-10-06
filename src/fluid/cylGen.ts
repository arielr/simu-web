/**
 * Cylinder configurator (like FluidSIM's "Configure cylinder" dialog).
 * A CylConfig becomes a complete part: ports, FluidSIM-style properties and a
 * drawing in the SYM primitive format. The moving parts (piston, rod, carriage,
 * spring, marks) are produced by cylOverlay() for the current extension.
 * Physical parameters for the simulation are read back from the properties by
 * physOf(), so cylinders loaded from .ct files simulate with their own values too.
 * All drawings are generated here; nothing is copied from FluidSIM.
 */
import type { FluidPart, FluidPort } from "./catalog";

export type RodType = "one" | "two" | "none";
export type CylType = "sa-ext" | "sa-ret" | "da";
export interface CylMark { label: string; start: number; end: number }
export interface CylConfig {
  name: string;
  rod: RodType; through: boolean; magnetic: boolean; slide: boolean;
  /** sa-ext: air extends (port on the cap side); sa-ret: air retracts; da: double acting */
  type: CylType;
  /** return spring of a single-acting cylinder */
  spring: boolean;
  damping: boolean; dampAdj: boolean;
  detect: boolean; detectMark: string;
  mirrorH: boolean; mirrorV: boolean;
  /** mm */ stroke: number; pos: number; dPiston: number; dRod: number;
  /** degrees, 0 = horizontal, 90 = rod pointing up */ angle: number;
  /** l/(min·MPa) */ leak: number;
  showV: boolean; showF: boolean;
  /** kg */ mass: number;
  /** 0 = entered by hand, otherwise index into MATERIALS + 1 */ friction: number;
  muS: number; muD: number;
  constForce: boolean;
  /** N, positive = against extension */ force: number;
  /** variable force: [piston position mm, force N] */ profile: [number, number][];
  marks: CylMark[];
}

/** approximate static / dynamic friction coefficients (dry) */
export const MATERIALS: { en: string; he: string; s: number; d: number }[] = [
  { en: "Steel on steel", he: "פלדה על פלדה", s: 0.74, d: 0.57 },
  { en: "Cast iron on cast iron", he: "יציקה על יציקה", s: 1.1, d: 0.15 },
  { en: "Wood on wood", he: "עץ על עץ", s: 0.5, d: 0.3 },
  { en: "Steel on wood", he: "פלדה על עץ", s: 0.5, d: 0.4 },
  { en: "Steel on ice", he: "פלדה על קרח", s: 0.03, d: 0.02 },
  { en: "Tyre on asphalt", he: "צמיג על אספלט", s: 0.9, d: 0.8 },
];
export const MAX_MARKS = 6;

export function defaultCyl(hyd = false): CylConfig {
  return {
    name: "", rod: "one", through: false, magnetic: false, slide: false, type: "da", spring: true,
    damping: false, dampAdj: false, detect: false, detectMark: "", mirrorH: false, mirrorV: false,
    stroke: hyd ? 200 : 100, pos: 0, dPiston: hyd ? 16 : 20, dRod: hyd ? 10 : 8, angle: 0, leak: 0, showV: false, showF: false,
    mass: 0, friction: 0, muS: 0, muD: 0, constForce: true, force: 0, profile: [[0, 0], [hyd ? 200 : 100, 0]], marks: [],
  };
}

/** piston and annular areas in cm² */
export function areas(c: Pick<CylConfig, "dPiston" | "dRod" | "rod">) {
  const ak = (Math.PI * (c.dPiston / 10) ** 2) / 4;
  const rods = c.rod === "none" ? 0 : c.rod === "two" ? 2 : 1;
  const ar = Math.max(0, ak - (rods * Math.PI * (c.dRod / 10) ** 2) / 4);
  return { ak, ar: c.rod === "none" ? ak : ar };
}

/* ---- geometry (1024 units = 1 mm) ---- */
const W = 57344, BH = 24576, H = 32768, MIDY = 12288;
const PA = 4096, PB = W - 4096; // port x: cap side, rod side
const X0 = Math.round(W * 0.08), X1 = Math.round(W * 0.8);
const ROD_OUT = W - X0 + 5120; // rod length: sticks out 5 mm at rest
const r = Math.round;
const ln = (x1: number, y1: number, x2: number, y2: number) => `1 ${r(x1)} ${r(y1)} ${r(x2)} ${r(y2)}`;
const dash = (x1: number, y1: number, x2: number, y2: number) => `2 ${r(x1)} ${r(y1)} ${r(x2)} ${r(y2)} 0 0 3`;
const fill = (x1: number, y1: number, x2: number, y2: number) => `5 ${r(x1)} ${r(y1)} ${r(x2)} ${r(y1)} ${r(x2)} ${r(y2)} ${r(x1)} ${r(y2)} 0`;
const text = (x: number, y: number, t: string) => `7 ${r(x)} ${r(y)} 10 0 0 0 0 ${t}`;
const rodYs = (rod: RodType) => (rod === "two" ? [7168, 17408] : rod === "one" ? [MIDY] : []);

/** mirror mapping of a primitive line (x/y pairs; circles and text keep their size) */
function mirror(prims: string[], mh: boolean, mv: boolean, w = W, h = H): string[] {
  if (!mh && !mv) return prims;
  const X = (v: number) => (mh ? w - v : v), Y = (v: number) => (mv ? h - v : v);
  return prims.map((p) => {
    const s = p.split(" "), n = s.map(Number);
    if (s[0] === "1" || s[0] === "2") return [s[0], X(n[1]), Y(n[2]), X(n[3]), Y(n[4]), ...s.slice(5)].join(" ");
    if (s[0] === "5") return ["5", X(n[1]), Y(n[2]), X(n[3]), Y(n[4]), X(n[5]), Y(n[6]), X(n[7]), Y(n[8]), s[9]].join(" ");
    if (s[0] === "7") return ["7", X(n[1]), Y(n[2]), ...s.slice(3)].join(" ");
    return p;
  });
}

function arrow(x1: number, y1: number, x2: number, y2: number): string[] {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const bx = x2 - ux * 3000, by = y2 - uy * 3000, px = -uy * 1100, py = ux * 1100;
  return [ln(x1, y1, x2, y2), `5 ${r(x2)} ${r(y2)} ${r(bx + px)} ${r(by + py)} ${r(bx - px)} ${r(by - py)} ${r(bx - px)} ${r(by - py)} 0`];
}

function body(c: CylConfig): string[] {
  const out = [ln(0, 0, W, 0), ln(0, BH, W, BH)];
  const wall = (x: number, holes: number[]) => {
    let y = 0;
    for (const hy of holes) { out.push(ln(x, y, x, hy - 2048)); y = hy + 2048; }
    out.push(ln(x, y, x, BH));
  };
  const ys = rodYs(c.rod);
  wall(W, ys);
  wall(0, c.through && c.rod !== "none" ? ys : []);
  const ports = portXs(c);
  for (const x of ports) out.push(ln(x, BH, x, H));
  if (c.damping && c.dampAdj) out.push(...arrow(X0 - 3000, BH - 1500, X0 + 3000, 3000), ...arrow(X1 + 2000, BH - 1500, X1 + 8000, 3000));
  return out;
}

const portXs = (c: CylConfig) => (c.type === "da" ? [PA, PB] : c.type === "sa-ext" ? [PA] : [PB]);
const springSide = (c: CylConfig): "L" | "R" | null => (c.type === "da" || !c.spring ? null : c.type === "sa-ext" ? "R" : "L");

/** build the part for a configuration */
export function buildCyl(cfg: CylConfig, hydraulic: boolean): FluidPart {
  const kind = hydraulic ? "HConnection" : "PConnection";
  const mh = cfg.mirrorH, mv = cfg.mirrorV;
  const ports: FluidPort[] = portXs(cfg).map((x) => ({ kind, x: mh ? W - x : x, y: mv ? 0 : H, label: "", ex: "EX0" }));
  const { ak, ar } = areas(cfg);
  const sp = springSide(cfg);
  const piston = cfg.rod === "none" ? (cfg.slide ? "CP_0CAS" : "CP_0C") : cfg.rod === "two" ? (cfg.through ? "CP_2D" : "CP_2") : cfg.through ? "CP_DCA" : "CP";
  const T = (b: boolean) => (b ? "T" : "F");
  const props: Record<string, string> = {
    GEN: "cyl", description: cfg.name, piston,
    HUB: String(cfg.stroke), S: String(cfg.pos), S_RESET: String(cfg.pos),
    A_K: ak.toFixed(5), A_R: ar.toFixed(5), D_K: String(cfg.dPiston), D_R: String(cfg.dRod),
    ALPHA: String(cfg.angle), GLEAK: String(cfg.leak), MASS: String(cfg.mass),
    FRICTION_SEL: String(cfg.friction), FRICTION: String(cfg.muS), FRICTION_BA: String(cfg.muD),
    CONSTANT_FORCE: T(cfg.constForce), F: String(cfg.force),
    FORCE_PROFILE: cfg.profile.map(([x, f]) => `${Math.round(x * 100)} ${f};`).join(""),
    PISTON_COUNT: cfg.rod === "none" ? "0" : cfg.rod === "two" ? "2" : "1",
    PISTON_R: T(cfg.rod !== "none"), PISTON_L: T(cfg.rod !== "none" && cfg.through), SLEDGE: T(cfg.rod === "none" && cfg.slide),
    SPRING_L: T(sp === "L"), SPRING_R: T(sp === "R"),
    DAMPING_L: T(cfg.damping), DAMPING_R: T(cfg.damping), DAMPING_ADJ_L: T(cfg.damping && cfg.dampAdj), DAMPING_ADJ_R: T(cfg.damping && cfg.dampAdj),
    DETECT: T(cfg.detect), DETECT_MARK: cfg.detectMark, MIRROR_H: T(mh), MIRROR_V: T(mv),
    SHOW_V: T(cfg.showV), SHOW_F: T(cfg.showF),
  };
  cfg.marks.forEach((m, i) => { props[`MARK${i}`] = m.label; props[`MARK_S${i}`] = String(m.start); props[`MARK_E${i}`] = String(m.end); });
  return {
    cls: hydraulic ? "CylGenH" : "CylGen", config: "gen:" + JSON.stringify(cfg), programs: [], domain: hydraulic ? "hyd" : "pneu", files: [],
    description: cfg.name, model: "", size: [W, H], ports, sym: mirror(body(cfg), mh, mv), props, fields: {},
  };
}

const truthy = (v?: string) => v === "T" || v === "TRUE" || v === "1";
const num = (v: string | undefined, d: number) => { const n = parseFloat(v ?? ""); return Number.isFinite(n) ? n : d; };

/** best-effort reading of any cylinder (generated, from a file or the library) into a configuration */
export function cylConfigOf(part: FluidPart): CylConfig {
  if (part.config.startsWith("gen:")) { try { return { ...defaultCyl(), ...JSON.parse(part.config.slice(4)) }; } catch { /* fall through */ } }
  const p = part.props, d = defaultCyl(part.domain.startsWith("hyd"));
  const fl = part.ports.filter((q) => q.kind === "PConnection" || q.kind === "HConnection");
  const count = p.PISTON_COUNT ?? (/^CylDGPP/.test(part.cls) ? "0" : "1");
  const rod: RodType = count === "0" || /^CP_0/.test(p.piston || "") ? "none" : count === "2" ? "two" : "one";
  const type: CylType = fl.length === 1 ? (fl[0].x < part.size[0] / 2 ? "sa-ext" : "sa-ret") : "da";
  const ak = num(p.A_K, areas(d).ak), arr = num(p.A_R, areas(d).ar);
  const dPiston = Math.round(10 * Math.sqrt((4 * ak) / Math.PI) * 10) / 10;
  const rods = rod === "two" ? 2 : 1;
  const dRod = rod === "none" ? 0 : Math.round(10 * Math.sqrt(Math.max(0, (4 * (ak - arr)) / (Math.PI * rods))) * 10) / 10;
  const stroke = num(p.HUB, d.stroke);
  const profile = (p.FORCE_PROFILE || "").split(";").map((s) => s.trim().split(/\s+/).map(Number)).filter((a) => a.length === 2 && a.every(Number.isFinite))
    .map(([x, f]) => [Math.min(stroke, x / 100), f] as [number, number]);
  const marks: CylMark[] = [];
  for (let i = 0; `MARK${i}` in p; i++) marks.push({ label: p[`MARK${i}`], start: num(p[`MARK_S${i}`], 0), end: num(p[`MARK_E${i}`], 0) });
  const hasSpring = "SPRING_L" in p || "SPRING_R" in p;
  return {
    ...d, name: p.description && p.description !== "_" ? p.description : part.description || "", rod,
    through: truthy(p.PISTON_L) && rod !== "none", slide: rod === "none" && truthy(p.SLEDGE), magnetic: rod === "none" && !truthy(p.SLEDGE),
    type, spring: type === "da" ? true : hasSpring ? truthy(p.SPRING_L) || truthy(p.SPRING_R) : true,
    damping: truthy(p.DAMPING_L) || truthy(p.DAMPING_R), dampAdj: truthy(p.DAMPING_ADJ_L) || truthy(p.DAMPING_ADJ_R),
    detect: truthy(p.DETECT), detectMark: p.DETECT_MARK || "", mirrorH: truthy(p.MIRROR_H), mirrorV: truthy(p.MIRROR_V),
    stroke, pos: num(p.S_RESET ?? p.S, 0), dPiston: num(p.D_K, dPiston), dRod: num(p.D_R, dRod),
    angle: num(p.ALPHA, 0), leak: num(p.GLEAK, 0), showV: truthy(p.SHOW_V), showF: truthy(p.SHOW_F),
    mass: num(p.MASS, 0), friction: Math.round(num(p.FRICTION_SEL, 0)), muS: num(p.FRICTION, 0), muD: num(p.FRICTION_BA, 0),
    constForce: p.CONSTANT_FORCE !== "F", force: num(p.F, 0), profile: profile.length >= 2 ? profile : [[0, 0], [stroke, 0]], marks,
  };
}

/** the configuration fields that change the drawing (anything else only changes properties) */
export const shapeKey = (c: CylConfig) => JSON.stringify([c.rod, c.through, c.magnetic, c.slide, c.type, c.spring, c.damping, c.dampAdj, c.detect, c.mirrorH, c.mirrorV]);

/** keep the drawing of a cylinder loaded from a file when only its parameters change */
export function withParams(part: FluidPart, cfg: CylConfig, hydraulic: boolean): FluidPart {
  const gen = buildCyl(cfg, hydraulic);
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(part.props)) if (!/^MARK(_[SE])?\d+$/.test(k)) props[k] = v;
  for (const k of ["HUB", "S", "S_RESET", "A_K", "A_R", "D_K", "D_R", "ALPHA", "GLEAK", "MASS", "FRICTION_SEL", "FRICTION", "FRICTION_BA", "CONSTANT_FORCE", "F", "FORCE_PROFILE", "SHOW_V", "SHOW_F", "DETECT_MARK"]) props[k] = gen.props[k];
  for (const [k, v] of Object.entries(gen.props)) if (/^MARK/.test(k)) props[k] = v;
  props.description = cfg.name || props.description || "";
  return { ...part, description: cfg.name || part.description, props };
}

/* ---------------- physical parameters for the simulation ---------------- */
export interface CylPhys {
  stroke: number; ak: number; ar: number; mass: number; angle: number; leak: number;
  muS: number; muD: number; damping: boolean; dampAdj: boolean;
  /** external force (N, positive = against extension) at a piston position in mm */
  load: (mm: number) => number;
}
export function physOf(part: FluidPart): CylPhys {
  const c = cylConfigOf(part), mat = c.friction > 0 ? MATERIALS[c.friction - 1] : null;
  const prof = [...c.profile].sort((a, b) => a[0] - b[0]);
  const load = c.constForce ? () => c.force : (mm: number) => {
    if (!prof.length) return 0;
    if (mm <= prof[0][0]) return prof[0][1];
    for (let i = 1; i < prof.length; i++) if (mm <= prof[i][0]) {
      const [x0, f0] = prof[i - 1], [x1, f1] = prof[i];
      return x1 === x0 ? f1 : f0 + ((f1 - f0) * (mm - x0)) / (x1 - x0);
    }
    return prof[prof.length - 1][1];
  };
  const { ak, ar } = { ak: num(part.props.A_K, areas(c).ak), ar: num(part.props.A_R, areas(c).ar) };
  return { stroke: Math.max(1, c.stroke), ak, ar, mass: c.mass, angle: c.angle, leak: c.leak, muS: mat ? mat.s : c.muS, muD: mat ? mat.d : c.muD, damping: c.damping, dampAdj: c.dampAdj, load };
}

/* ---------------- moving parts ---------------- */
export const isGenCyl = (p: FluidPart) => p.props.GEN === "cyl";

/** marks of a cylinder: label and range in mm */
export function marksOf(part: FluidPart): CylMark[] {
  const out: CylMark[] = [];
  for (let i = 0; `MARK${i}` in part.props; i++) {
    const label = part.props[`MARK${i}`];
    if (label) out.push({ label, start: num(part.props[`MARK_S${i}`], 0), end: num(part.props[`MARK_E${i}`], 0) });
  }
  return out;
}

/**
 * Piston, rod, carriage, spring, cushions and marks for an extension 0..1,
 * as SYM primitives in the part's own (unrotated) coordinates.
 */
export function cylOverlay(part: FluidPart, ext: number): string[] {
  const [w, h] = part.size, gen = isGenCyl(part);
  const stroke = num(part.props.HUB, 100);
  const marks = marksOf(part);
  const out: string[] = [];
  let tip: (e: number) => number, rulerY: number, top = 0, bot = BH;
  if (gen) {
    const c = cylConfigOf(part), px = X0 + (X1 - X0) * ext;
    out.push(fill(px - 900, 600, px + 900, BH - 600));
    if (c.damping) out.push(ln(px - 3400, MIDY - 3500, px - 900, MIDY - 3500), ln(px - 3400, MIDY + 3500, px - 900, MIDY + 3500), ln(px - 3400, MIDY - 3500, px - 3400, MIDY + 3500),
      ln(px + 900, MIDY - 3500, px + 3400, MIDY - 3500), ln(px + 900, MIDY + 3500, px + 3400, MIDY + 3500), ln(px + 3400, MIDY - 3500, px + 3400, MIDY + 3500));
    const ys = rodYs(c.rod);
    for (const y of ys) {
      out.push(fill(px, y - 700, px + ROD_OUT, y + 700));
      if (c.through) out.push(fill(px - ROD_OUT, y - 700, px, y + 700));
    }
    if (c.rod === "two") out.push(fill(px + ROD_OUT, ys[0] - 2000, px + ROD_OUT + 1400, ys[1] + 2000));
    if (c.rod === "none") {
      const cw = 14000, cx = px;
      out.push(fill(cx - cw / 2, -5200, cx + cw / 2, -400));
      if (c.magnetic) out.push(dash(cx - 3000, -400, cx - 3000, 600), dash(cx + 3000, -400, cx + 3000, 600));
      if (c.slide) out.push(ln(0, -6400, W, -6400));
    }
    const sp = springSide(c);
    if (sp) {
      const [a, b] = sp === "L" ? [600, px - 900] : [px + 900, W - 600];
      const n = 8;
      for (let i = 0; i < n; i++) {
        const xa = a + ((b - a) * i) / n, xb = a + ((b - a) * (i + 1)) / n;
        out.push(ln(xa, MIDY + (i % 2 ? 3600 : -3600), xb, MIDY + (i % 2 ? -3600 : 3600)));
      }
    }
    if (c.detect) out.push(fill(px - 1800, -1300, px + 1800, -150));
    tip = (e: number) => (c.rod === "none" ? X0 + (X1 - X0) * e : X0 + (X1 - X0) * e + ROD_OUT);
    rulerY = c.rod === "none" ? -11000 : c.detect ? -4200 : -3200;
    const res = mirror(out, c.mirrorH, c.mirrorV);
    return [...res, ...mirror(rulerPrims(marks, stroke, tip, rulerY), c.mirrorH, c.mirrorV)];
  }
  /* cylinders drawn by FluidSIM: piston and rod over the stored body */
  const rodless = (part.props.PISTON_COUNT ?? (/^CylDGPP/.test(part.cls) ? "0" : "1")) === "0" || /^CP_0/.test(part.props.piston || "");
  if (rodless) {
    const cw = Math.min(14000, w * 0.25), x = 1500 + (w - cw - 3000) * ext;
    out.push(fill(x, -5200, x + cw, 0));
    tip = (e) => 1500 + (w - cw - 3000) * e + cw / 2; rulerY = -9000;
  } else {
    const hs = part.sym.map((l) => l.split(" ").map(Number)).filter((n) => n[0] === 1 && n[2] === n[4]).map((n) => n[2]);
    top = Math.min(...hs); bot = Math.max(...hs.filter((y) => y < h));
    if (!(bot > top)) return [];
    const mid = (top + bot) / 2, x0 = w * 0.08, x1 = w * 0.8, px = x0 + (x1 - x0) * ext, rodEnd = px + w * 0.92;
    out.push(fill(px - 900, top + 600, px + 900, bot - 600), fill(px, mid - 360, rodEnd, mid + 360));
    if (part.props.PISTON_L === "T") out.push(fill(px - w * 0.92, mid - 360, px, mid + 360));
    if (truthy(part.props.SPRING_L) || part.cls.startsWith("Zylinder")) {
      const a = 1200, b = px - 1200, n = 6;
      for (let i = 0; i < n; i++) out.push(ln(a + ((b - a) * i) / n, mid + (i % 2 ? 1800 : -1800), a + ((b - a) * (i + 1)) / n, mid + (i % 2 ? -1800 : 1800)));
    }
    tip = (e) => x0 + (x1 - x0) * e + w * 0.92; rulerY = top - 3200;
  }
  return [...out, ...rulerPrims(marks, stroke, tip, rulerY)];
}

/** a ruler above the cylinder with its marks, positioned where the rod tip is at each mark */
function rulerPrims(marks: CylMark[], stroke: number, tip: (e: number) => number, y: number): string[] {
  if (!marks.length) return [];
  const out = [dash(tip(0), y, tip(1), y)];
  const at = (mm: number) => tip(Math.max(0, Math.min(1, mm / stroke)));
  for (const m of marks) {
    const a = at(Math.min(m.start, m.end)), b = at(Math.max(m.start, m.end));
    out.push(ln(a, y - 1400, a, y + 1400));
    if (b - a > 300) out.push(ln(b, y - 1400, b, y + 1400), fill(a, y - 500, b, y + 500));
    out.push(text((a + b) / 2, y - 3600, m.label));
  }
  return out;
}

/** port identity used to keep tubes attached when a cylinder is reconfigured: cap side "a", rod side "b" */
export function cylPortRoles(part: FluidPart): string[] {
  const mh = truthy(part.props.MIRROR_H), w = part.size[0];
  return part.ports.map((q) => ((q.kind === "PConnection" || q.kind === "HConnection") ? ((q.x < w / 2) !== mh ? "a" : "b") : "x"));
}
