import { describe, expect, it } from "vitest";
import { FLUID_CATALOG } from "../src/fluid/catalog";
import { buildCyl, cylConfigOf, cylOverlay, defaultCyl, physOf, withParams, shapeKey } from "../src/fluid/cylGen";
import { activeMarks, moveCylinders, roleOf, startSim, SimResult } from "../src/fluid/sim";
import type { FComp } from "../src/fluid/model";

const comp = (part: ReturnType<typeof buildCyl>): FComp => ({ id: "c", key: part.cls + "|gen", part, x: 0, y: 0, rot: 0 });
/** a result with the cap side pressurised and the rod side vented (dir +1), or the reverse */
function res(d: 1 | -1): SimResult {
  const netOf = new Map([["c:0", 1], ["c:1", 2]]);
  return { netOf, pressure: new Set([d > 0 ? 1 : 2]), vent: new Set([d > 0 ? 2 : 1]), pos: {}, dir: { c: d } };
}
/** seconds to reach the end of stroke */
function strokeTime(cfg = defaultCyl(), d: 1 | -1 = 1, limit = 30) {
  const c = comp(buildCyl(cfg, false));
  let st = startSim([c]), t = 0;
  if (d < 0) st.ext.c = 1;
  while (t < limit) {
    const m = moveCylinders([c], st, res(d), 0.01, false);
    st = { ...st, ext: m.ext, vel: m.vel, force: m.force };
    t += 0.01;
    if ((d > 0 && st.ext.c >= 1) || (d < 0 && (st.ext.c ?? 0) <= 0)) return t;
  }
  return Infinity;
}

describe("cylinder configurator", () => {
  it("round-trips a configuration through the part", () => {
    const cfg = { ...defaultCyl(), stroke: 250, dPiston: 32, dRod: 12, mass: 5, friction: 2, marks: [{ label: "1S1", start: 0, end: 0 }, { label: "1S2", start: 240, end: 250 }] };
    const back = cylConfigOf(buildCyl(cfg, false));
    expect(back).toEqual(cfg);
  });

  it("reads FluidSIM cylinder properties (areas -> diameters, rod type, single acting)", () => {
    const h = cylConfigOf(FLUID_CATALOG.CylH3);
    expect(h.dPiston).toBeCloseTo(16, 1);
    expect(h.dRod).toBeCloseTo(10, 1);
    expect(h.stroke).toBe(200);
    expect(h.type).toBe("da");
    const s = cylConfigOf(FLUID_CATALOG.Zylinder_einfach2);
    expect(s.type).toBe("sa-ret");
    expect(s.spring).toBe(true);
    expect(cylConfigOf(FLUID_CATALOG.CylDGPPPVAB).rod).toBe("none");
    expect(cylConfigOf(FLUID_CATALOG.CylDGPPPVAB).slide).toBe(true);
    expect(cylConfigOf(FLUID_CATALOG.CylPAL2D).through).toBe(true);
  });

  it("keeps the FluidSIM drawing when only parameters change", () => {
    const old = FLUID_CATALOG.CylH3, cfg = { ...cylConfigOf(old), stroke: 300, mass: 2 };
    expect(shapeKey(cfg)).toBe(shapeKey(cylConfigOf(old)));
    const p = withParams(old, cfg, true);
    expect(p.sym).toBe(old.sym);
    expect(p.props.HUB).toBe("300");
    expect(p.props.MASS).toBe("2");
  });

  it("single acting without return spring has no spring role; mirrored cylinder swaps sides", () => {
    const sa = buildCyl({ ...defaultCyl(), type: "sa-ext", spring: false }, false);
    expect(roleOf(sa)).toMatchObject({ kind: "cyl", spring: null });
    expect(roleOf(buildCyl({ ...defaultCyl(), type: "sa-ext" }, false))).toMatchObject({ spring: "b" });
    const m = buildCyl({ ...defaultCyl(), mirrorH: true }, false);
    const r = roleOf(m) as any;
    expect(m.ports[r.a].x).toBeGreaterThan(m.ports[r.b].x); // cap port on the right
  });

  it("a cylinder stored as CylDGPPAB with a normal piston (user file) is not drawn rodless", () => {
    const p = { ...FLUID_CATALOG.CylDGPPAB, props: { ...FLUID_CATALOG.CylDGPPAB.props, piston: "CP", PISTON_COUNT: "1" } };
    expect(cylOverlay(p, 0).some((l) => l.includes(" -5200 "))).toBe(false);
    expect(cylOverlay(FLUID_CATALOG.CylDGPPAB, 0).some((l) => l.includes(" -5200 "))).toBe(true);
  });
});

describe("cylinder physics", () => {
  it("speed depends on stroke, diameter and load; overload stalls", () => {
    const base = strokeTime();
    expect(base).toBeGreaterThan(0.3);
    expect(base).toBeLessThan(1);
    expect(strokeTime({ ...defaultCyl(), stroke: 200 })).toBeCloseTo(base * 2, 0);
    expect(strokeTime({ ...defaultCyl(), dPiston: 40 })).toBeGreaterThan(base * 2); // bigger piston, same flow
    expect(strokeTime({ ...defaultCyl(), force: 150 })).toBeGreaterThan(base * 1.5); // 150 N of 188 N
    expect(strokeTime({ ...defaultCyl(), force: 250 }, 1, 3)).toBe(Infinity);
  });

  it("weight on a vertical cylinder, friction, inertia and cushioning slow it down", () => {
    const base = strokeTime();
    expect(strokeTime({ ...defaultCyl(), mass: 15, angle: 90 })).toBeGreaterThan(base * 1.5);
    expect(strokeTime({ ...defaultCyl(), mass: 15, angle: 90 }, 1, 3)).toBeLessThan(3);
    expect(strokeTime({ ...defaultCyl(), mass: 20, angle: 90 }, 1, 3)).toBe(Infinity); // 196 N > 188 N
    expect(strokeTime({ ...defaultCyl(), mass: 10, friction: 1 })).toBeGreaterThan(base);
    expect(strokeTime({ ...defaultCyl(), damping: true })).toBeGreaterThan(base * 1.1);
    // retracting works on the smaller annular area: faster with the same flow
    expect(strokeTime(defaultCyl(), -1)).toBeLessThan(base);
  });

  it("variable force profile acts only where it is defined", () => {
    const p = physOf(buildCyl({ ...defaultCyl(), constForce: false, profile: [[0, 0], [50, 0], [60, 100], [100, 100]] }, false));
    expect(p.load(10)).toBe(0);
    expect(p.load(55)).toBeCloseTo(50);
    expect(p.load(90)).toBe(100);
  });

  it("marks on the cylinder operate their label inside their range", () => {
    const c = comp(buildCyl({ ...defaultCyl(), marks: [{ label: "1S1", start: 0, end: 0 }, { label: "B", start: 40, end: 60 }] }, false));
    expect([...activeMarks([c], { c: 0 })]).toEqual(["1S1"]);
    expect([...activeMarks([c], { c: 0.5 })]).toEqual(["B"]);
    expect([...activeMarks([c], { c: 0.9 })]).toEqual([]);
  });

  it("starts at the configured piston position", () => {
    expect(startSim([comp(buildCyl({ ...defaultCyl(), pos: 25 }, false))]).ext.c).toBe(0.25);
  });
});
