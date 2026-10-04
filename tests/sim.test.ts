import { describe, it, expect } from "vitest";
import { solve } from "../src/sim/solve";
import { cadExample, timerExample, threePhaseExample, test6Example } from "../src/examples/index";

type Inp = { press: any; sw: any; trip: any; off: any; tripTag?: any };
const idle = (): Inp => ({ press: {}, sw: {}, trip: {}, off: {}, tripTag: {} });
const byTag = (d: any, tag: string, type?: string) => d.comps.find((c: any) => c.tag === tag && (!type || c.type === type));
const onLoads = (d: any, r: any) => d.comps.filter((c: any) => r.loads[c.id]).map((c: any) => c.tag);

/** run the solver the way the app does: settle coils and advance timers */
function runner(d: any) {
  let sim = { coils: {}, timers: {} as any };
  return (inp: Inp, now: number) => {
    let r: any;
    for (let k = 0; k < 4; k++) {
      r = solve(d.comps, d.wires, inp, sim.coils, sim.timers, now);
      const timers: any = {};
      r.ttags.forEach((g: string) => {
        const on = !!r.tOn[g], p = sim.timers[g], dl = r.delays[g] ?? 3000;
        if (!p) { if (on) timers[g] = { on: true, t: now, done: false }; return; }
        timers[g] = p.on === on ? p : { on, t: now, done: p.on && now - p.t >= dl };
      });
      sim = { coils: r.coils, timers };
    }
    return solve(d.comps, d.wires, inp, sim.coils, sim.timers, now);
  };
}

describe("simulation", () => {
  it("start/stop with self-holding (CADe SIMU sample)", () => {
    const d = cadExample("en"), run = runner(d);
    expect(run(idle(), 0).coils).toEqual({});
    expect(run({ ...idle(), press: { [byTag(d, "S1").id]: true } }, 10).coils).toEqual({ KM1: true });
    const held = run(idle(), 20);
    expect(held.coils).toEqual({ KM1: true });
    expect(onLoads(d, held)).toContain("M");
    expect(run({ ...idle(), press: { [byTag(d, "S2").id]: true } }, 30).coils).toEqual({});
  });

  it("on-delay timer closes after its delay", () => {
    const d = timerExample("en"), run = runner(d);
    run({ ...idle(), press: { [byTag(d, "S1").id]: true } }, 0);
    expect(onLoads(d, run(idle(), 1000))).not.toContain("H3");
    expect(onLoads(d, run(idle(), 3200))).toContain("H3");
  });

  it("three-phase motor runs forward without a short", () => {
    const d = threePhaseExample("en"), run = runner(d);
    run({ ...idle(), press: { [byTag(d, "S1").id]: true } }, 0);
    const r = run(idle(), 10);
    expect(r.short).toBe(false);
    expect(r.dir[byTag(d, "M1").id]).toBe(1);
  });

  it("MCB + RCD test file behaves like CADe SIMU", () => {
    const d = test6Example("en");
    const lamps = (inp: Inp) => {
      const r = solve(d.comps, d.wires, inp, {}, {}, 0);
      return d.comps.filter((c: any) => c.type === "lamp").map((c: any) => !!r.loads[c.id]);
    };
    const s1 = byTag(d, "S1").id, s2 = byTag(d, "S2").id;
    const rcd = d.comps.find((c: any) => c.type === "breaker2").id;
    expect(lamps(idle())).toEqual([true, false]);
    expect(lamps({ ...idle(), press: { [s1]: true } })).toEqual([false, false]);
    expect(lamps({ ...idle(), sw: { [s2]: true } })).toEqual([true, true]);
    expect(lamps({ ...idle(), sw: { [s2]: true }, off: { [rcd]: true } })).toEqual([false, false]);
  });
});
