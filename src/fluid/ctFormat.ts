/**
 * Reader for FluidSIM 4 circuit files (.ct).
 *
 * Layout, as found by analysing files saved by FluidSIM P 4:
 *
 *   1. Header: text lines separated by CRLF. Each line is passed through one of
 *      8 byte-substitution tables, chosen by (line length mod 8). The header
 *      lists the object classes used (`OBJ WV_5 ...`), paper size, creator,
 *      and ends with the line `COMPRESS`.
 *   2. Body: one compressed block.
 *        - 14-byte header (little-endian words): type=1, 0, headerLength,
 *          windowSize, maxFill, offsetBits, then a XOR key byte. When the
 *          first raw word is not 1, every body byte is XORed with 0x9a.
 *        - LZ77 stream over a sliding window preloaded with "PREVIEW":
 *            b & 0x80          -> (b & 0x7f) literal bytes follow
 *            length field == 1 -> run of one byte (count = offset field)
 *            length field == 2 -> explicit length in the next byte
 *            otherwise         -> copy `length` bytes from window[offset]
 *          Offsets are absolute window positions, so the window must be
 *          maintained exactly like the original (see `lzDecompress`).
 *   3. Decompressed text: `PREVIEW <n>\n` + n bytes of thumbnail, then a vector
 *      preview (BEGIN_FSPREVIEW..END_FSPREVIEW), the objects, ENDCT, and the
 *      symbol drawings (BEGINSYM..ENDSYM). This part is plain text.
 */
import DEC_TABLES from "./ctTables.json";

const DEC: number[][] = DEC_TABLES as number[][];
export const ENC: number[][] = DEC.map((t) => {
  const inv = new Array(256);
  t.forEach((v, i) => (inv[v] = i));
  return inv;
});

const latin1 = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
};

export function decodeLine(line: Uint8Array): string {
  const t = DEC[line.length % 8];
  let s = "";
  for (let i = 0; i < line.length; i++) s += String.fromCharCode(t[line[i]]);
  return s;
}

export function lzDecompress(d: Uint8Array): { data: Uint8Array; windowSize: number; bits: number } {
  const u16 = (o: number) => d[o] | (d[o + 1] << 8);
  const hl = u16(4), D = u16(6), maxFill = u16(8), bits = u16(10);
  const W = new Uint8Array(0x1000);
  const pre = "PREVIEW";
  for (let i = 0; i < pre.length; i++) W[i] = pre.charCodeAt(i);
  let wpos = pre.length;
  const out: number[] = [];
  let p = hl;
  while (p < d.length) {
    const b = d[p];
    if (b & 0x80) {
      let n = b & 0x7f;
      let q = p + 1;
      if (wpos + n >= D) {
        for (;;) {
          const k = D - wpos - 1;
          if (k > 0) {
            for (let i = 0; i < k; i++) { W[wpos + i] = d[q + i]; out.push(d[q + i]); }
            q += k; n -= k;
          }
          wpos = 0;
          if (n < D) break;
        }
      }
      for (let i = 0; i < n; i++) { W[wpos + i] = d[q + i]; out.push(d[q + i]); }
      wpos += n; p = q + n;
    } else {
      if (p + 1 >= d.length) break; // trailing padding
      const w = (d[p] << 8) | d[p + 1];
      let L = ((w >> bits) + 1) & 0xff;
      const off = w & (D - 1);
      if (L === 1) {
        if (p + 2 >= d.length) break;
        const cnt = off, ch = d[p + 2];
        if (cnt <= maxFill && wpos + cnt < D) { W.fill(ch, wpos, wpos + cnt); wpos += cnt; }
        for (let i = 0; i < cnt; i++) out.push(ch);
        p += 3;
      } else {
        if (L === 2) { p += 1; L = d[p + 1]; }
        const seg = W.slice(off, off + L);
        for (let i = 0; i < seg.length; i++) out.push(seg[i]);
        if (wpos + L + 1 >= D) wpos = 0;
        W.set(seg, wpos);
        wpos += L; p += 2;
      }
    }
  }
  return { data: Uint8Array.from(out), windowSize: D, bits };
}

export interface CtObject {
  cls: string;
  id: number;
  /** bounding box in FluidSIM units (1024 = 1 mm) */
  box: [number, number, number, number];
  rot: number;
  extra: number[];
  /** ` S name type value` properties */
  props: Record<string, { type: string; value: string }>;
  /** ` F group name type value` sub-properties */
  fields: Record<string, Record<string, { type: string; value: string }>>;
  /** tube polyline segments drawn from a connection port, relative to the port */
  lines: [number, number, number, number][];
  /** O-ids of the ports this object owns (from `gateN # ownerIndex portIndex`, indices in file order) */
  ports: number[];
}

