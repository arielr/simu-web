/**
 * The Open and Save dialogs, shared by all programs. A drawing can come from this computer (a file),
 * from this browser (the drawings kept in its storage and copies saved "in this browser"), or from
 * Google Drive; and it can be saved to any of the three. Drawings travel as text in each program's
 * own file format, so an editor only has to say how to serialize itself.
 */
import { useRef, useState } from "react";
import { COMMON, type Lang } from "./i18n";
import { Dialog } from "./ui";
import { detectSaver } from "../platform/save";
import { latin1 } from "../cad/format";
import { driveConfigured, driveDownload, driveList, driveSave, type DriveFile } from "./drive";
import { nid, safeName } from "./hooks";

export interface SaveFormat { id: string; label: string; ext: string }
/** what an editor can save: its formats, and its drawing in one of them */
export interface SaveSource {
  formats: SaveFormat[];
  serialize: (fmt: string) => { name: string; text: string; notes?: string[] };
}
/** onDone runs after a successful save (default: close the dialog) */
export type FileMode = { mode: "open" } | { mode: "save"; source: SaveSource | null; onDone?: () => void };

const LIB = "#lib:";
const MIME: Record<string, string> = { cad: "application/octet-stream", json: "application/json" };

interface Stored { key: string; kind: "tab" | "lib"; name: string; parts: number; wires: number; open: boolean; text: string; ext: string; saved: number }

/** the drawings of this program kept in the browser: each tab's drawing, and copies saved "in this browser" */
function listStored(store: string): Stored[] {
  const openKeys = new Set<string>([store]);
  try {
    const idx = JSON.parse(localStorage.getItem(store + ":tabs") || "null");
    (idx?.tabs || []).forEach((x: { id: string }) => openKeys.add(x.id === "main" ? store : store + ":" + x.id));
  } catch { /* no storage */ }
  const out: Stored[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      const raw = localStorage.getItem(k) || "";
      try {
        const d = JSON.parse(raw);
        if (k.startsWith(store + LIB)) {
          out.push({ key: k, kind: "lib", name: d.name || "", parts: 0, wires: 0, open: false, text: String(d.text ?? ""), ext: d.ext || "json", saved: Number(d.saved) || 0 });
        } else if ((k === store || (k.startsWith(store + ":") && k !== store + ":tabs")) && d && Array.isArray(d.comps)) {
          out.push({ key: k, kind: "tab", name: d.name || "", parts: d.comps.length, wires: (d.wires || d.tubes || []).length, open: openKeys.has(k), text: raw, ext: "json", saved: 0 });
        }
      } catch { /* not a drawing */ }
    }
  } catch { /* storage blocked */ }
  return out;
}

/** a stored drawing as a file, read the way the file would be (CADe files are Windows-1252 text) */
function fileOf(s: Stored, untitled: string): File {
  const base = safeName(s.name || untitled);
  if (s.kind === "lib" && s.ext === "cad") return new File([latin1(s.text)], base + ".cad");
  return new File([s.text], base + "." + s.ext, { type: MIME[s.ext] || "text/plain" });
}

export async function saveToComputer(src: SaveSource, fmt: SaveFormat): Promise<boolean> {
  const d = src.serialize(fmt.id);
  const saver = await detectSaver();
  if (!saver) return false;
  try {
    const base = safeName(d.name || "");
    return fmt.ext === "cad" ? await saver.saveCad(base, d.text) : await saver.saveJson(base, d.text);
  } catch (err: any) {
    if (err?.code === "declined") return false;
    throw err;
  }
}

function saveToBrowser(store: string, src: SaveSource, fmt: SaveFormat): boolean {
  const d = src.serialize(fmt.id);
  try {
    localStorage.setItem(store + LIB + nid("f"), JSON.stringify({ name: d.name, ext: fmt.ext, text: d.text, saved: Date.now() }));
    return true;
  } catch { return false; }
}

async function saveToDrive(src: SaveSource, fmt: SaveFormat): Promise<void> {
  const d = src.serialize(fmt.id);
  await driveSave(safeName(d.name || "") + "." + fmt.ext, MIME[fmt.ext] || "text/plain", fmt.ext === "cad" ? latin1(d.text) : d.text);
}

export function FileDialog({ lang, store, untitled, dialog, onOpen, onClose }: {
  lang: Lang; store: string; untitled: string; dialog: FileMode;
  onOpen: (files: File[]) => void; onClose: () => void;
}) {
  const t = COMMON[lang];
  return (<Dialog lang={lang} title={dialog.mode === "open" ? t.open : t.saveDlg} onClose={onClose}>
    {dialog.mode === "open"
      ? <OpenPanel lang={lang} store={store} untitled={untitled} onOpen={(fs) => { onOpen(fs); onClose(); }} />
      : <SavePanel lang={lang} store={store} source={dialog.source} onDone={dialog.onDone || onClose} />}
  </Dialog>);
}

