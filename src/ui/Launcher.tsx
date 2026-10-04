/** Launch screen: one card per program. Used by the multi-page site and by the single-file build. */
import { useLang, useTitle } from "../shared/hooks";
import { COMMON } from "../shared/i18n";
import { LangSelect } from "../shared/ui";
import { Sym } from "./symbols";

export type Prog = "electrical" | "pneumatic" | "hydraulic";
export const PROGS: Prog[] = ["electrical", "pneumatic", "hydraulic"];
export const APP_OF: Record<Prog, "elec" | "pneu" | "hyd"> = { electrical: "elec", pneumatic: "pneu", hydraulic: "hyd" };

const TXT = {
  en: { tag: "Circuit editors and simulators in the browser", open: "Open",
    desc: { electrical: "Control circuits: contactors, push buttons, timers, motors.", pneumatic: "Cylinders, directional valves, air supply and treatment.", hydraulic: "Pumps, cylinders, motors, pressure and flow valves." },
    fmt: { electrical: "CADe SIMU .cad", pneumatic: "FluidSIM P .ct", hydraulic: "FluidSIM H .ct" } },
  he: { tag: "עורכי מעגלים וסימולטורים בדפדפן", open: "פתח",
    desc: { electrical: "מעגלי פיקוד: מגענים, לחצנים, טיימרים, מנועים.", pneumatic: "בוכנות, שסתומי כיוון, אספקת אוויר וטיפול בו.", hydraulic: "משאבות, בוכנות, מנועים, שסתומי לחץ וספיקה." },
    fmt: { electrical: "CADe SIMU .cad", pneumatic: "FluidSIM P .ct", hydraulic: "FluidSIM H .ct" } },
};

/** small original drawings, kept free of the parts catalogs so this page stays light */
function Art({ p }: { p: Prog }) {
  if (p === "electrical") return (<svg viewBox="0 -10 170 90" aria-hidden="true">
    <g transform="translate(40,0)"><Sym type="coil" s={{}} /></g><g transform="translate(110,0)"><Sym type="lamp" s={{}} /></g></svg>);
  const cyl = (<g><rect x="0" y="0" width="70" height="26" fill="none" /><rect x="14" y="2" width="4" height="22" fill="currentColor" stroke="none" />
    <line x1="16" y1="13" x2="96" y2="13" strokeWidth="3" /><line x1="8" y1="26" x2="8" y2="40" /><line x1="62" y1="26" x2="62" y2="40" /></g>);
  if (p === "pneumatic") return (<svg viewBox="-6 -6 190 110" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.6">
    {cyl}<g transform="translate(20,50)"><rect width="34" height="26" /><rect x="34" width="34" height="26" />
      <line x1="8" y1="22" x2="26" y2="4" /><line x1="44" y1="4" x2="44" y2="22" /><line x1="60" y1="4" x2="60" y2="22" />
      <polyline points="68,13 72,7 76,19 80,7 84,19 88,13" /><polyline points="0,13 -10,7 -10,19 0,13" /></g>
    <line x1="8" y1="40" x2="28" y2="50" /><line x1="62" y1="40" x2="46" y2="50" />
    <circle cx="37" cy="94" r="7" /><polygon points="33,97 41,97 37,90" fill="currentColor" stroke="none" /><line x1="37" y1="76" x2="37" y2="87" /></g></svg>);
  return (<svg viewBox="-6 -6 190 110" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.6">
    {cyl}<circle cx="130" cy="70" r="16" /><polygon points="123,72 137,72 130,58" fill="currentColor" stroke="none" />
    <line x1="130" y1="54" x2="130" y2="40" /><line x1="130" y1="40" x2="62" y2="40" /><polyline points="112,98 112,104 148,104 148,98" />
    <line x1="130" y1="86" x2="130" y2="102" /><line x1="8" y1="40" x2="8" y2="100" /><line x1="8" y1="100" x2="112" y2="100" /></g></svg>);
}

export function Launcher({ hrefOf, onOpen }: { hrefOf?: (p: Prog) => string; onOpen?: (p: Prog) => void }) {
  const [lang, setLang] = useLang();
  const t = TXT[lang], c = COMMON[lang];
  useTitle("SIMU Web");
  return (<div className="launch" dir={c.dir} lang={lang}>
    <header><span className="brand" dir="ltr">SIMU Web</span><span className="tag">{t.tag}</span><span className="spacer"></span>
      <LangSelect lang={lang} setLang={setLang} /></header>
    <div className="cards">
      {PROGS.map((p) => (<a key={p} className="card" data-app={APP_OF[p]} href={hrefOf ? hrefOf(p) : "#" + p}
        onClick={onOpen ? (e) => { e.preventDefault(); onOpen(p); } : undefined}>
        <div className="art">{<Art p={p} />}</div>
        <div className="ttl">{c.programs[p]}</div><div className="desc">{t.desc[p]}</div>
        <div className="foot"><span className="chip mono" dir="ltr">{t.fmt[p]}</span><span className="open">{t.open} →</span></div>
      </a>))}
    </div>
  </div>);
}
