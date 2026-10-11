import { describe, expect, it } from "vitest";
import { solve } from "../src/sim/solve";
import { pinsOf } from "../src/model/geometry";
import { DEFS } from "../src/model/parts";
import { parseCad, writeCad } from "../src/cad/format";
import { rawSym, RAW_DRAWN } from "../src/ui/rawSyms";

const inp = { press: {}, sw: {}, trip: {}, off: {} };
// supply L1 L2 L3 at y=0, motor terminals at y=10: U1 V1 W1 straight below the phases
const sup = { id: "s", type: "supply3", x: 0, y: 0, rot: 0, tag: "X" };
const mot = { id: "m", type: "motor6", x: 0, y: 10, rot: 0, tag: "M1" };
const w = (id: string, a: number[], b: number[]) => ({ id, a, b, v: false, kind: "ph" });
const feed = [w("a", [0, 0], [0, 10]), w("b", [2, 0], [2, 10]), w("c", [4, 0], [4, 10])];

describe("6-terminal motor (CADe SIMU 1001)", () => {
  it("runs in star when W2 U2 V2 are joined", () => {
    const p = pinsOf(mot); // 4: W2, 5: U2, 6: V2 on the bottom row
    const r = solve([sup, mot], [...feed, w("y1", p[4], p[5]), w("y2", p[5], p[6])], inp, {}, {}, 0);
    expect(r.loads.m).toBe(true);
    expect(r.yd.m).toBe("Y");
  });
  it("runs in delta when each winding end goes to the next phase", () => {
    const p = pinsOf(mot); // U2 -> V1 (L2), V2 -> W1 (L3), W2 -> U1 (L1), routed below the motor
    const r = solve([sup, mot], [...feed, w("d1", p[5], [p[5][0], 22]), w("d1b", [p[5][0], 22], [20, 22]), w("d1c", [20, 22], [20, 1]), w("d1d", [20, 1], [2, 1]),
      w("d2", p[6], [p[6][0], 24]), w("d2b", [p[6][0], 24], [22, 24]), w("d2c", [22, 24], [22, 2]), w("d2d", [22, 2], [4, 2]),
      w("d3", p[4], [p[4][0], 26]), w("d3b", [p[4][0], 26], [24, 26]), w("d3c", [24, 26], [24, 3]), w("d3d", [24, 3], [0, 3])], inp, {}, {}, 0);
    expect(r.loads.m).toBe(true);
    expect(r.yd.m).toBe("Δ");
  });
  it("does not run with the winding ends open", () => {
    expect(solve([sup, mot], feed, inp, {}, {}, 0).loads.m).toBe(false);
  });
});

describe("CADe SIMU records", () => {
  it("DC wires (+ 4018, − 4019) are read as wires and written back unchanged", () => {
    const rec = (id: number, code: number, x1: number, y1: number, x2: number, y2: number) => `*${id}*${code}##########*0*0*0*0*0*0*0*0*${x1}*${y1}*${x2}*${y2}*0*0*0*0*0*0*0*0*0*0*0#`;
    const head = "CADe_SIMU*1*20000#XXX#########*0*0*0*0*0*0*0*0*42*486*0*0*0*0*0*0*0*0*0*0*0*0*0#";
    const txt = head + rec(2, 4018, 30, 30, 90, 30) + rec(3, 4019, 30, 60, 90, 60) + "$$$&&&";
    const d = parseCad(txt);
    expect(d.wires.map((x: any) => x.kind)).toEqual(["pos", "neg"]);
    expect(writeCad({ comps: d.comps, wires: d.wires, dots: [], order: d.cadOrder, footer: d.cadFooter }).text).toBe(txt);
  });
  it("tags written without '-' in the file keep that style", () => {
    const txt = "CADe_SIMU*2*2001#KM1##1#3#5#2#4#6##*1*1*1*1*1*1*0*0*42*84*0*0*-12*-3*18*15*0*0*0*1*0*0*0#$$$&&&";
    const d = parseCad(txt);
    expect(d.comps[0].type).toBe("km3");
    expect(writeCad({ comps: d.comps, wires: d.wires, dots: [], order: d.cadOrder, footer: d.cadFooter }).text).toBe(txt);
  });
  it("draws GRAFCET, ladder and text records", () => {
    for (const code of RAW_DRAWN) {
      const cad = { code, text: "X1#########", nums: [0, 0, 0, 0, 0, 0, 0, 0, 30, 30, 60, 33, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], trail: "S1" };
      expect(rawSym(cad)).not.toBeNull();
    }
  });
  it("motor breakers and RCDs have CADe SIMU's terminal depth", () => {
    expect((DEFS as any).mpcb3.pins[3]).toEqual([0, 7]);
    expect((DEFS as any).rcd3n.pins[4]).toEqual([0, 6]);
    expect((DEFS as any).mcb3.pins[3]).toEqual([0, 4]);
  });
});
