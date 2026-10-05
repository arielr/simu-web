import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { importCt } from "../src/fluid/ctImport";
import { solveFluid, emptySim, roleOf, stepCylinders } from "../src/fluid/sim";

const load = (f: string) => importCt(new Uint8Array(readFileSync(join(__dirname, "fixtures/fluidsim", f))));
const valveOf = (d: ReturnType<typeof load>, id: string) => { const r = roleOf(d.comps.find((c) => c.id === id)!.part!); if (r.kind !== "valve") throw 0; return r.v; };

describe("FluidSIM valves read from their drawing", () => {
  it("5/2 valve: both positions, pilot on the left, memory (no spring)", () => {
    const v = valveOf(load("cyl-valves-2.ct"), "f3");
    expect(v.boxes.length).toBe(2);
    // ports: 0=4 (top left) 1=2 (top right) 2=5 3=1(P) 4=3
    expect(v.conn[0]).toEqual([[0, 3], [1, 4]]); // 1→4, 2→3
    expect(v.conn[1]).toEqual([[0, 2], [1, 3]]); // 4→5, 1→2
    expect(v.left.kind).toBe("pilot");
    expect(v.springL || v.springR).toBe(false);
  });
  it("3/2 push-button valve, spring return to closed", () => {
    const v = valveOf(load("cyl-valves-2.ct"), "f25");
    expect(v.conn).toEqual([[[0, 1]], [[0, 2]]]);
    expect(v.left.kind).toBe("manual");
    expect(v.reset).toBe(1);
  });
  it("4/2 solenoid valve (hydraulic): cross and parallel boxes", () => {
    const v = valveOf(load("hyd-electro-cylinder.ct"), "f20");
    expect(v.conn).toEqual([[[0, 3], [1, 2]], [[0, 2], [1, 3]]]);
    expect(v.left.kind).toBe("solenoid");
  });
});

describe("FluidSIM simulation", () => {
  it("two-hand control: the cylinder moves only with both buttons", () => {
    const d = load("cyl-5-2-valve.ct"), s = emptySim();
    const run = (a: boolean, b: boolean) => { s.act = { "f19:L": a, "f29:L": b }; return solveFluid(d.comps, d.tubes, s); };
    expect(run(false, false).dir.f0).toBe(-1);
    expect(run(true, false).dir.f0).toBe(-1);
    expect(run(false, true).dir.f0).toBe(-1);
    expect(run(true, true).dir.f0).toBe(1);
    expect(run(true, true).pos.f3).toBe(0);
  });
  it("memory valve keeps its position after the buttons are released", () => {
    const d = load("cyl-valves-2.ct"), s = emptySim();
    s.act = { "f25:L": true, "f15:L": true };
    const r = solveFluid(d.comps, d.tubes, s);
    expect(r.dir.f0).toBe(1);
    s.pos = r.pos; s.act = {};
    const r2 = solveFluid(d.comps, d.tubes, s);
    expect(r2.pos.f3).toBe(0);
    expect(r2.dir.f0).toBe(1);
  });
  it("hydraulics: pump → 4/2 valve → cylinder, solenoid reverses it", () => {
    const d = load("hyd-electro-cylinder.ct"), s = emptySim();
    expect(solveFluid(d.comps, d.tubes, s).dir.f13).toBe(1);
    s.act["f20:L"] = true;
    expect(solveFluid(d.comps, d.tubes, s).dir.f13).toBe(-1);
  });
  it("cylinders travel their stroke over time", () => {
    let ext = { c: 0 };
    for (let i = 0; i < 30; i++) ext = stepCylinders(ext, { c: 1 }, 0.05).ext as any;
    expect(ext.c).toBe(1);
  });
});

describe("FluidSIM file with explicit connections and a distance rule", () => {
  const d = load("user-noname1.ct");
  it("tubes come from the CON lines", () => {
    expect(d.tubes.map((t) => `${t.a.c}.${t.a.p}-${t.b.c}.${t.b.p}`)).toEqual(
      ["f0.0-f7.0", "f0.1-f7.1", "f3.0-f19.1", "f5.0-f29.1", "f7.3-f39.0", "f7.5-f19.0", "f7.6-f29.0"]);
  });
  it("roller valve A1 is operated when the cylinder reaches 100 %", () => {
    const s = emptySim();
    s.act["f19:L"] = true; // close the normally-open valve so only the roller pilots the 5/2 valve
    s.ext.f0 = 0.5;
    expect(solveFluid(d.comps, d.tubes, s).pos.f29).toBe(1);
    s.ext.f0 = 1;
    expect(solveFluid(d.comps, d.tubes, s).pos.f29).toBe(0);
  });
});
