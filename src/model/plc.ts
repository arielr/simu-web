// @ts-nocheck
/**
 * PLCs for the electrical program: terminal layouts of a few common compact controllers and a
 * small program language evaluated every scan.
 *
 * Program: one assignment per line, e.g.
 *   Q0 = (I0 | Q0) & !I1        start/stop with self-holding
 *   M0 = I2 AND NOT I3          internal marker
 *   Q0.1 = TON(I0.2, 3)         on-delay: true after the input has been on for 3 s
 * Operators: !, NOT, /  ·  &, AND, *  ·  |, OR, +  ·  parentheses  ·  0 / 1.
 * Names are the controller's own addresses (I0 / %I0 / I0.0 …), outputs Q…, markers M….
 * Drawings are original; the terminal names follow the manufacturers' documentation.
 */

/* terminal spec "label:role:group[:address]"; role: in, icom, out, ocom, L, N, pe, dc+, dc-, sup+, sup-, x (unused); '' = gap */
type Spec = string;
export interface PlcModel { name: string; maker: string; top: Spec[]; bottom: Spec[]; power: "ac" | "dc"; addr: "flat" | "byte" }

const seq = (from: number, to: number, f: (i: number) => Spec) => Array.from({ length: to - from + 1 }, (_, k) => f(from + k));
const byteBits = (byte: number, from: number, to: number) => seq(from, to, (b) => `.${b}`).map((s, k) => [s, byte, from + k] as const);

export const PLC_MODELS: Record<string, PlcModel> = {
  plc_m221: {
    name: "M221 TM221C16R", maker: "Schneider", power: "ac", addr: "flat",
    top: ["24V:sup+", "0V:sup-", "COM:icom:0", ...seq(0, 8, (i) => `I${i}:in:0:I${i}`)],
    bottom: ["L:L", "N:N", "PE:pe", "", "COM0:ocom:0", ...seq(0, 3, (i) => `Q${i}:out:0:Q${i}`), "COM1:ocom:1", ...seq(4, 6, (i) => `Q${i}:out:1:Q${i}`)],
  },
  plc_m241: {
    name: "M241 TM241CE40U", maker: "Schneider", power: "ac", addr: "flat",
    top: ["24V:sup+", "0V:sup-", "COM0:icom:0", ...seq(0, 3, (i) => `I${i}:in:0:I${i}`), "COM1:icom:1", ...seq(4, 7, (i) => `I${i}:in:1:I${i}`),
      "COM2:icom:2", ...seq(8, 23, (i) => `I${i}:in:2:I${i}`)],
    bottom: ["L:L", "N:N", "PE:pe", "", "V0+:x", "V0-:ocom:0", ...seq(0, 3, (i) => `TR${i}:out:0:Q${i}`), "", "COM1:ocom:1", ...seq(4, 7, (i) => `Q${i}:out:1:Q${i}`),
      "COM2:ocom:2", "Q8:out:2:Q8", "COM3:ocom:3", ...seq(9, 11, (i) => `Q${i}:out:3:Q${i}`), "COM4:ocom:4", "Q12:out:4:Q12", "Q13:out:4:Q13",
      "COM5:ocom:5", "Q14:out:5:Q14", "COM6:ocom:6", "Q15:out:6:Q15"],
  },
  plc_s7200: {
    name: "S7-200 CPU 226", maker: "Siemens", power: "ac", addr: "byte",
    top: ["1L:ocom:0", ...byteBits(0, 0, 3).map(([l, B, b]) => `${B}${l}:out:0:Q${B}.${b}`), "2L:ocom:1", ...byteBits(0, 4, 7).map(([l, B, b]) => `${B}${l}:out:1:Q${B}.${b}`),
      "1.0:out:1:Q1.0", "", "3L:ocom:2", ...byteBits(1, 1, 7).map(([l, B, b]) => `${B}${l}:out:2:Q${B}.${b}`), "", "L1:L", "N:N", "PE:pe"],
    bottom: ["1M:icom:0", ...byteBits(0, 0, 7).map(([l, B, b]) => `0${l}:in:0:I${B}.${b}`), ...byteBits(1, 0, 4).map(([l, B, b]) => `1${l}:in:0:I${B}.${b}`),
      "", "2M:icom:1", ...byteBits(1, 5, 7).map(([l, B, b]) => `1${l}:in:1:I${B}.${b}`), ...byteBits(2, 0, 7).map(([l, B, b]) => `2${l}:in:1:I${B}.${b}`), "", "M:sup-", "L+:sup+"],
  },
  plc_c24: {
    name: "Compact PLC 24 DI / 16 DO", maker: "", power: "dc", addr: "flat",
    top: ["COM0:icom:0", ...seq(0, 11, (i) => `${i}:in:0:I${i}`), "COM1:icom:1", ...seq(12, 23, (i) => `${i}:in:1:I${i}`)],
    bottom: ["24V+:dc+", "24V-:dc-", "PE:pe", "", "V0-:ocom:0", "0:out:0:Q0", "V1-:ocom:1", "1:out:1:Q1", "", "COM2:ocom:2", ...seq(2, 5, (i) => `${i}:out:2:Q${i}`),
      "COM3:ocom:3", ...seq(6, 9, (i) => `${i}:out:3:Q${i}`), "COM4:ocom:4", ...seq(10, 13, (i) => `${i}:out:4:Q${i}`), "COM5:ocom:5", "14:out:5:Q14", "COM6:ocom:6", "15:out:6:Q15"],
  },
  plc_s71214: {
    name: "S7-1200 CPU 1214C AC/DC/RLY", maker: "Siemens", power: "ac", addr: "byte",
    top: ["L1:L", "N:N", "PE:pe", "", "L+:sup+", "M:sup-", "", "1M:icom:0", ...byteBits(0, 0, 7).map(([l, B, b]) => `${l}:in:0:I${B}.${b}`),
      ...byteBits(1, 0, 5).map(([l, B, b]) => `1${l}:in:0:I${B}.${b}`)],
    bottom: ["1L:ocom:0", ...byteBits(0, 0, 4).map(([l, B, b]) => `${l}:out:0:Q${B}.${b}`), "", "2L:ocom:1", ...byteBits(0, 5, 7).map(([l, B, b]) => `${l}:out:1:Q${B}.${b}`),
      ...byteBits(1, 0, 1).map(([l, B, b]) => `1${l}:out:1:Q${B}.${b}`)],
  },
};

