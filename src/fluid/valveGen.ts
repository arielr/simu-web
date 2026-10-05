/**
 * Directional valve configurator (like FluidSIM's "Configure valve" dialog).
 * A ValveConfig is turned into a complete part: ports, properties and a drawing
 * in the same SYM format FluidSIM uses. The simulator then reads the switching
 * positions from that drawing exactly as it does for valves loaded from files.
 * The drawings are generated here; nothing is copied from FluidSIM.
 */
import type { FluidPart, FluidPort } from "./catalog";

export type Ways = 2 | 3 | 4 | 5;
export type Manual = "none" | "button" | "lever" | "detent" | "pedal";
export type Mech = "none" | "roller" | "plunger";
export interface SideConfig {
  spring: boolean;
  pilot: boolean;
  solenoid: boolean;
  manual: Manual;
  mech: Mech;
  /** label of the solenoid (links to E_Y001 "1Y1") */
  solLabel: string;
  /** label of the roller/plunger (links to a distance-rule mark "1S1") */
  mechLabel: string;
}
export interface ValveConfig {
  ways: Ways;
  /** box types, 1 to 4 positions, left to right */
  boxes: string[];
  /** initial (rest) position, index into boxes */
  initial: number;
  left: SideConfig;
  right: SideConfig;
  name: string;
  flow: number;
}

/* ---- box types: which ports are joined; every other port is blocked ---- */
interface BoxType { id: string; en: string; he: string; groups: string[][] }
const P = (...g: string[][]) => g;
export const BOX_TYPES: Record<Ways, BoxType[]> = {
  2: [
    { id: "2open", en: "Open 1→2", he: "פתוח 1→2", groups: P(["1", "2"]) },
    { id: "2closed", en: "Closed", he: "סגור", groups: P() },
  ],
  3: [
    { id: "3pass", en: "1→2, 3 closed", he: "1→2, 3 סגור", groups: P(["1", "2"]) },
    { id: "3exh", en: "2→3, 1 closed", he: "2→3, 1 סגור", groups: P(["2", "3"]) },
    { id: "3closed", en: "All closed", he: "הכל סגור", groups: P() },
  ],
  4: [
    { id: "4par", en: "1→4, 2→3", he: "1→4, 2→3", groups: P(["1", "4"], ["2", "3"]) },
    { id: "4cross", en: "1→2, 4→3", he: "1→2, 4→3", groups: P(["1", "2"], ["4", "3"]) },
    { id: "4closed", en: "Closed centre", he: "מרכז סגור", groups: P() },
    { id: "4open", en: "Open centre", he: "מרכז פתוח", groups: P(["1", "2", "3", "4"]) },
    { id: "4tandem", en: "Tandem 1→3", he: "טנדם 1→3", groups: P(["1", "3"]) },
    { id: "4float", en: "Float 2,4→3", he: "צף 2,4→3", groups: P(["2", "3", "4"]) },
  ],
  5: [
    { id: "5par", en: "1→2, 4→5", he: "1→2, 4→5", groups: P(["1", "2"], ["4", "5"]) },
    { id: "5cross", en: "1→4, 2→3", he: "1→4, 2→3", groups: P(["1", "4"], ["2", "3"]) },
    { id: "5closed", en: "Closed centre", he: "מרכז סגור", groups: P() },
    { id: "5exh", en: "Exhaust centre 2→3, 4→5", he: "מרכז פליטה", groups: P(["2", "3"], ["4", "5"]) },
    { id: "5press", en: "Pressure centre 1→2, 1→4", he: "מרכז לחץ", groups: P(["1", "2", "4"]) },
  ],
};
/* FluidSIM position codes seen in files -> our box types */
const FROM_CODE: Record<string, string> = { C3P: "3pass", C3C: "3exh", C4P: "4par", C4C: "4cross", C5PCB: "5par", C5CPB: "5cross", C2P: "2open", C2C: "2closed" };

