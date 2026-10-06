/**
 * Pneumatic / hydraulic simulation (switching logic + cylinder motion).
 *
 * Valves: a FluidSIM directional valve symbol contains one box per switching
 * position, drawn side by side; the box under the ports is the current
 * position. The connections of every position are read straight from the
 * drawing: inside each box, the flow lines (arrows) are followed from the
 * port positions on the top and bottom edge. This works for any valve
 * configuration (2/2 … 8/n, closed / open / tandem centre) without a table.
 * Actuation (pilot, solenoid, manual, mechanical) and springs come from the
 * valve's own properties (ACTUATION_*, SPRING_*, POS, POS_RESET).
 *
 * Network: ports joined by tubes and by open valve paths form nets. A net is
 * pressurised when it reaches a supply (compressor, source, pump) and is not
 * vented; it is vented when it reaches an exhaust (valve port 3/5/R/S left
 * open, tank). Cylinders move when one chamber is pressurised and the other
 * is vented (or by their spring).
 */
import type { FluidPart } from "./catalog";
import type { FComp, Tube } from "./model";
import { partOf } from "./model";
import { physOf, marksOf } from "./cylGen";
import type { CylMark } from "./cylGen";

/* ---------------- valve analysis ---------------- */

type Seg = [number, number, number, number];
export type ActKind = "none" | "pilot" | "solenoid" | "manual" | "mech";
export interface ValveInfo {
  boxes: [number, number][];
  /** for each position: groups of port indices joined inside the valve */
  conn: number[][][];
  /** position drawn in the symbol (the box under the ports) */
  drawn: number;
  reset: number;
  left: { kind: ActKind; port?: number };
  right: { kind: ActKind; port?: number };
  springL: boolean;
  springR: boolean;
}

