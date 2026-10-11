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
 * Terminal names and positions follow the controllers' pictures.
 */

/*
 * Each controller is drawn from its picture (src/assets/plc/, supplied by the user). A model lists the
 * picture, the part of it used (crop, in image px) and its terminal rows: the screw centres measured on
 * the picture and, per screw, "label:role:group[:address]".
 * role: in, icom, out, ocom, L, N, pe, dc+, dc-, sup+, sup-, x (no function). Screws without a
 * function in the simulation (serial, analog) get no terminal.
 * The picture is scaled so neighbouring screws are about 2 grid steps apart; each terminal sits on the
 * grid point nearest its screw, joined to it by a short lead.
 */
type Spec = string;
type Row = [y: number, xs: number[], specs: Spec[]];
export interface PlcModel { name: string; maker: string; power: "ac" | "dc"; addr: "flat" | "byte"; img: string; crop: number[]; rows: Row[] }
export interface ImgModel { img: string; crop: number[]; rows: Row[] }

const seq = (from: number, to: number, f: (i: number) => Spec) => Array.from({ length: to - from + 1 }, (_, k) => f(from + k));
const bits = (byte: number, from: number, to: number, f: (l: string, a: string) => Spec) => seq(from, to, (b) => f(`.${b}`, `${byte}.${b}`));
const step = (x0: number, d: number, n: number) => Array.from({ length: n }, (_, i) => Math.round(x0 + i * d));

export const PLC_MODELS: Record<string, PlcModel> = {
  plc_m221: {
    name: "M221 TM221C16R", maker: "Schneider", power: "ac", addr: "flat", img: "m221", crop: [0, 0, 373, 371],
    rows: [
      [26, [150, 168, 185, 203, 221, 239, 256, 274, 292, 310, 327, 345], ["24V:sup+", "0V:sup-", "COM:icom:0", ...seq(0, 8, (i) => `I${i}:in:0:I${i}`)]],
      [322, [204, 222, 240, 258, 276, 292, 310, 328, 346], ["COM0:ocom:0", ...seq(0, 3, (i) => `Q${i}:out:0:Q${i}`), "COM1:ocom:1", ...seq(4, 6, (i) => `Q${i}:out:1:Q${i}`)]],
      [343, [49, 66, 84], ["L:L", "N:N", "PE:pe"]],
    ],
  },
  plc_m241: {
    name: "M241 TM241CE40U", maker: "Schneider", power: "ac", addr: "flat", img: "m241", crop: [0, 0, 796, 437],
    rows: [
      [50, [159, 180, 199, 219, 238, 258, 277, 317, 337, 356, 376, 394, 431, 452, 470, 491, 509, 530, 549, 569, 588, 609, 628, 648, 666, 685, 706, 725, 745],
        ["24V:sup+", "0V:sup-", "COM0:icom:0", ...seq(0, 3, (i) => `I${i}:in:0:I${i}`), "COM1:icom:1", ...seq(4, 7, (i) => `I${i}:in:1:I${i}`),
          "COM2:icom:2", ...seq(8, 23, (i) => `I${i}:in:2:I${i}`)]],
      [346, [228, 249, 268, 288, 307, 327, 385, 406, 426, 445, 466, 484, 505, 524, 544, 563, 583, 602, 623, 641, 660, 680, 699, 720],
        ["V0+:x", "V0-:ocom:0", ...seq(0, 3, (i) => `TR${i}:out:0:Q${i}`), "COM1:ocom:1", ...seq(4, 7, (i) => `Q${i}:out:1:Q${i}`),
          "COM2:ocom:2", "Q8:out:2:Q8", "Q9:out:2:Q9", "COM3:ocom:3", "Q10:out:3:Q10", "Q11:out:3:Q11", "COM4:ocom:4", "Q12:out:4:Q12", "Q13:out:4:Q13",
          "COM5:ocom:5", "Q14:out:5:Q14", "COM6:ocom:6", "Q15:out:6:Q15"]],
      [391, [71, 91, 112], ["L:L", "N:N", "PE:pe"]],
    ],
  },
  plc_s7200: {
    name: "S7-200 CPU 226", maker: "Siemens", power: "ac", addr: "byte", img: "s7200", crop: [0, 0, 660, 282],
    rows: [
      [37, [217, 230, 247, 263, 280, 298, 318, 337, 355, 372, 392, 412, 435, 448, 467, 483, 500, 518, 537, 555, 592, 610, 628],
        ["1L:ocom:0", ...bits(0, 0, 3, (l, a) => `0${l}:out:0:Q${a}`), "2L:ocom:1", ...bits(0, 4, 6, (l, a) => `0${l}:out:1:Q${a}`),
          "3L:ocom:2", "0.7:out:2:Q0.7", "1.0:out:2:Q1.0", "3L:ocom:3", ...bits(1, 1, 7, (l, a) => `1${l}:out:3:Q${a}`), "L1:L", "N:N", "PE:pe"]],
      [238, [133, 148, 165, 183, 200, 218, 237, 255, 273, 292, 310, 330, 352, 372, 400, 413, 430, 448, 465, 483, 500, 518, 537, 555, 575, 593, 617, 637],
        ["1M:icom:0", ...bits(0, 0, 7, (l, a) => `0${l}:in:0:I${a}`), ...bits(1, 0, 4, (l, a) => `1${l}:in:0:I${a}`),
          "2M:icom:1", ...bits(1, 5, 7, (l, a) => `1${l}:in:1:I${a}`), ...bits(2, 0, 7, (l, a) => `2${l}:in:1:I${a}`), "M:sup-", "L+:sup+"]],
    ],
  },
  plc_c24: {
    name: "Compact PLC 24 DI / 16 DO", maker: "", power: "dc", addr: "flat", img: "c24", crop: [270, 0, 726, 428],
    rows: [
      [28, [376, ...step(399, 22.45, 12), 669, ...step(691, 22.45, 12)],
        ["COM0:icom:0", ...seq(0, 11, (i) => `${i}:in:0:I${i}`), "COM1:icom:1", ...seq(12, 23, (i) => `${i}:in:1:I${i}`)]],
      [398, [296, 318, 341, ...step(386, 22.5, 25)],
        ["24V+:dc+", "24V-:dc-", "PE:pe", "V0+:x", "V0-:ocom:0", "0:out:0:Q0", "V1+:x", "V1-:ocom:1", "1:out:1:Q1",
          "COM2:ocom:2", ...seq(2, 5, (i) => `${i}:out:2:Q${i}`), "COM3:ocom:3", ...seq(6, 9, (i) => `${i}:out:3:Q${i}`),
          "COM4:ocom:4", ...seq(10, 13, (i) => `${i}:out:4:Q${i}`), "COM5:ocom:5", "14:out:5:Q14", "COM6:ocom:6", "15:out:6:Q15"]],
    ],
  },
  plc_s71214: {
    name: "S7-1200 CPU 1214C AC/DC/RLY", maker: "Siemens", power: "ac", addr: "byte", img: "s71214", crop: [0, 0, 608, 520],
    rows: [
      [40, [60, 82, 102, 123, 145, 167, 187, 208, 230, 250, 272, 293, 314, 337, 358, 380, 400, 422, 443, 463],
        ["L1:L", "N:N", "PE:pe", "L+:sup+", "M:sup-", "1M:icom:0", ...bits(0, 0, 7, (l, a) => `${l}:in:0:I${a}`), ...bits(1, 0, 5, (l, a) => `${l}:in:0:I${a}`)]],
      [480, [316, 336, 358, 380, 400, 422, 444, 466, 486, 508, 528, 550],
        ["1L:ocom:0", ...bits(0, 0, 4, (l, a) => `${l}:out:0:Q${a}`), "2L:ocom:1", ...bits(0, 5, 7, (l, a) => `${l}:out:1:Q${a}`), ...bits(1, 0, 1, (l, a) => `${l}:out:1:Q${a}`)]],
    ],
  },
};
/** the 24 V DC power supply: left part of the compact PLC picture */
export const PSU_MODEL: ImgModel = { img: "c24", crop: [0, 0, 258, 428], rows: [[43, [46, 66, 158, 180, 202, 228], ["L:L", "N:N", "+:dc+", "+:dc+", "−:dc-", "−:dc-"]]] };