/* ---- geometry (1024 units = 1 mm), same conventions as FluidSIM symbols ---- */
const H = 36864, TOP = 6144, BOT = 30720, MID = 18432, SIDE = 18432;
const BW: Record<Ways, number> = { 2: 24576, 3: 24576, 4: 24576, 5: 36864 };
/** port name -> [x offset in box, top?] */
const PORTS: Record<Ways, [string, number, boolean][]> = {
  2: [["2", 12288, true], ["1", 12288, false]],
  3: [["2", 6144, true], ["1", 6144, false], ["3", 18432, false]],
  4: [["4", 6144, true], ["2", 18432, true], ["1", 6144, false], ["3", 18432, false]],
  5: [["4", 6144, true], ["2", 30720, true], ["5", 6144, false], ["1", 18432, false], ["3", 30720, false]],
};
const HYD_NAME: Record<string, string> = { "4": "A", "2": "B", "1": "P", "3": "T" };
const isExhaust = (n: string) => n === "3" || n === "5";

export const defaultSide = (): SideConfig => ({ spring: false, pilot: false, solenoid: false, manual: "none", mech: "none", solLabel: "", mechLabel: "" });
export function defaultConfig(ways: Ways = 5): ValveConfig {
  const t = BOX_TYPES[ways];
  return { ways, boxes: [t[1].id, t[0].id], initial: 1, left: { ...defaultSide(), solenoid: true, solLabel: "1Y1" }, right: { ...defaultSide(), spring: true }, name: "", flow: 500 };
}

/* ---- drawing helpers producing SYM primitive lines ---- */
const line = (x1: number, y1: number, x2: number, y2: number) => `1 ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)}`;
const dashed = (x1: number, y1: number, x2: number, y2: number) => `2 ${Math.round(x1)} ${Math.round(y1)} ${Math.round(x2)} ${Math.round(y2)} 0 0 3`;
function arrowHead(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const bx = x2 - ux * 4400, by = y2 - uy * 4400, px = -uy * 1500, py = ux * 1500;
  const r = (v: number) => Math.round(v);
  return `5 ${r(x2)} ${r(y2)} ${r(bx + px)} ${r(by + py)} ${r(bx - px)} ${r(by - py)} ${r(bx - px)} ${r(by - py)} 0`;
}

function drawBox(ways: Ways, a: number, type: BoxType): string[] {
  const w = BW[ways], out: string[] = [line(a, TOP, a + w, TOP), line(a, BOT, a + w, BOT), line(a, TOP, a, BOT), line(a + w, TOP, a + w, BOT)];
  const pos = new Map(PORTS[ways].map(([n, x, top]) => [n, { x: a + x, y: top ? TOP : BOT, top }]));
  const used = new Set(type.groups.flat());
  for (const g of type.groups) {
    if (g.length === 2) {
      // flow from the pressure port (1) or towards the exhaust
      let [s, e] = g;
      if (e === "1" || isExhaust(s)) [s, e] = [e, s];
      const ps = pos.get(s)!, pe = pos.get(e)!;
      if (ps.top !== pe.top) { out.push(line(ps.x, ps.y, pe.x, pe.y), arrowHead(ps.x, ps.y, pe.x, pe.y)); }
      else { // both on one edge: a U through the middle
        const y = ps.top ? MID - 2048 : MID + 2048;
        out.push(line(ps.x, ps.y, ps.x, y), line(ps.x, y, pe.x, y), line(pe.x, y, pe.x, pe.y), arrowHead(pe.x, y, pe.x, pe.y));
      }
    } else if (g.length > 2) { // several ports joined at a node in the middle
      const xs = g.map((n) => pos.get(n)!.x);
      for (const n of g) { const p = pos.get(n)!; out.push(line(p.x, p.y, p.x, MID)); }
      out.push(line(Math.min(...xs), MID, Math.max(...xs), MID));
    }
  }
  for (const [n] of PORTS[ways]) {
    if (used.has(n)) continue;
    const p = pos.get(n)!, y = p.top ? TOP + 6144 : BOT - 6144;
    out.push(line(p.x, p.y, p.x, y), line(p.x - 2048, y, p.x + 2048, y)); // blocked: T
  }
  return out;
}

