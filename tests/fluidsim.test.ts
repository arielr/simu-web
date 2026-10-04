import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readCt } from "../src/fluid/ctFormat";

const load = (n: string) => new Uint8Array(readFileSync(join(__dirname, "fixtures/fluidsim", n)));

describe("FluidSIM .ct reader", () => {
  it("decodes header, objects, ports and symbols of a pneumatic circuit", () => {
    const f = readCt(load("cyl-5-2-valve.ct"));
    expect(f.version.startsWith("FluidSIM Schaltkreis4")).toBe(true);
    expect(f.classes.map((c) => c.split(" ")[0])).toEqual(["CylDGPPAB", "WV_5", "PVS3", "WV_3", "PPE1"]);
    const cyl = f.objects.find((o) => o.cls === "CylDGPPAB")!;
    expect(cyl.props.description.value).toBe("Zylinder, doppeltwirkend");
    expect(cyl.props.MoName.value).toBe("Pneu.Actuator.CylinderDA");
    expect(cyl.props.HUB.value).toBe("100"); // stroke in mm
    expect(cyl.ports.length).toBe(2);
    const supply = f.objects.filter((o) => o.cls === "PPE1");
    expect(supply.length).toBe(4);
    expect(supply[0].props.P_LIM.value).toBe("6"); // bar
    expect(f.thumbnail!.length).toBe(2142);
    expect(Object.keys(f.symbols).length).toBeGreaterThan(0);
  });
  it("reads the second file", () => {
    const f = readCt(load("cyl-valves-2.ct"));
    expect(f.objects.some((o) => o.cls === "WV_5")).toBe(true);
    expect(f.objects.every((o) => Number.isInteger(o.id))).toBe(true);
  });
  it("reads an electro-hydraulic circuit from FluidSIM H", () => {
    const f = readCt(load("hyd-electro-cylinder.ct"));
    const cls = new Set(f.objects.map((o) => o.cls));
    for (const c of ["Ag1", "tank1", "CylH3", "HWV_4", "magnet", "lampe"]) expect(cls.has(c)).toBe(true);
    expect(f.objects.some((o) => o.cls === "HConnection")).toBe(true);
    expect(f.objects.some((o) => o.cls === "EConnection")).toBe(true);
  });
});
