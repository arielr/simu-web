/** "Configure cylinder" dialog: configuration, parameters, external load, force profile, marks. */
import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Lang } from "../shared/i18n";
import { Dialog } from "../shared/ui";
import { FluidSymbol } from "./symbols";
import { CylConfig, CylMark, MATERIALS, MAX_MARKS, areas, buildCyl } from "./cylGen";

const TX = {
  en: {
    title: "Configure cylinder", tabs: ["Configuration", "Parameters", "External load", "Force profile", "Marks"],
    name: "Component name", rodType: "Piston rod", one: "One rod", two: "Two rods", none: "Rodless", through: "Through rod",
    magnetic: "Magnetic coupling", slide: "With slide", cylType: "Cylinder type", saExt: "Single acting (extending)", saRet: "Single acting (retracting)",
    da: "Double acting", spring: "Return spring", props: "Properties", damping: "Cushioning", adj: "adjustable", detect: "Detection", mark: "Mark",
    mirror: "Mirror", horiz: "Horizontal", vert: "Vertical",
    stroke: "Maximum stroke", pos: "Piston position", dP: "Piston diameter", dR: "Rod diameter", angle: "Mounting angle", leak: "Internal leakage",
    calc: "Calculated", ak: "Piston area", ar: "Annular area", show: "Show values", vel: "Velocity [m/s]", force: "Force [N]",
    mass: "Moving mass", friction: "Friction", material: "Select material", manual: "Enter manually", muS: "Static friction coefficient", muD: "Dynamic friction coefficient",
    note: "The friction force also depends on the mounting angle (see Parameters).",
    constF: "Constant force", varF: "Variable force", range: "Range", del: "Delete", delAll: "Delete all", pPos: "Piston position", fAxis: "Force [N]", xAxis: "Piston position [mm]",
    graphHint: "Click the chart to add a point, drag points to move them. Positive force acts against extension.",
    markHead: ["Mark", "Start", "End"], markHint: "Contacts, proximity switches and roller valves with the same label are operated while the piston is between Start and End.",
    ok: "OK", cancel: "Cancel",
  },
  he: {
    title: "הגדרת בוכנה", tabs: ["תצורה", "פרמטרים", "עומס חיצוני", "פרופיל כוח", "סימונים"],
    name: "שם הרכיב", rodType: "סוג מוט", one: "מוט אחד", two: "שני מוטות", none: "ללא מוט", through: "מוט עובר",
    magnetic: "צימוד מגנטי", slide: "עם מזחלת", cylType: "סוג בוכנה", saExt: "חד-פעולה (יציאה)", saRet: "חד-פעולה (חזרה)",
    da: "דו-פעולה", spring: "קפיץ החזרה", props: "מאפיינים", damping: "ריסון", adj: "מתכוונן", detect: "חישה", mark: "סימון",
    mirror: "שיקוף", horiz: "אופקי", vert: "אנכי",
    stroke: "מהלך מרבי", pos: "מיקום הבוכנה", dP: "קוטר הבוכנה", dR: "קוטר המוט", angle: "זווית התקנה", leak: "דליפה פנימית",
    calc: "ערכים מחושבים", ak: "שטח הבוכנה", ar: "שטח טבעתי", show: "הצג ערכים", vel: "מהירות [m/s]", force: "כוח [N]",
    mass: "מסה נעה", friction: "חיכוך", material: "בחר חומר", manual: "הזנה ידנית", muS: "מקדם חיכוך סטטי", muD: "מקדם חיכוך דינמי",
    note: "כוח החיכוך תלוי גם בזווית ההתקנה (ראה פרמטרים).",
    constF: "כוח קבוע", varF: "כוח משתנה", range: "טווח", del: "מחק", delAll: "מחק הכל", pPos: "מיקום הבוכנה", fAxis: "כוח [N]", xAxis: "מיקום הבוכנה [mm]",
    graphHint: "לחץ על הגרף כדי להוסיף נקודה, גרור נקודות כדי להזיז. כוח חיובי פועל נגד היציאה.",
    markHead: ["סימון", "התחלה", "סוף"], markHint: "מגעים, חיישני קרבה ושסתומי גלגלת עם אותה תווית מופעלים כשהבוכנה בין ההתחלה לסוף.",
    ok: "אישור", cancel: "ביטול",
  },
};
type T = typeof TX.en;