/** actuators of one side; e = box edge x, dir = -1 left (outwards), +1 right */
function drawSide(s: SideConfig, e: number, dir: number, W: number): string[] {
  const out: string[] = [];
  const x = (d: number) => e + dir * d;
  if (s.spring) { // zigzag
    const n = 6, pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) pts.push([x((i * 12288) / n), MID + (i === 0 || i === n ? 0 : i % 2 ? -3600 : 3600)]);
    for (let i = 1; i < pts.length; i++) out.push(line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  }
  if (s.solenoid) { // coil box with a diagonal
    const x1 = x(2048), x2 = x(8192);
    out.push(line(x1, 14336, x2, 14336), line(x2, 14336, x2, 22528), line(x2, 22528, x1, 22528), line(x1, 22528, x1, 14336), line(x1, 22528, x2, 14336));
  }
  if (s.pilot) { // pilot triangle fed from the side port
    const y = 26624, tip = x(0), base = x(5120), end = dir < 0 ? 0 : W;
    out.push(line(tip, y, base, y - 2560), line(base, y - 2560, base, y + 2560), line(base, y + 2560, tip, y), line(base, y, end, y));
  }
  if (s.manual !== "none") {
    const y = 10240, x1 = x(0), x2 = x(10240);
    out.push(line(x1, y, x2, y));
    if (s.manual === "button") out.push(line(x2, y - 3072, x2, y + 3072));
    else if (s.manual === "lever" || s.manual === "detent") out.push(line(x(4096), y, x(9216), y - 5120), ...(s.manual === "detent" ? [line(x(6144), y + 1024, x(7168), y + 3072), line(x(7168), y + 3072, x(8192), y + 1024)] : []));
    else if (s.manual === "pedal") out.push(line(x2, y, x(13312), y - 4096));
  }
  if (s.mech !== "none") {
    const y = s.manual !== "none" ? 4096 + TOP : 10240;
    out.push(line(x(0), y, x(9216), y));
    if (s.mech === "roller") out.push(`3 ${Math.round(x(11264))} ${y} 2048 0 2`);
    else out.push(line(x(9216), y - 2048, x(9216), y + 2048));
  }
  return out;
}

/** build the part (ports, properties, drawing) for a configuration */
export function buildValve(cfg: ValveConfig, hydraulic: boolean): FluidPart {
  const ways = cfg.ways, bw = BW[ways], n = cfg.boxes.length;
  const types = cfg.boxes.map((id) => BOX_TYPES[ways].find((t) => t.id === id) || BOX_TYPES[ways][0]);
  const L = SIDE, W = SIDE * 2 + n * bw;
  const cur = Math.min(Math.max(0, cfg.initial), n - 1), a0 = L + cur * bw; // ports sit under the initial box
  const sym: string[] = [];
  types.forEach((t, i) => sym.push(...drawBox(ways, L + i * bw, t)));
  sym.push(...drawSide(cfg.left, L, -1, W), ...drawSide(cfg.right, L + n * bw, 1, W));
  const kind = hydraulic ? "HConnection" : "PConnection";
  const ports: FluidPort[] = PORTS[ways].map(([name, x, top]) => ({
    kind, x: a0 + x, y: top ? 0 : H, label: hydraulic && ways === 4 ? HYD_NAME[name] : name, ex: !hydraulic && isExhaust(name) ? "EX3" : "EX0",
  }));
  // short tube stubs from the ports to the body
  PORTS[ways].forEach(([, x, top]) => sym.push(line(a0 + x, top ? 0 : H, a0 + x, top ? TOP : BOT)));
  if (cfg.left.pilot) ports.push({ kind, x: 0, y: 26624, label: "", ex: "EX0" });
  if (cfg.right.pilot) ports.push({ kind, x: W, y: 26624, label: "", ex: "EX0" });
  if (cfg.left.solenoid) ports.push({ kind: "UEConnection", x: L - 5120, y: 18432, label: cfg.left.solLabel, ex: "" });
  if (cfg.right.solenoid) ports.push({ kind: "UEConnection", x: L + n * bw + 5120, y: 18432, label: cfg.right.solLabel, ex: "" });
  if (cfg.left.mech !== "none") ports.push({ kind: "UMConnection", x: L - 9216, y: 10240, label: cfg.left.mechLabel, ex: "" });
  if (cfg.right.mech !== "none") ports.push({ kind: "UMConnection", x: L + n * bw + 9216, y: 10240, label: cfg.right.mechLabel, ex: "" });
  const act = (s: SideConfig, side: "L" | "R") => ({
    [`ACTUATION_${side}_EL_PN`]: s.solenoid ? `A${side}_PE1` : s.pilot ? `A${side}_PE2` : `A${side}N`,
    [`ACTUATION_${side}_MA`]: s.manual !== "none" ? `A${side}_MA1` : `A${side}N`,
    [`ACTUATION_${side}_ME`]: s.mech !== "none" ? `A${side}_ME2` : `A${side}N`,
    [`SPRING_${side}`]: s.spring ? "TRUE" : "FALSE",
  });
  const posStr = (i: number) => `(${i + 1}\t${types[i].id})`;
  const cls = (hydraulic ? "HWV_" : "WV_") + ways;
  return {
    cls, config: "gen:" + JSON.stringify(cfg), programs: [], domain: hydraulic ? "hyd" : "pneu", files: [],
    description: cfg.name || `${ways}/${n}`, model: "", size: [W, H], ports, sym,
    props: {
      ...act(cfg.left, "L"), ...act(cfg.right, "R"),
      POS: posStr(cur), POS_RESET: posStr(cur), VALUECLASS: types.map((_, i) => posStr(i)).join(" "),
      BODY_COUNT: String(n), NN_FLOW: String(cfg.flow), description: cfg.name || "", GEN: "1",
    },
    fields: {},
  };
}

