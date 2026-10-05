/**
 * Electrical part of FluidSIM circuits (electro-pneumatics / electro-hydraulics).
 *
 * FluidSIM links electrical elements by label, like CADe SIMU does by tag:
 *   relay coil E_K001 "K1"       -> contacts E_S001/E_S002 labelled "K1"
 *   on-delay timer E_K008 "T0"   -> contacts "T0" switch DELAY_TIME seconds after the coil
 *   counter E_P010 "K1" (N)      -> contacts "K1" switch after N pulses on A1/A2; R1/R2 resets
 *   solenoid E_Y001 "1Y1"        -> valve side whose electrical port (UEConnection) is "1Y1"
 *   limit switch (SWITCH_TYPE 1) -> mark of a distance rule next to a cylinder
 * Push buttons (E_S011/E_S012/E_S031, or a contact whose label nothing drives) are clicked.
 */
import type { FluidPart } from "./catalog";
import type { FComp, Tube } from "./model";
import { partOf } from "./model";
import { valveInfo } from "./sim";

export type EKind =
  | { k: "plus" } | { k: "minus" } | { k: "junction" }
  | { k: "contact"; nc: boolean; manual: boolean; limit: boolean; label: string; a: number; b: number }
  | { k: "relay" | "solenoid" | "lamp" | "buzzer"; label: string; a: number; b: number }
  | { k: "timer"; label: string; a: number; b: number; delay: number }
  | { k: "counter"; label: string; a: number; b: number; r1: number; r2: number; n: number }
  | { k: "none" };

const eports = (p: FluidPart) => p.ports.map((q, i) => ({ ...q, i })).filter((q) => q.kind === "EConnection");

export function eKind(p: FluidPart): EKind {
  const c = p.cls, e = eports(p), label = (p.props.label || "").trim();
  if (/Triconnection$/.test(c)) return { k: "junction" };
  if (c === "pol2") return { k: "plus" };
  if (c === "pol1") return { k: "minus" };
  if (e.length < 2) return { k: "none" };
  const [a, b] = [e[0].i, e[1].i];
  if (/^E_S0\d\d$/.test(c) || /schliesser|oeffner|schalter/i.test(c)) {
    const nc = c === "E_S002" || c === "E_S012" || /oeffner/i.test(c);
    const manual = /^E_S01|^E_S03/.test(c) || /schalter|schliesser/i.test(c) && !label;
    return { k: "contact", nc, manual, limit: p.props.SWITCH_TYPE === "1", label, a, b };
  }
  if (c === "E_K001") return { k: "relay", label, a, b };
  if (c === "E_K008") return { k: "timer", label, a, b, delay: parseFloat(p.props.DELAY_TIME || "3") || 3 };
  if (c === "E_P010" && e.length >= 4) {
    const by = (l: string) => e.find((q) => q.label === l)?.i ?? -1;
    return { k: "counter", label, a: by("A1"), b: by("A2"), r1: by("R1"), r2: by("R2"), n: parseInt(p.props.N || "1", 10) || 1 };
  }
  if (c === "E_Y001" || c === "magnet") return { k: "solenoid", label, a, b };
  if (c === "lampe") return { k: "lamp", label, a, b };
  if (c === "hupe") return { k: "buzzer", label, a, b };
  return { k: "none" };
}

export interface ElecState {
  /** timers: label -> since when the coil is on (ms), absent when off */
  tOn: Record<string, number>;
  /** counters: label -> pulses counted, and whether the input was on last time */
  count: Record<string, { n: number; was: boolean }>;
  /** coils energised after the previous step: relays hold themselves through their own contacts */
  on: string[];
}
export const emptyElec = (): ElecState => ({ tOn: {}, count: {}, on: [] });

export interface ElecResult {
  netOf: Map<string, number>;
  plus: Set<number>;
  minus: Set<number>;
  short: boolean;
  /** comp ids of energised coils/loads */
  on: Set<string>;
  /** comp ids of closed contacts */
  closed: Set<string>;
  /** valve sides driven by solenoids: `${compId}:L|R` */
  solenoids: Set<string>;
  /** which contacts are clickable */
  manual: Set<string>;
  /** clickable contacts that stay where they are put (selector switches) */
  latching: Set<string>;
}

