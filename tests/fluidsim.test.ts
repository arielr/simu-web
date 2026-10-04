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

import { FLUID_CATALOG } from "../src/fluid/catalog";
import { lzDecompress } from "../src/fluid/ctFormat";

describe("FluidSIM catalog", () => {
  it("covers pneumatic and hydraulic parts with ports", () => {
    const v = Object.values(FLUID_CATALOG);
    expect(v.filter((p) => p.domain.startsWith("pneu")).length).toBeGreaterThan(80);
    expect(v.filter((p) => p.domain.startsWith("hyd")).length).toBeGreaterThan(60);
    const cyl = v.find((p) => p.cls === "CylDGPPAB")!;
    expect(cyl.model).toBe("Pneu.FS4.CylinderDA");
    expect(cyl.ports.map((p) => p.kind)).toEqual(["PConnection", "PConnection"]);
    expect(v.find((p) => p.cls === "tank1")).toBeTruthy();
  });
  it("LZ decoder stops cleanly on trailing padding", () => {
    const hdr = [1, 0, 14, 0x800, 16, 11, 0].flatMap((w) => [w & 255, w >> 8]);
    const d = Uint8Array.from([...hdr, 0x82, 65, 66, 0x00]);
    expect(Array.from(lzDecompress(d).data)).toEqual([65, 66]);
  });
});

import { importCt } from "../src/fluid/ctImport";
import { portPos } from "../src/fluid/model";

describe("FluidSIM import into the editor", () => {
  const load = (f: string) => importCt(new Uint8Array(readFileSync(join(__dirname, "fixtures/fluidsim", f))));
  it("pneumatic circuit: parts, ports and tubes", () => {
    const d = load("cyl-5-2-valve.ct");
    expect(d.comps.map((c) => c.key.split("|")[0])).toEqual(["CylDGPPAB", "WV_5", "PVS3", "WV_3", "WV_3", "PPE1", "PPE1", "PPE1", "PPE1"]);
    expect(d.tubes.length).toBe(8);
    // cylinder ports go to valve ports 4 and 2 (first two ports of the 5/2 valve)
    expect(d.tubes.slice(0, 2).map((t) => [t.a.c, t.b.c])).toEqual([["f0", "f3"], ["f0", "f3"]]);
    // the last bend of every tube is straight across from its end port
    for (const t of d.tubes) {
      const b = portPos(d.comps, t.b)!, last = t.pts[t.pts.length - 1];
      expect(Math.min(Math.abs(b[0] - last[0]), Math.abs(b[1] - last[1]))).toBeLessThan(600);
    }
  });
  it("hydraulic circuit: pump, tank and 4/2 valve connected", () => {
    const d = load("hyd-electro-cylinder.ct");
    const valve = d.comps.find((c) => c.key.startsWith("HWV_4"))!;
    expect(d.tubes.filter((t) => t.b.c === valve.id || t.a.c === valve.id).length).toBe(4);
    expect(d.program).toBe("H");
  });
});
