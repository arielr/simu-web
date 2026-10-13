import { describe, expect, it } from "vitest";
import { I18N } from "../src/i18n/strings";
import { DESC, ACT_DESC, FORM_DESC } from "../src/i18n/descriptions";
import { COMMON } from "../src/shared/i18n";
import { FS } from "../src/fluid/strings";
import { ES_NAMES } from "../src/fluid/names.es";
import { readFileSync } from "node:fs";

/** every key path of an object (functions and arrays count as leaves) */
const keys = (o: any, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, p + k + ".") : [p + k]));

describe("Spanish translation", () => {
  it.each([
    ["electrical", I18N], ["descriptions", DESC], ["actuators", ACT_DESC], ["contact forms", FORM_DESC], ["shared", COMMON], ["fluid", FS],
  ] as [string, any][])("%s strings have every English key", (_, d) => {
    expect(keys(d.es).sort()).toEqual(keys(d.en).sort());
  });
  it("every FluidSIM part name has a Spanish name", () => {
    const en = [...readFileSync(__dirname + "/../src/fluid/names.ts", "utf8").matchAll(/:\s*\["([^"]*)",\s*"[^"]*"\]/g)].map((m) => m[1]);
    expect(en.filter((n) => !ES_NAMES[n])).toEqual([]);
  });
});