const key = (c: string, p: number) => c + ":" + p;

/**
 * act: manual contacts pressed (comp id -> true); marks: active distance-rule labels;
 * now: ms clock for timers.
 */
export function solveElectric(comps: FComp[], wires: Tube[], act: Record<string, boolean>, marks: Set<string>, st: ElecState, now: number): ElecResult {
  const parts = comps.map((c) => ({ c, part: partOf(c)! })).filter((x) => x.part);
  const kinds = new Map(parts.map(({ c, part }) => [c.id, eKind(part)]));
  const labelsOf = (k: string) => new Set(parts.filter(({ c }) => kinds.get(c.id)!.k === k).map(({ c }) => (kinds.get(c.id) as any).label));
  const relays = labelsOf("relay"), timers = labelsOf("timer"), counters = labelsOf("counter");
  const manual = new Set<string>();
  for (const { c } of parts) {
    const k = kinds.get(c.id)!;
    if (k.k === "contact" && (k.manual || (!k.limit && !relays.has(k.label) && !timers.has(k.label) && !counters.has(k.label)))) manual.add(c.id);
  }
  let on = new Set<string>(st.on), res: ElecResult | null = null;
  for (let iter = 0; iter < 10; iter++) {
    const relayOn = new Set(parts.filter(({ c }) => kinds.get(c.id)!.k === "relay" && on.has(c.id)).map(({ c }) => (kinds.get(c.id) as any).label));
    const timerDone = new Set([...timers].filter((l) => st.tOn[l] !== undefined && now - st.tOn[l] >= 1000 * ((parts.map(({ c }) => kinds.get(c.id)!).find((k: any) => k.k === "timer" && k.label === l) as any)?.delay ?? 3)));
    const counted = new Set(parts.filter(({ c }) => { const k = kinds.get(c.id)!; return k.k === "counter" && (st.count[k.label]?.n ?? 0) >= k.n; }).map(({ c }) => (kinds.get(c.id) as any).label));
    const ids = new Map<string, number>(), par: number[] = [];
    const id = (k: string) => { let v = ids.get(k); if (v === undefined) { v = par.length; ids.set(k, v); par.push(v); } return v; };
    const f = (x: number): number => (par[x] === x ? x : (par[x] = f(par[x])));
    const u = (a: string, b: string) => { par[f(id(a))] = f(id(b)); };
    for (const { c, part } of parts) part.ports.forEach((_, i) => id(key(c.id, i)));
    for (const w of wires) u(key(w.a.c, w.a.p), key(w.b.c, w.b.p));
    const closed = new Set<string>();
    for (const { c, part } of parts) {
      const k = kinds.get(c.id)!;
      if (k.k === "junction") part.ports.forEach((_, i) => i && u(key(c.id, 0), key(c.id, i)));
      if (k.k === "contact") {
        const actuated = manual.has(c.id) ? !!act[c.id]
          : k.limit || (!relays.has(k.label) && !timers.has(k.label) && !counters.has(k.label)) ? marks.has(k.label)
          : relayOn.has(k.label) || timerDone.has(k.label) || counted.has(k.label);
        if (actuated !== k.nc) { closed.add(c.id); u(key(c.id, k.a), key(c.id, k.b)); }
      }
    }
    const netOf = new Map<string, number>();
    for (const [k, v] of ids) netOf.set(k, f(v));
    const plus = new Set<number>(), minus = new Set<number>();
    for (const { c, part } of parts) {
      const k = kinds.get(c.id)!;
      if (k.k === "plus") part.ports.forEach((_, i) => plus.add(netOf.get(key(c.id, i))!));
      if (k.k === "minus") part.ports.forEach((_, i) => minus.add(netOf.get(key(c.id, i))!));
    }
    const short = [...plus].some((n) => minus.has(n));
    // loads in series are all energised (as FluidSIM shows them): a net that only joins
    // exactly two load terminals is a series node, current passes through it
    const loadEdges: [string, number, number][] = [];
    const terms = new Map<number, number>(); // net -> number of non-junction terminals on it
    for (const { c, part } of parts) {
      const k = kinds.get(c.id)! as any;
      if (k.k === "junction") continue;
      part.ports.forEach((q, i) => { if (q.kind === "EConnection") { const n = netOf.get(key(c.id, i))!; terms.set(n, (terms.get(n) || 0) + 1); } });
      if (["relay", "solenoid", "lamp", "buzzer", "timer", "counter"].includes(k.k) && k.a >= 0 && k.b >= 0)
        loadEdges.push([c.id, netOf.get(key(c.id, k.a))!, netOf.get(key(c.id, k.b))!]);
    }
    const reaches = (from: number, target: Set<number>, skip: string) => {
      let n = from, via = skip;
      for (let hop = 0; hop < 8; hop++) {
        if (target.has(n)) return true;
        if (terms.get(n) !== 2) return false;
        const e = loadEdges.find(([id, x, y]) => id !== via && (x === n || y === n));
        if (!e) return false;
        via = e[0]; n = e[1] === n ? e[2] : e[1];
      }
      return false;
    };
    const powered = (cid: string, a: number, b: number) => {
      if (a < 0 || b < 0) return false;
      const na = netOf.get(key(cid, a))!, nb = netOf.get(key(cid, b))!;
      if (na === nb) return false;
      return (reaches(na, plus, cid) && reaches(nb, minus, cid)) || (reaches(nb, plus, cid) && reaches(na, minus, cid));
    };
    const next = new Set<string>();
    for (const { c } of parts) {
      const k = kinds.get(c.id)! as any;
      if (["relay", "solenoid", "lamp", "buzzer", "timer", "counter"].includes(k.k) && !short && powered(c.id, k.a, k.b)) next.add(c.id);
      if (k.k === "counter" && !short && powered(c.id, k.r1, k.r2)) next.add(c.id + ":R");
    }
    const solenoids = new Set<string>();
    const solLabels = new Set(parts.filter(({ c }) => kinds.get(c.id)!.k === "solenoid" && next.has(c.id)).map(({ c }) => (kinds.get(c.id) as any).label).filter(Boolean));
    for (const { c, part } of parts) {
      const v = valveInfo(part);
      if (!v) continue;
      const mid = (v.boxes[0][0] + v.boxes[v.boxes.length - 1][1]) / 2;
      part.ports.forEach((q) => { if (q.kind === "UEConnection" && q.label && solLabels.has(q.label)) solenoids.add(c.id + ":" + (q.x < mid ? "L" : "R")); });
    }
    const latching = new Set([...manual].filter((id) => /^E_S03|schalter/i.test(parts.find((x) => x.c.id === id)!.part.cls)));
    res = { netOf, plus, minus, short, on: next, closed, solenoids, manual, latching };
    const same = next.size === on.size && [...next].every((x) => on.has(x));
    on = next;
    if (same) break;
  }
  return res!;
}

/** advance timers and counters after a solve (returns a new state, or the same one if nothing changed) */
export function stepElectric(comps: FComp[], r: ElecResult, st: ElecState, now: number): ElecState {
  let changed = false;
  const tOn = { ...st.tOn }, count = { ...st.count };
  const on = [...r.on].sort();
  if (on.join() !== st.on.join()) changed = true;
  for (const c of comps) {
    const part = partOf(c); if (!part) continue;
    const k = eKind(part) as any;
    if (k.k === "timer" && k.label) {
      const powered = r.on.has(c.id);
      if (powered && tOn[k.label] === undefined) { tOn[k.label] = now; changed = true; }
      if (!powered && tOn[k.label] !== undefined) { delete tOn[k.label]; changed = true; }
    }
    if (k.k === "counter" && k.label) {
      const cur = count[k.label] || { n: 0, was: false }, pulse = r.on.has(c.id);
      let n = cur.n;
      if (r.on.has(c.id + ":R")) n = 0;
      else if (pulse && !cur.was) n = cur.n + 1;
      if (n !== cur.n || pulse !== cur.was) { count[k.label] = { n, was: pulse }; changed = true; }
    }
  }
  return changed ? { tOn, count, on } : st;
}
