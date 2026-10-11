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
  const lamp = { id: "h", type: "lamp", x: 40, y: 24, rot: 0, tag: "H1", color: "green" };
  const P = pinsOf(plc), lay = plcLayout("plc_s71214");
  const at = (label: string, row: number) => P[lay.pins.findIndex((q) => q.label === label && q.y === row)];
  const wires = [
    line([0, 0], at("L1", 0)), line([2, 0], at("N", 0)),
    ...via(at("L+", 0), [40, 0], -1), ...via([40, 4], at(".0", 0), 7), ...via(at("M", 0), at("1M", 0), 8),
    line(at("L1", 0), at("1L", 9)), ...via(at(".0", 9), [40, 24], 22),
    line([40, 28], [40, 30]), line([40, 30], [60, 30]), line([60, 30], [60, -2]), line([60, -2], [2, -2]), line([2, -2], [2, 0]),
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
