/** "Configure valve" dialog: actuation on both sides, valve body, initial position, dominant signal, flow, mirror. */
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Lang } from "../shared/i18n";
import { Dialog } from "../shared/ui";
import { FluidSymbol } from "./symbols";
import type { FluidPart } from "./catalog";
import { BOX_TYPES, ELPNS, ElPn, MANUALS, MECHS, Manual, Mech, SideConfig, ValveConfig, Ways, boxPreview, buildValve, sidePreview } from "./valveGen";

const TX = {
  en: { title: "Configure valve", left: "Left actuation", right: "Right actuation", body: "Valve body", name: "Component name", ways: "Ports",
    spring: "Spring return", piloted: "Piloted", ext: "External supply", pneuSpring: "Air spring",
    manual: "Muscular", mech: "Mechanical", elpn: "Pneumatic / electric", label: "Label",
    initial: "Initial position", reversible: "Reversible", dominant: "Dominant signal", dl: "Left", dr: "Right",
    flow: "Standard nominal flow", mirror: "Mirror", horiz: "Horizontal", vert: "Vertical", ok: "OK", cancel: "Cancel", none: "—", pos: "Position",
    manuals: { none: "None", general: "General manual", button: "Push button", mushroom: "Mushroom button", lever: "Lever", detent: "Lever with detent", pedal: "Pedal" } as Record<Manual, string>,
    mechs: { none: "None", plunger: "Plunger", roller: "Roller", idle: "Idle-return roller" } as Record<Mech, string>,
    elpns: { none: "None", pilot: "Pilot pressure", solenoid: "Solenoid" } as Record<ElPn, string>,
    hint: "Labels link the valve to the circuit: a solenoid label (e.g. 1Y1) to an electrical solenoid, a roller label (e.g. 1S1) to a mark of a cylinder." },
  he: { title: "הגדרת שסתום", left: "הפעלה שמאלית", right: "הפעלה ימנית", body: "גוף השסתום", name: "שם הרכיב", ways: "מספר יציאות",
    spring: "החזרת קפיץ", piloted: "מוגבר פיקוד (סרוו)", ext: "אספקה חיצונית", pneuSpring: "קפיץ אוויר",
    manual: "ידני", mech: "מכני", elpn: "פנאומטי / חשמלי", label: "תווית",
    initial: "מצב התחלתי", reversible: "הפיך", dominant: "אות דומיננטי", dl: "שמאל", dr: "ימין",
    flow: "ספיקה נומינלית", mirror: "שיקוף", horiz: "אופקי", vert: "אנכי", ok: "אישור", cancel: "ביטול", none: "—", pos: "מצב",
    manuals: { none: "ללא", general: "ידני כללי", button: "לחצן", mushroom: "לחצן פטרייה", lever: "ידית", detent: "ידית עם נעילה", pedal: "דוושה" } as Record<Manual, string>,
    mechs: { none: "ללא", plunger: "פין לחיצה", roller: "גלגלת", idle: "גלגלת חד-כיוונית" } as Record<Mech, string>,
    elpns: { none: "ללא", pilot: "פיקוד לחץ", solenoid: "סולנואיד" } as Record<ElPn, string>,
    hint: "תוויות מקשרות את השסתום למעגל: תווית סולנואיד (למשל 1Y1) לסולנואיד חשמלי, ותווית גלגלת (למשל 1S1) לסימון של בוכנה." },
};
type T = typeof TX.en;

const Icon = ({ part }: { part: FluidPart }) =>
  <svg className="fl big" viewBox={`-1000 7168 ${part.size[0] + 2000} 22528`} width="52" height="32" aria-hidden="true"><FluidSymbol part={part} /></svg>;

