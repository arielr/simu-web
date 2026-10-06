/**
 * Pneumatic / hydraulic circuit editor. One component, two separate programs:
 * each domain has its own parts library, examples, storage and colour.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPE } from "react";
import { FLUID_CATALOG, FluidPart } from "./catalog";
import { FluidSymbol } from "./symbols";
import { fluidName } from "./names";
import { FS } from "./strings";
import { importCt } from "./ctImport";
import { solveFluid, moveCylinders, emptySim, startSim, clickAction, roleOf, valveInfo, activeMarks, SimState } from "./sim";
import { CylDialog } from "./CylDialog";
import { buildCyl, cylConfigOf, cylPortRoles, defaultCyl, isGenCyl, shapeKey, withParams, CylConfig, CylMark } from "./cylGen";
import { ValveDialog } from "./ValveDialog";
import { buildValve, configOf, defaultConfig, portRoles, ValveConfig } from "./valveGen";
import { solveElectric, stepElectric, emptyElec, eKind, ElecState } from "./elec";
import { FLUID_EXAMPLES } from "../examples/fluid";
import {
  FComp, FluidDoc, FluidDomain, PortRef, Tube, FLUID_KIND, MM, SNAP, PORT_R,
  partOf, portsOf, portPos, rotSize, rotTransform, routeTube, isFluidPart, unrotPt,
} from "./model";
import { useLang, useHistory, usePersist, useSaver, useFlash, useKeys, useTitle, loadPersisted, nid, safeName } from "../shared/hooks";
import { COMMON } from "../shared/i18n";
import { EditorFrame, HomeButton, Brand, Seg, ZoomControl, UndoButton, NameField, ExamplesMenu, BarEnd, PartsDrawer, Dialog, StageMessage, Preview, matches } from "../shared/ui";

const A3W = 420 * MM, A3H = 297 * MM, PX = 1 / 256; // 4 px per mm at 100 %

/** bounding box of everything drawn */
function extent(comps: FComp[]): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of comps) {
    const p = partOf(c); if (!p) continue;
    const [w, h] = rotSize(p, c.rot);
    x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); x1 = Math.max(x1, c.x + w); y1 = Math.max(y1, c.y + h);
  }
  return x0 < Infinity ? [x0, y0, x1, y1] : null;
}
const GROUPS = ["actuator", "valve", "vgroup", "supply", "sensor", "electric", "other"];
const storeKey = (d: FluidDomain) => "simu-web-fluid-" + d;
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

const NEW_VALVE = "__valve", NEW_CYL = "__cyl";
const genCache: Record<string, FluidPart> = {};
/** catalog part, or the configurable valve generated with default settings */
function partForKey(key: string, hyd: boolean): FluidPart {
  if (key === NEW_VALVE) return genCache[hyd ? "h" : "p"] ||= buildValve({ ...defaultConfig(hyd ? 4 : 5), name: "" }, hyd);
  if (key === NEW_CYL) return genCache[hyd ? "hc" : "pc"] ||= buildCyl(defaultCyl(hyd), hyd);
  return FLUID_CATALOG[key];
}

/** piston position at rest (S / HUB) */
const restExt = (p: FluidPart) => { const h = parseFloat(p.props.HUB || ""), s = parseFloat(p.props.S_RESET ?? p.props.S ?? ""); return h > 0 && s > 0 ? Math.min(1, s / h) : 0; };

function groupOf(p: FluidPart): string {
  if (p.ports.length && p.ports.every((q) => q.kind === "EConnection") && eKind(p).k !== "none") return "electric";
  if (p.domain.endsWith("-example")) return "other";
  const seg = (p.files[0] || "").split(":")[1]?.split("/")[1] || "";
  return GROUPS.includes(seg) ? seg : "other";
}

function loadDoc(d: FluidDomain, t: typeof FS.en): FluidDoc {
  const s = loadPersisted<FluidDoc>(storeKey(d), (v) => Array.isArray(v.comps));
  if (s) return s;
  const ex = FLUID_EXAMPLES[d][0];
  try { const r = importCt(ex.bytes(), (t as any)[ex.key]); return { name: r.name, comps: r.comps, tubes: r.tubes }; } catch { return { name: t.newName, comps: [], tubes: [] }; }
}

type Sel = { k: "c" | "t"; id: string } | null;
type Drag = { kind: "move"; id: string; dx: number; dy: number; moved: boolean } | null;

function PartIcon({ part }: { part: FluidPart }) {
  const [w, h] = part.size, pad = 3000, s = Math.max(w, h) + 2 * pad;
  return (<svg className="fl" width="44" height="30" viewBox={`${(w - s) / 2} ${(h - s * 0.76) / 2} ${s} ${s * 0.76}`} aria-hidden="true"><FluidSymbol part={part} /></svg>);
}