function OpenPanel({ lang, store, untitled, onOpen }: { lang: Lang; store: string; untitled: string; onOpen: (fs: File[]) => void }) {
  const t = COMMON[lang];
  const [stored] = useState(() => listStored(store));
  const [drive, setDrive] = useState<DriveFile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const openDrive = async () => {
    setBusy(true); setErr("");
    try { setDrive(await driveList()); } catch { setErr(t.openFail); } finally { setBusy(false); }
  };
  const pickDrive = async (f: DriveFile) => {
    setBusy(true); setErr("");
    try { const b = await driveDownload(f.id); onOpen([new File([b], f.name, { type: b.type })]); } catch { setErr(t.openFail); setBusy(false); }
  };
  return (<div className="fileopen">
    <section>
      <h3>{t.fromComputer}</h3>
      <button className="go" onClick={() => fileRef.current?.click()}>{t.chooseFiles}</button>
      <input ref={fileRef} type="file" multiple hidden accept=".cad,.json,.ct,.bmp,.png,.jpg,.jpeg,.gif,.webp"
        onChange={(e) => { const fs = [...(e.target.files || [])]; e.target.value = ""; if (fs.length) onOpen(fs); }} />
    </section>
    <section>
      <h3>{t.fromBrowser}</h3>
      {stored.length === 0 ? <p className="hint">{t.nothingStored}</p> : (
        <div className="storedlist">{stored.map((s) => (
          <button key={s.key} disabled={s.open} onClick={() => onOpen([fileOf(s, untitled)])} title={s.key}>
            <span dir="auto">{s.name || untitled}</span>
            <span className="hint">{s.open ? t.storedOpenTag + " · " : ""}{s.kind === "tab" ? t.countOf(s.parts, s.wires) : t.savedAt(new Date(s.saved).toLocaleString(lang))}</span>
          </button>))}</div>)}
    </section>
    <section>
      <h3>{t.fromDrive}</h3>
      {!driveConfigured() ? <p className="hint">{t.driveOff}</p>
        : drive === null ? <button onClick={openDrive} disabled={busy}>{t.driveSignIn}</button>
        : drive.length === 0 ? <p className="hint">{t.driveEmpty}</p>
        : <div className="storedlist">{drive.map((f) => (<button key={f.id} disabled={busy} onClick={() => pickDrive(f)}><span dir="auto">{f.name}</span></button>))}</div>}
      {err && <p className="hint">{err}</p>}
    </section>
  </div>);
}

function SavePanel({ lang, store, source, onDone }: { lang: Lang; store: string; source: SaveSource | null; onDone: () => void }) {
  const t = COMMON[lang];
  const [fmtId, setFmtId] = useState(source?.formats[0]?.id || "");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!source) return <p className="hint">{t.nothingToSave}</p>;
  const fmt = source.formats.find((f) => f.id === fmtId) || source.formats[0];
  const notes = source.serialize(fmt.id).notes || [];
  const go = async (where: "computer" | "browser" | "drive") => {
    setBusy(true); setMsg("");
    try {
      const ok = where === "computer" ? await saveToComputer(source, fmt)
        : where === "browser" ? saveToBrowser(store, source, fmt)
        : (await saveToDrive(source, fmt), true);
      if (ok) { onDone(); return; }
      setMsg(t.saveFail);
    } catch { setMsg(t.saveFail); } finally { setBusy(false); }
  };
  return (<div className="fileopen">
    {source.formats.length > 1 && (<div className="seg" role="group" aria-label={t.formatLabel}>
      {source.formats.map((f) => <button key={f.id} className={f.id === fmt.id ? "on" : ""} onClick={() => setFmtId(f.id)}>{f.label}</button>)}</div>)}
    {notes.map((n) => <div key={n} className="note">{n}</div>)}
    <div className="row">
      <button disabled={busy} onClick={() => go("computer")}>{t.toComputer}</button>
      <button disabled={busy} onClick={() => go("browser")}>{t.toBrowser}</button>
      <button disabled={busy || !driveConfigured()} title={driveConfigured() ? "" : t.driveOff} onClick={() => go("drive")}>{t.toDrive}</button>
    </div>
    {msg && <p className="hint">{msg}</p>}
  </div>);
}
