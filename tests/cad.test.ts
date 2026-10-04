import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseCad, writeCad } from "../src/cad/format";
import { pinsOf, onSeg } from "../src/model/geometry";

const dirs = [join(__dirname, "../src/examples/files"), join(__dirname, "fixtures")];
const files = dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".cad")).map((f) => join(d, f)));
const read = (p: string) => readFileSync(p, "latin1");

describe("CADe SIMU round-trip", () => {
  for (const f of files) {
    it(`writes ${f.split("/").pop()} back byte-for-byte`, () => {
      const text = read(f);
      const d = parseCad(text);
      const out = writeCad({ comps: d.comps, wires: d.wires, dots: [], order: d.cadOrder, footer: d.cadFooter });
      expect(out.text).toBe(text);
    });
  }
});

/** terminals that the user wired in CADe SIMU must sit on a wire in our model */
function unwiredPins(file: string) {
  const d = parseCad(read(file));
  const segs = d.wires.map((w: any) => [w.a, w.b]);
  const miss: string[] = [];
  for (const c of d.comps) {
    if (c.type === "raw") continue;
    pinsOf(c).forEach((p: number[], i: number) => {
      if (!segs.some(([a, b]: any) => onSeg(p, a, b))) miss.push(`${c.type}#${i}`);
    });
  }
  return { d, miss };
}

describe("terminal positions verified against CADe SIMU wiring", () => {
  it("start/stop sample: every terminal wired", () => {
    expect(unwiredPins(join(dirs[0], "sample.cad")).miss).toEqual([]);
  });
  it("MCB + RCD test (incl. rotated push button): every terminal wired", () => {
    const { d, miss } = unwiredPins(join(dirs[0], "test-mcb-rcd.cad"));
    expect(d.unknown).toBe(0);
    expect(miss).toEqual([]);
  });
  it("timer contacts + battery: only the unwired NO terminal 57 is free", () => {
    const { d, miss } = unwiredPins(join(dirs[1], "test-timer-battery-full.cad"));
    expect(d.unknown).toBe(0);
    expect(miss).toEqual(["ton_pair#1"]);
  });
  it("rotation 3 maps the second terminal of a vertical part to the right", () => {
    expect(pinsOf({ type: "lamp", x: 10, y: 10, rot: 3 })).toEqual([[10, 10], [14, 10]]);
  });
});
