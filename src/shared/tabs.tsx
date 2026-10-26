/**
 * Several drawings open at once, one tab each (like a browser's tabs, inside the program).
 * Every tab is a full editor kept mounted (its undo history, zoom and simulation stay as they were);
 * only the visible one listens to the keyboard and the clipboard. Each tab's drawing is saved in this
 * browser under its own key; the first tab keeps the key the program always used.
 * Each tab has a menu (⋮) to save it or close it; Open and Save use the shared file dialog.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { COMMON, Lang } from "./i18n";
import { nid } from "./hooks";
import { FileDialog, saveToComputer, type SaveSource } from "./fileDialog";
import { Dialog } from "./ui";

export interface DocTab { id: string; name: string }
/** what an editor gets from the tab strip */
export interface TabProps {
  /** localStorage key of this tab's drawing */
  storeKey: string;
  /** the program's base key (the tabs of one program share it) */
  store: string;
  /** this tab is the visible one */
  active: boolean;
  /** a new tab starts empty instead of with the sample drawing */
  blank: boolean;
  /** files to open in a tab created by the Open dialog */
  files: File[] | null;
  /** the editor reports its drawing name, shown on the tab */
  onName: (name: string) => void;
  /** open these files in new tabs (one per drawing) */
  openInTabs: (files: File[]) => void;
  /** the editor says what this tab can save and how (its drawing as text, in each format) */
  register: (src: SaveSource) => void;
  /** shows the Open dialog */
  showFiles: () => void;
  /** the strip itself, placed by the editor under its top bar */
  tabs: ReactNode;
}

const MAIN = "main";
const isPicture = (f: File) => /\.(bmp|png|jpe?g|gif|webp)$/i.test(f.name);
const keyOf = (store: string, id: string) => (id === MAIN ? store : `${store}:${id}`);

function readTabs(store: string): { tabs: DocTab[]; active: string } {
  try {
    const v = JSON.parse(localStorage.getItem(store + ":tabs") || "null");
    if (v && Array.isArray(v.tabs) && v.tabs.length) return { tabs: v.tabs, active: v.tabs.some((t: DocTab) => t.id === v.active) ? v.active : v.tabs[0].id };
  } catch { /* no storage */ }
  return { tabs: [{ id: MAIN, name: "" }], active: MAIN };
}

/** closeAfter: the tab closes once it is saved (from the close prompt) */
type DlgState = { mode: "open" } | { mode: "save"; tabId: string; closeAfter?: boolean } | null;
type MenuState = { id: string; x: number; y: number } | null;

export function DocTabs({ store, lang, untitled, render }: {
  store: string; lang: Lang; untitled: string;
  render: (tab: DocTab, p: TabProps) => ReactNode;
}) {
  const [st, setSt] = useState(() => readTabs(store));
  const fresh = useRef<Record<string, { blank: boolean; files: File[] | null }>>({});
  const sources = useRef<Record<string, SaveSource>>({});
  const [dlg, setDlg] = useState<DlgState>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const t = COMMON[lang];
  useEffect(() => { try { localStorage.setItem(store + ":tabs", JSON.stringify(st)); } catch { /* storage full or blocked */ } }, [store, st]);
  // a tab menu closes on any click outside it
  useEffect(() => {
    if (!menu) return;
    const h = () => setMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [menu]);

  /** a new empty tab, or one tab per drawing file; pictures among the files go with every drawing */
  const add = (files: File[] | null = null) => {
    const pics = (files || []).filter(isPicture), docs = (files || []).filter((f) => !isPicture(f));
    const groups = files?.length ? (docs.length ? docs.map((d) => [d, ...pics]) : [pics]) : [null];
    const made = groups.map((g) => {
      const id = nid("t");
      fresh.current[id] = { blank: true, files: g };
      return { id, name: g?.find((f) => !isPicture(f))?.name.replace(/\.[^.]*$/, "") || "" };
    });
    setSt((s) => ({ tabs: [...s.tabs, ...made], active: made[made.length - 1].id }));
  };
  // files dropped anywhere on the page open in new tabs
  useEffect(() => {
    const over = (e: DragEvent) => { if (e.dataTransfer?.types.includes("Files")) e.preventDefault(); };
    const drop = (e: DragEvent) => { const fs = [...(e.dataTransfer?.files || [])]; if (!fs.length) return; e.preventDefault(); add(fs); };
    window.addEventListener("dragover", over); window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, []);

  /** closing asks first: save the drawing (to this computer) and close, close without saving, or keep it open */
  const close = (id: string) => setClosing(id);
  const closeWith = (id: string, save: boolean) => {
    if (save) { setClosing(null); setDlg({ mode: "save", tabId: id, closeAfter: true }); return; }
    removeTab(id);
  };
  const removeTab = (id: string) => {
    setClosing(null);
    delete sources.current[id];
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
          <button className="dt-more" aria-label={t.moreMenu} title={t.moreMenu} aria-haspopup="menu" aria-expanded={menu?.id === tab.id}
            onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); setMenu(menu?.id === tab.id ? null : { id: tab.id, x: r.left, y: r.bottom }); }}>⋮</button>
          <button className="dt-x" aria-label={t.closeTabBtn} title={t.closeTabBtn} onClick={(e) => { e.stopPropagation(); close(tab.id); }}>×</button>
        </div>))}
      <button className="dt-add" onClick={() => add()} title={t.newTab} aria-label={t.newTab}>+</button>
      {menu && (<div className="dt-menu" role="menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
        <button role="menuitem" onClick={() => { setMenu(null); setDlg({ mode: "save", tabId: menu.id }); }}>{t.menuSave}</button>
        <button role="menuitem" onClick={() => { const id = menu.id; setMenu(null); close(id); }}>{t.menuClose}</button>
      </div>)}
    </div>);

  const closingName = st.tabs.find((x) => x.id === closing)?.name || untitled;
  return (<>{closing && (<Dialog lang={lang} title={t.closeTabTitle} onClose={() => setClosing(null)}>
    <p>{t.closeTabAsk(closingName)}</p>
    <div className="row">
      <button className="go" onClick={() => closeWith(closing, true)}>{t.saveAndClose}</button>
      <button onClick={() => closeWith(closing, false)}>{t.closeWithout}</button>
      <span className="spacer"></span><button onClick={() => setClosing(null)}>{t.keepOpen}</button>
    </div>
  </Dialog>)}
  {dlg && (<FileDialog lang={lang} store={store} untitled={untitled} onOpen={(fs) => add(fs)} onClose={() => setDlg(null)}
    dialog={dlg.mode === "open" ? { mode: "open" } : { mode: "save", source: sources.current[dlg.tabId] || null,
      onDone: dlg.closeAfter ? () => { setDlg(null); removeTab(dlg.tabId); } : undefined }} />)}
  {st.tabs.map((tab) => {
    const on = tab.id === st.active, f = fresh.current[tab.id];
    return (<div key={tab.id} className="doctab-pane" style={on ? undefined : { display: "none" }}>
      {render(tab, {
        storeKey: keyOf(store, tab.id), store, active: on, blank: !!f?.blank, files: f?.files || null,
        onName: (n) => setName(tab.id, n), openInTabs: add,
        register: (src) => { sources.current[tab.id] = src; },
        showFiles: () => setDlg({ mode: "open" }),
        tabs: on ? strip : null,
      })}
    </div>);
  })}</>);
}