function Num({ label, value, set, min, max, step = 1, unit, disabled }: { label: string; value: number; set: (v: number) => void; min: number; max: number; step?: number; unit: string; disabled?: boolean }) {
  return (<label className="nrow"><span>{label}</span>
    <input type="number" dir="ltr" min={min} max={max} step={step} value={value} disabled={disabled}
      onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) set(v); }}
      onBlur={() => set(Math.min(max, Math.max(min, value)))} />
    <span className="unit" dir="ltr">{unit} ({min}..{max})</span></label>);
}
const Ck = ({ on, set, children, disabled }: { on: boolean; set: (v: boolean) => void; children: ReactNode; disabled?: boolean }) =>
  <label className={"ck" + (disabled ? " dis" : "")}><input type="checkbox" checked={on} disabled={disabled} onChange={(e) => set(e.target.checked)} /> {children}</label>;
const Rad = ({ on, set, children, name }: { on: boolean; set: () => void; children: ReactNode; name: string }) =>
  <label className="ck"><input type="radio" name={name} checked={on} onChange={set} /> {children}</label>;

/* ---------- force profile chart ---------- */
const GW = 420, GH = 240, ML = 46, MR = 10, MT = 10, MB = 34;
function ForceChart({ c, set, t, range, sel, setSel }: { c: CylConfig; set: (p: [number, number][]) => void; t: T; range: number; sel: number; setSel: (i: number) => void }) {
  const ref = useRef<SVGSVGElement>(null), drag = useRef<number | null>(null);
  const pw = GW - ML - MR, phh = GH - MT - MB;
  const X = (mm: number) => ML + (mm / c.stroke) * pw, Y = (f: number) => MT + ((range - f) / (2 * range)) * phh;
  const at = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * GW, y = ((e.clientY - r.top) / r.height) * GH;
    const mm = Math.round(Math.min(c.stroke, Math.max(0, ((x - ML) / pw) * c.stroke)) * 10) / 10;
    const f = Math.round(Math.min(range, Math.max(-range, range - ((y - MT) / phh) * 2 * range)));
    return [mm, f];
  };
  const pts = c.profile;
  const move = (i: number, p: [number, number]) => {
    const n = pts.map((q) => [...q] as [number, number]);
    const last = n.length - 1;
    n[i] = [i === 0 ? 0 : i === last ? c.stroke : Math.min(n[i + 1][0], Math.max(n[i - 1][0], p[0])), p[1]];
    set(n);
  };
  const ticksX = Array.from({ length: 11 }, (_, i) => (c.stroke * i) / 10), ticksY = Array.from({ length: 11 }, (_, i) => range - (range * i) / 5);
  const disabled = c.constForce;
  return (<svg ref={ref} className={"fchart" + (disabled ? " dis" : "")} viewBox={`0 0 ${GW} ${GH}`}
    onPointerDown={(e) => {
      if (disabled || (e.target as Element).closest("circle")) return;
      const p = at(e);
      if (p[0] <= 0 || p[0] >= c.stroke) return;
      const i = pts.findIndex((q) => q[0] > p[0]);
      const n = [...pts.slice(0, i), p, ...pts.slice(i)];
      set(n); setSel(i); drag.current = i; (e.currentTarget as Element).setPointerCapture(e.pointerId);
    }}
    onPointerMove={(e) => { if (drag.current !== null) move(drag.current, at(e)); }}
    onPointerUp={() => { drag.current = null; }}>
    <rect x={ML} y={MT} width={pw} height={phh} className="bg" />
    {ticksX.map((v, i) => <g key={"x" + i}><line x1={X(v)} y1={MT} x2={X(v)} y2={MT + phh} className="grid" /><text x={X(v)} y={MT + phh + 13} textAnchor="middle">{Math.round(v)}</text></g>)}
    {ticksY.map((v, i) => <g key={"y" + i}><line x1={ML} y1={Y(v)} x2={ML + pw} y2={Y(v)} className="grid" /><text x={ML - 4} y={Y(v) + 3} textAnchor="end">{v}</text></g>)}
    <rect x={ML} y={MT} width={pw} height={phh} className="frame" />
    <text x={ML + pw / 2} y={GH - 4} textAnchor="middle" className="ax">{t.xAxis}</text>
    <text x={12} y={MT + phh / 2} textAnchor="middle" className="ax" transform={`rotate(-90 12 ${MT + phh / 2})`}>{t.fAxis}</text>
    {disabled
      ? <line x1={X(0)} y1={Y(Math.max(-range, Math.min(range, c.force)))} x2={X(c.stroke)} y2={Y(Math.max(-range, Math.min(range, c.force)))} className="curve" />
      : <>
        <polyline points={pts.map(([x, f]) => `${X(x)},${Y(Math.max(-range, Math.min(range, f)))}`).join(" ")} className="curve" />
        {pts.map(([x, f], i) => <circle key={i} cx={X(x)} cy={Y(Math.max(-range, Math.min(range, f)))} r={i === sel ? 5 : 4} className={i === sel ? "pt on" : "pt"}
          onPointerDown={(e) => { e.stopPropagation(); setSel(i); drag.current = i; ref.current!.setPointerCapture(e.pointerId); }} />)}
      </>}
  </svg>);
}

