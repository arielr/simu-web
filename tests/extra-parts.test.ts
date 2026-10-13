import { describe, expect, it } from "vitest";
import { solve } from "../src/sim/solve";
import { pinsOf } from "../src/model/geometry";
import { gate } from "../src/model/extras";
import { parseCad } from "../src/cad/format";
import { readFileSync } from "node:fs";

let n = 0;
const inp = (o: any = {}) => ({ press: {}, sw: {}, trip: {}, off: {}, ...o });
/** wire a -> b through a lane row (vertical, horizontal, vertical) */
const via = (a: number[], b: number[], lane: number) => [[a, [a[0], lane]], [[a[0], lane], [b[0], lane]], [[b[0], lane], b]]
  .filter(([p, q]) => p[0] !== q[0] || p[1] !== q[1]).map(([p, q]) => ({ id: "w" + n++, a: p, b: q, v: false, kind: "ph" }));
const P = (c: any, i: number) => pinsOf(c)[i];
/** run the solver a few frames, carrying coils like the editor does */
function run(comps: any[], wires: any[], frames: any[]) {
  let coils = {}, r: any;
  for (const [i, t] of frames) { r = solve(comps, wires, i, coils, {}, t); coils = r.coils; }
  return r;
}

describe("more CADe SIMU parts", () => {
  const sup = { id: "s", type: "supply", x: 0, y: 0, rot: 0, tag: "X" }; // L (0,0), N (2,0)

  it("I-0-II switch: position I feeds output 2, position 0 nothing, II output 3", () => {
    const sw = { id: "q", type: "sw_i0ii", x: 10, y: 10, rot: 0, tag: "S1" };
    const h1 = { id: "h1", type: "lamp", x: 30, y: 20, rot: 0, tag: "H1" }, h2 = { id: "h2", type: "lamp", x: 40, y: 20, rot: 0, tag: "H2" };
    const w = [...via(P(sup, 0), P(sw, 0), 5), ...via(P(sw, 1), P(h1, 0), 16), ...via(P(sw, 2), P(h2, 0), 17),
      ...via(P(h1, 1), P(sup, 1), 40), ...via(P(h2, 1), [P(h1, 1)[0], 40], 41)];
    const at = (pos: number) => solve([sup, sw, h1, h2], w, inp({ sw: { q: pos } }), {}, {}, 0).loads;
    expect(at(0)).toMatchObject({ h1: false, h2: false });
    expect(at(1)).toMatchObject({ h1: true, h2: false });
    expect(at(2)).toMatchObject({ h1: false, h2: true });
  });

  it("impulse relay toggles its contacts on each pulse", () => {
    const pb = { id: "b", type: "pb_no", x: 10, y: 6, rot: 0, tag: "S1" };
    const kr = { id: "k", type: "step_relay", x: 10, y: 14, rot: 0, tag: "KA1" };
    const c = { id: "c", type: "no", x: 30, y: 6, rot: 0, tag: "KA1" }, h = { id: "h", type: "lamp", x: 30, y: 14, rot: 0, tag: "H1" };
    const w = [...via(P(sup, 0), P(pb, 0), 3), ...via(P(pb, 1), P(kr, 0), 12), ...via(P(kr, 1), P(sup, 1), 30),
      ...via(P(sup, 0), P(c, 0), 2), ...via(P(c, 1), P(h, 0), 12), ...via(P(h, 1), [P(kr, 1)[0], 30], 31)];
    const C = [sup, pb, kr, c, h];
    const on = inp({ press: { b: true } }), off = inp();
    let r = run(C, w, [[on, 0], [off, 1]]);
    expect(r.loads.h).toBe(true);
    r = run(C, w, [[on, 0], [off, 1], [on, 2], [off, 3]]);
    expect(r.loads.h).toBe(false);
  });

  it("transformer secondary is its own supply; the PSU gives + and −", () => {
    const tr = { id: "t", type: "trafo", x: 10, y: 10, rot: 0, tag: "T1" }, h = { id: "h", type: "lamp", x: 10, y: 24, rot: 0, tag: "H1" };
    const w = [...via(P(sup, 0), P(tr, 0), 5), ...via(P(sup, 1), P(tr, 1), 6), ...via(P(tr, 2), P(h, 0), 20), ...via(P(tr, 3), P(h, 1), 34)];
    expect(run([sup, tr, h], w, [[inp(), 0], [inp(), 1]]).loads.h).toBe(true);
    const ps = { id: "p", type: "psu_v", x: 10, y: 10, rot: 0, tag: "V1" };
    const w2 = [...via(P(sup, 0), P(ps, 0), 5), ...via(P(sup, 1), P(ps, 1), 6), ...via(P(ps, 2), P(h, 0), 20), ...via(P(ps, 3), P(h, 1), 34)];
    const r = run([sup, ps, h], w2, [[inp(), 0], [inp(), 1]]);
    expect(r.loads.h).toBe(true);
    expect(r.potOf(P(ps, 2))).toBe("P");
  });

  it("logic: AND output lights a lamp only when both inputs are at +", () => {
    const bat = { id: "g", type: "supplyDC", x: 0, y: 0, rot: 0, tag: "G" }; // + (0,0), − (2,0)
    const s1 = { id: "a", type: "sel_no", x: 10, y: 6, rot: 0, tag: "S1" }, s2 = { id: "b", type: "sel_no", x: 20, y: 6, rot: 0, tag: "S2" };
    const u = { id: "u", type: "lg_and", x: 10, y: 20, rot: 0, tag: "U1" }, h = { id: "h", type: "lamp", x: 30, y: 20, rot: 0, tag: "H1" };
    const w = [...via(P(bat, 0), P(s1, 0), 3), ...via(P(bat, 0), P(s2, 0), 4), ...via(P(s1, 1), P(u, 0), 12), ...via(P(s2, 1), P(u, 1), 23),
      ...via(P(u, 2), P(h, 0), 18), ...via(P(h, 1), P(bat, 1), 40)];
    const C = [bat, s1, s2, u, h];
    const f = (sw: any) => run(C, w, [[inp({ sw }), 0], [inp({ sw }), 1]]).loads.h;
    expect(f({ a: true })).toBe(false);
    expect(f({ a: true, b: true })).toBe(true);
  });

  it("gates and logic timers", () => {
    expect(gate("xor", [true, false], false, undefined, 0, 1000).q).toBe(true);
    expect(gate("sr", [false, false], true, undefined, 0, 1000).q).toBe(true);
    const a = gate("ton", [true], false, undefined, 0, 1000);
    expect(a.q).toBe(false);
    expect(gate("ton", [true], false, a.t0, 1200, 1000).q).toBe(true);
  });

  it("phase sequence relay operates its contacts only with L1 → L2 → L3", () => {
    const s3 = { id: "s", type: "supply3", x: 0, y: 0, rot: 0, tag: "X" };
    const kp = { id: "k", type: "ph_seq", x: 10, y: 10, rot: 0, tag: "KP1" };
    const ok = [...via(P(s3, 0), P(kp, 0), 4), ...via(P(s3, 1), P(kp, 1), 5), ...via(P(s3, 2), P(kp, 2), 6)];
    expect(solve([s3, kp], ok, inp(), {}, {}, 0).coils.KP1).toBe(true);
    const swapped = [...via(P(s3, 0), P(kp, 0), 4), ...via(P(s3, 1), P(kp, 2), 5), ...via(P(s3, 2), P(kp, 1), 6)];
    expect(solve([s3, kp], swapped, inp(), {}, {}, 0).coils.KP1).toBeUndefined();
  });

  it("CADe SIMU catalog files now open these codes as parts", () => {
    const d = parseCad(readFileSync(__dirname + "/../src/examples/files/catalog3.cad", "latin1"));
    const types = new Set(d.comps.map((c: any) => c.type));
    for (const t of ["lg_and", "lg_or", "step_relay", "relay_spdt", "ph_seq"]) expect(types.has(t)).toBe(true);
  });
});

describe("CADe SIMU limits", () => {
  it("tags longer than 5 characters are shortened in .cad files (CADe SIMU closes on them)", async () => {
    const { writeCad } = await import("../src/cad/format");
    const out = writeCad({ comps: [{ id: "a", type: "step_relay", x: 4, y: 4, rot: 0, tag: "KA9001" }], wires: [], dots: [] } as any);
    expect(out.text).toContain("#-KA900#");
    expect(out.shortened).toBe(1);
  });
});
