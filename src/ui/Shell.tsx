/**
 * Single-page entry (used for the one-file build, e.g. the claude.ai artifact).
 * The URL hash picks the program: #electrical, #pneumatic, #hydraulic.
 * The multi-page site (GitHub Pages) uses src/entries/* instead.
 */
import { useEffect, useState } from "react";
import { App as AppJs } from "./App";
import { FluidApp } from "../fluid/FluidApp";
import { Launcher, Prog, PROGS } from "./Launcher";
const App = AppJs as unknown as (p: { onHome?: () => void }) => JSX.Element;

const progOf = (h: string): Prog | "" => (PROGS.includes(h.slice(1) as Prog) ? (h.slice(1) as Prog) : "");

export function Shell() {
  const [prog, setProg] = useState<Prog | "">(() => progOf(location.hash));
  useEffect(() => { const f = () => setProg(progOf(location.hash)); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const go = (p: Prog | "") => { try { history.pushState(null, "", p ? "#" + p : location.pathname + location.search); } catch { /* sandboxed */ } setProg(p); };
  if (prog === "electrical") return <App onHome={() => go("")} />;
  if (prog) return <FluidApp key={prog} domain={prog === "pneumatic" ? "pneu" : "hyd"} onHome={() => go("")} />;
  return <Launcher onOpen={go} />;
}
