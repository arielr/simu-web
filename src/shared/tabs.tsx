/**
 * Several drawings open at once, one tab each (like a browser's tabs, inside the program).
 * Every tab is a full editor kept mounted (its undo history, zoom and simulation stay as they were);
 * only the visible one listens to the keyboard and the clipboard. Each tab's drawing is saved in this
 * browser under its own key; the first tab keeps the key the program always used.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { COMMON, Lang } from "./i18n";
import { nid } from "./hooks";

export interface DocTab { id: string; name: string }
/** what an editor gets from the tab strip */
export interface TabProps {
  /** localStorage key of this tab's drawing */
  storeKey: string;
  /** this tab is the visible one */
  active: boolean;
  /** a new tab starts empty instead of with the sample drawing */
  blank: boolean;
  /** files to open in a tab created by "open in new tab" */
  files: File[] | null;
  /** the editor reports its drawing name, shown on the tab */
  onName: (name: string) => void;
  /** the strip itself, placed by the editor under its top bar */
  tabs: ReactNode;
}

const MAIN = "main";
const keyOf = (store: string, id: string) => (id === MAIN ? store : `${store}:${id}`);

function readTabs(store: string): { tabs: DocTab[]; active: string } {
  try {
    const v = JSON.parse(localStorage.getItem(store + ":tabs") || "null");
    if (v && Array.isArray(v.tabs) && v.tabs.length) return { tabs: v.tabs, active: v.tabs.some((t: DocTab) => t.id === v.active) ? v.active : v.tabs[0].id };
  } catch { /* no storage */ }
  return { tabs: [{ id: MAIN, name: "" }], active: MAIN };
}

export function DocTabs({ store, lang, untitled, render }: {
  store: string; lang: Lang; untitled: string;
  render: (tab: DocTab, p: TabProps) => ReactNode;
}) {
  const [st, setSt] = useState(() => readTabs(store));
  const fresh = useRef<Record<string, { blank: boolean; files: File[] | null }>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const t = COMMON[lang];
  useEffect(() => { try { localStorage.setItem(store + ":tabs", JSON.stringify(st)); } catch { /* storage full or blocked */ } }, [store, st]);

  const add = (files: File[] | null = null) => {
    const id = nid("t");
    fresh.current[id] = { blank: true, files };
    setSt((s) => ({ tabs: [...s.tabs, { id, name: files?.length ? files.find((f) => !/\.(bmp|png|jpe?g|gif|webp)$/i.test(f.name))?.name.replace(/\.[^.]*$/, "") || "" : "" }], active: id }));
  };
  const close = (id: string) => {
    if (!confirm(t.closeTab)) return;
    try { localStorage.removeItem(keyOf(store, id)); } catch { /* ignore */ }
    setSt((s) => {
      const i = s.tabs.findIndex((x) => x.id === id), tabs = s.tabs.filter((x) => x.id !== id);
      if (!tabs.length) { const n = nid("t"); fresh.current[n] = { blank: true, files: null }; return { tabs: [{ id: n, name: "" }], active: n }; }
      return { tabs, active: s.active === id ? tabs[Math.min(i, tabs.length - 1)].id : s.active };
    });
  };
  const setName = (id: string, name: string) => setSt((s) => (s.tabs.find((x) => x.id === id)?.name === name ? s : { ...s, tabs: s.tabs.map((x) => (x.id === id ? { ...x, name } : x)) }));

  const strip = (
    <div className="doctabs" role="tablist">
      {st.tabs.map((tab) => (
        <div key={tab.id} role="tab" aria-selected={tab.id === st.active} className={"doctab" + (tab.id === st.active ? " on" : "")}
          onClick={() => setSt((s) => ({ ...s, active: tab.id }))} onAuxClick={(e) => { if (e.button === 1) close(tab.id); }} title={tab.name || untitled}>
          <span className="dt-name" dir="auto">{tab.name || untitled}</span>
          <button className="dt-x" aria-label={t.closeTab} title={t.closeTab} onClick={(e) => { e.stopPropagation(); close(tab.id); }}>×</button>
        </div>))}
      <button className="dt-add" onClick={() => add()} title={t.newTab} aria-label={t.newTab}>+</button>
      <button className="dt-add" onClick={() => fileRef.current?.click()} title={t.openInTab}>{t.openInTab}</button>
      <input ref={fileRef} type="file" multiple style={{ display: "none" }}
        onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ""; if (fs.length) add(fs); }} />
    </div>);

  return (<>{st.tabs.map((tab) => {
    const on = tab.id === st.active, f = fresh.current[tab.id];
    return (<div key={tab.id} className="doctab-pane" style={on ? undefined : { display: "none" }}>
      {render(tab, { storeKey: keyOf(store, tab.id), active: on, blank: !!f?.blank, files: f?.files || null, onName: (n) => setName(tab.id, n), tabs: on ? strip : null })}
    </div>);
  })}</>);
}
