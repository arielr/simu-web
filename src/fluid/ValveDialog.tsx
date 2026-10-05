/** "Configure valve" dialog: actuation on both sides, valve body, initial position, name, flow. */
import { useMemo, useState } from "react";
import type { Lang } from "../shared/i18n";
import { Dialog } from "../shared/ui";
import { FluidSymbol } from "./symbols";
import { BOX_TYPES, Manual, Mech, SideConfig, ValveConfig, Ways, boxPreview, buildValve } from "./valveGen";

const TX = {
  en: { title: "Configure valve", left: "Left actuation", right: "Right actuation", body: "Valve body", name: "Component name", ways: "Ports",
    spring: "Spring return", pilot: "Pilot (pneumatic/hydraulic)", solenoid: "Solenoid", label: "Label", manual: "Manual", mech: "Mechanical",
    initial: "Initial position", flow: "Standard nominal flow", ok: "OK", cancel: "Cancel", none: "—", pos: "Position",
    manuals: { none: "—", button: "Push button", lever: "Lever", detent: "Lever with detent", pedal: "Pedal" } as Record<Manual, string>,
    mechs: { none: "—", roller: "Roller", plunger: "Plunger" } as Record<Mech, string>,
    hint: "Labels link the valve to the circuit: a solenoid label (e.g. 1Y1) to an electrical solenoid E_Y001, a roller label (e.g. 1S1) to a distance-rule mark." },
  he: { title: "הגדרת שסתום", left: "הפעלה שמאלית", right: "הפעלה ימנית", body: "גוף השסתום", name: "שם הרכיב", ways: "מספר יציאות",
    spring: "החזרת קפיץ", pilot: "פיקוד (פנאומטי/הידראולי)", solenoid: "סולנואיד", label: "תווית", manual: "ידני", mech: "מכני",
    initial: "מצב התחלתי", flow: "ספיקה נומינלית", ok: "אישור", cancel: "ביטול", none: "—", pos: "מצב",
    manuals: { none: "—", button: "לחצן", lever: "ידית", detent: "ידית עם נעילה", pedal: "דוושה" } as Record<Manual, string>,
    mechs: { none: "—", roller: "גלגלת", plunger: "בוכנה" } as Record<Mech, string>,
    hint: "תוויות מקשרות את השסתום למעגל: תווית סולנואיד (למשל 1Y1) לסולנואיד חשמלי E_Y001, ותווית גלגלת (למשל 1S1) לסימון בסרגל המרחק." },
};

function Side({ s, set, t }: { s: SideConfig; set: (s: SideConfig) => void; t: typeof TX.en }) {
  const ck = (k: "spring" | "pilot" | "solenoid", l: string) => (
    <label className="ck"><input type="checkbox" checked={s[k]} onChange={(e) => set({ ...s, [k]: e.target.checked })} /> {l}</label>);
  return (<div className="vside">
    {ck("spring", t.spring)}
    {ck("pilot", t.pilot)}
    {ck("solenoid", t.solenoid)}
    {s.solenoid && <label className="sub">{t.label} <input dir="ltr" value={s.solLabel} onInput={(e) => set({ ...s, solLabel: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>}
    <label className="sub">{t.manual} <select value={s.manual} onChange={(e) => set({ ...s, manual: e.target.value as Manual })}>
      {(Object.keys(t.manuals) as Manual[]).map((k) => <option key={k} value={k}>{t.manuals[k]}</option>)}</select></label>
    <label className="sub">{t.mech} <select value={s.mech} onChange={(e) => set({ ...s, mech: e.target.value as Mech })}>
      {(Object.keys(t.mechs) as Mech[]).map((k) => <option key={k} value={k}>{t.mechs[k]}</option>)}</select></label>
    {s.mech !== "none" && <label className="sub">{t.label} <input dir="ltr" value={s.mechLabel} onInput={(e) => set({ ...s, mechLabel: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>}
  </div>);
}

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
  const [w, h] = part.size;
  return (<Dialog lang={lang} title={t.title} onClose={onClose}>
    {/* physical left/right, also in Hebrew: the columns match the sides of the drawing */}
    <div className="vdlg" dir="ltr">
      <fieldset><legend>{t.left}</legend><Side s={c.left} set={(s) => setC({ ...c, left: s })} t={t} /></fieldset>
      <fieldset className="vbody"><legend>{t.body}</legend>
        <label className="sub">{t.name} <input value={c.name} onInput={(e) => setC({ ...c, name: (e.target as HTMLInputElement).value })} /></label>
        <label className="sub">{t.ways} <select value={c.ways} onChange={(e) => setWays(+e.target.value as Ways)}>
          {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/n</option>)}</select></label>
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
              <label className="ck rad"><input type="radio" name="initial" disabled={!id} checked={c.initial === i} onChange={() => setC({ ...c, initial: i })} /> {i === 0 ? t.initial : ""}</label>
            </div>);
          })}
        </div>
      </fieldset>
      <fieldset><legend>{t.right}</legend><Side s={c.right} set={(s) => setC({ ...c, right: s })} t={t} /></fieldset>
    </div>
    <label className="sub">{t.flow} <input type="number" min={0.1} step={10} dir="ltr" value={c.flow} onInput={(e) => setC({ ...c, flow: +(e.target as HTMLInputElement).value || c.flow })} /> l/min</label>
    <div className="vprev"><svg className="fl big" viewBox={`-4000 -4000 ${w + 8000} ${h + 8000}`}><FluidSymbol part={part} /></svg></div>
    <p className="hint" style={{ margin: 0 }}>{t.hint}</p>
    <div className="row"><span className="spacer"></span><button onClick={onClose}>{t.cancel}</button><button className="go" onClick={() => onApply(c)}>{t.ok}</button></div>
  </Dialog>);
}
