/**
 * Directional valve configurator (like FluidSIM's "Configure valve" dialog).
 * A ValveConfig is turned into a complete part: ports, properties and a drawing
 * in the same SYM format FluidSIM uses. The simulator then reads the switching
 * positions from that drawing exactly as it does for valves loaded from files.
 * The drawings are generated here; nothing is copied from FluidSIM.
 */
import type { FluidPart, FluidPort } from "./catalog";

export type Ways = 2 | 3 | 4 | 5;
/** muscular actuation; "-d" = with detent (stays where it is put). "detent" = lever with detent (older configs) */
export type Manual = "none" | "general" | "general-d" | "button" | "button-d" | "mushroom" | "mushroom-d" | "lever" | "lever-d" | "pedal" | "pedal-d" | "detent";
export type Mech = "none" | "plunger" | "roller" | "idle" | "idle2" | "general" | "twoway";
export type ElPn = "none" | "pilot" | "solenoid" | "solpilot";
export const MANUALS: Manual[] = ["none", "general", "general-d", "button", "button-d", "mushroom", "mushroom-d", "lever", "lever-d", "pedal", "pedal-d"];
export const MECHS: Mech[] = ["none", "plunger", "roller", "idle", "idle2", "general", "twoway"];
export const ELPNS: ElPn[] = ["none", "solenoid", "pilot", "solpilot"];
const hasDetent = (m: Manual) => m.endsWith("-d") || m === "detent";
const manualBase = (m: Manual) => (m === "detent" ? "lever" : m.replace(/-d$/, ""));
export interface SideConfig {
  spring: boolean;
  /** air spring (return by pressure), optionally with external supply */
  pneuSpring?: boolean; extSpring?: boolean;
  /** solenoid pilot-operated (servo), optionally with external pilot supply */
  piloted?: boolean; extPilot?: boolean;
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
  /** ports may be used in both directions (flow arrows on both ends) */
  reversible?: boolean;
  /** which side wins when both are actuated (memory valves) */
  dominant?: "none" | "L" | "R";
  mirrorH?: boolean;
  mirrorV?: boolean;
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

export const defaultSide = (): SideConfig => ({ spring: false, pneuSpring: false, extSpring: false, piloted: false, extPilot: false, pilot: false, solenoid: false, manual: "none", mech: "none", solLabel: "", mechLabel: "" });
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

function arrowSmall(x1: number, y1: number, x2: number, y2: number): string[] {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const bx = x2 - ux * 1500, by = y2 - uy * 1500, px = -uy * 700, py = ux * 700, r = Math.round;
  return [line(x1, y1, x2, y2), `5 ${r(x2)} ${r(y2)} ${r(bx + px)} ${r(by + py)} ${r(bx - px)} ${r(by - py)} ${r(bx - px)} ${r(by - py)} 0`];
}

/* actuators of one side are laid out outwards from the box edge, one slot each (like FluidSIM) */
const SLOT = { sol: 7168, servo: 2560, manual: 11264, mech: 13312, spring: 12288 };
function slots(s: SideConfig): { k: "sol" | "manual" | "mech" | "spring"; o: number; w: number }[] {
  const out: { k: "sol" | "manual" | "mech" | "spring"; o: number; w: number }[] = [];
  let o = 0;
  const add = (k: "sol" | "manual" | "mech" | "spring", w: number) => { out.push({ k, o, w }); o += w; };
  if (s.solenoid) add("sol", SLOT.sol + (s.piloted ? SLOT.servo : 0));
  if (s.manual !== "none") add("manual", SLOT.manual + (s.manual === "pedal" ? 2048 : 0));
  if (s.mech !== "none") add("mech", SLOT.mech);
  if (s.spring || s.pneuSpring) add("spring", SLOT.spring);
  return out;
}
/** width a side needs outside the boxes */
const sideWidth = (s: SideConfig) => Math.max(SIDE, slots(s).reduce((a, x) => a + x.w, 0) + 3072);

/** actuators of one side; e = box edge x, dir = -1 left (outwards), +1 right; end = outer edge x */
function drawSide(s: SideConfig, e: number, dir: number, end: number): string[] {
  const out: string[] = [];
  const x = (d: number) => e + dir * d, y = MID;
  for (const { k, o } of slots(s)) {
    const u = (d: number) => x(o + d);
    if (k === "sol") {
      let c0 = 0;
      if (s.piloted) { // servo pilot: a small box with a filled triangle between valve and coil
        out.push(line(u(0), 14336, u(SLOT.servo), 14336), line(u(0), 22528, u(SLOT.servo), 22528), line(u(SLOT.servo), 14336, u(SLOT.servo), 22528));
        out.push(`5 ${Math.round(u(400))} ${y} ${Math.round(u(2000))} ${y - 1600} ${Math.round(u(2000))} ${y + 1600} ${Math.round(u(2000))} ${y + 1600} 0`);
        c0 = SLOT.servo;
      }
      const x1 = u(c0 + 512), x2 = u(c0 + 6656);
      if (c0) out.push(line(u(c0), y, x1, y));
      out.push(line(x1, 14336, x2, 14336), line(x2, 14336, x2, 22528), line(x2, 22528, x1, 22528), line(x1, 22528, x1, 14336), line(x1, 22528, x2, 14336));
    } else if (k === "manual") {
      const x2 = u(9216), m = manualBase(s.manual);
      out.push(line(u(0), y, m === "lever" || m === "pedal" ? u(5120) : x2, y));
      if (m === "button") out.push(line(x2, y - 3072, x2, y + 3072));
      else if (m === "general") out.push(line(x2, y - 3072, x2, y + 3072), line(x2, y - 3072, u(7168), y - 3072), line(x2, y + 3072, u(7168), y + 3072));
      else if (m === "mushroom") out.push(line(x2, y - 3072, x2, y + 3072), `4 ${Math.round(x2)} ${y} 3072 ${dir > 0 ? 270000 : 90000} ${dir > 0 ? 90000 : 270000}`);
      else if (m === "lever") out.push(line(u(5120), y, u(9216), y - 5120), `3 ${Math.round(u(9728))} ${y - 5760} 900 0 2`); // lever with a knob
      else if (m === "pedal") out.push(line(u(5120), y, u(5120), y + 2560), line(u(5120), y + 2560, u(10240), y - 1536)); // pedal: foot plate
      if (hasDetent(s.manual)) // detent: a notch under the rod
        out.push(line(u(1536), y + 3584, u(2560), y + 1024), line(u(2560), y + 1024, u(3584), y + 3584), line(u(2560), y, u(2560), y + 1024));
    } else if (k === "mech") {
      out.push(line(u(0), y, u(9216), y));
      if (s.mech === "roller") out.push(`3 ${Math.round(u(11264))} ${y} 2048 0 2`);
      else if (s.mech === "idle" || s.mech === "idle2") { // idle-return roller: hinged lever, acts in one direction only (arrow)
        const up = s.mech === "idle" ? -1 : 1;
        out.push(`3 ${Math.round(u(11264))} ${y} 2048 0 2`, line(u(6656), y, u(9216), y + up * 2560));
        out.push(...arrowSmall(u(8704), y - 4096, u(11264), y - 4096 + up * 0));
      } else if (s.mech === "general" || s.mech === "twoway") { // mechanism in a box: general (✱) or two-way (◁▷)
        const b0 = u(9216), b1 = u(13312);
        out.push(line(b0, y - 2560, b1, y - 2560), line(b1, y - 2560, b1, y + 2560), line(b1, y + 2560, b0, y + 2560), line(b0, y + 2560, b0, y - 2560));
        const cx = (b0 + b1) / 2;
        if (s.mech === "general") out.push(line(cx - 1536, y, cx + 1536, y), line(cx, y - 1536, cx, y + 1536), line(cx - 1100, y - 1100, cx + 1100, y + 1100), line(cx - 1100, y + 1100, cx + 1100, y - 1100));
        else out.push(line(cx, y - 2560, cx, y + 2560), line(cx - 300, y, cx - 1700, y - 1300), line(cx - 1700, y - 1300, cx - 1700, y + 1300), line(cx - 1700, y + 1300, cx - 300, y),
          `5 ${Math.round(cx + 300)} ${y} ${Math.round(cx + 1700)} ${y - 1300} ${Math.round(cx + 1700)} ${y + 1300} ${Math.round(cx + 1700)} ${y + 1300} 0`);
      }
      else if (s.mech === "plunger") out.push(`4 ${Math.round(u(9216))} ${y} 1536 ${dir > 0 ? 270000 : 90000} ${dir > 0 ? 90000 : 270000}`); // plunger: rounded end
    } else if (s.pneuSpring) { // air spring: hollow triangle with a short spring behind it
      out.push(line(u(512), y, u(4608), y - 2560), line(u(4608), y - 2560, u(4608), y + 2560), line(u(4608), y + 2560, u(512), y));
      for (let i = 0; i < 4; i++) out.push(line(u(4608 + i * 1792), y + (i % 2 ? 2400 : -2400), u(4608 + (i + 1) * 1792), y + (i % 2 ? -2400 : 2400)));
    } else { // spring zigzag
      const n = 6, pts: [number, number][] = [];
      for (let i = 0; i <= n; i++) pts.push([u((i * 12288) / n), y + (i === 0 || i === n ? 0 : i % 2 ? -3600 : 3600)]);
      for (let i = 1; i < pts.length; i++) out.push(line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
    }
  }
  if (s.pilot) { // pilot triangle on the lower row, fed from the side port at the outer edge
    const yp = 26624, tip = x(0), base = x(5120);
    out.push(line(tip, yp, base, yp - 2560), line(base, yp - 2560, base, yp + 2560), line(base, yp + 2560, tip, yp), line(base, yp, end, yp));
  }
  return out;
}
/** x of an actuator's link port (solenoid coil centre, roller) measured from the box edge */
function linkAt(s: SideConfig, k: "sol" | "mech"): number {
  const sl = slots(s).find((q) => q.k === k);
  if (!sl) return 0;
  return k === "sol" ? sl.o + (s.piloted ? SLOT.servo : 0) + 3584 : sl.o + 11264;
}

/** build the part (ports, properties, drawing) for a configuration */
export function buildValve(cfg: ValveConfig, hydraulic: boolean): FluidPart {
  const ways = cfg.ways, bw = BW[ways], n = cfg.boxes.length;
  const types = cfg.boxes.map((id) => BOX_TYPES[ways].find((t) => t.id === id) || BOX_TYPES[ways][0]);
  const L = sideWidth(cfg.left), R = sideWidth(cfg.right), W = L + n * bw + R, E = L + n * bw;
  const cur = Math.min(Math.max(0, cfg.initial), n - 1), a0 = L + cur * bw; // ports sit under the initial box
  const sym: string[] = [];
  types.forEach((t, i) => sym.push(...drawBox(ways, L + i * bw, t)));
  sym.push(...drawSide(cfg.left, L, -1, 0), ...drawSide(cfg.right, E, 1, W));
  const kind = hydraulic ? "HConnection" : "PConnection";
  const ports: FluidPort[] = PORTS[ways].map(([name, x, top]) => ({
    kind, x: a0 + x, y: top ? 0 : H, label: hydraulic && ways === 4 ? HYD_NAME[name] : name, ex: !hydraulic && isExhaust(name) ? "EX3" : "EX0",
  }));
  // short tube stubs from the ports to the body
  PORTS[ways].forEach(([, x, top]) => sym.push(line(a0 + x, top ? 0 : H, a0 + x, top ? TOP : BOT)));
  if (cfg.left.pilot) ports.push({ kind, x: 0, y: 26624, label: "", ex: "EX0" });
  if (cfg.right.pilot) ports.push({ kind, x: W, y: 26624, label: "", ex: "EX0" });
  if (cfg.left.solenoid) ports.push({ kind: "UEConnection", x: L - linkAt(cfg.left, "sol"), y: MID, label: cfg.left.solLabel, ex: "" });
  if (cfg.right.solenoid) ports.push({ kind: "UEConnection", x: E + linkAt(cfg.right, "sol"), y: MID, label: cfg.right.solLabel, ex: "" });
  if (cfg.left.mech !== "none") ports.push({ kind: "UMConnection", x: L - linkAt(cfg.left, "mech"), y: MID, label: cfg.left.mechLabel, ex: "" });
  if (cfg.right.mech !== "none") ports.push({ kind: "UMConnection", x: E + linkAt(cfg.right, "mech"), y: MID, label: cfg.right.mechLabel, ex: "" });
  const act = (s: SideConfig, side: "L" | "R") => ({
    [`ACTUATION_${side}_EL_PN`]: s.solenoid ? `A${side}_PE1` : s.pilot ? `A${side}_PE2` : `A${side}N`,
    [`ACTUATION_${side}_MA`]: s.manual !== "none" ? `A${side}_MA1${hasDetent(s.manual) ? "F" : ""}` : `A${side}N`,
    [`ACTUATION_${side}_ME`]: s.mech !== "none" ? `A${side}_ME2` : `A${side}N`,
    [`SPRING_${side}`]: s.spring && !s.pneuSpring ? "TRUE" : "FALSE",
  });
  if (cfg.reversible) // flow possible both ways: small arrows at the start of every flow line too
    types.forEach((t, i) => t.groups.filter((g) => g.length === 2).forEach((g) => {
      const a = L + i * bw, pos = new Map(PORTS[ways].map(([nm, x, top]) => [nm, { x: a + x, y: top ? TOP : BOT, top }]));
      let [s0, e0] = g; if (e0 === "1" || isExhaust(s0)) [s0, e0] = [e0, s0];
      const ps = pos.get(s0)!, pe = pos.get(e0)!;
      if (ps.top !== pe.top) sym.push(arrowHead(pe.x, pe.y, ps.x, ps.y));
    }));
  // mirroring: flip the drawing and the ports; horizontally the sides and the box order swap too
  const mh = !!cfg.mirrorH, mv = !!cfg.mirrorV;
  const X = (v: number) => (mh ? W - v : v), Y = (v: number) => (mv ? H - v : v);
  const symM = sym.map((p) => {
    const t = p.split(" "), k = t.map(Number);
    if (t[0] === "1" || t[0] === "2") return [t[0], X(k[1]), Y(k[2]), X(k[3]), Y(k[4]), ...t.slice(5)].join(" ");
    if (t[0] === "5") return ["5", X(k[1]), Y(k[2]), X(k[3]), Y(k[4]), X(k[5]), Y(k[6]), X(k[7]), Y(k[8]), t[9]].join(" ");
    if (t[0] === "3") return ["3", X(k[1]), Y(k[2]), ...t.slice(3)].join(" ");
    if (t[0] === "4") { // arc: mirror the angles
      let a0 = k[4] / 1000, a1 = k[5] / 1000;
      if (mh) [a0, a1] = [180 - a1, 180 - a0];
      if (mv) [a0, a1] = [-a1, -a0];
      const nrm = (a: number) => Math.round((((a % 360) + 360) % 360) * 1000);
      return ["4", X(k[1]), Y(k[2]), k[3], nrm(a0), nrm(a1)].join(" ");
    }
    return p;
  });
  const portsM = ports.map((q) => ({ ...q, x: X(q.x), y: Y(q.y) }));
  const order = types.map((_, i) => (mh ? n - 1 - i : i)); // drawing position -> configured box
  const posStr = (drawnAt: number) => `(${drawnAt + 1}\t${types[order[drawnAt]].id})`;
  const curDrawn = mh ? n - 1 - cur : cur;
  const [sl, sr] = mh ? [cfg.right, cfg.left] : [cfg.left, cfg.right];
  const dom = cfg.dominant && cfg.dominant !== "none" ? (mh ? (cfg.dominant === "L" ? "R" : "L") : cfg.dominant) : "";
  const cls = (hydraulic ? "HWV_" : "WV_") + ways;
  return {
    cls, config: "gen:" + JSON.stringify(cfg), programs: [], domain: hydraulic ? "hyd" : "pneu", files: [],
    description: cfg.name || `${ways}/${n}`, model: "", size: [W, H], ports: portsM, sym: symM,
    props: {
      ...act(sl, "L"), ...act(sr, "R"),
      PNEU_SPRING_L: sl.pneuSpring ? "TRUE" : "FALSE", PNEU_SPRING_R: sr.pneuSpring ? "TRUE" : "FALSE",
      POS: posStr(curDrawn), POS_RESET: posStr(curDrawn), VALUECLASS: types.map((_, i) => posStr(i)).join(" "),
      BODY_COUNT: String(n), NN_FLOW: String(cfg.flow), description: cfg.name || "", GEN: "1",
      ...(dom ? { DOMINANT_SIDE: dom } : {}), ...(cfg.reversible ? { REVERSIBLE: "TRUE" } : {}),
    },
    fields: {},
  };
}

/** best-effort reading of an existing valve (from a file or the library) into a configuration */
export function configOf(part: FluidPart): ValveConfig {
  if (part.config.startsWith("gen:")) { try { const c = JSON.parse(part.config.slice(4)); const fix = (x: SideConfig) => ({ ...defaultSide(), ...x, manual: (x.manual === "detent" ? "lever-d" : x.manual) as Manual });
      return { ...c, left: fix(c.left), right: fix(c.right) }; } catch { /* fall through */ } }
  const m = /WV_(\d)/.exec(part.cls), ways = Math.min(5, Math.max(2, m ? +m[1] : 5)) as Ways;
  const codes = [...(part.props.VALUECLASS || "").matchAll(/\(\d+\s+(\w+)\)/g)].map((x) => x[1]);
  const types = BOX_TYPES[ways];
  const boxes = codes.length ? codes.map((c) => FROM_CODE[c] || types[0].id) : [types[0].id, types[1]?.id || types[0].id];
  const pos = /\((\d+)/.exec(part.props.POS_RESET || part.props.POS || "");
  const side = (s: "L" | "R"): SideConfig => {
    const el = part.props[`ACTUATION_${s}_EL_PN`] || "", ma = part.props[`ACTUATION_${s}_MA`] || "", me = part.props[`ACTUATION_${s}_ME`] || "";
    const lbl = (k: string) => part.ports.find((q) => q.kind === k && (s === "L" ? q.x < part.size[0] / 2 : q.x >= part.size[0] / 2))?.label || "";
    const pneu = part.props[`PNEU_SPRING_${s}`] === "TRUE";
    return {
      spring: part.props[`SPRING_${s}`] === "TRUE" || pneu, pneuSpring: pneu, extSpring: false, piloted: false, extPilot: false,
      pilot: /PE2/.test(el), solenoid: /PE1/.test(el),
      manual: /MA/.test(ma) ? (/F$/.test(ma) ? "button-d" : "button") : "none",
      mech: /ME1/.test(me) ? "plunger" : /ME3/.test(me) ? "idle" : /ME/.test(me) ? "roller" : "none",
      solLabel: lbl("UEConnection"), mechLabel: lbl("UMConnection"),
    };
  };
  const AFL = parseFloat(part.props.NN_FLOW || part.props.AFL || "");
  return { ways, boxes, initial: pos ? Math.min(boxes.length - 1, +pos[1] - 1) : 0, left: side("L"), right: side("R"), name: part.props.description || part.description || "", flow: AFL > 0 ? AFL : 500, dominant: "none", reversible: false, mirrorH: false, mirrorV: false };
}

/** a single box as a tiny part, for previews in the dialog */
export function boxPreview(ways: Ways, id: string): FluidPart {
  const t = BOX_TYPES[ways].find((x) => x.id === id) || BOX_TYPES[ways][0];
  return { cls: "box", config: "", programs: [], domain: "", files: [], description: "", model: "", size: [BW[ways], H], ports: [], props: {}, fields: {},
    sym: [...drawBox(ways, 0, t), ...PORTS[ways].map(([, x, top]) => line(x, top ? 0 : H, x, top ? TOP : BOT))] };
}

/** one side's actuator alone, for the icons of the dialog's actuator lists */
export function sidePreview(s: Partial<SideConfig>, right = false): FluidPart {
  const full = { ...defaultSide(), ...s }, W = Math.max(16384, sideWidth(full) - 2048);
  // the icon shows the actuator against a short piece of the valve edge; a pilot line stops short of the port
  const sym = [line(right ? 0 : W, MID - 5120, right ? 0 : W, MID + 5120), ...drawSide(full, right ? 0 : W, right ? 1 : -1, right ? 9216 : W - 9216)];
  return { cls: "act", config: "", programs: [], domain: "", files: [], description: "", model: "", size: [W, H], ports: [], props: {}, fields: {}, sym };
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