/* ---------- dialog ---------- */
export function CylDialog({ lang, initial, hydraulic, onApply, onClose }: {
  lang: Lang; initial: CylConfig; hydraulic: boolean; onApply: (c: CylConfig) => void; onClose: () => void;
}) {
  const t = TX[lang];
  const [c, setC] = useState<CylConfig>(() => ({ ...initial, marks: Array.from({ length: MAX_MARKS }, (_, i) => initial.marks[i] || { label: "", start: NaN, end: NaN }) }));
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState(-1);
  const [range, setRange] = useState(() => { const m = Math.max(Math.abs(initial.force), ...initial.profile.map((p) => Math.abs(p[1]))); return [100, 1000, 10000].find((r) => m <= r) || 10000; });
  const up = (p: Partial<CylConfig>) => setC((o) => ({ ...o, ...p }));
  const part = useMemo(() => buildCyl(c, hydraulic), [c, hydraulic]);
  const { ak, ar } = areas(c);
  const marks = c.marks;
  const setMark = (i: number, m: Partial<CylMark>) => up({ marks: marks.map((x, k) => (k === i ? { ...x, ...m } : x)) });
  const apply = () => {
    const stroke = Math.max(1, Math.min(5000, c.stroke));
    const prof = [...c.profile].map(([x, f]) => [Math.min(stroke, Math.max(0, x)), f] as [number, number]).sort((a, b) => a[0] - b[0]);
    prof[0][0] = 0; prof[prof.length - 1][0] = stroke;
    onApply({
      ...c, stroke, pos: Math.min(stroke, Math.max(0, c.pos)), dRod: c.rod === "none" ? 0 : Math.min(c.dRod, c.dPiston - 1),
      profile: prof,
      marks: c.marks.filter((m) => m.label.trim()).map((m) => {
        const s = Number.isFinite(m.start) ? m.start : Number.isFinite(m.end) ? m.end : 0, e = Number.isFinite(m.end) ? m.end : s;
        return { label: m.label.trim(), start: Math.min(stroke, Math.max(0, s)), end: Math.min(stroke, Math.max(0, e)) };
      }),
    });
  };
  const W = part.size[0], H = part.size[1];
  const left = c.mirrorH || c.through ? W * 0.95 : W * 0.12, right = !c.mirrorH || c.through ? W * 1.95 : W * 1.12;
  const top = c.mirrorV ? -4000 : c.rod === "none" ? -18000 : -14000, bot = c.mirrorV ? H + 14000 : H + 3000;
  const vb = `${-left} ${top} ${left + right} ${bot - top}`;
  return (<Dialog lang={lang} title={t.title} onClose={onClose}>
    <div className="tabs" role="tablist">{t.tabs.map((n, i) => <button key={i} role="tab" aria-selected={tab === i} className={tab === i ? "on" : ""} onClick={() => setTab(i)}>{n}</button>)}</div>
    <div className="cdlg">
      {tab === 0 && (<div className="cgrid">
        <fieldset><legend>{t.name}</legend><input value={c.name} onInput={(e) => up({ name: (e.target as HTMLInputElement).value })} /></fieldset>
        <fieldset className="span2"><legend>{t.cylType}</legend>
          <Rad name="ct" on={c.type === "sa-ext"} set={() => up({ type: "sa-ext", pos: c.pos === c.stroke ? 0 : c.pos })}>{t.saExt}</Rad>
          <div className="ind"><Ck on={c.spring} disabled={c.type !== "sa-ext"} set={(v) => up({ spring: v })}>{t.spring}</Ck></div>
          <Rad name="ct" on={c.type === "sa-ret"} set={() => up({ type: "sa-ret", pos: c.spring && c.pos === 0 ? c.stroke : c.pos })}>{t.saRet}</Rad>
          <div className="ind"><Ck on={c.spring} disabled={c.type !== "sa-ret"} set={(v) => up({ spring: v })}>{t.spring}</Ck></div>
          <Rad name="ct" on={c.type === "da"} set={() => up({ type: "da" })}>{t.da}</Rad>
        </fieldset>
        <fieldset><legend>{t.rodType}</legend>
          <Rad name="rt" on={c.rod === "one"} set={() => up({ rod: "one" })}>{t.one}</Rad>
          <div className="ind"><Ck on={c.through && c.rod === "one"} disabled={c.rod !== "one"} set={(v) => up({ through: v })}>{t.through}</Ck></div>
          <Rad name="rt" on={c.rod === "two"} set={() => up({ rod: "two" })}>{t.two}</Rad>
          <div className="ind"><Ck on={c.through && c.rod === "two"} disabled={c.rod !== "two"} set={(v) => up({ through: v })}>{t.through}</Ck></div>
          <Rad name="rt" on={c.rod === "none"} set={() => up({ rod: "none", through: false })}>{t.none}</Rad>
          <div className="ind"><Ck on={c.magnetic} disabled={c.rod !== "none"} set={(v) => up({ magnetic: v, slide: v ? false : c.slide })}>{t.magnetic}</Ck>
            <Ck on={c.slide} disabled={c.rod !== "none"} set={(v) => up({ slide: v, magnetic: v ? false : c.magnetic })}>{t.slide}</Ck></div>
        </fieldset>
        <fieldset><legend>{t.props}</legend>
          <Ck on={c.damping} set={(v) => up({ damping: v })}>{t.damping}</Ck>
          <div className="ind"><Ck on={c.dampAdj} disabled={!c.damping} set={(v) => up({ dampAdj: v })}>{t.adj}</Ck></div>
          <Ck on={c.detect} set={(v) => up({ detect: v })}>{t.detect}</Ck>
          <label className="nrow ind"><span>{t.mark}</span><input dir="ltr" disabled={!c.detect} value={c.detectMark} onInput={(e) => up({ detectMark: (e.target as HTMLInputElement).value })} /></label>
        </fieldset>
        <fieldset><legend>{t.mirror}</legend>
          <Ck on={c.mirrorH} set={(v) => up({ mirrorH: v })}>◧ {t.horiz}</Ck>
          <Ck on={c.mirrorV} set={(v) => up({ mirrorV: v })}>⬓ {t.vert}</Ck>
        </fieldset>
      </div>)}
      {tab === 1 && (<div className="nlist">
        <Num label={t.stroke} value={c.stroke} set={(v) => up({ stroke: v })} min={1} max={5000} unit="mm" />
        <Num label={t.pos} value={c.pos} set={(v) => up({ pos: v })} min={0} max={c.stroke} unit="mm" />
        <Num label={t.dP} value={c.dPiston} set={(v) => up({ dPiston: v })} min={1} max={1000} step={0.5} unit="mm" />
        <Num label={t.dR} value={c.dRod} set={(v) => up({ dRod: v })} min={0} max={1000} step={0.5} unit="mm" disabled={c.rod === "none"} />
        <Num label={t.angle} value={c.angle} set={(v) => up({ angle: v })} min={0} max={360} unit="°" />
        <Num label={t.leak} value={c.leak} set={(v) => up({ leak: v })} min={0} max={100} step={0.1} unit="l/(min·MPa)" />
        <fieldset><legend>{t.calc}</legend>
          <div className="nrow"><span>{t.ak}</span><output dir="ltr">{ak.toFixed(2)}</output><span className="unit">cm²</span></div>
          <div className="nrow"><span>{t.ar}</span><output dir="ltr">{ar.toFixed(2)}</output><span className="unit">cm²</span></div>
        </fieldset>
        <fieldset><legend>{t.show}</legend>
          <Ck on={c.showV} set={(v) => up({ showV: v })}>{t.vel}</Ck><Ck on={c.showF} set={(v) => up({ showF: v })}>{t.force}</Ck>
        </fieldset>
      </div>)}
      {tab === 2 && (<div className="nlist">
        <Num label={t.mass} value={c.mass} set={(v) => up({ mass: v })} min={0} max={10000} step={0.1} unit="kg" />
        <fieldset><legend>{t.friction}</legend>
          <Rad name="fr" on={c.friction > 0} set={() => up({ friction: c.friction || 1 })}>{t.material}</Rad>
          <div className="ind mats">{MATERIALS.map((m, i) => (
            <label key={i} className={"ck" + (c.friction ? "" : " dis")}><input type="radio" name="mat" disabled={!c.friction} checked={c.friction === i + 1} onChange={() => up({ friction: i + 1 })} /> {lang === "he" ? m.he : m.en} <span className="unit" dir="ltr">μ {m.s} / {m.d}</span></label>))}</div>
          <Rad name="fr" on={c.friction === 0} set={() => up({ friction: 0 })}>{t.manual}</Rad>
          <div className="ind">
            <Num label={t.muS} value={c.muS} set={(v) => up({ muS: v })} min={0} max={2} step={0.01} unit="" disabled={c.friction > 0} />
            <Num label={t.muD} value={c.muD} set={(v) => up({ muD: v })} min={0} max={2} step={0.01} unit="" disabled={c.friction > 0} />
          </div>
        </fieldset>
        <p className="hint" style={{ margin: 0 }}>{t.note}</p>
      </div>)}
      {tab === 3 && (<div className="fprof">
        <div className="frow">
          <Rad name="cf" on={c.constForce} set={() => up({ constForce: true })}>{t.constF}</Rad>
          <input type="number" dir="ltr" min={-10000} max={10000} value={c.force} disabled={!c.constForce} onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) up({ force: v }); }} /> <span className="unit">N (-10000..10000)</span>
          <Rad name="cf" on={!c.constForce} set={() => up({ constForce: false })}>{t.varF}</Rad>
        </div>
        <div className="fbox">
          <ForceChart c={c} set={(p) => up({ profile: p })} t={t} range={range} sel={sel} setSel={setSel} />
          <label className="sub range">{t.range}<select value={range} onChange={(e) => setRange(+e.target.value)} dir="ltr">{[10, 100, 1000, 10000].map((r) => <option key={r} value={r}>±{r} N</option>)}</select></label>
        </div>
        <div className="frow">
          <label className="sub">{t.pPos} (mm)<input type="number" dir="ltr" disabled={c.constForce || sel <= 0 || sel >= c.profile.length - 1} value={sel >= 0 && c.profile[sel] ? c.profile[sel][0] : ""}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isFinite(v)) return; const p = c.profile.map((q) => [...q] as [number, number]); p[sel][0] = Math.min(p[sel + 1][0], Math.max(p[sel - 1][0], v)); up({ profile: p }); }} /></label>
          <label className="sub">{t.fAxis}<input type="number" dir="ltr" disabled={c.constForce || sel < 0} value={sel >= 0 && c.profile[sel] ? c.profile[sel][1] : ""}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isFinite(v)) return; const p = c.profile.map((q) => [...q] as [number, number]); p[sel][1] = Math.max(-10000, Math.min(10000, v)); up({ profile: p }); }} /></label>
          <span className="spacer"></span>
          <button disabled={c.constForce || sel <= 0 || sel >= c.profile.length - 1} onClick={() => { up({ profile: c.profile.filter((_, i) => i !== sel) }); setSel(-1); }}>{t.del}</button>
          <button disabled={c.constForce} onClick={() => { up({ profile: [[0, 0], [c.stroke, 0]] }); setSel(-1); }}>{t.delAll}</button>
        </div>
        <p className="hint" style={{ margin: 0 }}>{t.graphHint}</p>
      </div>)}
      {tab === 4 && (<div className="marks">
        <div className="mrow head"><span>{t.markHead[0]}</span><span>{t.markHead[1]}</span><span>{t.markHead[2]}</span><span></span></div>
        {marks.map((m, i) => (<div key={i} className="mrow">
          <input dir="ltr" value={m.label} aria-label={`${t.markHead[0]} ${i + 1}`} onInput={(e) => setMark(i, { label: (e.target as HTMLInputElement).value.toUpperCase() })} />
          <input type="number" dir="ltr" min={0} max={c.stroke} aria-label={t.markHead[1]} value={Number.isFinite(m.start) ? m.start : ""} onChange={(e) => setMark(i, { start: e.target.value === "" ? NaN : +e.target.value })} />
          <input type="number" dir="ltr" min={0} max={c.stroke} aria-label={t.markHead[2]} value={Number.isFinite(m.end) ? m.end : ""} onChange={(e) => setMark(i, { end: e.target.value === "" ? NaN : +e.target.value })} />
          <span className="unit" dir="ltr">mm (0..{c.stroke})</span>
        </div>))}
        <p className="hint" style={{ margin: 0 }}>{t.markHint}</p>
      </div>)}
    </div>
    <div className="vprev cprev"><svg className="fl big" viewBox={vb}><FluidSymbol part={part} ext={c.stroke ? Math.min(1, Math.max(0, c.pos / c.stroke)) : 0} /></svg></div>
    <div className="row"><span className="spacer"></span><button onClick={onClose}>{t.cancel}</button><button className="go" onClick={apply}>{t.ok}</button></div>
  </Dialog>);
}
