import { describe, expect, it } from "vitest";
import { buildValve, configOf, defaultConfig, defaultSide, sidePreview, MANUALS, MECHS } from "../src/fluid/valveGen";
import { solveFluid, valveInfo, emptySim } from "../src/fluid/sim";
import type { FluidPart } from "../src/fluid/catalog";

/** connections of a position as sorted port-label groups */
const groups = (p: FluidPart, pos: number) =>
  valveInfo(p)!.conn[pos].map((g) => g.map((i) => p.ports[i].label).sort().join("")).sort();

describe("valve configurator: FluidSIM options", () => {
  it("horizontal mirror swaps the actuated sides and the box order, same behaviour", () => {
    const cfg = defaultConfig(5); // solenoid left, spring right, rest = box 1
    const a = buildValve(cfg, false), b = buildValve({ ...cfg, mirrorH: true }, false);
    const va = valveInfo(a)!, vb = valveInfo(b)!;
    expect(va.left.kind).toBe("solenoid");
    expect(vb.right.kind).toBe("solenoid");
    expect(vb.springL).toBe(true);
    expect(groups(b, vb.reset)).toEqual(groups(a, va.reset));
    const other = (v: typeof va) => (v.reset === 0 ? v.boxes.length - 1 : 0);
    expect(groups(b, other(vb))).toEqual(groups(a, other(va)));
    expect(configOf(b).mirrorH).toBe(true); // the dialog reopens with the same settings
  });

  it("vertical mirror keeps the switching positions", () => {
    const cfg = defaultConfig(4);
    const a = buildValve(cfg, true), b = buildValve({ ...cfg, mirrorV: true }, true);
    const va = valveInfo(a)!, vb = valveInfo(b)!;
    expect(vb.boxes.length).toBe(va.boxes.length);
    for (let i = 0; i < va.boxes.length; i++) expect(groups(b, i)).toEqual(groups(a, i));
    expect(b.ports.find((p) => p.label === "P")!.y).toBe(0); // P now on top
  });

  it("dominant signal decides when both sides are actuated", () => {
    const side = { ...defaultSide(), manual: "button" as const };
    for (const dom of ["L", "R"] as const) {
      const p = buildValve({ ...defaultConfig(5), left: side, right: side, dominant: dom }, false);
      const c = { id: "v", key: "x", x: 0, y: 0, rot: 0, part: p };
      const r = solveFluid([c], [], { ...emptySim(), act: { "v:L": true, "v:R": true } });
      expect(r.pos.v).toBe(dom === "L" ? 0 : 1);
    }
  });

  it("air spring returns like a spring and is stored as PNEU_SPRING", () => {
    const p = buildValve({ ...defaultConfig(3), right: { ...defaultSide(), spring: true, pneuSpring: true } }, false);
    expect(p.props.PNEU_SPRING_R).toBe("TRUE");
    expect(p.props.SPRING_R).toBe("FALSE");
    expect(valveInfo(p)!.springR).toBe(true);
  });

  it("every actuator option draws something", () => {
    for (const m of MANUALS.slice(1)) expect(sidePreview({ manual: m }).sym.length).toBeGreaterThan(2);
    for (const m of MECHS.slice(1)) expect(sidePreview({ mech: m }, true).sym.length).toBeGreaterThan(2);
    expect(sidePreview({ solenoid: true, piloted: true }).sym.some((l) => l.startsWith("5 "))).toBe(true);
  });
});

describe("actuators with detent", () => {
  it("a push button with detent stays pressed (toggle), without detent it springs back", async () => {
    const { clickAction } = await import("../src/fluid/sim");
    const mk = (manual: any) => buildValve({ ...defaultConfig(3), left: { ...defaultSide(), manual }, right: { ...defaultSide(), spring: true } }, false);
    expect(clickAction(mk("button"), 0)!.momentary).toBe(true);
    expect(clickAction(mk("button-d"), 0)!.momentary).toBe(false);
    expect(configOf(mk("lever-d")).left.manual).toBe("lever-d");
  });
});

describe("valve body options", () => {
  it("3/n bodies: all joined, and 1→3 with 2 closed, simulate as drawn", () => {
    const p = buildValve({ ...defaultConfig(3), boxes: ["3all", "3short"], initial: 0 }, false);
    const v = valveInfo(p)!;
    expect(groups(p, 0)).toEqual(["123"]);
    expect(groups(p, 1)).toEqual(["13"]);
    expect(v.boxes.length).toBe(2);
  });
});
