/**
 * Data model for the pneumatic / hydraulic editors.
 * Units are FluidSIM units: 1024 = 1 mm. y grows downwards.
 * A component stores the top-left corner of its (rotated) bounding box and a
 * rotation in degrees (0/90/180/270, clockwise on screen, like FluidSIM).
 */
import { FLUID_CATALOG, FluidPart, FluidPort } from "./catalog";

export type FluidDomain = "pneu" | "hyd";
export interface FComp { id: string; key: string; x: number; y: number; rot: number; tag?: string; part?: FluidPart }
export interface PortRef { c: string; p: number }
export interface Tube { id: string; a: PortRef; b: PortRef; pts: [number, number][] }
export interface FluidDoc { name: string; comps: FComp[]; tubes: Tube[] }

export const MM = 1024;
export const SNAP = 1024;
export const PORT_R = 1100;

export const partOf = (c: FComp): FluidPart | undefined => c.part || FLUID_CATALOG[c.key];

export function rotSize(part: FluidPart, rot: number): [number, number] {
  const [w, h] = part.size;
  return rot === 90 || rot === 270 ? [h, w] : [w, h];
}

/** unrotated part coordinates -> rotated, relative to the rotated bbox corner */
export function rotPt(part: FluidPart, rot: number, x: number, y: number): [number, number] {
  const [w, h] = part.size;
  if (rot === 90) return [h - y, x];
  if (rot === 180) return [w - x, h - y];
  if (rot === 270) return [y, w - x];
  return [x, y];
}
/** inverse of rotPt */
export function unrotPt(part: FluidPart, rot: number, x: number, y: number): [number, number] {
  const [w, h] = part.size;
  if (rot === 90) return [y, h - x];
  if (rot === 180) return [w - x, h - y];
  if (rot === 270) return [w - y, x];
  return [x, y];
}
/** SVG transform that maps unrotated part drawing into the rotated bbox */
export function rotTransform(part: FluidPart, rot: number): string {
  const [w, h] = part.size;
  if (rot === 90) return `translate(${h},0) rotate(90)`;
  if (rot === 180) return `translate(${w},${h}) rotate(180)`;
  if (rot === 270) return `translate(0,${w}) rotate(270)`;
  return "";
}

export function portsOf(c: FComp): (FluidPort & { ax: number; ay: number })[] {
  const part = partOf(c);
  if (!part) return [];
  return part.ports.map((p) => {
    const [rx, ry] = rotPt(part, c.rot, p.x, p.y);
    return { ...p, ax: c.x + rx, ay: c.y + ry };
  });
}
export function portPos(comps: FComp[], r: PortRef): [number, number] | null {
  const c = comps.find((k) => k.id === r.c);
  const p = c && portsOf(c)[r.p];
  return p ? [p.ax, p.ay] : null;
}

/** orthogonal route a -> bends -> b, adding an elbow between any two non-aligned points */
export function routeTube(a: [number, number], pts: [number, number][], b: [number, number]): [number, number][] {
  const all = [a, ...pts, b];
  const out: [number, number][] = [all[0]];
  for (let i = 1; i < all.length; i++) {
    const p = out[out.length - 1], q = all[i];
    if (p[0] !== q[0] && p[1] !== q[1]) out.push(i === all.length - 1 ? [q[0], p[1]] : [p[0], q[1]]);
    out.push(q);
  }
  return out;
}

/** port kinds that carry air/oil in each domain (used to filter which ports may be joined) */
export const FLUID_KIND: Record<FluidDomain, string> = { pneu: "PConnection", hyd: "HConnection" };

export const isFluidPart = (p: FluidPart, d: FluidDomain) => p.domain === d || p.domain === d + "-example";
