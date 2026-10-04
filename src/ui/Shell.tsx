/**
 * Entry point: three separate programs that share only the language setting.
 * The URL hash picks the program, so each one can be bookmarked or shared:
 *   #electrical  -> CADe SIMU compatible editor (.cad)
 *   #pneumatic   -> FluidSIM P compatible editor (.ct)
 *   #hydraulic   -> FluidSIM H compatible editor (.ct)
 */
import { useEffect, useState } from "react";
import { App as AppJs } from "./App";
const App = AppJs as unknown as (p: { onHome: () => void }) => JSX.Element;
import { FluidApp } from "../fluid/FluidApp";
import { FLUID_CATALOG } from "../fluid/catalog";
import { FluidSymbol } from "../fluid/symbols";
import { Sym } from "./symbols";

type Prog = "" | "electrical" | "pneumatic" | "hydraulic";
const progOf = (h: string): Prog => (["electrical", "pneumatic", "hydraulic"].includes(h.slice(1)) ? (h.slice(1) as Prog) : "");
const initLang = (): "en" | "he" => { try { const l = localStorage.getItem("simu-web-lang"); if (l === "he" || l === "en") return l; } catch { /* */ } return "en"; };

const TXT = {
  en: { dir: "ltr", tag: "Circuit editors and simulators in the browser", open: "Open",
    cards: { electrical: ["Electrical", "Control circuits: contactors, push buttons, timers, motors.", "CADe SIMU .cad"],
      pneumatic: ["Pneumatics", "Cylinders, directional valves, air supply and treatment.", "FluidSIM P .ct"],
      hydraulic: ["Hydraulics", "Pumps, cylinders, motors, pressure and flow valves.", "FluidSIM H .ct"] } },
  he: { dir: "rtl", tag: "עורכי מעגלים וסימולטורים בדפדפן", open: "פתח",
    cards: { electrical: ["חשמל", "מעגלי פיקוד: מגענים, לחצנים, טיימרים, מנועים.", "CADe SIMU .cad"],
      pneumatic: ["פנאומטיקה", "בוכנות, שסתומי כיוון, אספקת אוויר וטיפול בו.", "FluidSIM P .ct"],
      hydraulic: ["הידראוליקה", "משאבות, בוכנות, מנועים, שסתומי לחץ וספיקה.", "FluidSIM H .ct"] } },
};

function Art({ p }: { p: Prog }) {
  if (p === "electrical") return (<svg viewBox="-40 -10 230 90" aria-hidden="true" style={{ color: "var(--ink)" }}>
    <g transform="translate(0,0)"><Sym type="pb" s={{}} /></g><g transform="translate(70,0)"><Sym type="coil" s={{}} /></g><g transform="translate(140,0)"><Sym type="lamp" s={{}} /></g></svg>);
  const keys = p === "pneumatic" ? ["CylPAL2D", "WV_5"] : ["CylH3", "DisplacementPumpFixedH"];
  const parts = keys.map((k) => FLUID_CATALOG[k] || Object.values(FLUID_CATALOG).find((x) => x.cls === k)!).filter(Boolean);
  let x = 0;
  const g = parts.map((part, i) => { const el = <g key={i} transform={`translate(${x},${(40000 - part.size[1]) / 2})`}><FluidSymbol part={part} /></g>; x += part.size[0] + 14000; return el; });
  return <svg className="fl big" viewBox={`-6000 -6000 ${x + 0} 52000`} aria-hidden="true" style={{ color: "var(--ink)" }}>{g}</svg>;
}

export function Shell() {
  const [prog, setProg] = useState<Prog>(() => progOf(location.hash));
  const [lang, setLangS] = useState(initLang);
  const setLang = (l: "en" | "he") => { setLangS(l); try { localStorage.setItem("simu-web-lang", l); } catch { /* */ } };
  useEffect(() => { const f = () => setProg(progOf(location.hash)); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const go = (p: Prog) => { try { history.pushState(null, "", p ? "#" + p : location.pathname + location.search); } catch { location.hash = p; } setProg(p); };
  const home = () => go("");
  useEffect(() => { if (!prog) document.title = "SIMU Web"; }, [prog]);

  if (prog === "electrical") return <App key={lang} onHome={home} />;
  if (prog === "pneumatic" || prog === "hydraulic") return <FluidApp key={prog} domain={prog === "pneumatic" ? "pneu" : "hyd"} lang={lang} setLang={setLang} onHome={home} />;
  const t = TXT[lang];
  return (<div className="launch" dir={t.dir} lang={lang}>
    <header><span className="brand" dir="ltr">SIMU Web</span><span className="tag">{t.tag}</span><span className="spacer"></span>
      <select aria-label="language" value={lang} onChange={(e) => setLang(e.target.value as "en" | "he")}><option value="en">English</option><option value="he">עברית</option></select></header>
    <div className="cards">
      {(["electrical", "pneumatic", "hydraulic"] as Prog[]).map((p) => {
        const [title, desc, fmt] = (t.cards as any)[p];
        return (<button key={p} className="card" data-app={p === "electrical" ? "elec" : p === "pneumatic" ? "pneu" : "hyd"} onClick={() => go(p)}>
          <div className="art"><Art p={p} /></div>
          <div className="ttl">{title}</div><div className="desc">{desc}</div>
          <div className="foot"><span className="chip mono" dir="ltr">{fmt}</span><span className="open">{t.open} →</span></div>
        </button>);
      })}
    </div>
  </div>);
}
