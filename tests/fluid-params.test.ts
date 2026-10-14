import { describe, expect, it } from "vitest";
import { FLUID_CATALOG } from "../src/fluid/catalog";
import { buildCyl, defaultCyl } from "../src/fluid/cylGen";
import { moveCylinders, roleOf, solveFluid, startSim, throttleFactor, SimResult } from "../src/fluid/sim";
import { cleanParam, colorOf, PARAMS } from "../src/fluid/params";
import type { FComp } from "../src/fluid/model";

const cylPart = buildCyl(defaultCyl(), false);
const cyl: FComp = { id: "c", key: cylPart.cls + "|gen", part: cylPart, x: 0, y: 0, rot: 0 };
const r = roleOf(cylPart) as { kind: "cyl"; a: number; b: number };
const withLevel = (cls: string, level: string, id = "t"): FComp => {
  const base = FLUID_CATALOG[cls];
  return { id, key: cls, part: { ...base, props: { ...base.props, LEVEL: level } }, x: 0, y: 0, rot: 0 };
};
/** cylinder extending (d=+1) or retracting; the throttle sits on the cap side ("a") or the rod side ("b") */
function res(d: 1 | -1, side: "a" | "b"): SimResult {
  const netOf = new Map([[`c:${r.a}`, 1], [`c:${r.b}`, 2], ["t:0", side === "a" ? 1 : 2], ["t:1", side === "a" ? 1 : 2]]);
  return { netOf, pressure: new Set([d > 0 ? 1 : 2]), vent: new Set([d > 0 ? 2 : 1]), pos: {}, dir: { c: d } };
}
function strokeTime(t: FComp | null, d: 1 | -1, side: "a" | "b") {
  const comps = t ? [cyl, t] : [cyl];
  let st = startSim(comps), time = 0;
  st.ext.c = d > 0 ? 0 : 1;
  while (time < 60) {
    const m = moveCylinders(comps, st, res(d, side), 0.01, false);
    st = { ...st, ext: m.ext, vel: m.vel }; time += 0.01;
    if ((d > 0 && m.ext.c >= 1) || (d < 0 && m.ext.c <= 0)) break;
  }
  return time;
}

describe("FluidSIM component parameters", () => {
  it("a two-way throttle slows the cylinder in both directions, more when closed further", () => {
    const free = strokeTime(null, 1, "b");
    const half = strokeTime(withLevel("drossel", "50"), 1, "b");
    const quarter = strokeTime(withLevel("drossel", "25"), 1, "b");
    expect(half).toBeGreaterThan(free * 1.6);
    expect(quarter).toBeGreaterThan(half * 1.6);
    expect(strokeTime(withLevel("drossel", "50"), -1, "b")).toBeGreaterThan(strokeTime(null, -1, "b") * 1.6);
  });
  it("a one-way flow control throttles only the exhausting side (meter-out)", () => {
    const t = withLevel("drorueck", "25");
    expect(throttleFactor([cyl, t], res(1, "b")).c).toBeCloseTo(0.25);
    expect(throttleFactor([cyl, t], res(1, "a")).c).toBe(1);
    expect(throttleFactor([cyl, t], res(-1, "a")).c).toBeCloseTo(0.25);
  });
  it("a throttle at 0 % passes no air", () => {
    const src = { ...FLUID_CATALOG.PPE1 }, s: FComp = { id: "s", key: "PPE1", part: src, x: 0, y: 0, rot: 0 };
    const out = (roleOf(src) as { out: number }).out;
    const t = withLevel("OrificeVariableP", "100");
    const tubes = [{ id: "w1", a: { c: "s", p: out }, b: { c: "t", p: 0 }, pts: [] }, { id: "w2", a: { c: "t", p: 1 }, b: { c: "c", p: r.a }, pts: [] }];
    const fed = (comps: FComp[]) => { const x = solveFluid(comps, tubes as any, startSim(comps)); return x.pressure.has(x.netOf.get(`c:${r.a}`)!); };
    expect(fed([s, t, cyl])).toBe(true);
    expect(fed([s, withLevel("OrificeVariableP", "0"), cyl])).toBe(false);
  });
  it("values are clamped to the ranges of FluidSIM's dialogs", () => {
    expect(cleanParam("LEVEL", "140")).toBe("100");
    expect(cleanParam("N", "3.6")).toBe("4");
    expect(cleanParam("DELAY_TIME", "2,5")).toBe("2.5");
    expect(cleanParam("P_SOLL", "abc")).toBeNull();
    expect(colorOf("255")).toBe("rgb(255,0,0)");
    expect(colorOf("65535")).toBe("rgb(255,255,0)");
    for (const p of Object.values(PARAMS)) expect(p.he && p.es && p.en && p.de).toBeTruthy();
  });
});