/** best-effort reading of an existing valve (from a file or the library) into a configuration */
export function configOf(part: FluidPart): ValveConfig {
  if (part.config.startsWith("gen:")) { try { return JSON.parse(part.config.slice(4)); } catch { /* fall through */ } }
  const m = /WV_(\d)/.exec(part.cls), ways = Math.min(5, Math.max(2, m ? +m[1] : 5)) as Ways;
  const codes = [...(part.props.VALUECLASS || "").matchAll(/\(\d+\s+(\w+)\)/g)].map((x) => x[1]);
  const types = BOX_TYPES[ways];
  const boxes = codes.length ? codes.map((c) => FROM_CODE[c] || types[0].id) : [types[0].id, types[1]?.id || types[0].id];
  const pos = /\((\d+)/.exec(part.props.POS_RESET || part.props.POS || "");
  const side = (s: "L" | "R"): SideConfig => {
    const el = part.props[`ACTUATION_${s}_EL_PN`] || "", ma = part.props[`ACTUATION_${s}_MA`] || "", me = part.props[`ACTUATION_${s}_ME`] || "";
    const lbl = (k: string) => part.ports.find((q) => q.kind === k && (s === "L" ? q.x < part.size[0] / 2 : q.x >= part.size[0] / 2))?.label || "";
    return {
      spring: part.props[`SPRING_${s}`] === "TRUE" || part.props[`PNEU_SPRING_${s}`] === "TRUE",
      pilot: /PE2/.test(el), solenoid: /PE1/.test(el),
      manual: /MA/.test(ma) ? (/F$/.test(ma) ? "detent" : "button") : "none",
      mech: /ME/.test(me) ? "roller" : "none",
      solLabel: lbl("UEConnection"), mechLabel: lbl("UMConnection"),
    };
  };
  return { ways, boxes, initial: pos ? Math.min(boxes.length - 1, +pos[1] - 1) : 0, left: side("L"), right: side("R"), name: part.props.description || part.description || "", flow: parseFloat(part.props.NN_FLOW || "500") || 500 };
}

/** a single box as a tiny part, for previews in the dialog */
export function boxPreview(ways: Ways, id: string): FluidPart {
  const t = BOX_TYPES[ways].find((x) => x.id === id) || BOX_TYPES[ways][0];
  return { cls: "box", config: "", programs: [], domain: "", files: [], description: "", model: "", size: [BW[ways], H], ports: [], props: {}, fields: {},
    sym: [...drawBox(ways, 0, t), ...PORTS[ways].map(([, x, top]) => line(x, top ? 0 : H, x, top ? TOP : BOT))] };
}

/** port identity used to keep tubes attached when a valve is reconfigured */
export function portRoles(part: FluidPart): string[] {
  const H0 = part.size[1], fluid = (k: string) => k === "PConnection" || k === "HConnection";
  let b = 0;
  return part.ports.map((q) => {
    if (fluid(q.kind) && (q.y <= 1200 || q.y >= H0 - 1200)) return "b" + b++;
    const side = q.x < part.size[0] / 2 ? "L" : "R";
    return (fluid(q.kind) ? "p" : q.kind === "UEConnection" ? "e" : q.kind === "UMConnection" ? "m" : "x") + side;
  });
}