export const PLC_H = 9; // body height in grid steps (top terminals at y=0, bottom at y=PLC_H)
export interface PlcPin { label: string; role: string; group: number; addr: string; x: number; y: number }
export interface PlcLayout { pins: PlcPin[]; cols: number; inputs: number[]; outputs: number[]; L: number; N: number; dcp: number; dcm: number; supP: number; supM: number }

const cache: Record<string, PlcLayout> = {};
export function plcLayout(type: string): PlcLayout {
  if (cache[type]) return cache[type];
  const m = PLC_MODELS[type], pins: PlcPin[] = [];
  const row = (specs: Spec[], y: number) => specs.forEach((s, i) => {
    if (!s) return;
    const [label, role, g, addr] = s.split(":");
    pins.push({ label, role, group: +(g || 0), addr: addr || "", x: i * 2, y });
  });
  row(m.top, 0); row(m.bottom, PLC_H);
  const idx = (r: string) => pins.findIndex((p) => p.role === r);
  const lay = {
    pins, cols: Math.max(m.top.length, m.bottom.length),
    inputs: pins.map((p, i) => (p.role === "in" ? i : -1)).filter((i) => i >= 0),
    outputs: pins.map((p, i) => (p.role === "out" ? i : -1)).filter((i) => i >= 0),
    L: idx("L"), N: idx("N"), dcp: idx("dc+"), dcm: idx("dc-"), supP: idx("sup+"), supM: idx("sup-"),
  };
  return (cache[type] = lay);
}
/** the common terminal of an input or output */
export function plcCom(lay: PlcLayout, i: number): number {
  const p = lay.pins[i], role = p.role === "in" ? "icom" : "ocom";
  return lay.pins.findIndex((q) => q.role === role && q.group === p.group);
}

/* ---------------- program ---------------- */
export const normAddr = (s: string) => s.trim().toUpperCase().replace(/^%/, "").replace(/^([IQM])X?/, "$1");

type Node = { k: "v"; n: string } | { k: "c"; v: boolean } | { k: "not"; a: Node } | { k: "and" | "or"; a: Node; b: Node } | { k: "ton"; a: Node; s: number };
export interface PlcProgram { lines: { target: string; expr: Node }[]; errors: string[] }