const near = (a: number, b: number, t = 700) => Math.abs(a - b) <= t;
function onSeg(px: number, py: number, s: Seg, t = 500) {
  const [x1, y1, x2, y2] = s;
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
  if (!l2) return near(px, x1, t) && near(py, y1, t);
  const u = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(x1 + u * dx - px, y1 + u * dy - py) <= t;
}
const posNum = (v?: string) => { const m = /\((\d+)/.exec(v || ""); return m ? +m[1] - 1 : -1; };
const truthy = (v?: string) => v === "TRUE";

const cache = new WeakMap<FluidPart, ValveInfo | null>();
export function valveInfo(part: FluidPart): ValveInfo | null {
  if (cache.has(part)) return cache.get(part)!;
  const r = analyse(part);
  cache.set(part, r);
  return r;
}

function analyse(part: FluidPart): ValveInfo | null {
  if (!/^H?WV_\d/.test(part.cls) || !part.sym.length) return null;
  const H = part.size[1];
  const lines: Seg[] = part.sym.filter((l) => l.startsWith("1 ")).map((l) => l.split(" ").slice(1, 5).map(Number) as Seg);
  const hl = lines.filter((s) => s[1] === s[3] && Math.abs(s[2] - s[0]) >= 15000);
  if (!hl.length) return null;
  const top = Math.min(...hl.map((s) => s[1])), bot = Math.max(...hl.map((s) => s[1]));
  const isVert = (s: Seg, x: number) => near(s[0], x, 80) && near(s[2], x, 80) && Math.min(s[1], s[3]) <= top + 80 && Math.max(s[1], s[3]) >= bot - 80;
  const xs = [...new Set(hl.filter((s) => near(s[1], top, 80)).flatMap((s) => [s[0], s[2]]))]
    .filter((x) => lines.some((s) => isVert(s, x))).sort((a, b) => a - b);
  const boxes: [number, number][] = [];
  for (let i = 0; i + 1 < xs.length; i++) if (xs[i + 1] - xs[i] > 8000) boxes.push([xs[i], xs[i + 1]]);
  if (!boxes.length) return null;
  const fluid = (k: string) => k === "PConnection" || k === "HConnection";
  const body = part.ports.map((p, i) => ({ ...p, i })).filter((p) => fluid(p.kind) && (near(p.y, 0, 1200) || near(p.y, H, 1200)));
  if (!body.length) return null;
  const pmin = Math.min(...body.map((p) => p.x)), pmax = Math.max(...body.map((p) => p.x));
  let drawn = boxes.findIndex(([a, b]) => a < pmin && pmax < b);
  if (drawn < 0) drawn = Math.max(0, posNum(part.props.POS));

  const conn = boxes.map(([a, b]) => {
    const dx = boxes[drawn][0] - a; // shifts box under the ports
    const segs = lines.filter((s) => {
      const inX = Math.min(s[0], s[2]) > a + 100 && Math.max(s[0], s[2]) < b - 100;
      const inY = Math.min(s[1], s[3]) >= top - 80 && Math.max(s[1], s[3]) <= bot + 80;
      const edge = s[1] === s[3] && (near(s[1], top, 80) || near(s[1], bot, 80));
      return inX && inY && !edge;
    });
    // union-find over segments + ports
    const n = segs.length, par = [...Array(n + body.length).keys()];
    const f = (x: number): number => (par[x] === x ? x : (par[x] = f(par[x])));
    const u = (x: number, y: number) => { par[f(x)] = f(y); };
    segs.forEach((s, i) => segs.forEach((t, j) => {
      if (j <= i) return;
      if (onSeg(s[0], s[1], t) || onSeg(s[2], s[3], t) || onSeg(t[0], t[1], s) || onSeg(t[2], t[3], s)) u(i, j);
    }));
    body.forEach((p, k) => {
      const ey = near(p.y, 0, 1200) ? top : bot;
      segs.forEach((s, i) => {
        if ((near(s[0] + dx, p.x) && near(s[1], ey, 300)) || (near(s[2] + dx, p.x) && near(s[3], ey, 300))) u(n + k, i);
      });
    });
    const groups = new Map<number, number[]>();
    body.forEach((p, k) => { const r = f(n + k); groups.set(r, [...(groups.get(r) || []), p.i]); });
    return [...groups.values()].filter((g) => g.length > 1);
  });

  const side = (s: "L" | "R"): { kind: ActKind; port?: number } => {
    const pr = part.props;
    const none = (v?: string) => !v || /^A[LR]N$/.test(v);
    const xa = boxes[0][0], xb = boxes[boxes.length - 1][1];
    const pilot = part.ports.findIndex((p) => fluid(p.kind) && !body.some((b) => b.i === part.ports.indexOf(p)) && (s === "L" ? p.x <= xa - 4000 + 4000 && p.x < xa : p.x > xb) && !near(p.y, 0, 1200) && !near(p.y, H, 1200));
    const elpn = pr[`ACTUATION_${s}_EL_PN`];
    // ..._PE1 = solenoid, ..._PE2 = pneumatic/hydraulic pilot (the side air port exists in both cases)
    if (!none(elpn)) {
      if (/PE1/.test(elpn)) return { kind: "solenoid" };
      return pilot >= 0 ? { kind: "pilot", port: pilot } : { kind: "solenoid" };
    }
    if (!none(pr[`ACTUATION_${s}_MA`])) return { kind: "manual" };
    if (!none(pr[`ACTUATION_${s}_ME`])) return { kind: "mech" };
    return { kind: "none" };
  };
  const reset = posNum(part.props.POS_RESET);
  const info: ValveInfo = {
    boxes, conn, drawn, reset: reset >= 0 && reset < boxes.length ? reset : drawn,
    left: side("L"), right: side("R"),
    springL: truthy(part.props.SPRING_L) || truthy(part.props.PNEU_SPRING_L),
    springR: truthy(part.props.SPRING_R) || truthy(part.props.PNEU_SPRING_R),
  };
  return info;
}

/* ---------------- roles of the other parts ---------------- */

export type Role =
  | { kind: "source"; out: number }        // compressed air / pump outlet
  | { kind: "tank" }                       // all ports vent (hydraulic tank)
  | { kind: "cyl"; a: number; b: number | null; spring: "a" | "b" | null } // a: extends, b: retracts
  | { kind: "valve"; v: ValveInfo }
  | { kind: "pass"; ports: number[] }      // inline parts: throttles, check valves, filters …
  | { kind: "shutoff"; ports: number[] }   // hand valve, open by default
  | { kind: "logic"; op: "and" | "or"; ins: [number, number]; out: number } // two-pressure (AND) / shuttle (OR) valve
  | { kind: "junction"; ports: number[] }  // tube T-piece
  | { kind: "none" };

const PASS = /Throttle|Orifice|Nozzle|CheckValve|^DV_P|drossel|drorueck|DRSV|rsvfed|PressureReducing|^srv|FlowControl|Filter|FILTER|Lubric|Cooler|Heater|Drain|AdDryer|^PPE2|^PRV|Flowmeter|FlowSense|PressureCompensator|Cartridge/;
const SOURCE1 = new Set(["PPE1", "152841", "Ag1"]);

export function roleOf(part: FluidPart): Role {
  const fl = part.ports.map((p, i) => ({ ...p, i })).filter((p) => p.kind === "PConnection" || p.kind === "HConnection");
  const c = part.cls;
  if (/^[PH]Triconnection$/.test(c)) return { kind: "junction", ports: fl.map((p) => p.i) };
  if (SOURCE1.has(c) && fl.length) return { kind: "source", out: fl[0].i };
  if (c === "Ag2" && fl.length) return { kind: "source", out: fl[0].i };
  if (/^(CompressorFixed|CompressorVariable|DisplacementPump)/.test(c) && fl.length) {
    const out = fl.reduce((a, b) => (b.y < a.y ? b : a));
    return { kind: "source", out: out.i };
  }
  if (c === "tank1") return { kind: "tank" };
  if (/^(Cyl|Zylinder)/.test(c) && fl.length) {
    const w = part.size[0], mh = part.props.MIRROR_H === "T", pr = part.props;
    const sorted = [...fl].sort((p, q) => p.x - q.x);
    if (mh) sorted.reverse(); // mirrored: the cap side is on the right
    if (sorted.length === 1) {
      const p = sorted[0], cap = (p.x < w / 2) !== mh;
      const yes = (v?: string) => v === "T" || v === "TRUE";
      const spring = !("SPRING_L" in pr || "SPRING_R" in pr) || yes(pr.SPRING_L) || yes(pr.SPRING_R) || yes(pr.PNEU_SPRING_L) || yes(pr.PNEU_SPRING_R);
      return cap ? { kind: "cyl", a: p.i, b: null, spring: spring ? "b" : null } : { kind: "cyl", a: -1, b: p.i, spring: spring ? "a" : null };
    }
    return { kind: "cyl", a: sorted[0].i, b: sorted[sorted.length - 1].i, spring: null };
  }
  const v = valveInfo(part);
  if (v) return { kind: "valve", v };
  // logic elements of the two-hand block: the port on the third side is the output
  if (/^PVS[13]$/.test(c) && fl.length === 3) {
    const [w, h] = part.size;
    const edge = (p: { x: number; y: number }) => (p.x <= 1200 ? "l" : p.x >= w - 1200 ? "r" : p.y <= 1200 ? "t" : p.y >= h - 1200 ? "b" : "?");
    const e = fl.map(edge), out = fl.find((p, k) => e.filter((x) => x === e[k]).length === 1 && !(e[k] === "l" || e[k] === "r") ) || fl[2];
    const ins = fl.filter((p) => p !== out).map((p) => p.i) as [number, number];
    return { kind: "logic", op: c === "PVS3" ? "and" : "or", ins, out: out.i };
  }
  if (c === "absperr") return { kind: "shutoff", ports: fl.map((p) => p.i) };
  if (PASS.test(c) && fl.length === 2) return { kind: "pass", ports: fl.map((p) => p.i) };
  return { kind: "none" };
}

/* ---------------- state + solver ---------------- */

export interface SimState {
  /** current valve position (box index) */
  pos: Record<string, number>;
  /** cylinder extension 0..1 */
  ext: Record<string, number>;
  /** actuators held/toggled by the user: `${compId}:L` / `${compId}:R` */
  act: Record<string, boolean>;
  /** shut-off valves closed by the user */
  closed: Record<string, boolean>;
  /** cylinder speed in m/s (+ extending) and piston force in N */
  vel?: Record<string, number>;
  force?: Record<string, number>;
}
export const emptySim = (): SimState => ({ pos: {}, ext: {}, act: {}, closed: {} });
/** start state: cylinders at their configured piston position */
export function startSim(comps: FComp[]): SimState {
  const st = emptySim();
  for (const c of comps) {
    const part = partOf(c);
    if (!part || roleOf(part).kind !== "cyl") continue;
    const hub = parseFloat(part.props.HUB || ""), s = parseFloat(part.props.S_RESET ?? part.props.S ?? "");
    if (hub > 0 && s > 0) st.ext[c.id] = Math.min(1, s / hub);
  }
  return st;
}

export interface SimResult {
  netOf: Map<string, number>;
  pressure: Set<number>;
  vent: Set<number>;
  pos: Record<string, number>;
  /** cylinder direction: +1 extending, -1 retracting, 0 still */
  dir: Record<string, number>;
}

const key = (c: string, p: number) => c + ":" + p;
const isExhaustPort = (part: FluidPart, i: number) => {
  const p = part.ports[i];
  return p.ex === "EX3" || /^(3|5|R|S|T|R1|R2)$/.test(p.label || "");
};

/**
 * Rollers operated by a cylinder: a distance rule (e.g. R_SCHALT) next to a cylinder lists
 * marks `labelN` at `posN` mm of the stroke; a valve whose mechanical port carries the same
 * label is actuated on that side while the cylinder is at the mark.
 */
/** marks of distance rules (R_SCHALT …), each attached to the nearest cylinder: cylinder id -> marks in mm */
export function ruleMarks(comps: FComp[]): Map<string, CylMark[] & { rule?: string }> {
  const parts = comps.map((c) => ({ c, part: partOf(c)! })).filter((x) => x.part);
  const cyls = parts.filter(({ part }) => roleOf(part).kind === "cyl");
  const centre = (c: FComp, p: FluidPart) => [c.x + p.size[0] / 2, c.y + p.size[1] / 2];
  const out = new Map<string, CylMark[] & { rule?: string }>();
  for (const { c, part } of parts) {
    if (!("label0" in part.props) || !cyls.length) continue;
    const [x, y] = centre(c, part);
    const cyl = cyls.reduce((a, b) => { const pa = centre(a.c, a.part), pb = centre(b.c, b.part); return Math.hypot(pb[0] - x, pb[1] - y) < Math.hypot(pa[0] - x, pa[1] - y) ? b : a; });
    const list = out.get(cyl.c.id) || Object.assign([] as CylMark[], { rule: c.id });
    for (let i = 0; `label${i}` in part.props; i++) {
      const mm = parseFloat(part.props[`pos${i}`] || "0") || 0;
      if (part.props[`label${i}`]) list.push({ label: part.props[`label${i}`], start: mm, end: mm });
    }
    out.set(cyl.c.id, list);
  }
  return out;
}

export function activeMarks(comps: FComp[], ext: Record<string, number>): Set<string> {
  const parts = comps.map((c) => ({ c, part: partOf(c)! })).filter((x) => x.part);
  const cyls = parts.filter(({ part }) => roleOf(part).kind === "cyl");
  const active = new Set<string>();
  // distance-rule marks: positions in mm along the stroke of the cylinder
  for (const [id, ms] of ruleMarks(comps)) {
    const cyl = cyls.find((x) => x.c.id === id)!;
    const hub = parseFloat(cyl.part.props.HUB || "100") || 100, e = (ext[id] ?? 0) * hub;
    for (const m of ms) if (Math.abs(e - m.start) <= Math.max(0.5, hub * 0.025)) active.add(m.label);
  }
  // marks configured on the cylinder itself (start..end in mm)
  for (const { c, part } of cyls) {
    const ms = marksOf(part);
    if (!ms.length) continue;
    const stroke = parseFloat(part.props.HUB || "100") || 100, mm = (ext[c.id] ?? 0) * stroke, tol = Math.max(0.5, stroke * 0.025);
    for (const m of ms) if (mm >= Math.min(m.start, m.end) - tol && mm <= Math.max(m.start, m.end) + tol) active.add(m.label);
  }
  return active;
}

export function rollerHits(comps: FComp[], ext: Record<string, number>): Set<string> {
  const parts = comps.map((c) => ({ c, part: partOf(c)! })).filter((x) => x.part);
  const on = new Set<string>();
  const active = activeMarks(comps, ext);
  for (const { c, part } of parts) {
    const v = valveInfo(part);
    if (!v) continue;
    const mid = (v.boxes[0][0] + v.boxes[v.boxes.length - 1][1]) / 2;
    part.ports.forEach((q) => { if (q.kind === "UMConnection" && q.label && active.has(q.label)) on.add(c.id + ":" + (q.x < mid ? "L" : "R")); });
  }
  return on;
}

export function solveFluid(comps: FComp[], tubes: Tube[], st: SimState, solenoids: Set<string> = new Set()): SimResult {
  const parts = comps.map((c) => ({ c, part: partOf(c)! })).filter((x) => x.part);
  const roles = new Map(parts.map(({ c, part }) => [c.id, roleOf(part)]));
  const rollers = rollerHits(comps, st.ext);
  const used = new Set(tubes.flatMap((t) => [key(t.a.c, t.a.p), key(t.b.c, t.b.p)]));
  const pos: Record<string, number> = {};
  for (const { c } of parts) {
    const r = roles.get(c.id)!;
    if (r.kind === "valve") pos[c.id] = st.pos[c.id] ?? r.v.drawn;
  }
  let res: SimResult = { netOf: new Map(), pressure: new Set(), vent: new Set(), pos, dir: {} };
  const pick: Record<string, number> = {}; // logic element -> input index it is joined to
  // iterate: pilot pressures switch valves, which change the nets
  for (let iter = 0; iter < 6; iter++) {
    const ids = new Map<string, number>(); const par: number[] = [];
    const id = (k: string) => { let v = ids.get(k); if (v === undefined) { v = par.length; ids.set(k, v); par.push(v); } return v; };
    const f = (x: number): number => (par[x] === x ? x : (par[x] = f(par[x])));
    const u = (a: string, b: string) => { par[f(id(a))] = f(id(b)); };
    for (const { c, part } of parts) part.ports.forEach((_, i) => id(key(c.id, i)));
    for (const t of tubes) u(key(t.a.c, t.a.p), key(t.b.c, t.b.p));
    for (const { c } of parts) {
      const r = roles.get(c.id)!;
      if (r.kind === "pass") u(key(c.id, r.ports[0]), key(c.id, r.ports[1]));
      if (r.kind === "junction") for (let k = 1; k < r.ports.length; k++) u(key(c.id, r.ports[0]), key(c.id, r.ports[k]));
      if (r.kind === "shutoff" && !st.closed[c.id] && r.ports.length === 2) u(key(c.id, r.ports[0]), key(c.id, r.ports[1]));
      if (r.kind === "valve") for (const g of r.v.conn[pos[c.id]] || []) for (let k = 1; k < g.length; k++) u(key(c.id, g[0]), key(c.id, g[k]));
      if (r.kind === "logic") u(key(c.id, r.out), key(c.id, r.ins[pick[c.id] ?? 0]));
    }
    const netOf = new Map<string, number>();
    for (const [k, v] of ids) netOf.set(k, f(v));
    const pressure = new Set<number>(), vent = new Set<number>();
    for (const { c, part } of parts) {
      const r = roles.get(c.id)!;
      if (r.kind === "source") pressure.add(netOf.get(key(c.id, r.out))!);
      if (r.kind === "tank") part.ports.forEach((_, i) => vent.add(netOf.get(key(c.id, i))!));
      part.ports.forEach((_, i) => { if (!used.has(key(c.id, i)) && isExhaustPort(part, i)) vent.add(netOf.get(key(c.id, i))!); });
    }
    // a net that is both fed and vented is flowing to exhaust: it is not under pressure
    for (const n of [...pressure]) if (vent.has(n)) pressure.delete(n);
    // valve positions from actuators
    let changed = false;
    for (const { c } of parts) {
      const r = roles.get(c.id)!;
      if (r.kind !== "valve") continue;
      const v = r.v, last = v.boxes.length - 1;
      const on = (s: "L" | "R") => {
        const a = s === "L" ? v.left : v.right;
        if (a.kind === "pilot") return a.port !== undefined && pressure.has(netOf.get(key(c.id, a.port))!);
        if (a.kind === "none") return false;
        return !!st.act[c.id + ":" + s] || (a.kind === "mech" && rollers.has(c.id + ":" + s)) || (a.kind === "solenoid" && solenoids.has(c.id + ":" + s));
      };
      const L = on("L"), R = on("R");
      let p = pos[c.id];
      if (L && !R) p = 0;
      else if (R && !L) p = last;
      else if (!L && !R && (v.springL || v.springR)) p = v.reset;
      if (p !== pos[c.id]) { pos[c.id] = p; changed = true; }
    }
    for (const { c } of parts) {
      const r = roles.get(c.id)!;
      if (r.kind !== "logic") continue;
      const pr = r.ins.map((i) => pressure.has(netOf.get(key(c.id, i))!));
      // OR passes the pressurised input; AND passes the lower pressure (pressure only if both are)
      const want = r.op === "or" ? (pr[0] ? 0 : pr[1] ? 1 : 0) : (!pr[0] ? 0 : !pr[1] ? 1 : 0);
      if ((pick[c.id] ?? 0) !== want) { pick[c.id] = want; changed = true; }
    }
    res = { netOf, pressure, vent, pos, dir: {} };
    if (!changed) break;
  }
  for (const { c } of parts) {
    const r = roles.get(c.id)!;
    if (r.kind !== "cyl") continue;
    const P = (i: number | null) => i !== null && i >= 0 && res.pressure.has(res.netOf.get(key(c.id, i))!);
    const V = (i: number | null) => i === null || i < 0 || res.vent.has(res.netOf.get(key(c.id, i))!);
    let d = 0;
    if (P(r.a) && V(r.b)) d = 1;
    else if (P(r.b) && V(r.a)) d = -1;
    else if (r.spring === "b" && !P(r.a) && V(r.a)) d = -1;
    else if (r.spring === "a" && !P(r.b) && V(r.b)) d = 1;
    res.dir[c.id] = d;
  }
  return res;
}

/**
 * Advance the cylinders by dt seconds with their physical parameters:
 * supply pressure on the piston (A_K) or annular (A_R) area, return spring, external
 * load (constant or profile), weight along the mounting angle, static/dynamic friction,
 * moving mass (inertia) and end cushioning. Pneumatic speed falls with the square root
 * of the remaining pressure margin (flow through the valve); hydraulic speed is the pump
 * flow (minus internal leakage) over the area.
 */
export function moveCylinders(comps: FComp[], st: SimState, res: SimResult, dt: number, hydraulic: boolean) {
  const ext = { ...st.ext }, vel: Record<string, number> = { ...(st.vel || {}) }, force: Record<string, number> = {};
  let moving = false;
  // supply: pressure (bar) and, for hydraulics, flow (l/min)
  let bar = hydraulic ? 60 : 6, lpm = 2;
  for (const c of comps) {
    const p = partOf(c); if (!p || roleOf(p).kind !== "source") continue;
    const pr = p.props, P = parseFloat(pr.P_LIM || pr.PMAX || "");
    if (P > 0) bar = P;
    const q = pr.DISPLACEMENT && pr.RPM ? parseFloat(pr.DISPLACEMENT) * parseFloat(pr.RPM) : parseFloat(pr.FLOW || "");
    if (hydraulic && q > 0 && q < 1000) lpm = q;
    break;
  }
  const g = 9.81, QP = 6.3e-5; // pneumatic: effective flow, ~0.2 m/s for a 20 mm piston
  for (const c of comps) {
    const part = partOf(c); if (!part) continue;
    const r = roleOf(part); if (r.kind !== "cyl") continue;
    const ph = physOf(part), e = ext[c.id] ?? 0, d = res.dir[c.id] || 0;
    const P = (i: number | null) => i !== null && i >= 0 && res.pressure.has(res.netOf.get(c.id + ":" + i)!);
    const pa = P(r.a), pb = P(r.b);
    const Fp = (pa ? bar * 10 * ph.ak : 0) - (pb ? bar * 10 * ph.ar : 0);
    const Fs = r.spring ? (r.spring === "a" ? 1 : -1) * 0.15 * 6 * 10 * ph.ak * (hydraulic ? 0.5 : 1) : 0;
    const rad = (ph.angle * Math.PI) / 180, mm = e * ph.stroke;
    const Fl = -ph.load(mm) - ph.mass * g * Math.sin(rad);
    force[c.id] = Math.round(Fp + Fs);
    let v = Math.abs(vel[c.id] || 0);
    if (Math.sign(vel[c.id] || 0) !== d) v = 0;
    let target = 0, Fnet = 0;
    if (d) {
      const Ff = (v > 0 ? ph.muD : ph.muS) * ph.mass * g * Math.abs(Math.cos(rad));
      Fnet = d * (Fp + Fs + Fl) - Ff;
      const A = Math.max(1e-6, (d > 0 ? ph.ak : ph.ar) * 1e-4);
      const Fref = Math.max(1e-6, bar * 10 * (d > 0 ? ph.ak : ph.ar));
      if (Fnet > 0) {
        const driven = d > 0 ? pa : pb;
        if (hydraulic && driven) target = Math.max(0, (lpm - ph.leak * bar / 10) / 60000) / A;
        else target = (hydraulic ? lpm / 60000 : QP) / A * Math.sqrt(Math.min(1, Fnet / Fref));
        const left = d > 0 ? ph.stroke * (1 - e) : ph.stroke * e;
        if (ph.damping && left < Math.min(15, ph.stroke * 0.2)) target *= ph.dampAdj ? 0.4 : 0.3;
      }
    }
    if (ph.mass > 0 && target > v) v = Math.min(target, v + (Fnet / ph.mass) * dt);
    else v = target;
    let n = e + (d * v * dt) / (ph.stroke / 1000);
    if (n <= 0 || n >= 1) { n = Math.max(0, Math.min(1, n)); v = 0; }
    vel[c.id] = d * v;
    if (n !== e) { ext[c.id] = n; moving = true; }
  }
  return { ext, vel, force, moving };
}

/** advance cylinders by dt seconds (full stroke in `stroke` seconds) */
export function stepCylinders(ext: Record<string, number>, dir: Record<string, number>, dt: number, stroke = 1.2) {
  const out = { ...ext };
  let moving = false;
  for (const [id, d] of Object.entries(dir)) {
    const e = out[id] ?? 0, n = Math.max(0, Math.min(1, e + (d * dt) / stroke));
    if (n !== e) { out[id] = n; moving = true; }
  }
  return { ext: out, moving };
}

/** what a click on a valve does in simulation: which side, momentary or toggle */
export function clickAction(part: FluidPart, xRel: number): { side: "L" | "R"; momentary: boolean } | null {
  const v = valveInfo(part);
  if (!v) return null;
  const mid = (v.boxes[0][0] + v.boxes[v.boxes.length - 1][1]) / 2;
  const prefer: "L" | "R" = xRel < mid ? "L" : "R";
  const ok = (s: "L" | "R") => { const k = (s === "L" ? v.left : v.right).kind; return k !== "none" && k !== "pilot"; };
  const side = ok(prefer) ? prefer : ok(prefer === "L" ? "R" : "L") ? (prefer === "L" ? "R" : "L") : null;
  if (!side) return null;
  const kind = (side === "L" ? v.left : v.right).kind;
  // push buttons and rollers spring back; solenoids are switched on/off
  return { side, momentary: kind === "manual" || kind === "mech" ? v.springL || v.springR : false };
}