/** a drop-down list whose options are actuator symbols */
function IconSelect<K extends string>({ value, options, labels, icon, onChange, label }: {
  value: K; options: K[]; labels: Record<K, string>; icon: (k: K) => FluidPart | null; onChange: (k: K) => void; label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  const ic = (k: K) => { const p = icon(k); return p ? <Icon part={p} /> : <span className="noicon">—</span>; };
  return (<div className="isel" ref={ref}>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`${label}: ${labels[value]}`} title={labels[value]}
      onClick={() => setOpen(!open)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>{ic(value)}<span className="caret">▾</span></button>
    {open && <div className="ilist" role="listbox">{options.map((k) => (
      <button type="button" role="option" aria-selected={k === value} key={k} className={k === value ? "on" : ""}
        onClick={() => { onChange(k); setOpen(false); }}>{ic(k)}<span>{labels[k]}</span></button>))}</div>}
  </div>);
}

function Side({ s, set, t, right }: { s: SideConfig; set: (s: SideConfig) => void; t: T; right: boolean }) {
  const elpn: ElPn = s.solenoid ? "solenoid" : s.pilot ? "pilot" : "none";
  const ck = (on: boolean, l: string, f: (v: boolean) => void, dis = false, ind = false) => (
    <label className={"ck" + (dis ? " dis" : "") + (ind ? " ind1" : "")}><input type="checkbox" checked={on} disabled={dis} onChange={(e) => f(e.target.checked)} /> {l}</label>);
  const row = (l: string, ctl: ReactNode) => <div className={"arow" + (right ? " r" : "")}><span>{l}</span>{ctl}</div>;
  return (<div className="vside">
    {ck(s.spring && !s.pneuSpring, t.spring, (v) => set({ ...s, spring: v, pneuSpring: v ? false : s.pneuSpring }))}
    {ck(!!s.piloted, t.piloted, (v) => set({ ...s, piloted: v }), !s.solenoid)}
    {ck(!!s.extPilot, t.ext, (v) => set({ ...s, extPilot: v }), !s.solenoid || !s.piloted, true)}
    {ck(!!s.pneuSpring, t.pneuSpring, (v) => set({ ...s, pneuSpring: v, spring: v ? true : false }))}
    {ck(!!s.extSpring, t.ext, (v) => set({ ...s, extSpring: v }), !s.pneuSpring, true)}
    {row(t.manual, <IconSelect label={t.manual} value={s.manual} options={MANUALS} labels={t.manuals} onChange={(k) => set({ ...s, manual: k })}
      icon={(k) => (k === "none" ? null : sidePreview({ manual: k }, right))} />)}
    {row(t.mech, <IconSelect label={t.mech} value={s.mech} options={MECHS} labels={t.mechs} onChange={(k) => set({ ...s, mech: k })}
      icon={(k) => (k === "none" ? null : sidePreview({ mech: k }, right))} />)}
    {s.mech !== "none" && <label className="sub">{t.label} <input dir="ltr" value={s.mechLabel} onInput={(e) => set({ ...s, mechLabel: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>}
    {row(t.elpn, <IconSelect label={t.elpn} value={elpn} options={ELPNS} labels={t.elpns}
      onChange={(k) => set({ ...s, pilot: k === "pilot", solenoid: k === "solenoid", piloted: k === "solenoid" ? s.piloted : false })}
      icon={(k) => (k === "none" ? null : sidePreview({ pilot: k === "pilot", solenoid: k === "solenoid" }, right))} />)}
    {s.solenoid && <label className="sub">{t.label} <input dir="ltr" value={s.solLabel} onInput={(e) => set({ ...s, solLabel: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>}
  </div>);
}

const acts = (s: SideConfig) => s.pilot || s.solenoid || s.manual !== "none" || s.mech !== "none";

export function ValveDialog({ lang, initial, hydraulic, onApply, onClose }: {
  lang: Lang; initial: ValveConfig; hydraulic: boolean; onApply: (c: ValveConfig) => void; onClose: () => void;
}) {
  const t = TX[lang];
  const [c, setC] = useState<ValveConfig>(initial);
  const types = BOX_TYPES[c.ways];
  const part = useMemo(() => buildValve(c, hydraulic), [c, hydraulic]);
  const setBox = (i: number, id: string) => {
    const boxes = [...c.boxes];
    if (id) boxes[i] = id; else boxes.splice(i);
    const b = boxes.filter(Boolean);
    setC({ ...c, boxes: b, initial: Math.min(c.initial, b.length - 1) });
  };
  const setWays = (w: Ways) => setC({ ...c, ways: w, boxes: [BOX_TYPES[w][1]?.id || BOX_TYPES[w][0].id, BOX_TYPES[w][0].id], initial: Math.min(c.initial, 1) });
  const domOk = acts(c.left) && acts(c.right);
  const dom = c.dominant || "none";
  const [w, h] = part.size;
  return (<Dialog lang={lang} title={t.title} onClose={onClose}>
    {/* physical left/right, also in Hebrew: the columns match the sides of the drawing */}
    <div className="vdlg" dir="ltr">
      <fieldset><legend>{t.left}</legend><Side s={c.left} set={(s) => setC({ ...c, left: s })} t={t} right={false} /></fieldset>
      <div className="vmid">
        <fieldset><legend>{t.name}</legend><input value={c.name} onInput={(e) => setC({ ...c, name: (e.target as HTMLInputElement).value })} /></fieldset>
        <fieldset className="vbody"><legend>{t.body}</legend>
          <div className="row" style={{ gap: 12 }}>
            <label className="sub" style={{ flex: 1 }}>{t.ways} <select value={c.ways} onChange={(e) => setWays(+e.target.value as Ways)}>
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/n</option>)}</select></label>
            <label className="ck"><input type="checkbox" checked={!!c.reversible} onChange={(e) => setC({ ...c, reversible: e.target.checked })} /> {t.reversible}</label>
          </div>
          <div className="slots">
            {[0, 1, 2, 3].map((i) => {
              const id = c.boxes[i];
              const enabled = i <= c.boxes.length;
              const bp = id ? boxPreview(c.ways, id) : null;
              return (<div key={i} className={"slot" + (enabled ? "" : " off")}>
                <div className="sbox">{bp && <svg className="fl big" viewBox={`-2000 -2000 ${bp.size[0] + 4000} ${bp.size[1] + 4000}`}><FluidSymbol part={bp} /></svg>}</div>
                <select disabled={!enabled} value={id || ""} aria-label={`${t.pos} ${i + 1}`} onChange={(e) => setBox(i, e.target.value)}>
                  {i >= 2 && <option value="">{t.none}</option>}
                  {types.map((x) => <option key={x.id} value={x.id}>{lang === "he" ? x.he : x.en}</option>)}
                </select>
              </div>);
            })}
          </div>
          <div className="inipos"><span className="hint">{t.initial}</span>
            <div className="slots">{[0, 1, 2, 3].map((i) => <label key={i} className="radc"><input type="radio" name="initial" aria-label={`${t.initial} ${i + 1}`} disabled={!c.boxes[i]} checked={c.initial === i} onChange={() => setC({ ...c, initial: i })} /></label>)}</div>
          </div>
        </fieldset>
      </div>
      <fieldset><legend>{t.right}</legend><Side s={c.right} set={(s) => setC({ ...c, right: s })} t={t} right /></fieldset>
    </div>
    <div className={"vdom" + (domOk ? "" : " dis")} dir="ltr">
      <label className="ck"><input type="radio" name="dom" disabled={!domOk || dom === "none"} checked={dom === "L"} onChange={() => setC({ ...c, dominant: "L" })} /> {t.dl}</label>
      <label className="ck"><input type="checkbox" disabled={!domOk} checked={dom !== "none"} onChange={(e) => setC({ ...c, dominant: e.target.checked ? "L" : "none" })} /> {t.dominant}</label>
      <label className="ck"><input type="radio" name="dom" disabled={!domOk || dom === "none"} checked={dom === "R"} onChange={() => setC({ ...c, dominant: "R" })} /> {t.dr}</label>
    </div>
    <div className="vfoot">
      <div className="vleft">
        <label className="nrow2"><span>{t.flow}</span><input type="number" min={0.1} max={5000} step={10} dir="ltr" value={c.flow} onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v) && v > 0) setC({ ...c, flow: v }); }} /><span className="unit" dir="ltr">l/min (0.1..5000)</span></label>
        <fieldset><legend>{t.mirror}</legend>
          <label className="ck"><input type="checkbox" checked={!!c.mirrorH} onChange={(e) => setC({ ...c, mirrorH: e.target.checked })} /> ◧ {t.horiz}</label>
          <label className="ck"><input type="checkbox" checked={!!c.mirrorV} onChange={(e) => setC({ ...c, mirrorV: e.target.checked })} /> ⬓ {t.vert}</label>
        </fieldset>
      </div>
      <div className="vprev"><svg className="fl big" viewBox={`-4000 -4000 ${w + 8000} ${h + 8000}`}><FluidSymbol part={part} /></svg></div>
    </div>
    <p className="hint" style={{ margin: 0 }}>{t.hint}</p>
    <div className="row"><span className="spacer"></span><button onClick={onClose}>{t.cancel}</button><button className="go" onClick={() => onApply(c)}>{t.ok}</button></div>
  </Dialog>);
}
