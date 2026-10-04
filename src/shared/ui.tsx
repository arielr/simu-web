/**
 * UI building blocks shared by all three programs: the page frame, the top bar
 * pieces, the parts drawer and dialogs. Each program keeps only what is
 * specific to it (canvas, inspector content, file formats).
 */
import type { ReactNode } from "react";
import { COMMON, Lang } from "./i18n";

export type AppId = "elec" | "pneu" | "hyd";

/** page frame: top bar, drawer | stage | inspector, status line */
export function EditorFrame({ app, lang, bar, drawer, stage, inspector, status, overlay }: {
  app: AppId; lang: Lang; bar: ReactNode; drawer: ReactNode; stage: ReactNode; inspector: ReactNode; status: ReactNode; overlay?: ReactNode;
}) {
  return (<div className="app" data-app={app} dir={COMMON[lang].dir} lang={lang}>
    <div className="bar">{bar}</div>
    <div className="main">{drawer}{stage}<div className="insp">{inspector}</div></div>
    <div className="status">{status}</div>
    {overlay}
  </div>);
}

export function HomeButton({ lang, onHome }: { lang: Lang; onHome?: () => void }) {
  if (!onHome) return null;
  const t = COMMON[lang];
  return <button className="home" onClick={onHome} title={t.home} aria-label={t.home}>⌂</button>;
}

export function Brand({ title }: { title: string }) {
  return <span className="brand" dir="ltr">SIMU Web<small>{title}</small></span>;
}

/** segmented control */
export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label?: string }) {
  return (<div className="seg" role="group" aria-label={label}>
    {options.map(([v, l]) => <button key={v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}
  </div>);
}

export function ZoomControl({ lang, zoom, setZoom, min = 0.25, max = 3, step = 0.25, onReset }: {
  lang: Lang; zoom: number; setZoom: (f: (z: number) => number) => void; min?: number; max?: number; step?: number; onReset: () => void;
}) {
  const t = COMMON[lang];
  return (<div className="seg">
    <button onClick={() => setZoom((z) => Math.max(min, +(z - step).toFixed(2)))} aria-label={t.zoomOut}>−</button>
    <button className="mono" onClick={onReset} title={t.zoomReset}>{Math.round(zoom * 100)}%</button>
    <button onClick={() => setZoom((z) => Math.min(max, +(z + step).toFixed(2)))} aria-label={t.zoomIn}>+</button>
  </div>);
}

export function UndoButton({ lang, onUndo }: { lang: Lang; onUndo: () => void }) {
  return <button onClick={onUndo} title="Ctrl+Z">{COMMON[lang].undo}</button>;
}

export function NameField({ lang, value, onChange }: { lang: Lang; value: string; onChange: (v: string) => void }) {
  return <input className="proj" value={value} onInput={(e) => onChange((e.target as HTMLInputElement).value)} aria-label={COMMON[lang].name} />;
}

export function ExamplesMenu({ lang, items, onPick }: { lang: Lang; items: [string, string][]; onPick: (key: string) => void }) {
  const t = COMMON[lang];
  return (<select aria-label={t.examples} value="" onChange={(e) => e.target.value && onPick(e.target.value)}>
    <option value="">{t.examples}…</option>
    {items.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
  </select>);
}

export function LangSelect({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (<select aria-label={COMMON[lang].lang} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
    <option value="en">English</option><option value="he">עברית</option>
  </select>);
}

/** right end of every top bar: zoom, new, examples, file, language */
export function BarEnd({ lang, setLang, zoom, onNew, examples, onFile }: {
  lang: Lang; setLang: (l: Lang) => void; zoom: ReactNode; onNew: () => void; examples: ReactNode; onFile: () => void;
}) {
  const t = COMMON[lang];
  return (<>
    <span className="spacer"></span>
    {zoom}
    <button onClick={onNew}>{t.newDoc}</button>
    {examples}
    <button className="go" onClick={onFile}>{t.file}</button>
    <LangSelect lang={lang} setLang={setLang} />
  </>);
}

export interface DrawerItem { key: string; icon: ReactNode; label: string; title?: string }
/** parts drawer: optional search box, grouped buttons */
export function PartsDrawer({ lang, groups, active, onPick, disabled, query, setQuery, label }: {
  lang: Lang; groups: { id: string; title: string; items: DrawerItem[] }[]; active?: string | null; onPick: (key: string) => void;
  disabled?: boolean; query?: string; setQuery?: (q: string) => void; label?: string;
}) {
  return (<div className="drawer" aria-label={label}>
    {setQuery && <input className="search" type="search" placeholder={COMMON[lang].search} value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />}
    {groups.filter((g) => g.items.length).map((g) => (<div key={g.id} style={{ display: "contents" }}>
      <div className="grp">{g.title}</div>
      {g.items.map((it) => (<button key={it.key} className={"part" + (active === it.key ? " on" : "")} title={it.title} disabled={disabled} onClick={() => onPick(it.key)}>
        {it.icon}<span>{it.label}</span></button>))}
    </div>))}
  </div>);
}

/** filter helper for drawers with a search box */
export const matches = (q: string, ...fields: string[]) => { const s = q.trim().toLowerCase(); return !s || fields.some((f) => f.toLowerCase().includes(s)); };

export function Dialog({ lang, title, onClose, children }: { lang: Lang; title: string; onClose: () => void; children: ReactNode }) {
  return (<div className="modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="dlg" role="dialog" aria-modal="true" aria-label={title}>
      <div className="row"><h2>{title}</h2><span className="spacer"></span><button onClick={onClose} aria-label={COMMON[lang].close}>✕</button></div>
      {children}
    </div>
  </div>);
}

/** floating message over the stage */
export function StageMessage({ text, kind = "info" }: { text: string; kind?: "info" | "warn" }) {
  if (!text) return null;
  return <div className="warnwrap"><div className={"warn" + (kind === "info" ? " info" : "")}>{text}</div></div>;
}

/** big preview box at the top of the inspector */
export function Preview({ children }: { children: ReactNode }) { return <div className="preview">{children}</div>; }