function tokenize(src: string): string[] {
  const out: string[] = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if ("()!&|*+/,".includes(c)) { out.push(c); i++; continue; }
    const m = /^%?[A-Za-z][A-Za-z]*\d*(\.\d+)?|^\d+(\.\d+)?/.exec(src.slice(i));
    if (!m) throw new Error(`"${c}"`);
    out.push(m[0]); i += m[0].length;
  }
  return out;
}
function parseExpr(toks: string[]): Node {
  let p = 0;
  const peek = () => toks[p], eat = () => toks[p++];
  const isOr = (t?: string) => t === "|" || t === "+" || t?.toUpperCase() === "OR";
  const isAnd = (t?: string) => t === "&" || t === "*" || t?.toUpperCase() === "AND";
  const isNot = (t?: string) => t === "!" || t === "/" || t?.toUpperCase() === "NOT";
  const or = (): Node => { let a = and(); while (isOr(peek())) { eat(); a = { k: "or", a, b: and() }; } return a; };
  const and = (): Node => { let a = un(); while (isAnd(peek())) { eat(); a = { k: "and", a, b: un() }; } return a; };
  const un = (): Node => {
    const t = eat();
    if (t === undefined) throw new Error("…");
    if (isNot(t)) return { k: "not", a: un() };
    if (t === "(") { const e = or(); if (eat() !== ")") throw new Error(")"); return e; }
    if (t === "0" || t === "1") return { k: "c", v: t === "1" };
    if (t.toUpperCase() === "TON" && peek() === "(") {
      eat(); const a = or(); if (eat() !== ",") throw new Error(","); const s = parseFloat(eat() || ""); if (eat() !== ")") throw new Error(")");
      if (!(s >= 0)) throw new Error("TON"); return { k: "ton", a, s };
    }
    if (/^%?[IQM]/i.test(t)) return { k: "v", n: normAddr(t) };
    throw new Error(`"${t}"`);
  };
  const e = or();
  if (p < toks.length) throw new Error(`"${toks[p]}"`);
  return e;
}
export function parseProgram(src: string): PlcProgram {
  const lines: PlcProgram["lines"] = [], errors: string[] = [];
  (src || "").split(/\n/).forEach((raw, n) => {
    const line = raw.replace(/\/\/.*$|#.*$/, "").trim();
    if (!line) return;
    const m = /^(%?[QM][\w.]*)\s*(:?=)\s*(.+)$/i.exec(line);
    if (!m) { errors.push(`${n + 1}: Q… = …`); return; }
    try { lines.push({ target: normAddr(m[1]), expr: parseExpr(tokenize(m[3])) }); } catch (e) { errors.push(`${n + 1}: ${e.message}`); }
  });
  return { lines, errors };
}
/**
 * One scan: inputs and previous memory -> new memory (outputs and markers).
 * timers: per line index, the time the TON input became true (kept by the caller), now in ms.
 */
export function scan(prog: PlcProgram, inputs: Record<string, boolean>, mem: Record<string, boolean>, timers: Record<string, number>, now: number) {
  const out = { ...mem }, tOn = { ...timers };
  const val = (nd: Node, key: string): boolean => {
    switch (nd.k) {
      case "c": return nd.v;
      case "v": return nd.n[0] === "I" ? !!inputs[nd.n] : !!out[nd.n];
      case "not": return !val(nd.a, key + "n");
      case "and": return val(nd.a, key + "a") && val(nd.b, key + "b");
      case "or": return val(nd.a, key + "a") || val(nd.b, key + "b");
      case "ton": {
        const a = val(nd.a, key + "t");
        if (!a) { delete tOn[key]; return false; }
        if (tOn[key] === undefined) tOn[key] = now;
        return now - tOn[key] >= nd.s * 1000;
      }
    }
  };
  prog.lines.forEach((l, i) => { out[l.target] = val(l.expr, "L" + i); });
  return { mem: out, timers: tOn };
}
/** addresses used by a model, for the help text */
export const plcAddrs = (type: string) => { const lay = plcLayout(type); return { ins: lay.inputs.map((i) => lay.pins[i].addr), outs: lay.outputs.map((i) => lay.pins[i].addr) }; };
