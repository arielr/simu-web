import { describe, expect, it } from "vitest";
import { solve } from "../src/sim/solve";
import { pinsOf } from "../src/model/geometry";
import { parseProgram, scan, plcLayout, PLC_MODELS } from "../src/model/plc";

const inp = (press: Record<string, boolean> = {}) => ({ press, sw: {}, trip: {}, off: {} });
let n = 0;
/** wire through a lane: a -> (a.x, lane) -> (b.x, lane) -> b */
const via = (a: number[], b: number[], lane: number) => [[a, [a[0], lane]], [[a[0], lane], [b[0], lane]], [[b[0], lane], b]].map(([p, q]) => ({ id: "w" + n++, a: p, b: q, v: false, kind: "ph" }));
const line = (a: number[], b: number[]) => ({ id: "w" + n++, a, b, v: false, kind: "ph" });

function circuit(prog: string) {
  const sup = { id: "s", type: "supply", x: 0, y: 0, rot: 0, tag: "X" };
  const plc: any = { id: "p", type: "plc_s71214", x: 0, y: 10, rot: 0, tag: "PLC1", prog };
  const pb = { id: "b", type: "pb_no", x: 40, y: 0, rot: 0, tag: "S1" };
  const lamp = { id: "h", type: "lamp", x: 80, y: 60, rot: 0, tag: "H1", color: "green" };
  const P = pinsOf(plc), lay = plcLayout("plc_s71214");
  const at = (f: (q: any) => boolean) => P[lay.pins.findIndex(f)];
  const lbl = (l: string) => at((q) => q.label === l), adr = (a: string) => at((q) => q.addr === a);
  const low = Math.max(...P.map((p) => p[1])) + 2; // lanes below the bottom terminals (the lamp sits below them)
  const wires = [
    line([0, 0], lbl("L1")), line([2, 0], lbl("N")),
    ...via(lbl("L+"), [40, 0], -1), ...via([40, 4], adr("I0.0"), 7), ...via(lbl("M"), lbl("1M"), 8),
    ...via(lbl("L1"), lbl("1L"), low), ...via(adr("Q0.0"), [80, 60], low + 1),
    line([80, 64], [80, 66]), line([80, 66], [100, 66]), line([100, 66], [100, -2]), line([100, -2], [2, -2]), line([2, -2], [2, 0]),
  ];
  return { comps: [sup, plc, pb, lamp], wires };
}

describe("PLC program", () => {
  it("parses addresses in both styles, operators in words and symbols", () => {
    const p = parseProgram("Q0 = (I0 OR Q0) AND NOT I1\n%Q0.1 := I0.0 & !%I0.1 // comment\nM3 = TON(I2, 1.5)");
    expect(p.errors).toEqual([]);
    expect(p.lines.map((l) => l.target)).toEqual(["Q0", "Q0.1", "M3"]);
    expect(parseProgram("Q0 = I0 &").errors.length).toBe(1);
  });
  it("self-holding start/stop", () => {
    const p = parseProgram("Q0 = (I0 | Q0) & !I1");
    let m = scan(p, { I0: true }, {}, {}, 0).mem;
    expect(m.Q0).toBe(true);
    m = scan(p, {}, m, {}, 0).mem;
    expect(m.Q0).toBe(true);
    expect(scan(p, { I1: true }, m, {}, 0).mem.Q0).toBe(false);
  });
  it("on-delay timer", () => {
    const p = parseProgram("Q0 = TON(I0, 2)");
    const a = scan(p, { I0: true }, {}, {}, 1000);
    expect(a.mem.Q0).toBe(false);
    expect(scan(p, { I0: true }, a.mem, a.timers, 3100).mem.Q0).toBe(true);
    expect(scan(p, {}, a.mem, a.timers, 3100).mem.Q0).toBe(false);
  });
  it("every model has inputs, outputs with a common, and power terminals", () => {
    for (const k of Object.keys(PLC_MODELS)) {
      const lay = plcLayout(k);
      expect(lay.inputs.length).toBeGreaterThan(8);
      expect(lay.outputs.length).toBeGreaterThan(6);
      expect(lay.L >= 0 || lay.dcp >= 0).toBe(true);
      const seen = new Set(lay.pins.map((p) => p.x + "," + p.y));
      expect(seen.size).toBe(lay.pins.length); // one grid point per terminal
      for (const p of lay.pins) expect(Math.hypot(p.sx - p.x * 15, p.sy - p.y * 15)).toBeLessThan(11); // close to its screw
    }
  });
});

describe("PLC in the circuit", () => {
  it("a push button on I0.0 lights a lamp on Q0.0 through the program", () => {
    const { comps, wires } = circuit("Q0.0 = I0.0");
    expect(solve(comps, wires, inp(), {}, {}, 0).loads.h).toBe(false);
    const r = solve(comps, wires, inp({ b: true }), {}, {}, 0);
    expect(r.plc.p.on).toBe(true);
    expect(r.plc.p.ins["I0.0"]).toBe(true);
    expect(r.loads.h).toBe(true);
  });
  it("does nothing when the PLC is not powered", () => {
    const { comps, wires } = circuit("Q0.0 = 1");
    const r = solve(comps, wires.slice(1), inp({ b: true }), {}, {}, 0); // L not connected
    expect(r.loads.h).toBe(false);
  });
});
