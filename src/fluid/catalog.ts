/**
 * FluidSIM component catalog, built by tools/fluidsim_catalog.py from the
 * library (sym/**) and example circuits of FluidSIM P 4 and H 4.
 * Key: class name, plus "|configuration" for valves built from a configuration.
 * Coordinates are in FluidSIM units (1024 = 1 mm) relative to the component's
 * top-left corner. `sym` holds the raw SYM primitive lines.
 */
import CATALOG from "./catalog.json";

export interface FluidPort { kind: string; x: number; y: number; label: string; ex: string }
export interface FluidPart {
  cls: string; config: string; programs: ("P" | "H")[]; domain: string; files: string[];
  description: string; model: string; size: [number, number]; ports: FluidPort[]; sym: string[];
  props: Record<string, string>; fields: Record<string, Record<string, string>>;
}
export const FLUID_CATALOG = CATALOG as unknown as Record<string, FluidPart>;
export const fluidPartsByDomain = (domain: string) =>
  Object.entries(FLUID_CATALOG).filter(([, v]) => v.domain === domain || v.domain === domain + "-example");
