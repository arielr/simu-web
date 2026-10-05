/**
 * Converts a FluidSIM .ct file into the editor model.
 * - Every non-port object becomes a component. Its drawing comes from the
 *   file's own SYM block (named by the dxf_prim_list property), falling back
 *   to the catalog; port positions come from the file's port objects.
 * - Tubes: a port's `L` lines are the bend points of the tube that starts at
 *   that port (x/y relative to the port box corner). The tube ends at the port
 *   that lies straight across from the last bend.
 */
import { readCt, CtObject } from "./ctFormat";
import { FLUID_CATALOG, FluidPart } from "./catalog";
import type { FComp, FluidDoc, Tube } from "./model";
import { portsOf } from "./model";

const PORT = /Connection$/; // junctions (…Triconnection) are components with three ports
const SKIP = new Set(["text", "BITMAP", "RTF_TEXT", "GRAPHRECT", "group", "DIAGRAM", "PART_LIST", "DXF", "CAD_RECT", "SLIDER", "GRAPHIO"]);

/**
 * Tube polyline stored on a port: every `L a b c d` is one segment from (a, b) to
 * (c + w, d + w), relative to the port box corner, where w is the port box size.
 */
export function tubePoints(o: CtObject): [number, number][] {
  const w = o.box[2] - o.box[0], out: [number, number][] = [];
  const add = (x: number, y: number) => { const l = out[out.length - 1]; if (!l || l[0] !== x || l[1] !== y) out.push([x, y]); };
  for (const [a, b, c, d] of o.lines) { add(o.box[0] + a, o.box[1] + b); add(o.box[0] + c + w, o.box[1] + d + w); }
  return out;
}

const centre = (o: CtObject): [number, number] => [(o.box[0] + o.box[2]) >> 1, (o.box[1] + o.box[3]) >> 1];

export interface CtImport extends FluidDoc { skipped: Record<string, number>; program: "P" | "H" | "?" }