export interface PlcPin { label: string; role: string; group: number; addr: string; x: number; y: number; sx: number; sy: number }
/** picture placement in px relative to the part origin (first terminal): x, y, width, height, scale */
export interface PlcPic { img: string; crop: number[]; x: number; y: number; w: number; h: number; k: number }
export interface PlcLayout { pins: PlcPin[]; pic: PlcPic; inputs: number[]; outputs: number[]; L: number; N: number; dcp: number; dcm: number; supP: number; supM: number }

const G = 15; // px per grid step
export function imgLayout(m: ImgModel): { pins: PlcPin[]; pic: PlcPic } {
  const gaps: number[] = [];
  m.rows.forEach(([, xs]) => xs.forEach((x, i) => { if (i && xs[i] - xs[i - 1] < 30) gaps.push(xs[i] - xs[i - 1]); }));
  gaps.sort((a, b) => a - b);
  const k = (2 * G) / (gaps[gaps.length >> 1] || 20);
  const [cx, cy, cw, ch] = m.crop;
  const raw: PlcPin[] = [];
  m.rows.forEach(([y, xs, specs]) => specs.forEach((s, i) => {
    const [label, role, g, addr] = s.split(":");
    const sx = (xs[i] - cx) * k, sy = (y - cy) * k;
    raw.push({ label, role, group: +(g || 0), addr: addr || "", x: Math.round(sx / G), y: Math.round(sy / G), sx, sy });
  }));
  const ox = raw[0].x, oy = raw[0].y;
  const pins = raw.map((p) => ({ ...p, x: p.x - ox, y: p.y - oy, sx: p.sx - ox * G, sy: p.sy - oy * G }));
  return { pins, pic: { img: m.img, crop: m.crop, x: -ox * G, y: -oy * G, w: cw * k, h: ch * k, k } };
}

const cache: Record<string, PlcLayout> = {};
export function plcLayout(type: string): PlcLayout {
  if (cache[type]) return cache[type];
  const { pins, pic } = imgLayout(PLC_MODELS[type]);
  const idx = (r: string) => pins.findIndex((p) => p.role === r);
  const lay = {
    pins, pic,
    inputs: pins.map((p, i) => (p.role === "in" ? i : -1)).filter((i) => i >= 0),
    outputs: pins.map((p, i) => (p.role === "out" ? i : -1)).filter((i) => i >= 0),
    L: idx("L"), N: idx("N"), dcp: idx("dc+"), dcm: idx("dc-"), supP: idx("sup+"), supM: idx("sup-"),
  };
  return (cache[type] = lay);
}
let psuCache: { pins: PlcPin[]; pic: PlcPic } | null = null;
export const psuLayout = () => (psuCache ||= imgLayout(PSU_MODEL));
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