export interface CtFile {
  header: string[];
  classes: string[];
  objects: CtObject[];
  symbols: Record<number, string[]>;
  /** explicit tube connections `CON <kind> a b` (object indices in file order), when the file has them */
  cons: [number, number][];
  thumbnail: Uint8Array | null;
  version: string;
}

export function readCt(bytes: Uint8Array): CtFile {
  // 1. header lines
  const header: string[] = [];
  let pos = 0;
  let compressed = false;
  while (pos < bytes.length) {
    let e = pos;
    while (e < bytes.length - 1 && !(bytes[e] === 13 && bytes[e + 1] === 10)) e++;
    const line = decodeLine(bytes.subarray(pos, e));
    header.push(line);
    pos = e + 2;
    if (line === "COMPRESS") { compressed = true; break; }
  }
  if (!compressed) throw new Error("FluidSIM file without COMPRESS section is not supported yet");
  // 2. body
  const raw = bytes.subarray(pos);
  const key = (raw[0] | (raw[1] << 8)) !== 1 ? 0x9a : 0;
  const body = key ? raw.map((b) => b ^ key) : raw;
  const { data } = lzDecompress(body);
  // 3. text
  let text: string;
  let thumbnail: Uint8Array | null = null;
  const nl = data.indexOf(10);
  const first = latin1(data.subarray(0, nl));
  if (first.startsWith("PREVIEW ")) {
    const n = parseInt(first.slice(8), 10);
    thumbnail = data.slice(nl + 1, nl + 1 + n);
    text = latin1(data.subarray(nl + 1 + n));
  } else {
    text = latin1(data);
  }
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const objects: CtObject[] = [];
  const byId = new Map<number, CtObject>();
  const symbols: Record<number, string[]> = {};
  let section: "pre" | "objects" | "sym" | "done" = "pre";
  let cur: CtObject | null = null;
  let curSym: number | null = null;
  const gates: [number, number][] = [];
  const cons: [number, number][] = [];
  const OBJ = /^(\S+) O(\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+)((?: -?\d+)*)$/;
  for (const line of lines) {
    if (section === "pre") { if (line.trim() === "END_FSPREVIEW") section = "objects"; continue; }
    if (section === "objects") {
      if (line === "ENDCT") { section = "done"; continue; }
      const m = OBJ.exec(line);
      if (m) {
        const nums = m[8].trim() ? m[8].trim().split(" ").map(Number) : [];
        cur = { cls: m[1], id: +m[2], box: [+m[3], +m[4], +m[5], +m[6]], rot: +m[7], extra: nums, props: {}, fields: {}, lines: [], ports: [] };
        objects.push(cur); byId.set(cur.id, cur);
        continue;
      }
      const g = /^gate\d+ # (\d+) (\d+)$/.exec(line);
      if (g) { gates.push([+g[1], +g[2]]); continue; }
      const cn = /^CON \S+ (\d+) (\d+)$/.exec(line);
      if (cn) { cons.push([+cn[1], +cn[2]]); continue; }
      if (!cur) continue;
      if (line.startsWith("L ")) { const [, a, b, c, d] = line.split(" ").map(Number); cur.lines.push([a, b, c, d]); continue; }
      const s = /^ S (\S+) (\S+) ?(.*)$/.exec(line);
      if (s) { cur.props[s[1]] = { type: s[2], value: s[3] }; continue; }
      const f = /^ F (\S+) (\S+) (\S+) ?(.*)$/.exec(line);
      if (f) { (cur.fields[f[1]] ||= {})[f[2]] = { type: f[3], value: f[4] }; continue; }
      continue;
    }
    if (section === "done" && line === "BEGINSYM") { section = "sym"; continue; }
    if (section === "sym") {
      if (line === "ENDSYM") break;
      const sm = /^SYM (\d+)$/.exec(line);
      if (sm) { curSym = +sm[1]; symbols[curSym] = []; continue; }
      if (curSym !== null && line) symbols[curSym].push(line);
    }
  }
  // `gateN # a b`: object #b (index in file order) is a port of object #a
  for (const [a, b] of gates) if (objects[a] && objects[b]) objects[a].ports.push(objects[b].id);
  return {
    header,
    version: header[0] || "",
    classes: header.filter((h) => h.startsWith("OBJ ")).map((h) => h.slice(4)),
    objects,
    symbols,
    cons: cons.filter(([a, b]) => objects[a] && objects[b]).map(([a, b]) => [objects[a].id, objects[b].id] as [number, number]),
    thumbnail,
  };
}