export function importCt(bytes: Uint8Array, name = ""): CtImport {
  const ct = readCt(bytes);
  const byId = new Map(ct.objects.map((o) => [o.id, o]));
  const cfgOf = (cls: string) => {
    const l = ct.classes.find((c) => c.split(" ")[0] === cls);
    return l && l.includes(" ") ? l.slice(cls.length + 1) : "";
  };
  const comps: FComp[] = [];
  const portOwner = new Map<number, { c: string; p: number }>();
  const skipped: Record<string, number> = {};
  for (const o of ct.objects) {
    if (PORT.test(o.cls)) continue;
    if (SKIP.has(o.cls)) { skipped[o.cls] = (skipped[o.cls] || 0) + 1; continue; }
    const cfg = cfgOf(o.cls);
    const key = cfg ? `${o.cls}|${cfg}` : o.cls;
    const base: FluidPart | undefined = FLUID_CATALOG[key] || Object.values(FLUID_CATALOG).find((p) => p.cls === o.cls);
    const rot = ((o.rot % 360) + 360) % 360;
    const [x0, y0, x1, y1] = o.box;
    const [W, H] = rot === 90 || rot === 270 ? [y1 - y0, x1 - x0] : [x1 - x0, y1 - y0];
    const unrot = (x: number, y: number): [number, number] =>
      rot === 90 ? [y, H - x] : rot === 180 ? [W - x, H - y] : rot === 270 ? [W - y, x] : [x, y];
    const ports = o.ports.map((id) => byId.get(id)).filter((p): p is CtObject => !!p && PORT.test(p.cls));
    const symId = o.props.dxf_prim_list?.value;
    const sym = symId && /^\d+$/.test(symId) ? ct.symbols[+symId] || [] : [];
    const part: FluidPart = {
      ...(base || { cls: o.cls, config: cfg, programs: [], domain: "file", files: [], description: "", model: "", props: {}, fields: {}, sym: [] }),
      size: [W, H],
      sym: sym.length ? sym : base?.sym || [],
      ports: ports.map((p) => {
        const [cx, cy] = centre(p);
        const [ux, uy] = unrot(cx - x0, cy - y0);
        return { kind: p.cls, x: ux, y: uy, label: p.props.description?.value || p.props.label?.value || "", ex: p.props.ex_type?.value || "" };
      }),
      props: Object.fromEntries(Object.entries(o.props).filter(([k]) => !k.endsWith("_FEST") && !k.startsWith("dxf_prim")).map(([k, v]) => [k, v.value])),
    };
    const id = "f" + o.id;
    const label = o.props.label?.value;
    comps.push({ id, key: base ? key : o.cls, x: x0, y: y0, rot, part, tag: label || undefined });
    ports.forEach((p, i) => portOwner.set(p.id, { c: id, p: i }));
  }

  // tubes
  const allPorts = comps.flatMap((c) => portsOf(c).map((p, i) => ({ ref: { c: c.id, p: i }, x: p.ax, y: p.ay, kind: p.kind })));
  const tubes: Tube[] = [];
  if (ct.cons.length) {
    const pc = (id: number) => { const o = byId.get(id)!; return [(o.box[0] + o.box[2]) >> 1, (o.box[1] + o.box[3]) >> 1] as [number, number]; };
    for (const [a, b] of ct.cons) {
      const ra = portOwner.get(a), rb = portOwner.get(b);
      if (!ra || !rb) continue;
      const oa = byId.get(a)!, ob = byId.get(b)!;
      // bends are stored on the port the tube was drawn from
      let pts: [number, number][] = [];
      if (oa.lines.length) pts = tubePoints(oa);
      else if (ob.lines.length) pts = tubePoints(ob).reverse();
      const [sa, sb] = [pc(a), pc(b)];
      const far = (q: [number, number], r: [number, number]) => Math.abs(q[0] - r[0]) > 600 || Math.abs(q[1] - r[1]) > 600;
      pts = pts.filter((q) => far(q, sa) && far(q, sb));
      tubes.push({ id: "t" + tubes.length, a: ra, b: rb, pts });
    }
    const program = /fl_sim_h|FluidSIM-H|HYDRAULIK/i.test(ct.header.join("\n")) ? "H" : /fl_sim_p|FluidSIM-P|PNEUMATIK/i.test(ct.header.join("\n")) ? "P" : "?";
    return { name, comps, tubes, skipped, program };
  }
  const seen = new Set<string>();
  for (const o of ct.objects) {
    if (!PORT.test(o.cls) || !o.lines.length) continue;
    const from = portOwner.get(o.id);
    if (!from) continue;
    const pts = tubePoints(o);
    const start = allPorts.find((p) => p.ref.c === from.c && p.ref.p === from.p)!;
    const last = pts[pts.length - 1];
    let best: (typeof allPorts)[number] | null = null, bd = Infinity;
    for (const p of allPorts) {
      if (p === start || p.kind !== start.kind) continue;
      const dx = Math.abs(p.x - last[0]), dy = Math.abs(p.y - last[1]);
      const d = Math.min(dx, dy) < 600 ? Math.max(dx, dy) : Infinity; // straight across from the last bend
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) continue;
    const k = [from.c, from.p, best.ref.c, best.ref.p].join(":");
    const k2 = [best.ref.c, best.ref.p, from.c, from.p].join(":");
    if (seen.has(k) || seen.has(k2)) continue;
    seen.add(k);
    // drop the first point when it is the port itself
    const at = (q: [number, number], x: number, y: number) => Math.abs(q[0] - x) < 600 && Math.abs(q[1] - y) < 600;
    const bends = pts.filter((q) => !at(q, start.x, start.y) && !at(q, best!.x, best!.y));
    tubes.push({ id: "t" + tubes.length, a: from, b: best.ref, pts: bends });
  }
  const program = /fl_sim_h|FluidSIM-H|HYDRAULIK/i.test(ct.header.join("\n")) ? "H" : /fl_sim_p|FluidSIM-P|PNEUMATIK/i.test(ct.header.join("\n")) ? "P" : "?";
  return { name, comps, tubes, skipped, program };
}