export function FluidApp({ domain, onHome }: { domain: FluidDomain; onHome?: () => void }) {
  const [lang, setLang] = useLang();
  const t = FS[lang], c0 = COMMON[lang];
  const init = useMemo(() => loadDoc(domain, t), [domain]);
  const [name, setName] = useState(init.name || "");
  const [comps, setComps] = useState<FComp[]>(init.comps);
  const [tubes, setTubes] = useState<Tube[]>(init.tubes);
  const [tool, setTool] = useState<string>("select");
  const [sel, setSel] = useState<Sel>(null);
  const [draft, setDraft] = useState<{ a: PortRef; pts: [number, number][] } | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [placeRot, setPlaceRot] = useState(0);
  const [zoom, setZoom] = useState(0.75);
  const [dlg, setDlg] = useState(false);
  const [msg, setMsg] = useFlash(9000);
  const [query, setQuery] = useState("");
  const saver = useSaver();
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitReq, setFitReq] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null), drag = useRef<Drag>(null);
  const fileRef = useRef<HTMLInputElement>(null), jsonRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"edit" | "sim">("edit");
  const [sim, setSim] = useState<SimState>(emptySim);
  const held = useRef<string | null>(null);
  const [vdlg, setVdlg] = useState<string | null>(null);
  const [cdlg, setCdlg] = useState<{ id: string; init: CylConfig; rule?: string; ruleMarks?: CylMark[] } | null>(null);
  const [elecSt, setElecSt] = useState<ElecState>(emptyElec);
  const [now, setNow] = useState(() => Date.now());

  const title = c0.programs[domain === "pneu" ? "pneumatic" : "hydraulic"];
  const doc = useMemo(() => ({ name, comps, tubes }), [name, comps, tubes]);
  usePersist(storeKey(domain), doc);
  useTitle(`SIMU Web · ${title}`);

  const palette = useMemo(() => {
    const kind = FLUID_KIND[domain];
    const q = query.trim().toLowerCase();
    const items = Object.entries(FLUID_CATALOG)
      .filter(([, p]) => isFluidPart(p, domain) && (p.ports.some((x) => x.kind === kind) || groupOf(p) === "electric"))
      .map(([key, p]) => ({ key, p, label: fluidName(p.cls, p.description, lang), g: groupOf(p) }))
      .filter((x) => matches(q, x.label, x.p.cls));
    const gen = partForKey(NEW_VALVE, domain === "hyd"), genLabel = lang === "he" ? "שסתום כיווני – הגדרה חופשית ⚙" : "Directional valve – configure ⚙";
    const genC = partForKey(NEW_CYL, domain === "hyd"), genCLabel = lang === "he" ? "בוכנה – הגדרה חופשית ⚙" : "Cylinder – configure ⚙";
    return GROUPS.map((g) => ({
      id: g, title: t.groups[g],
      items: [
        ...(g === "valve" && matches(q, genLabel, "valve") ? [{ key: NEW_VALVE, label: genLabel, icon: <PartIcon part={gen} />, title: genLabel }] : []),
        ...(g === "actuator" && matches(q, genCLabel, "cylinder") ? [{ key: NEW_CYL, label: genCLabel, icon: <PartIcon part={genC} />, title: genCLabel }] : []),
        ...items.filter((x) => x.g === g).sort((a, b) => a.label.localeCompare(b.label))
          .map(({ key, p, label }) => ({ key, label, icon: <PartIcon part={p} />, title: p.cls + (p.config ? " · " + p.config : "") })),
      ],
    }));
  }, [domain, lang, query]);

  const { push, undo } = useHistory(() => ({ comps, tubes }), (h) => { setComps(h.comps); setTubes(h.tubes); setSel(null); });
  const loadDoc2 = (d: FluidDoc) => { push(); setComps(d.comps); setTubes(d.tubes); setName(d.name); setSel(null); setDraft(null); setTool("select"); setFitReq((n) => n + 1); };
  const ext = extent(comps);
  const SHEET_W = Math.max(A3W, ext ? ext[2] + 20 * MM : 0), SHEET_H = Math.max(A3H, ext ? ext[3] + 20 * MM : 0);
  // zoom to fit the circuit after loading a file
  useEffect(() => {
    const st = stageRef.current, e = extent(comps);
    if (!st || !e) return;
    const m = 12 * MM, z = Math.min(st.clientWidth / ((e[2] - e[0] + 2 * m) * PX), st.clientHeight / ((e[3] - e[1] + 2 * m) * PX), 2);
    const zz = Math.max(0.25, Math.floor(z * 20) / 20);
    setZoom(zz);
    requestAnimationFrame(() => { st.scrollLeft = (e[0] - m) * PX * zz; st.scrollTop = (e[1] - m) * PX * zz; });
  }, [fitReq]);

  /* ---- simulation ---- */
  useEffect(() => { if (mode !== "sim") return; const i = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(i); }, [mode]);
  const elRes = useMemo(() => (mode === "sim" ? solveElectric(comps, tubes, sim.act, activeMarks(comps, sim.ext), elecSt, now) : null), [mode, comps, tubes, sim, elecSt, now]);
  useEffect(() => { if (elRes) { const n = stepElectric(comps, elRes, elecSt, now); if (n !== elecSt) setElecSt(n); } }, [elRes]);
  const simRes = useMemo(() => (mode === "sim" && elRes ? solveFluid(comps, tubes, sim, elRes.solenoids) : null), [mode, comps, tubes, sim, elRes]);
  useEffect(() => { // keep valve positions (memory valves stay where they were switched)
    if (!simRes) return;
    if (Object.entries(simRes.pos).some(([k, v]) => sim.pos[k] !== v)) setSim((s) => ({ ...s, pos: { ...s.pos, ...simRes.pos } }));
  }, [simRes]);
  useEffect(() => {
    if (!simRes || !Object.values(simRes.dir).some((d) => d)) return;
    let last = performance.now(), raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      setSim((s) => { const r = moveCylinders(comps, s, simRes, dt, domain === "hyd"); return r.moving || JSON.stringify(r.force) !== JSON.stringify(s.force) ? { ...s, ext: r.ext, vel: r.vel, force: r.force } : s; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [simRes && JSON.stringify(simRes.dir) + [...simRes.pressure].length]);
  const toMode = (m: "edit" | "sim") => { setMode(m); setSim(m === "sim" ? startSim(comps) : emptySim()); setElecSt(emptyElec()); setDraft(null); setTool("select"); setSel(null); };
  useEffect(() => { // release push buttons wherever the pointer goes up
    const up = () => { const h = held.current; if (h) { held.current = null; setSim((s) => ({ ...s, act: { ...s.act, [h]: false } })); } };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);
  const simClick = (c: FComp, x: number, y: number, latch = false) => {
    const part = partOf(c); if (!part) return;
    const r = roleOf(part);
    if (elRes?.manual.has(c.id)) {
      if (latch || elRes.latching.has(c.id)) setSim((s) => ({ ...s, act: { ...s.act, [c.id]: !s.act[c.id] } }));
      else { held.current = c.id; setSim((s) => ({ ...s, act: { ...s.act, [c.id]: true } })); }
      return;
    }
    if (r.kind === "shutoff") { setSim((s) => ({ ...s, closed: { ...s.closed, [c.id]: !s.closed[c.id] } })); return; }
    const [ux] = unrotPt(part, c.rot, x - c.x, y - c.y);
    const a = clickAction(part, ux);
    if (!a) return;
    const k = c.id + ":" + a.side;
    if (a.momentary && !latch) { held.current = k; setSim((s) => ({ ...s, act: { ...s.act, [k]: true } })); }
    else setSim((s) => ({ ...s, act: { ...s.act, [k]: !s.act[k] } }));
  };

  const toSheet = (e: { clientX: number; clientY: number }): [number, number] => {
    const svg = svgRef.current!, pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [p.x, p.y];
  };
  const hitPort = (x: number, y: number): PortRef | null => {
    let best: PortRef | null = null, bd = PORT_R * 2.2;
    for (const c of comps) portsOf(c).forEach((p, i) => {
      const d = Math.hypot(p.ax - x, p.ay - y);
      if (d < bd) { bd = d; best = { c: c.id, p: i }; }
    });
    return best;
  };
  const kindOf = (r: PortRef) => { const c = comps.find((k) => k.id === r.c); return c ? portsOf(c)[r.p]?.kind : undefined; };

  const finishTube = (b: PortRef) => {
    if (!draft) return;
    if (b.c === draft.a.c && b.p === draft.a.p) { setDraft(null); return; }
    if (kindOf(b) !== kindOf(draft.a)) { setMsg(lang === "he" ? "אפשר לחבר רק יציאות מאותו סוג" : "Only ports of the same kind can be joined"); return; }
    push();
    setTubes((ts) => [...ts, { id: nid("t"), a: draft.a, b, pts: draft.pts }]);
    setDraft(null);
  };

  const onDown = (e: RPE<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const [x, y] = toSheet(e);
    setMsg("");
    if (mode === "sim") {
      const cid = (e.target as Element).closest("[data-cid]")?.getAttribute("data-cid");
      const c = cid && comps.find((k) => k.id === cid);
      if (c) simClick(c, x, y, e.shiftKey);
      return;
    }
    if (tool.startsWith("place:")) {
      const key = tool.slice(6), part = partForKey(key, domain === "hyd");
      const [w, h] = rotSize(part, placeRot);
      push();
      const c: FComp = key === NEW_VALVE || key === NEW_CYL ? { id: nid("c"), key: part.cls + "|gen", part, x: snap(x - w / 2), y: snap(y - h / 2), rot: placeRot }
        : { id: nid("c"), key, x: snap(x - w / 2), y: snap(y - h / 2), rot: placeRot };
      setComps((cs) => [...cs, c]);
      setSel({ k: "c", id: c.id });
      if (!e.shiftKey) setTool("select");
      return;
    }
    const port = hitPort(x, y);
    if (draft) {
      if (port) finishTube(port);
      else setDraft({ ...draft, pts: [...draft.pts, [snap(x), snap(y)]] });
      return;
    }
    if (port && (tool === "tube" || tool === "select")) {
      const busy = tool === "select" && tubes.some((tb) => (tb.a.c === port.c && tb.a.p === port.p) || (tb.b.c === port.c && tb.b.p === port.p));
      if (!busy) { setDraft({ a: port, pts: [] }); setSel(null); return; }
    }
    const el = (e.target as Element).closest("[data-cid],[data-tid]");
    if (el?.getAttribute("data-tid")) { setSel({ k: "t", id: el.getAttribute("data-tid")! }); return; }
    const cid = el?.getAttribute("data-cid");
    if (cid && tool === "select") {
      const c = comps.find((k) => k.id === cid)!;
      setSel({ k: "c", id: cid });
      drag.current = { kind: "move", id: cid, dx: x - c.x, dy: y - c.y, moved: false };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    setSel(null);
  };
  const onMove = (e: RPE<SVGSVGElement>) => {
    const [x, y] = toSheet(e);
    setCursor([x, y]);
    const d = drag.current;
    if (d && d.kind === "move") {
      if (!d.moved) { push(); d.moved = true; }
      const nx = snap(x - d.dx), ny = snap(y - d.dy);
      setComps((cs) => cs.map((c) => (c.id === d.id && (c.x !== nx || c.y !== ny) ? { ...c, x: nx, y: ny } : c)));
    }
  };
  const onUp = (e: RPE<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (draft && !d) {
      // drag-from-port: releasing on another port finishes the tube
      const [x, y] = toSheet(e);
      const port = hitPort(x, y);
      if (port && !(port.c === draft.a.c && port.p === draft.a.p)) finishTube(port);
    }
  };

  const rotateSel = () => {
    if (tool.startsWith("place:")) { setPlaceRot((r) => (r + 90) % 360); return; }
    if (sel?.k !== "c") return;
    push();
    setComps((cs) => cs.map((c) => {
      if (c.id !== sel.id) return c;
      const part = partOf(c)!, [w, h] = rotSize(part, c.rot), rot = (c.rot + 90) % 360;
      return { ...c, rot, x: snap(c.x + w / 2 - h / 2), y: snap(c.y + h / 2 - w / 2) };
    }));
  };
  const isValve = (c?: FComp) => !!c && /^H?WV_\d/.test(partOf(c)?.cls || "");
  const isCyl = (c?: FComp) => !!c && !!partOf(c) && roleOf(partOf(c)!).kind === "cyl";
  /** open the cylinder dialog; marks of a distance rule next to it are shown as its marks */
  const openCyl = (id: string) => {
    const c = comps.find((k) => k.id === id); if (!c) return;
    const part = partOf(c)!, init = cylConfigOf(part);
    const cyls = comps.filter(isCyl), ctr = (k: FComp) => { const p = partOf(k)!; const [w, h] = rotSize(p, k.rot); return [k.x + w / 2, k.y + h / 2]; };
    let rule: string | undefined, ruleMarks: CylMark[] | undefined;
    if (!init.marks.length) for (const k of comps) {
      const p = partOf(k); if (!p || !("label0" in p.props)) continue;
      const [x, y] = ctr(k);
      const near = cyls.reduce((a, b) => (Math.hypot(ctr(b)[0] - x, ctr(b)[1] - y) < Math.hypot(ctr(a)[0] - x, ctr(a)[1] - y) ? b : a));
      if (near.id !== id) continue;
      rule = k.id; ruleMarks = [];
      for (let i = 0; `label${i}` in p.props; i++) { const mm = parseFloat(p.props[`pos${i}`] || "0"); ruleMarks.push({ label: p.props[`label${i}`], start: mm, end: mm }); }
      init.marks = ruleMarks;
      break;
    }
    setCdlg({ id, init, rule, ruleMarks });
  };
  const applyCyl = (cfg: CylConfig) => {
    if (!cdlg) return;
    const id = cdlg.id, c = comps.find((k) => k.id === id); if (!c) return;
    const old = partOf(c)!, hyd = domain === "hyd";
    // marks taken from a distance rule and left unchanged stay on the rule
    const sameAsRule = cdlg.ruleMarks && JSON.stringify(cdlg.ruleMarks) === JSON.stringify(cfg.marks);
    const cfg2 = sameAsRule ? { ...cfg, marks: [] } : cfg;
    const keep = !isGenCyl(old) && shapeKey(cylConfigOf(old)) === shapeKey(cfg2);
    const part = keep ? withParams(old, cfg2, hyd) : buildCyl(cfg2, hyd);
    const oldR = cylPortRoles(old), newR = cylPortRoles(part);
    const map = (i: number) => (keep ? i : newR.indexOf(oldR[i]));
    const dropRule = cdlg.rule && !sameAsRule ? cdlg.rule : null;
    push();
    setComps((cs) => cs.filter((k) => k.id !== dropRule).map((k) => (k.id === id ? { ...k, key: keep ? k.key : part.cls + "|gen", part } : k)));
    setTubes((ts) => ts.map((tb) => {
      const a = tb.a.c === id ? { ...tb.a, p: map(tb.a.p) } : tb.a, b = tb.b.c === id ? { ...tb.b, p: map(tb.b.p) } : tb.b;
      return { ...tb, a, b };
    }).filter((tb) => tb.a.p >= 0 && tb.b.p >= 0 && tb.a.c !== dropRule && tb.b.c !== dropRule));
    setCdlg(null);
  };
  const applyValve = (id: string, cfg: ValveConfig) => {
    const c = comps.find((k) => k.id === id); if (!c) return;
    const old = partOf(c)!, part = buildValve(cfg, domain === "hyd");
    const oldR = portRoles(old), newR = portRoles(part);
    const map = (i: number) => newR.indexOf(oldR[i]);
    push();
    setComps((cs) => cs.map((k) => (k.id === id ? { ...k, key: part.cls + "|gen", part } : k)));
    setTubes((ts) => ts.map((tb) => {
      const a = tb.a.c === id ? { ...tb.a, p: map(tb.a.p) } : tb.a, b = tb.b.c === id ? { ...tb.b, p: map(tb.b.p) } : tb.b;
      return { ...tb, a, b };
    }).filter((tb) => tb.a.p >= 0 && tb.b.p >= 0));
    setVdlg(null);
  };
  const deleteSel = () => {
    if (!sel) return;
    push();
    if (sel.k === "c") { setComps((cs) => cs.filter((c) => c.id !== sel.id)); setTubes((ts) => ts.filter((tb) => tb.a.c !== sel.id && tb.b.c !== sel.id)); }
    else setTubes((ts) => ts.filter((tb) => tb.id !== sel.id));
    setSel(null);
  };
  useKeys((e) => {
    if (dlg || vdlg || cdlg) return;
    if (mode === "sim") { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") e.preventDefault(); return; }
    if (e.key === "Escape") { setDraft(null); setTool("select"); setPlaceRot(0); }
    else if (e.key === "r" || e.key === "R" || e.key === "ר") rotateSel();
    else if (e.key === "Delete" || e.key === "Backspace") deleteSel();
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
  });

  const openCt = async (f: File) => {
    try {
      const r = importCt(new Uint8Array(await f.arrayBuffer()), f.name.replace(/\.ct$/i, ""));
      loadDoc2(r);
      const extra = Object.values(r.skipped).reduce((a, b) => a + b, 0);
      const wrong = r.program !== "?" && (r.program === "H") !== (domain === "hyd");
      setMsg(t.imported(r.comps.length, r.tubes.length) + (extra ? ` ${t.skipped}: ${extra}.` : "") + (wrong ? " " + t.wrongProgram(r.program) : ""));
      setDlg(false);
    } catch (err: any) { setMsg(String(err?.message || err)); }
  };
  const openJson = async (f: File) => {
    try { const d = JSON.parse(await f.text()); if (Array.isArray(d.comps)) { loadDoc2({ name: d.name || f.name, comps: d.comps, tubes: d.tubes || [] }); setDlg(false); } } catch (err: any) { setMsg(String(err?.message || err)); }
  };
  const saveJson = async () => {
    if (!saver) return;
    await saver.saveJson(safeName(name), JSON.stringify({ app: "simu-web", domain, name, comps: comps.map(({ part, ...c }) => (FLUID_CATALOG[c.key] ? c : { ...c, part })), tubes }, null, 1));
  };

  // connected ports
  const used = new Set(tubes.flatMap((tb) => [tb.a.c + ":" + tb.a.p, tb.b.c + ":" + tb.b.p]));
  const fluidKind = FLUID_KIND[domain];
  const selComp = sel?.k === "c" ? comps.find((c) => c.id === sel.id) : undefined;
  const selTube = sel?.k === "t" ? tubes.find((tb) => tb.id === sel.id) : undefined;
  const placing = tool.startsWith("place:") ? partForKey(tool.slice(6), domain === "hyd") : undefined;
  const label = (c: FComp) => { const p = partOf(c); return p ? fluidName(p.cls, p.description, lang) : c.key; };

  const bar = (<>
    <HomeButton lang={lang} onHome={onHome} />
    <Brand title={title} />
    <Seg label="mode" value={mode} options={[["edit", t.edit], ["sim", t.sim]]} onChange={toMode} />
    {mode === "edit" && <Seg label="tool" value={tool === "tube" ? "tube" : "select"} options={[["select", c0.select], ["tube", t.tube]]} onChange={(v) => { setTool(v); setDraft(null); }} />}
    <UndoButton lang={lang} onUndo={undo} />
    <NameField lang={lang} value={name} onChange={setName} />
    <BarEnd lang={lang} setLang={setLang}
      zoom={<ZoomControl lang={lang} zoom={zoom} setZoom={setZoom} onReset={() => setFitReq((n) => n + 1)} />}
      onNew={() => { toMode("edit"); push(); setComps([]); setTubes([]); setName(t.newName); setSel(null); }}
      examples={<ExamplesMenu lang={lang} items={FLUID_EXAMPLES[domain].map((x) => [x.key, (t as any)[x.key]])}
        onPick={(k) => { const ex = FLUID_EXAMPLES[domain].find((x) => x.key === k); if (ex) { toMode("edit"); loadDoc2(importCt(ex.bytes(), (t as any)[ex.key])); } }} />}
      onFile={() => setDlg(true)} />
  </>);

  return (<EditorFrame app={domain} lang={lang} bar={bar}
    drawer={<PartsDrawer lang={lang} groups={palette} disabled={mode === "sim"} active={tool.startsWith("place:") ? tool.slice(6) : null} query={query} setQuery={setQuery}
      onPick={(k) => { setDraft(null); setTool("place:" + k); setPlaceRot(0); setSel(null); }} />}
    stage={
      <div className="stage" ref={stageRef}>
        <StageMessage text={msg} />
        <svg className="sheet fluid" ref={svgRef} onDoubleClick={() => { if (mode !== "edit" || sel?.k !== "c") return; const c = comps.find((k) => k.id === sel.id); if (isValve(c)) setVdlg(c!.id); else if (isCyl(c)) openCyl(c!.id); }} width={SHEET_W * PX * zoom} height={SHEET_H * PX * zoom} viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => setCursor(null)} onContextMenu={(e) => { e.preventDefault(); setDraft(null); }}
          style={{ cursor: mode === "sim" ? "default" : tool === "select" && !draft ? "default" : "crosshair" }}>
          <defs><pattern id="fdots" width={4 * MM} height={4 * MM} patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r={420} fill="var(--grid)" /></pattern></defs>
          <rect width={SHEET_W} height={SHEET_H} fill="url(#fdots)" />
          <rect x={5 * MM} y={5 * MM} width={SHEET_W - 10 * MM} height={SHEET_H - 10 * MM} fill="none" stroke="var(--grid)" strokeWidth={400} />

          {tubes.map((tb) => {
            const a = portPos(comps, tb.a), b = portPos(comps, tb.b);
            if (!a || !b) return null;
            const pts = routeTube(a, tb.pts, b).map((p) => p.join(",")).join(" ");
            const isSel = sel?.k === "t" && sel.id === tb.id;
            const wire = kindOf(tb.a) !== fluidKind; // electrical wires inside FluidSIM files
            const pressed = !!simRes && !wire && simRes.pressure.has(simRes.netOf.get(tb.a.c + ":" + tb.a.p)!);
            return (<g key={tb.id} data-tid={tb.id}>
              <polyline points={pts} fill="none" stroke="transparent" strokeWidth={2600} />
              {isSel && <polyline points={pts} fill="none" stroke="var(--sel)" strokeWidth={1800} opacity=".35" strokeLinejoin="round" />}
              <polyline points={pts} fill="none" stroke={wire ? (elRes ? (elRes.plus.has(elRes.netOf.get(tb.a.c + ":" + tb.a.p)!) ? "var(--live)" : elRes.minus.has(elRes.netOf.get(tb.a.c + ":" + tb.a.p)!) ? "var(--neu)" : "var(--ink)") : "var(--ink)") : simRes && !pressed ? "var(--tube-off)" : "var(--tube)"} strokeWidth={wire ? 260 : pressed ? 760 : 420} strokeLinejoin="round" />
            </g>);
          })}
          {draft && cursor && (() => {
            const a = portPos(comps, draft.a);
            if (!a) return null;
            const pts = routeTube(a, draft.pts, [snap(cursor[0]), snap(cursor[1])]).map((p) => p.join(",")).join(" ");
            return <polyline points={pts} fill="none" stroke="var(--tube)" strokeWidth={420} strokeDasharray="1500 900" pointerEvents="none" />;
          })()}

          {comps.map((c) => {
            const part = partOf(c);
            if (!part) return null;
            const [w, h] = rotSize(part, c.rot);
            const isSel = sel?.k === "c" && sel.id === c.id;
            const vi = simRes ? valveInfo(part) : null;
            const shift = vi && simRes!.pos[c.id] !== undefined ? vi.boxes[vi.drawn][0] - vi.boxes[simRes!.pos[c.id]][0] : 0;
            const clickable = !!simRes && (!!(vi && clickAction(part, 0)) || roleOf(part).kind === "shutoff" || !!elRes?.manual.has(c.id));
            return (<g key={c.id} data-cid={c.id} transform={`translate(${c.x},${c.y})`} style={{ cursor: simRes ? (clickable ? "pointer" : undefined) : tool === "select" ? "move" : undefined }}>
              <rect x={-800} y={-800} width={w + 1600} height={h + 1600} fill="transparent" stroke={isSel ? "var(--sel)" : "none"} strokeWidth={300} strokeDasharray="1200 800" rx={800} />
              <g transform={rotTransform(part, c.rot)}>
                <g transform={shift ? `translate(${shift},0)` : undefined}><FluidSymbol part={part} ext={sim.ext[c.id] ?? (simRes ? 0 : restExt(part))} st={elRes ? { closed: elRes.closed.has(c.id), on: elRes.on.has(c.id) } : eKind(part).k === "contact" && (eKind(part) as any).nc ? { closed: true } : undefined} /></g>
                {/* the switched valve slides; ports stay put, so pilot/side connections stretch to follow it */}
                {shift !== 0 && part.ports.map((q, i) => (q.kind === fluidKind && q.y > 1200 && q.y < part.size[1] - 1200 && used.has(c.id + ":" + i))
                  ? <line key={"st" + i} x1={q.x} y1={q.y} x2={q.x + shift} y2={q.y} stroke="currentColor" strokeWidth={330} /> : null)}
              </g>
              {clickable && <rect x={-800} y={-800} width={w + 1600} height={h + 1600} fill="color-mix(in srgb,var(--accent) 8%,transparent)" stroke="none" rx={800} pointerEvents="none" />}
              {simRes && roleOf(part).kind === "shutoff" && sim.closed[c.id] && <text x={w + 800} y={h / 2} fontSize={3600} fill="var(--live)" stroke="none">✕</text>}
              {c.tag && <text x={w + 1200} y={-600} fontSize={3000} fill="var(--muted)" stroke="none">{c.tag}</text>}
              {simRes && (part.props.SHOW_V === "T" || part.props.SHOW_F === "T") && <text x={w / 2} y={h + 4200} fontSize={3200} fill="var(--accent)" stroke="none" textAnchor="middle" className="mono">
                {[part.props.SHOW_V === "T" ? `${(sim.vel?.[c.id] ?? 0).toFixed(2)} m/s` : "", part.props.SHOW_F === "T" ? `${sim.force?.[c.id] ?? 0} N` : ""].filter(Boolean).join(" · ")}</text>}
            </g>);
          })}
          {comps.map((c) => portsOf(c).map((p, i) => {
            const fl = p.kind === fluidKind, on = used.has(c.id + ":" + i);
            if (!fl && on) return null;
            if (simRes && !fl) return null;
            if (simRes && !on) { const part = partOf(c)!, q = part.ports[i]; if (q.y > 1200 && q.y < part.size[1] - 1200) return null; }
            return <circle key={c.id + ":" + i} cx={p.ax} cy={p.ay} r={fl ? (on ? 700 : 900) : 600}
              fill={fl ? (on ? "var(--tube)" : "var(--sheet)") : "none"} stroke={fl ? "var(--tube)" : "var(--muted)"} strokeWidth={fl ? 300 : 200} pointerEvents="none" />;
          }))}
          {placing && cursor && (() => {
            const [w, h] = rotSize(placing, placeRot);
            return <g transform={`translate(${snap(cursor[0] - w / 2)},${snap(cursor[1] - h / 2)})`} opacity=".45" pointerEvents="none"><g transform={rotTransform(placing, placeRot)}><FluidSymbol part={placing} /></g></g>;
          })()}
        </svg>
      </div>
    }
    inspector={<>
        {simRes ? (<>
          <h3>{t.simTitle}</h3>
          <p className="hint">{t.simHint}</p>
          <div className="legend"><div><span style={{ background: "var(--tube)", height: 4 }}></span>{t.legP}</div><div><span style={{ background: "var(--tube-off)" }}></span>{t.legNoP}</div></div>
          {elRes?.short && <div className="warn" style={{ position: "static", margin: "8px 0" }}>{lang === "he" ? "קצר חשמלי!" : "Short circuit!"}</div>}
          {comps.some((c) => partOf(c) && ["timer", "counter"].includes(eKind(partOf(c)!).k)) && (<>
            <div className="grp" style={{ marginTop: 14 }}>{lang === "he" ? "טיימרים ומונים" : "Timers & counters"}</div>
            {comps.filter((c) => partOf(c) && ["timer", "counter"].includes(eKind(partOf(c)!).k)).map((c) => {
              const k = eKind(partOf(c)!) as any;
              const v = k.k === "timer" ? (elecSt.tOn[k.label] !== undefined ? `${Math.min(k.delay, (now - elecSt.tOn[k.label]) / 1000).toFixed(1)} / ${k.delay} s` : `0 / ${k.delay} s`) : `${elecSt.count[k.label]?.n ?? 0} / ${k.n}`;
              return <div key={c.id} className="mono" style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}><span>{k.label}</span><b>{v}</b></div>;
            })}</>)}
          <div className="grp" style={{ marginTop: 14 }}>{t.cylinders}</div>
          {comps.filter((c) => partOf(c) && roleOf(partOf(c)!).kind === "cyl").map((c) => {
            const d = simRes.dir[c.id] || 0, e = sim.ext[c.id] ?? 0;
            return (<div key={c.id} className="mono" style={{ fontSize: 12, display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span>{c.tag || label(c)}</span><b style={{ color: d ? "var(--accent)" : "var(--muted)" }}>{d > 0 ? "→ " : d < 0 ? "← " : ""}{Math.round(e * 100)}% · {Math.abs(sim.vel?.[c.id] ?? 0).toFixed(2)} m/s · {sim.force?.[c.id] ?? 0} N</b></div>);
          })}
        </>) : selComp ? (() => {
          const p = partOf(selComp)!;
          return (<>
            <Preview><svg className="fl big" viewBox={`${-4000} ${-4000} ${p.size[0] + 8000} ${p.size[1] + 8000}`}><FluidSymbol part={p} /></svg></Preview>
            <div className="about-name">{label(selComp)}</div>
            <p className="about mono" dir="ltr">{p.cls}{p.config ? <><br /><span className="hint">{t.config}: {p.config}</span></> : null}</p>
            <div className="row" style={{ marginBottom: 10 }}><button onClick={rotateSel}>{c0.rotate} ↻</button><button onClick={deleteSel}>{c0.del}</button>
              {isValve(selComp) && <button className="go" onClick={() => setVdlg(selComp.id)}>⚙ {lang === "he" ? "הגדר שסתום" : "Configure valve"}</button>}
              {isCyl(selComp) && <button className="go" onClick={() => openCyl(selComp.id)}>⚙ {lang === "he" ? "הגדר בוכנה" : "Configure cylinder"}</button>}</div>
            <div className="field"><label>{t.ports}</label>
              <div className="hint">{portsOf(selComp).map((q, i) => ({ q, i })).filter(({ q }) => q.kind === fluidKind).map(({ q, i }, n) => <span key={i} className="chip" style={{ marginInlineEnd: 4 }}>{q.label || n + 1}{used.has(selComp.id + ":" + i) ? "" : " · " + t.openPort}</span>)}</div></div>
            {Object.keys(p.props).length > 0 && (<div className="field"><label>{t.props}</label>
              <table className="props"><tbody>{Object.entries(p.props).filter(([k]) => k !== "description").slice(0, 14).map(([k, v]) => <tr key={k}><td className="mono">{k}</td><td className="mono">{String(v).slice(0, 24)}</td></tr>)}</tbody></table></div>)}
          </>);
        })() : selTube ? (<>
          <h3>{t.tubeSel}</h3>
          <p className="about">{t.from}: {label(comps.find((c) => c.id === selTube.a.c)!)}<br />{t.to}: {label(comps.find((c) => c.id === selTube.b.c)!)}<br />{t.bends}: {selTube.pts.length}</p>
          <button onClick={deleteSel}>{c0.del}</button>
        </>) : placing ? (<>
          <Preview><svg className="fl big" viewBox={`${-4000} ${-4000} ${placing.size[0] + 8000} ${placing.size[1] + 8000}`}><FluidSymbol part={placing} /></svg></Preview>
          <div className="about-name">{fluidName(placing.cls, placing.description, lang)}</div>
          <p className="hint">{t.placeHint}</p>
        </>) : (<p className="hint">{tool === "tube" ? t.tubeHint : t.selHint}</p>)}
    </>}
    status={<>
      <span><b>{comps.length}</b> {t.parts}</span><span><b>{tubes.length}</b> {t.tubes}</span>
      <span className={"chip" + (mode === "sim" ? " sim" : "")}>{mode === "sim" ? "SIM" : "EDIT"}</span>
    </>}
    overlay={cdlg ? <CylDialog lang={lang} hydraulic={domain === "hyd"} initial={cdlg.init} onApply={applyCyl} onClose={() => setCdlg(null)} /> : vdlg ? (() => { const c = comps.find((k) => k.id === vdlg); return c ? <ValveDialog lang={lang} hydraulic={domain === "hyd"} initial={configOf(partOf(c)!)} onApply={(cfg) => applyValve(c.id, cfg)} onClose={() => setVdlg(null)} /> : null; })() : dlg && (<Dialog lang={lang} title={c0.file} onClose={() => setDlg(false)}>
        <p className="note">{t.ctNote}</p>
        <div className="row">
          <button className="go" onClick={() => fileRef.current?.click()}>{t.openCt}</button>
          <button onClick={() => jsonRef.current?.click()}>{t.openJson}</button>
          {saver && <button onClick={saveJson}>{t.saveJson}</button>}
        </div>
        <input ref={fileRef} type="file" accept=".ct" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openCt(f); e.target.value = ""; }} />
        <input ref={jsonRef} type="file" accept=".json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) openJson(f); e.target.value = ""; }} />
    </Dialog>)} />);
}
