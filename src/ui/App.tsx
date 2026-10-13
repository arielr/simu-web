// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { CAD_CATALOG_NAMES, RAW_CAT, RAW_NAMES, rawTerminals } from "../cad/catalog";
import { addImage, imageOf, isImageFile } from "./images";
import { parseCad, writeCad, termNames } from "../cad/format";
import { useLang, useHistory, usePersist, useSaver, useFlash, useKeys, nid, safeName } from "../shared/hooks";
import { DocTabs } from "../shared/tabs";
import { COMMON, readLang } from "../shared/i18n";
import { EditorFrame, HomeButton, Brand, Seg, ZoomControl, UndoButton, NameField, ExamplesMenu, BarEnd, PartsDrawer, Dialog, matches } from "../shared/ui";
import { cadExample, catalog2Example, catalog3Example, catalog4Example, catalog5Example, catalogExample, test6Example, test7Example, threePhaseExample, timerExample } from "../examples/index";
import { pname } from "../i18n/descriptions";
import { I18N } from "../i18n/strings";
import { elbow, key, onSeg, pinsOf, rotV, wireNet } from "../model/geometry";
import { BOX2, DEFS, G, H, LAMP, NC_TYPES, PALETTE_HIDE, VARIANTS, W } from "../model/parts";
import { actuated, closed, solve } from "../sim/solve";
import { About, Icon, PartPicture, Sym } from "./symbols";
import { rawSym, RAW_DRAWN } from "./rawSyms";
import { parseProgram, plcAddrs } from "../model/plc";
import { TIMED } from "../model/extras";
import { paletteGroups } from "../model/palette";

export const STORE='simu-web-v6';
export const initLang=readLang;
export function loadSaved(key=STORE,blank=false){try{const s=JSON.parse(localStorage.getItem(key));if(s&&Array.isArray(s.comps))return s;}catch(e){}return blank?{name:'',comps:[],wires:[]}:cadExample(initLang());}
const EXAMPLES=[['cad','exCad',cadExample],['timer','exTimer',timerExample],['p3','ex3',threePhaseExample],['t6','exT6',test6Example],['t7','exT7',test7Example],['all','exAll',catalogExample],['all2','exAll2',catalog2Example],['all3','exAll3',catalog3Example],['all4','exAll4',catalog4Example],['all5','exAll5',catalog5Example]];

/** one editor per tab: see shared/tabs.tsx */
/* the part drawn on each group button, like the icons of CADe SIMU's group toolbar */
const GROUP_ICON={supply:'L',fuse:'fuse',breaker:'mcb1',contactor:'km3',motor:'motor3',contact:'no',actuator:'pb_no',sensor:'ind_no',coil:'coil',erelay:'relay_spst',logic:'lg_and',io:'plc_m221'};
/* groups whose part icon is too small to read at toolbar size get a simple drawing */
const gsvg=(body)=>(<svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">{body}</svg>);
const GROUP_SVG={logic:gsvg(<><rect x="7" y="6" width="13" height="18"/><text x="13.5" y="18" fontSize="9" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">&amp;</text><path d="M2 10h5M2 20h5M20 15h4"/></>),
  io:gsvg(<><rect x="3" y="7" width="20" height="16"/><text x="13" y="18.5" fontSize="8" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">IO</text></>)};
/* parts whose drawing does not already carry its terminal names */
const NUMBERED=new Set(['coil','tcoil','tcoil_off','tcoil_both','lamp','lampf','buzzer','bell','siren','horn','valve','motor','motor1','motor3','sw','breaker2','switch2','sw_i0ii','sw_i3','sw_cross','bar_tx','step_relay','flasher','pulse_gen','time_sw','battery']);
const showNums=t=>{const d=DEFS[t];return !!d&&(NUMBERED.has(t)||!!d.form||!!d.fam);};
export function App({onHome}={}){const [lang]=useLang();
  return (<DocTabs store={STORE} lang={lang} untitled={COMMON[lang].untitled} render={(tab,p)=>(<Editor onHome={onHome} tab={p}/>)}/>);}

function Editor({onHome,tab}){
  const [lang,setLang]=useLang();const t=I18N[lang];
  const active=tab.active;
  useEffect(()=>{if(active)document.title='SIMU Web · '+COMMON[lang].programs.electrical+(name?' · '+name:'');});
  const init=useMemo(()=>loadSaved(tab.storeKey,tab.blank),[]);
  const [name,setName]=useState(init.name||'');
  const [comps,setComps]=useState(init.comps);
  const [wires,setWires]=useState(init.wires);
  const [cadMeta,setCadMeta]=useState({order:init.cadOrder||null,footer:init.cadFooter||null});
  const [mode,setMode]=useState('edit');
  const [tool,setTool]=useState('select');
  /** kind of wire drawn by the wire tool, picked from the drawer like a part */
  const [wireKind,setWireKind]=useState('ph');
  const [sel,setSel]=useState(null);
  /* multi-selection (2+ items): ids of parts and wires; sel stays the single item shown in the inspector */
  const [msel,setMsel]=useState({cs:[],ws:[]});
  const [band,setBand]=useState(null);
  const clip=useRef(null);
  const [wStart,setWStart]=useState(null);
  const [hover,setHover]=useState(null);
  const [vFirst,setVFirst]=useState(false);
  const [zoom,setZoom]=useState(1);
  const [inp,setInp]=useState({press:{},sw:{},trip:{},off:{}});
  const [sim,setSim]=useState({coils:{},timers:{}});
  const [now,setNow]=useState(Date.now());
  const [dlg,setDlg]=useState(null);
  const [fmt,setFmt]=useState('cad');
  const [exOpen,setExOpen]=useState(false);
  const [msg,setMsg]=useFlash();
  const [query,setQuery]=useState('');
  const dl=useSaver();
  const svgRef=useRef(),stageRef=useRef(),drag=useRef(null);

  const persisted=useMemo(()=>({name,comps,wires,cadOrder:cadMeta.order,cadFooter:cadMeta.footer}),[name,comps,wires,cadMeta]);
  usePersist(tab.storeKey,persisted);
  useEffect(()=>{tab.onName(name);},[name]);
  const {push:snap,undo}=useHistory(()=>({comps,wires}),h=>{setComps(h.comps);setWires(h.wires);setSel(null);});

  useEffect(()=>{if(mode!=='sim')return;const i=setInterval(()=>setNow(Date.now()),100);return()=>clearInterval(i);},[mode]);
  const res=useMemo(()=>mode==='sim'?solve(comps,wires,inp,sim.coils,sim.timers,now):null,[mode,comps,wires,inp,sim,now]);
  useEffect(()=>{if(!res||!res.stable)return;
    const timers={};res.ttags.forEach(k=>{const on=!!res.tOn[k],p=sim.timers[k],d=res.delays[k]??3000;
      if(!p){if(on)timers[k]={on:true,t:now,done:false};return;}
      timers[k]=p.on===on?p:{on,t:now,done:p.on&&now-p.t>=d};});
    if(JSON.stringify(res.coils)!==JSON.stringify(sim.coils)||JSON.stringify(timers)!==JSON.stringify(sim.timers))setSim({coils:res.coils,timers});
  },[res]);
  const toMode=m=>{setMode(m);setInp({press:{},sw:{},trip:{},off:{},tripTag:{}});setSim({coils:{},timers:{}});setWStart(null);setTool('select');};
  useEffect(()=>{const up=()=>setInp(i=>Object.keys(i.press).length?{...i,press:{}}:i);window.addEventListener('pointerup',up);return()=>window.removeEventListener('pointerup',up);},[]);

  const pt=e=>{const r=svgRef.current.getBoundingClientRect();const x=(e.clientX-r.left)/zoom,y=(e.clientY-r.top)/zoom;
    return {x,y,g:[Math.max(0,Math.min(W,Math.round(x/G))),Math.max(0,Math.min(H,Math.round(y/G)))]};};
  const nextTag=p=>{let m=0;comps.forEach(c=>{const r=new RegExp('^'+p+'(\\d+)$').exec(c.tag||'');if(r)m=Math.max(m,+r[1]);});return p+(m+1);};
  const coilTags=ty=>[...new Set(comps.filter(c=>c.type===ty||(ty==='coil'&&(DEFS[c.type].drive||DEFS[c.type].kind==='mon'))).map(c=>c.tag))];
  const tcDelay=tag=>{const tc=comps.find(x=>/^tcoil/.test(x.type)&&x.tag===tag)||comps.find(x=>DEFS[x.type].timer&&x.tag===tag&&x.delay);return +(tc&&tc.delay)||3;};

  const onDown=e=>{
    const P=pt(e);const cEl=e.target.closest('[data-cid]'),wEl=e.target.closest('[data-wid]');
    if(mode==='sim'){
      if(!cEl)return startPan(e);const c=comps.find(x=>x.id===cEl.dataset.cid);
      const da=DEFS[c.type];
      if(da.trip)setInp(i=>({...i,tripTag:{...(i.tripTag||{}),[c.tag]:!(i.tripTag||{})[c.tag]}}));
      if(da.act==='pb')setInp(i=>({...i,press:{...i.press,[c.id]:true}}));
      if(da.act==='th')setInp(i=>({...i,trip:{...i.trip,[c.id]:!i.trip[c.id]}}));
      if(da.latch)setInp(i=>({...i,sw:{...i.sw,[c.id]:!i.sw[c.id]}}));
      if(da.multi)setInp(i=>({...i,sw:{...i.sw,[c.id]:((+i.sw[c.id]|0)+1)%da.multi}}));
      const tg=da.toggle;if(tg)setInp(i=>({...i,[tg]:{...i[tg],[c.id]:!i[tg][c.id]}}));
      if(da.act==='aux')setMsg(t.follows(c.tag));
      if(da.timer)setMsg(t.timerKind[da.act](c.tag,tcDelay(c.tag)));
      return;}
    if(e.button===2){setWStart(null);return;}
    if(tool.startsWith('place:')){const type=tool.slice(6);const d=DEFS[type];snap();
      const tag=d.link?(coilTags(d.link)[0]||(d.link==='coil'?'KM1':'KT1')):d.prefix?nextTag(d.prefix):'';
      const c={id:nid('c'),type,x:P.g[0],y:P.g[1],rot:0,tag};if(type==='lamp')c.color='red';if(type==='lampf')c.color='amber';if(type==='interlock'){const ts=coilTags('coil');c.tag=ts[0]||'KM1';c.tag2=ts[1]||'KM2';}if(/^tcoil/.test(type))c.delay=3;
      setComps(cs=>[...cs,c]);setSel({k:'c',id:c.id});setTool('select');return;}
    if(tool==='wire'){
      if(!wStart){setWStart(P.g);return;}
      if(key(wStart)!==key(P.g)){snap();setWires(ws=>[...ws,{id:nid('w'),a:wStart,b:P.g,v:vFirst,kind:wireKind}]);}
      setWStart(P.g);return;}
    const add=e.shiftKey||e.ctrlKey||e.metaKey;
    if(e.button===1){startPan(e);return;}
    if(cEl||wEl){const k=cEl?'c':'w',id=cEl?cEl.dataset.cid:wEl.dataset.wid;
      if(add){toggleSel(k,id);return;}
      if(!(k==='c'?isSelC(id):isSelW(id))){if(k==='c')setSelection([id],[]);else setSelection([],[id]);}
      // drag everything selected (or just this item); wire ends on the moved parts' terminals follow
      const S=(k==='c'?isSelC(id):isSelW(id))?selSet():{cs:k==='c'?[id]:[],ws:k==='w'?[id]:[]};
      const moving=new Set(S.cs),pins=new Set();comps.forEach(c=>{if(moving.has(c.id))pinsOf(c).forEach(p=>pins.add(key(p)));});
      const ends=[];wires.forEach(w=>{if(S.ws.includes(w.id))return;if(pins.has(key(w.a)))ends.push([w.id,'a']);if(pins.has(key(w.b)))ends.push([w.id,'b']);});
      drag.current={group:true,start:P.g,cs:comps.filter(c=>moving.has(c.id)).map(c=>({id:c.id,x:c.x,y:c.y})),ws:wires.filter(w=>S.ws.includes(w.id)).map(w=>({id:w.id,a:w.a,b:w.b})),
        ends:ends.map(([wid,end])=>({wid,end,p:wires.find(w=>w.id===wid)[end]})),moved:false,last:[0,0]};
      svgRef.current.setPointerCapture(e.pointerId);return;}
    // empty sheet: draw a selection rectangle
    if(!add)clearSel();
    drag.current={band:true,add,base:selSet(),a:[P.x,P.y]};setBand({a:[P.x,P.y],b:[P.x,P.y]});svgRef.current.setPointerCapture(e.pointerId);
  };
  const startPan=e=>{const s=stageRef.current;drag.current={pan:true,x:e.clientX,y:e.clientY,l:s.scrollLeft,t:s.scrollTop};svgRef.current.setPointerCapture(e.pointerId);};
  const onMove=e=>{const P=pt(e);setHover(P.g);const d=drag.current;if(!d)return;
    if(d.pan){const s=stageRef.current;s.scrollLeft=d.l-(e.clientX-d.x);s.scrollTop=d.t-(e.clientY-d.y);return;}
    if(d.band){setBand({a:d.a,b:[P.x,P.y]});return;}
    if(d.group){
      let dx=P.g[0]-d.start[0],dy=P.g[1]-d.start[1];
      const xs=[...d.cs.map(c=>c.x),...d.ws.flatMap(w=>[w.a[0],w.b[0]])],ys=[...d.cs.map(c=>c.y),...d.ws.flatMap(w=>[w.a[1],w.b[1]])];
      dx=Math.max(-Math.min(...xs),Math.min(W-Math.max(...xs),dx));dy=Math.max(-Math.min(...ys),Math.min(H-Math.max(...ys),dy));
      if(dx===d.last[0]&&dy===d.last[1])return;d.last=[dx,dy];
      if(!d.moved){d.moved=true;snap();}
      const cm=new Map(d.cs.map(c=>[c.id,c])),wm=new Map(d.ws.map(w=>[w.id,w]));
      setComps(cs=>cs.map(x=>cm.has(x.id)?{...x,x:cm.get(x.id).x+dx,y:cm.get(x.id).y+dy}:x));
      setWires(ws=>ws.map(w=>{const o=wm.get(w.id);if(o)return {...w,a:[o.a[0]+dx,o.a[1]+dy],b:[o.b[0]+dx,o.b[1]+dy]};
        const es=d.ends.filter(q=>q.wid===w.id);if(!es.length)return w;const n={...w};es.forEach(q=>{n[q.end]=[q.p[0]+dx,q.p[1]+dy];});return n;}));
    }
  };
  const onUp=()=>{const d=drag.current;drag.current=null;
    if(d&&d.band){setBand(null);
      const [ax,ay]=d.a,[bx,by]=band?band.b:d.a;const x0=Math.min(ax,bx)/G,x1=Math.max(ax,bx)/G,y0=Math.min(ay,by)/G,y1=Math.max(ay,by)/G;
      if(x1-x0<0.3&&y1-y0<0.3)return; // a click, not a rectangle
      const inside=p=>p[0]>=x0&&p[0]<=x1&&p[1]>=y0&&p[1]<=y1;
      const cs=comps.filter(c=>inside([c.x,c.y])&&pinsOf(c).every(inside)).map(c=>c.id),ws=wires.filter(w=>inside(w.a)&&inside(w.b)).map(w=>w.id);
      const base=d.add?d.base:{cs:[],ws:[]};
      const allC=[...new Set([...base.cs,...cs])],allW=[...new Set([...base.ws,...ws])];
      if(allC.length+allW.length)setSelection(allC,allW);else clearSel();}};

  const del=()=>{if(!sel)return;snap();if(sel.k==='c')setComps(cs=>cs.filter(c=>c.id!==sel.id));else setWires(ws=>ws.filter(w=>w.id!==sel.id));setSel(null);};
  const rot=()=>{if(sel?.k!=='c')return;const c=comps.find(x=>x.id===sel.id);if(['src','raw'].includes(DEFS[c.type].kind))return;snap();setComps(cs=>cs.map(x=>x.id===sel.id?{...x,rot:((x.rot|0)+1)%4}:x));};
  const flip=()=>{if(sel?.k!=='w')return;snap();setWires(ws=>ws.map(w=>w.id===sel.id?{...w,v:!w.v}:w));};
  const upd=(id,patch)=>setComps(cs=>cs.map(x=>x.id===id?{...x,...patch}:x));
  const updW=(id,patch)=>setWires(ws=>ws.map(x=>x.id===id?{...x,...patch}:x));

  /* ---- selection of several items ---- */
  const multi=msel.cs.length+msel.ws.length>1;
  const selSet=()=>multi?msel:sel?{cs:sel.k==='c'?[sel.id]:[],ws:sel.k==='w'?[sel.id]:[]}:{cs:[],ws:[]};
  const isSelC=id=>multi?msel.cs.includes(id):sel?.k==='c'&&sel.id===id;
  const isSelW=id=>multi?msel.ws.includes(id):sel?.k==='w'&&sel.id===id;
  const clearSel=()=>{setSel(null);setMsel({cs:[],ws:[]});};
  const setSelection=(cs,ws)=>{if(cs.length+ws.length===1){setMsel({cs:[],ws:[]});setSel(cs.length?{k:'c',id:cs[0]}:{k:'w',id:ws[0]});}
    else{setMsel({cs,ws});setSel(null);}};
  const toggleSel=(k,id)=>{const cur=selSet();const cs=[...cur.cs],ws=[...cur.ws];const arr=k==='c'?cs:ws;const i=arr.indexOf(id);if(i>=0)arr.splice(i,1);else arr.push(id);
    if(!cs.length&&!ws.length)clearSel();else setSelection(cs,ws);};
  const selectAll=()=>setSelection(comps.map(c=>c.id),wires.map(w=>w.id));
  /** the selected parts and wires (copies) */
  const selItems=()=>{const S=selSet();return {comps:comps.filter(c=>S.cs.includes(c.id)),wires:wires.filter(w=>S.ws.includes(w.id))};};
  /** a .cad file holding only the given items (CADe SIMU opens it; copy from there into another drawing) */
  const cadOf=(cs,ws)=>{const segs=[];ws.forEach(w=>{const e=elbow(w);if(key(e)===key(w.a)||key(e)===key(w.b))segs.push({...w,cad:null});else{segs.push({...w,b:e,cad:null});segs.push({...w,a:e,cad:null});}});
    const uf=wireNet(cs,ws);const ids={};let n=0;const netOf=p=>{if(!p||!uf.p.has(key(p)))return 0;const r=uf.f(key(p));return ids[r]??(ids[r]=++n);};
    return writeCad({comps:cs,wires:segs,dots:[],order:null,footer:null,netOf,pinsOf}).text;};
  const copySel=(ev)=>{const it=selItems();if(!it.comps.length&&!it.wires.length)return false;
    clip.current=JSON.parse(JSON.stringify(it));try{localStorage.setItem('simu-web-clip',JSON.stringify(clip.current));}catch(e){}
    const cad=cadOf(it.comps,it.wires);
    if(ev&&ev.clipboardData){ev.clipboardData.setData('text/plain',cad);ev.clipboardData.setData('application/x-simu-web',JSON.stringify(it));ev.preventDefault();}
    else navigator.clipboard?.writeText(cad).catch(()=>{});
    setMsg(t.copiedN(it.comps.length+it.wires.length));return true;};
  /** paste items (from our clipboard or a .cad text), placed at the pointer or just next to the originals */
  const pasteItems=(it)=>{if(!it||(!it.comps?.length&&!it.wires?.length))return;
    const xs=[...it.comps.map(c=>c.x),...it.wires.flatMap(w=>[w.a[0],w.b[0]])],ys=[...it.comps.map(c=>c.y),...it.wires.flatMap(w=>[w.a[1],w.b[1]])];
    const x0=Math.min(...xs),y0=Math.min(...ys),x1=Math.max(...xs),y1=Math.max(...ys);
    let dx=hover?hover[0]-x0:2,dy=hover?hover[1]-y0:2;
    if(!hover||(dx===0&&dy===0)){dx=2;dy=2;}
    dx=Math.max(-x0,Math.min(W-x1,dx));dy=Math.max(-y0,Math.min(H-y1,dy));
    snap();const nc=it.comps.filter(c=>DEFS[c.type]).map(c=>({...c,id:nid('c'),x:c.x+dx,y:c.y+dy}));
    const nw=it.wires.map(w=>({kind:'ph',...w,id:nid('w'),a:[w.a[0]+dx,w.a[1]+dy],b:[w.b[0]+dx,w.b[1]+dy],cad:null}));
    setComps(cs=>[...cs,...nc]);setWires(ws=>[...ws,...nw]);setSelection(nc.map(c=>c.id),nw.map(w=>w.id));};
  const pasteText=txt=>{
    if(!txt)return false;
    if(txt.startsWith('CADe_SIMU')){try{const d=parseCad(txt);pasteItems({comps:d.comps,wires:d.wires});return true;}catch(e){return false;}}
    try{const d=JSON.parse(txt);if(Array.isArray(d.comps)&&Array.isArray(d.wires)){pasteItems(d);return true;}}catch(e){}
    return false;};
  const duplicate=()=>{const it=selItems();if(it.comps.length||it.wires.length){const h=hover;pasteItems(JSON.parse(JSON.stringify(it)));}};
  const delSel=()=>{const S=selSet();if(!S.cs.length&&!S.ws.length)return;snap();setComps(cs=>cs.filter(c=>!S.cs.includes(c.id)));setWires(ws=>ws.filter(w=>!S.ws.includes(w.id)));clearSel();};
  const rotSel=()=>{const S=selSet();const ids=S.cs.filter(id=>{const c=comps.find(x=>x.id===id);return c&&!['src','raw'].includes(DEFS[c.type].kind);});if(!ids.length)return;snap();setComps(cs=>cs.map(x=>ids.includes(x.id)?{...x,rot:((x.rot|0)+1)%4}:x));};
  const saveSelCad=async()=>{const it=selItems();if(!dl){setMsg(t.noSave);return;}try{const ok=await dl.saveCad(safeName((name||t.untitled)+'-'+t.selFile),cadOf(it.comps,it.wires));if(ok)setMsg(t.saved);}catch(err){if(err&&err.code==='declined')return;setMsg(t.noSave);}};
  /* copy / cut / paste through the system clipboard (keyboard shortcuts and menu); text fields keep their own */
  useEffect(()=>{if(!active)return;
    const inField=()=>{const a=document.activeElement;return a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.isContentEditable);};
    const onCopy=e=>{if(mode!=='edit'||dlg||inField())return;copySel(e);};
    const onCut=e=>{if(mode!=='edit'||dlg||inField())return;if(copySel(e))delSel();};
    const onPaste=e=>{if(mode!=='edit'||dlg||inField())return;const d=e.clipboardData;
      const own=d&&d.getData('application/x-simu-web');
      if(own){e.preventDefault();pasteText(own);return;}
      const txt=d&&d.getData('text/plain');
      if(txt&&pasteText(txt.trim())){e.preventDefault();return;}
      if(clip.current){e.preventDefault();pasteItems(JSON.parse(JSON.stringify(clip.current)));}};
    document.addEventListener('copy',onCopy);document.addEventListener('cut',onCut);document.addEventListener('paste',onPaste);
    return()=>{document.removeEventListener('copy',onCopy);document.removeEventListener('cut',onCut);document.removeEventListener('paste',onPaste);};
  });

  useKeys(e=>{if(!active||dlg)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
    if(mode!=='edit')return;
    const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
    if(mod&&(k==='a'||k==='ש')){e.preventDefault();selectAll();return;}
    if(mod&&(k==='d'||k==='ג')){e.preventDefault();duplicate();return;}
    if(mod)return; // copy, cut and paste arrive as clipboard events
    if(e.key==='Delete'||e.key==='Backspace')delSel();
    else if(e.key==='r'||e.key==='R'||e.key==='ר')rotSel();
    else if(e.key==='f'||e.key==='F'||e.key==='כ')flip();
    else if(e.key==='w'||e.key==='W'||e.key==="'"){setTool('wire');setWStart(null);setSel(null);}
    else if(e.key==='Shift')setVFirst(v=>!v);
    else if(e.key==='Escape'){setWStart(null);setTool('select');clearSel();}});

  const dots=useMemo(()=>{const cnt={},out=[];const segs=[];wires.forEach(w=>{const e=elbow(w);segs.push([w.a,e,w.id],[e,w.b,w.id]);});
    const ends=[];wires.forEach(w=>{ends.push([w.a,w.id],[w.b,w.id]);});comps.forEach(c=>pinsOf(c).forEach(p=>ends.push([p,c.id])));
    ends.forEach(([p])=>{cnt[key(p)]=(cnt[key(p)]||0)+1;});
    const seen=new Set();
    ends.forEach(([p,id])=>{const k=key(p);if(seen.has(k))return;
      const mid=segs.some(([s,e,wid])=>wid!==id&&onSeg(p,s,e)&&key(s)!==k&&key(e)!==k);
      if(mid||cnt[k]>=3){seen.add(k);out.push(p);}});return out;},[comps,wires]);

  const PCOL={L1:'var(--live)',L2:'var(--l2)',L3:'var(--l3)',N:'var(--neu)',P:'var(--live)',M:'var(--neu)'};
  const nodeColor=p=>{if(!res)return null;return PCOL[res.node(p)]||null;};
  const selC=sel?.k==='c'?comps.find(c=>c.id===sel.id):null;
  const selW=sel?.k==='w'?wires.find(w=>w.id===sel.id):null;
  const groups=useMemo(paletteGroups,[]); // CADe SIMU's toolbars and their order
  const placing=tool.startsWith('place:')?tool.slice(6):null;

  /* ---- file I/O ---- */
  const exportJSON=()=>JSON.stringify({format:'simu-web',version:3,name,grid:'cade-3u',components:comps,wires,cadOrder:cadMeta.order,cadFooter:cadMeta.footer},null,1);
  const exportCad=()=>{
    const segs=[];wires.forEach(w=>{const e=elbow(w);
      if(key(e)===key(w.a)||key(e)===key(w.b))segs.push(w);
      else{segs.push({...w,b:e});segs.push({...w,a:e,cad:null});}});
    const uf=wireNet(comps,wires);const ids={};let n=0;
    const netOf=p=>{if(!p)return 0;const r=uf.f(key(p));if(!uf.p.has(key(p)))return 0;return ids[r]??(ids[r]=++n);};
    const segs2=segs;
    return {...writeCad({comps,wires:segs2,dots,order:cadMeta.order,footer:cadMeta.footer,netOf,pinsOf}),rotated:false};
  };
  const ioText=useMemo(()=>dlg!=='io'?null:fmt==='cad'?exportCad():{text:exportJSON()},[dlg,fmt,comps,wires,name,cadMeta]);
  const loadDrawing=(d,m)=>{snap();toMode('edit');setComps(d.comps);setWires(d.wires.map(w=>({kind:'ph',...w})));setName(d.name||'');
    setCadMeta({order:d.cadOrder||null,footer:d.cadFooter||null});setDlg(null);setSel(null);setMsg(m);
    if(stageRef.current){stageRef.current.scrollLeft=0;stageRef.current.scrollTop=0;}};
  const importText=(txt,fname)=>{
    try{
      if(txt.startsWith('CADe_SIMU')){const d=parseCad(txt);const unk=d.comps.filter(c=>c.type==='raw'&&!RAW_DRAWN.has(c.cad.code)).length;loadDrawing({...d,name:(fname||'').replace(/\.[^.]*$/,'')||t.untitled},t.cadLoaded(unk));return;}
      const d=JSON.parse(txt);const cs=d.components||d.comps,ws=d.wires;if(!Array.isArray(cs)||!Array.isArray(ws))throw 0;
      loadDrawing({comps:cs.filter(c=>DEFS[c.type]),wires:ws,name:d.name,cadOrder:d.cadOrder,cadFooter:d.cadFooter},t.loaded);
    }catch(e){setMsg(t.badFile);}};
  const [,setImgTick]=useState(0);
  /* pictures named in the drawing (code 9) can be chosen together with the .cad file, or later from the inspector */
  const addImages=async fs=>{const got=[];for(const f of fs){try{got.push(await addImage(f));}catch(e){}}
    if(got.length){setImgTick(n=>n+1);setMsg(t.imgLoaded(got.join(', ')));}return got;};
  /* the first drawing opens here, any further ones in new tabs (with the same pictures) */
  const openFiles=async all=>{const imgs=all.filter(isImageFile),docs=all.filter(x=>!isImageFile(x)),f=docs[0];
    if(docs.length>1)tab.openInTabs([...docs.slice(1),...imgs]);
    if(imgs.length)await addImages(imgs);if(!f)return;const r=new FileReader();
    r.onload=()=>importText(r.result,f.name);r.readAsText(f,'windows-1252');};
  const onFile=e=>{const all=[...e.target.files];e.target.value='';openFiles(all);};
  useEffect(()=>{if(tab.files)openFiles(tab.files);},[]);
  const copy=async txt=>{try{await navigator.clipboard.writeText(txt);setMsg(t.copied);}catch(e){const ta=document.getElementById('exp');ta&&ta.select();setMsg(t.copyManual);}};
  const saveFile=async()=>{if(!dl){setMsg(t.noSave);return;}
    try{
      const ok=fmt==='cad'?await dl.saveCad(safeName(name),ioText.text):await dl.saveJson(safeName(name),ioText.text);
      if(!ok)return;
      setMsg(t.saved);
    }catch(err){if(err&&err.code==='declined')return;setMsg(t.noSave);}};

  const labelPos=c=>{const d=DEFS[c.type];if(d.kind==='src'&&c.type!=='supply')return null;
    const [dx,dy]=d.lab||[17,34];if(c.type==='raw')return [c.x*G+18,c.y*G+56];if(c.type==='interlock')return null;
    if(!c.rot)return [c.x*G+dx,c.y*G+dy];const q=c.rot|0;const [rx,ry]=rotV(q,dx,dy);return [c.x*G+rx+(q===1?-14:0),c.y*G+ry+(q===2?12:q===3?4:-6)];};
  const wireStroke=w=>{const col=res?nodeColor(w.a):null;if(col)return col;return w.kind==='n'?'var(--neu)':w.kind==='pe'?'var(--pe)':w.kind==='pos'?'var(--live)':'currentColor';};

  const WIRE_COL={ph:'currentColor',n:'var(--neu)',pe:'var(--pe)',pos:'var(--live)',neg:'currentColor'};
  const wireItems=['ph','n','pe','pos','neg'].filter(k=>matches(query,t.kinds[k],t.wireWord)).map(k=>({key:'wire:'+k,label:`${t.wireWord} · ${t.kinds[k]}`,
    icon:<svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true"><circle cx="3" cy="24" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3"/><polyline points="3,24 3,6 23,6" fill="none" stroke={WIRE_COL[k]} strokeWidth="2.2" strokeDasharray={k==='pe'?'4 2':null}/><circle cx="23" cy="6" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>}));
  const drawerGroups=[...groups.map(([g,ks])=>({id:g,title:t.groups[g],icon:GROUP_SVG[g]||<Icon type={GROUP_ICON[g]}/>,sep:g==='contact'||g==='logic',items:ks.filter(k=>!PALETTE_HIDE.has(k)&&matches(query,pname(t,k),k)).map(k=>({key:k,icon:<Icon type={k}/>,label:pname(t,k)}))})),{id:'wires',title:t.wiresGroup,sep:true,icon:<svg width="26" height="30" viewBox="0 0 26 30" aria-hidden="true"><line x1="3" y1="15" x2="23" y2="15" stroke="var(--live)" strokeWidth="2.4"/></svg>,items:wireItems}];
  const bar=(<>
      <HomeButton lang={lang} onHome={onHome}/>
      <Brand title={COMMON[lang].programs.electrical}/>
      <Seg label="mode" value={mode} options={[['edit',t.edit],['sim',t.sim]]} onChange={toMode}/>
      <UndoButton lang={lang} onUndo={undo}/>
      <NameField lang={lang} value={name} onChange={setName}/>
      <BarEnd lang={lang} setLang={setLang}
        zoom={<ZoomControl lang={lang} zoom={zoom} setZoom={setZoom} min={.5} max={2.5} onReset={()=>setZoom(1)}/>}
        onNew={()=>{snap();toMode('edit');setComps([]);setWires([]);setName(t.newName);setCadMeta({order:null,footer:null});setSel(null);}}
        examples={<ExamplesMenu lang={lang} items={EXAMPLES.map(([k,l])=>[k,t[l]])} onPick={k=>{const ex=EXAMPLES.find(x=>x[0]===k);if(ex)loadDrawing(ex[2](lang),'');}}/>}
        onFile={()=>setDlg('io')}/>
    </>);

  return (<EditorFrame app="elec" lang={lang} bar={bar} tabs={tab.tabs}
    drawer={<PartsDrawer lang={lang} label={t.parts_} groups={drawerGroups} active={tool==='wire'?'wire:'+wireKind:placing} disabled={mode==='sim'} onPick={k=>{toMode('edit');if(k.startsWith('wire:')){setWireKind(k.slice(5));setTool('wire');setWStart(null);setSel(null);}else setTool('place:'+k);}} query={query} setQuery={setQuery}/>}
    stage={<>
      <div className="stage" ref={stageRef}>
        {res&&(res.short||!res.stable)&&(<div className="warnwrap"><div className="warn">{res.short?t.short:t.unstable}</div></div>)}
        <svg className="sheet" ref={svgRef} width={W*G*zoom} height={H*G*zoom} viewBox={`0 0 ${W*G} ${H*G}`}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={()=>setHover(null)} onContextMenu={e=>e.preventDefault()}
          style={{cursor:mode==='sim'?'default':tool==='select'?'default':'crosshair'}}>
          <defs><pattern id="dots" width={G} height={G} patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1.1" fill="var(--grid)"/></pattern></defs>
          <rect width={W*G} height={H*G} fill="url(#dots)"/>
          <rect x="6" y="6" width={W*G-12} height={H*G-12} fill="none" stroke="var(--grid)" strokeWidth="1.5"/>
          <g transform={`translate(${W*G-326},${H*G-76})`} fontSize="11" fill="var(--muted)">
            <rect width="320" height="70" fill="var(--sheet)" stroke="var(--grid)" strokeWidth="1.5"/>
            <line x1="0" y1="26" x2="320" y2="26" stroke="var(--grid)"/><line x1="200" y1="26" x2="200" y2="70" stroke="var(--grid)"/>
            <text x="10" y="18" fill="var(--ink)" fontSize="13" fontFamily="var(--f-ui)">{name||t.untitled}</text>
            <text x="10" y="44">CONTROL CIRCUIT · 230 V AC</text><text x="10" y="60">IEC 60617</text>
            <text x="210" y="44">{comps.filter(c=>DEFS[c.type].kind!=='src').length} parts</text><text x="210" y="60">{wires.length} wires</text>
          </g>

          {/* PLC and power-supply pictures lie under the wires, so the wires show on top of them */}
          {comps.filter(c=>c.type==='psu24'||DEFS[c.type].kind==='plc').map(c=>(<g key={'pp'+c.id} data-cid={c.id} style={{cursor:mode==='edit'?'move':null}} transform={`translate(${c.x*G},${c.y*G})${c.rot?` rotate(${90*c.rot})`:''}`}><PartPicture type={c.type}/></g>))}
          {/* pictures (CADe SIMU code 9) lie under the wires and parts, as in CADe SIMU */}
          {comps.filter(c=>c.type==='raw'&&c.cad.code===9).map(c=>{const n=c.cad.nums,xi=n.length-15,rs=rawSym(c.cad,(n[xi]-c.x*3)*5,(n[xi+1]-c.y*3)*5);
            return rs&&(<g key={'pic'+c.id} data-cid={c.id} style={{cursor:mode==='edit'?'move':null}} transform={`translate(${c.x*G},${c.y*G})`}>{rs.node}</g>);})}
          {wires.map(w=>{const e=elbow(w);const col=wireStroke(w);const pts=`${w.a[0]*G},${w.a[1]*G} ${e[0]*G},${e[1]*G} ${w.b[0]*G},${w.b[1]*G}`;
            const isSel=isSelW(w.id);const live=res&&nodeColor(w.a);
            return (<g key={w.id} data-wid={w.id}>
              <polyline points={pts} fill="none" stroke="transparent" strokeWidth="12"/>
              {isSel&&(<polyline points={pts} fill="none" stroke="var(--sel)" strokeWidth="7" opacity=".35" strokeLinejoin="round"/>)}
              <polyline points={pts} fill="none" stroke={col} strokeWidth={live?2.6:2} strokeDasharray={!res&&w.kind==='pe'?'7 3':null} strokeLinejoin="round"/></g>);})}
          {dots.map(p=>{const col=nodeColor(p);return (<circle key={'d'+key(p)} cx={p[0]*G} cy={p[1]*G} r="3.6" fill={col||'currentColor'} pointerEvents="none"/>);})}

          {comps.map(c=>{const d=DEFS[c.type];const ps=pinsOf(c);
            let s={noPic:c.type==='psu24'||d.kind==='plc',cs:ps.map(nodeColor),color:c.color,code:c.cad&&c.cad.code,cname:c.cad&&CAD_CATALOG_NAMES[c.cad.code],tag:c.tag,tag2:c.tag2};
            if(c.type==='raw'){const n=c.cad.nums,xi=n.length-15;if(RAW_NAMES[c.cad.code]){s.name=RAW_NAMES[c.cad.code];s.cat=RAW_CAT[c.cad.code];s.terms=rawTerminals(c.cad.text);const bw=Math.max(n[xi+6],12),bh=Math.max(n[xi+7],12);s.big=c.cad.code>=10204&&c.cad.code<=10208?[-30,-8,Math.max(bw*5,90),bh*5]:[n[xi+4]*5,n[xi+5]*5,Math.max(bw*5,96),Math.max(bh*5,60)];}
              else if(RAW_DRAWN.has(c.cad.code)){const rs=rawSym(c.cad,(n[xi]-c.x*3)*5,(n[xi+1]-c.y*3)*5);if(rs){s.custom=c.cad.code===9?<g/>:rs.node;s.hit=rs.box;}}
              else if(n[xi+2]||n[xi+3])s.line=[Math.round(n[xi+2]/3)*G-c.x*G,Math.round(n[xi+3]/3)*G-c.y*G];}
            if(res&&d.kind==='plc')s.plc=res.plc&&res.plc[c.id];if(res&&(d.kind==='psu'||d.kind==='psu2'))s.on=!!res.coils['pwr:'+c.id];
            s.pos=inp.sw[c.id];s.delay=c.delay;s.preset=c.delay;
            if(res){if(d.kind==='mon')s.on=!!res.loads[c.id];if(d.logic)s.on=!!res.coils['lg:'+c.id];s.speed=res.speed[c.id];s.cnt=res.cnt[c.id];if(d.drive==='timesw')s.act=!!inp.sw[c.id];}
            if(res){if(d.kind==='load'){s.on=res.loads[c.id];s.dir=res.dir[c.id];s.yd=res.yd&&res.yd[c.id];if(/^tcoil/.test(c.type)){const m=res.tm[c.tag];s.done=!!(m&&(c.type==='tcoil'?m.ton:c.type==='tcoil_off'?m.toff:m.tboth));}}
              else if(d.form)s.act=actuated(c,inp,res.coils,res.tm);
              else if(d.kind==='contact')s.closed=closed(c,inp,res.coils);
              s.pressed=!!inp.press[c.id];s.tripped=!!inp.trip[c.id]||!!(inp.tripTag&&inp.tripTag[c.tag]);}
            else{s.closed=NC_TYPES.includes(c.type)||d.fam==='fu'||d.toggle==='off';}
            const isSel=isSelC(c.id);
            const hit=s.hit?{x:s.hit[0],y:s.hit[1],width:s.hit[2],height:s.hit[3]}:s.big?{x:s.big[0],y:s.big[1],width:s.big[2],height:s.big[3]}:s.line?{x:Math.min(0,s.line[0])-4,y:Math.min(0,s.line[1])-4,width:Math.abs(s.line[0])+8,height:Math.abs(s.line[1])+8}:d.box||BOX2;
            const interactive=mode==='sim'&&(['pb','th'].includes(d.act)||!!d.latch||!!d.toggle||!!d.trip||!!d.multi);const linked=mode==='sim'&&!!d.link;
            return (<g key={c.id} data-cid={c.id} transform={`translate(${c.x*G},${c.y*G})${c.rot?` rotate(${90*c.rot})`:''}`} style={{cursor:interactive?'pointer':linked?'help':mode==='edit'&&tool==='select'?'move':null}}>
              <rect {...hit} fill={interactive?'color-mix(in srgb,var(--accent) 10%,transparent)':'transparent'} stroke={isSel?'var(--sel)':'none'} strokeDasharray="4 3" rx="4"
                {...(s.noPic||(c.type==='raw'&&c.cad.code===9)?{pointerEvents:'stroke',strokeWidth:10}:{})}/>
              <Sym type={c.type} s={s}/>
              {mode==='edit'&&d.pins.map((pp,i)=>(<circle key={i} cx={pp[0]*G} cy={pp[1]*G} r="2.6" fill="var(--sheet)" stroke="currentColor" strokeWidth="1.4"/>))}
            </g>);})}
          {/* terminal numbers next to each terminal, as CADe SIMU shows them (13/14, 11/12, 95/96, A1/A2…) */}
          {comps.map(c=>{const d=DEFS[c.type];if(!showNums(c.type))return null;const names=termNames(c,d.pins.length)||d.plabels;if(!names)return null;
            const ys=d.pins.map(p=>p[1]),y0=Math.min(...ys),y1=Math.max(...ys);
            return (<g key={'n'+c.id} pointerEvents="none">{d.pins.map((p,i)=>{const nm=names[i];if(!nm)return null;
              const off=p[1]===y0&&y1>y0?[4,13]:p[1]===y1&&y1>y0?[4,-5]:[4,-4];const [ox,oy]=rotV(c.rot|0,off[0],off[1]);const [px,py]=rotV(c.rot|0,p[0]*G,p[1]*G);
              return (<text key={i} x={c.x*G+px+ox} y={c.y*G+py+oy} fontSize="9" fill="var(--muted)" fontFamily="var(--f-mono)">{nm}</text>);})}</g>);})}
          {comps.map(c=>{const lp=c.type==='raw'&&(RAW_NAMES[c.cad.code]||RAW_DRAWN.has(c.cad.code))?null:labelPos(c);if(!lp||!c.tag)return null;const d=DEFS[c.type];
            const st=(/^tcoil/.test(c.type)||d.timer)&&res&&sim.timers[c.tag];const dl=tcDelay(c.tag);const el=st?(now-st.t)/1000:0;
            const extra=!st?'':st.on?` ${Math.min(el,dl).toFixed(1)}/${dl}s`:el<dl?` ↓${(dl-el).toFixed(1)}s`:'';
            return (<text key={'t'+c.id} x={lp[0]} y={lp[1]} fontSize="12" fontWeight="600" fill="currentColor" textAnchor={c.type==='raw'?'middle':null} pointerEvents="none">{c.tag}<tspan fill="var(--accent)">{extra}</tspan></text>);})}

          {mode==='edit'&&tool==='wire'&&wStart&&hover&&(()=>{const w={a:wStart,b:hover,v:vFirst};const e=elbow(w);
            return (<polyline points={`${w.a[0]*G},${w.a[1]*G} ${e[0]*G},${e[1]*G} ${w.b[0]*G},${w.b[1]*G}`} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" pointerEvents="none"/>);})()}
          {mode==='edit'&&(tool!=='select')&&hover&&(<circle cx={hover[0]*G} cy={hover[1]*G} r="5" fill="none" stroke="var(--accent)" strokeWidth="2" pointerEvents="none"/>)}
          {band&&(<rect x={Math.min(band.a[0],band.b[0])} y={Math.min(band.a[1],band.b[1])} width={Math.abs(band.b[0]-band.a[0])} height={Math.abs(band.b[1]-band.a[1])} fill="color-mix(in srgb,var(--sel) 10%,transparent)" stroke="var(--sel)" strokeDasharray="5 4" pointerEvents="none"/>)}
          {placing&&hover&&(<g transform={`translate(${hover[0]*G},${hover[1]*G})`} opacity=".45" pointerEvents="none"><Sym type={placing}/></g>)}
        </svg>
      </div>

    </>}
    inspector={<>
        {mode==='sim'?(<><h3>{t.simTitle}</h3>
          <p className="hint">{t.simHint}</p>
          <div className="legend"><div><span style={{background:'var(--live)'}}></span>{t.legL}</div><div><span style={{background:'var(--l2)'}}></span>{t.legL2}</div><div><span style={{background:'var(--l3)'}}></span>{t.legL3}</div><div><span style={{background:'var(--neu)'}}></span>{t.legN}</div><div><span style={{background:'var(--accent)'}}></span>{t.legOn}</div></div>
          <div className="grp" style={{marginTop:'14px'}}>{t.coilState}</div>
          {comps.filter(c=>(c.type==='motor3'||c.type==='motor6')&&res&&res.loads[c.id]).map(c=>(<div key={c.id} className="mono" style={{fontSize:'12px',display:'flex',justifyContent:'space-between'}}><span dir="ltr">{c.tag}{res.yd&&res.yd[c.id]?' · '+res.yd[c.id]:''}</span><b style={{color:'var(--accent)'}}>{res.dir[c.id]>0?t.dirFwd:t.dirRev}</b></div>))}
          {comps.filter(c=>c.type==='coil'||/^tcoil/.test(c.type)).map(c=>(<div key={c.id} className="mono" style={{fontSize:'12px',display:'flex',justifyContent:'space-between'}}><span dir="ltr">{c.tag}</span><b style={{color:res&&res.loads[c.id]?'var(--ok)':'var(--muted)'}}>{res&&res.loads[c.id]?'ON':'OFF'}</b></div>))}</>)
        :multi?(<><h3>{t.multiTitle(msel.cs.length,msel.ws.length)}</h3><p className="hint">{t.multiHint}</p>
          <div className="row" style={{flexWrap:'wrap'}}><button onClick={rotSel}>{t.rotate}</button><button onClick={()=>copySel()}>{t.copySel}</button><button onClick={duplicate}>{t.dupSel}</button><button onClick={delSel}>{t.del}</button></div>
          <div className="field" style={{marginTop:'12px'}}><label>CADe SIMU</label><p className="hint" style={{margin:'0 0 6px'}}>{t.toCadeHint}</p>
            <button className="go" onClick={saveSelCad}>{t.saveSelCad}</button></div></>)
        :selC&&selC.type==='raw'&&selC.cad.code===9?(<><h3>{t.imgTitle}</h3><div className="mono hint" dir="ltr">{(selC.cad.trail||'').trim()}</div>
          <p className="hint">{imageOf(selC.cad.trail)?t.imgHave:t.imgMissing}</p>
          <div className="row"><button onClick={()=>document.getElementById('imgfile').click()}>{t.imgLoad}</button><input id="imgfile" type="file" accept="image/*,.bmp" style={{display:'none'}} onChange={async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
            const want=(selC.cad.trail||'').trim();const named=new File([f],want||f.name,{type:f.type});await addImages([named]);}}/><button onClick={del}>{t.del}</button></div></>)
        :selC&&selC.type==='raw'?(<><h3>{CAD_CATALOG_NAMES[selC.cad.code]||t.rawTitle}</h3><p className="hint">{t.rawHint(selC.cad.code)}</p><div className="mono hint" dir="ltr">{selC.tag||''}</div><div className="row"><button onClick={del}>{t.del}</button></div></>)
        :selC?(<><About t={t} lang={lang} type={selC.type}/><div style={{height:'6px'}}></div>
          {(DEFS[selC.type].kind!=='src'||selC.type==='supply')&&selC.type!=='interlock'&&(<div className="field"><label htmlFor="tag">{DEFS[selC.type].link?t.tagLink:t.tag}</label>
            <input id="tag" dir="ltr" list="tags" value={selC.tag} onFocus={snap} onInput={e=>upd(selC.id,{tag:e.target.value.toUpperCase()})}/>
            <datalist id="tags">{(DEFS[selC.type].link?coilTags(DEFS[selC.type].link):[]).map(x=>(<option key={x} value={x}/>))}</datalist></div>)}
          {selC.type==='interlock'&&(<><div className="field"><label htmlFor="tagA">{t.tagLink} A</label><input id="tagA" dir="ltr" list="ctags" value={selC.tag} onFocus={snap} onInput={e=>upd(selC.id,{tag:e.target.value.toUpperCase()})}/></div>
            <div className="field"><label htmlFor="tagB">{t.tagLink} B</label><input id="tagB" dir="ltr" list="ctags" value={selC.tag2} onFocus={snap} onInput={e=>upd(selC.id,{tag2:e.target.value.toUpperCase()})}/></div>
            <datalist id="ctags">{coilTags('coil').map(x=>(<option key={x} value={x}/>))}</datalist><p className="hint">{t.ilHint}</p></>)}
          {DEFS[selC.type].fam&&VARIANTS[DEFS[selC.type].fam]&&(<div className="field"><label htmlFor="np">{t.poles}</label><select id="np" value={selC.type} onChange={e=>{snap();upd(selC.id,{type:e.target.value});}}>{VARIANTS[DEFS[selC.type].fam].map(([k,l])=>(<option key={k} value={k}>{l}</option>))}</select></div>)}
          {DEFS[selC.type].act&&(<div className="field"><label htmlFor="form">{t.formLbl}</label><select id="form" value={selC.type} onChange={e=>{snap();upd(selC.id,{type:e.target.value});}}>{Object.keys(DEFS).filter(k=>DEFS[k].act===DEFS[selC.type].act).map(k=>(<option key={k} value={k}>{t.forms[DEFS[k].form]}</option>))}</select></div>)}
          {DEFS[selC.type].timer&&(<div className="field"><label htmlFor="cdly">{t.delay}</label><input id="cdly" type="number" min="0.1" step="0.5" dir="ltr" value={tcDelay(selC.tag)} onInput={e=>{const v=e.target.value;setComps(cs=>cs.map(x=>(/^tcoil/.test(x.type)||DEFS[x.type].timer)&&x.tag===selC.tag?{...x,delay:v}:x));}}/></div>)}
          {(TIMED.has(selC.type)||selC.type==='pulse_cnt')&&(<div className="field"><label htmlFor="xdly">{selC.type==='pulse_cnt'?t.preset:t.delay}</label><input id="xdly" type="number" min={selC.type==='pulse_cnt'?1:0.1} step={selC.type==='pulse_cnt'?1:0.5} dir="ltr" value={selC.delay??(selC.type==='pulse_cnt'?5:1)} onFocus={snap} onInput={e=>upd(selC.id,{delay:e.target.value})}/></div>)}
          {/^tcoil/.test(selC.type)&&(<div className="field"><label htmlFor="dly">{t.delay}</label><input id="dly" type="number" min="0.1" step="0.5" dir="ltr" value={selC.delay} onInput={e=>upd(selC.id,{delay:e.target.value})}/></div>)}
          {DEFS[selC.type].kind==='plc'&&(()=>{const pr=parseProgram(selC.prog||''),ad=plcAddrs(selC.type);return (<div className="field"><label htmlFor="prog">{t.plcProg}</label>
            <textarea id="prog" dir="ltr" spellCheck="false" rows={8} value={selC.prog||''} placeholder={t.plcPlaceholder(ad.ins[0],ad.ins[1],ad.outs[0])} onFocus={snap} onInput={e=>upd(selC.id,{prog:e.target.value})} style={{width:'100%',fontFamily:'var(--f-mono)',fontSize:'12px',boxSizing:'border-box'}}/>
            {pr.errors.length>0&&(<div className="hint" style={{color:'var(--live)'}} dir="ltr">{pr.errors.join(' · ')}</div>)}
            <p className="hint" style={{margin:'4px 0 0'}}>{t.plcHelp}</p>
            <p className="hint mono" dir="ltr" style={{margin:'4px 0 0',fontSize:'11px'}}>IN: {ad.ins.join(' ')}<br/>OUT: {ad.outs.join(' ')}</p></div>);})()}
          {(selC.type==='lamp'||selC.type==='lampf')&&(<div className="field"><label htmlFor="clr">{t.color}</label><select id="clr" value={selC.color} onChange={e=>upd(selC.id,{color:e.target.value})}>{Object.keys(LAMP).map(k=>(<option key={k} value={k}>{t.colors[k]}</option>))}</select></div>)}
          <div className="row">{DEFS[selC.type].kind!=='src'&&(<button onClick={rot}>{t.rotate}{selC.rot?` · ${selC.rot*90}°`:''}</button>)}<button onClick={del}>{t.del}</button></div></>)
        :selW?(<><h3>{t.wireTitle}</h3><p className="hint">{t.wireHint}</p>
          <div className="field"><label htmlFor="wk">{t.wireKind}</label><select id="wk" value={selW.kind||'ph'} onChange={e=>{snap();updW(selW.id,{kind:e.target.value});}}>{['ph','n','pe','pos','neg'].map(k=>(<option key={k} value={k}>{t.kinds[k]}</option>))}</select></div>
          <div className="row"><button onClick={flip}>{t.flip}</button><button onClick={del}>{t.del}</button></div></>)
        :placing?(<><h3>{t.placeMode}</h3><About t={t} lang={lang} type={placing}/><p className="hint" style={{marginTop:'10px'}}>{t.placeHelp}</p></>)
        :(<><h3>{tool==='wire'?t.wireMode:placing?t.placeMode:t.editMode}</h3>
          <p className="hint">{tool==='wire'?t.wireHelp(vFirst):placing?t.placeHelp:t.editHelp}</p>
          <div className="hint" style={{marginTop:'10px',display:'grid',gap:'4px'}}>
            <div><span className="kbd">W</span> {t.keys1}</div>
            <div><span className="kbd">Del</span> {t.keys2}</div>
            <div><span className="kbd">Shift</span> {t.keys3}</div>
            <div><span className="kbd">Ctrl+C</span> <span className="kbd">Ctrl+V</span> {t.keys4}</div></div></>)}
    </>}
    status={<>
      <span className={'chip'+(mode==='sim'?' sim':'')}>{mode==='sim'?'SIM':'EDIT'}</span>
      {hover&&(<span className="mono" dir="ltr">x {hover[0]*3} · y {hover[1]*3}</span>)}
      <span><b>{comps.length}</b> {t.parts_} · <b>{wires.length}</b> {t.wires_}</span>
      {msg&&(<span style={{color:'var(--ink)'}}>{msg}</span>)}
      <span className="spacer"></span><span>{t.autosave}</span>
    </>}
    overlay={dlg==='io'&&(<Dialog lang={lang} title={t.ioTitle} onClose={()=>setDlg(null)}>
        <div className="row"><label className="hint" htmlFor="file">{t.openFile}</label><input id="file" type="file" accept=".cad,.json,.txt,.bmp,.png,.jpg,.jpeg,.gif,.webp" multiple onChange={onFile} style={{maxWidth:'100%'}}/></div>
        <div className="seg" role="group" style={{justifySelf:'start'}}>
          <button className={fmt==='cad'?'on':''} onClick={()=>setFmt('cad')}>{t.fmtCad}</button>
          <button className={fmt==='json'?'on':''} onClick={()=>setFmt('json')}>{t.fmtJson}</button>
        </div>
        <p className="hint" style={{margin:0}}>{fmt==='cad'?(dl&&dl.kind==='browser'?t.ioHintCadDirect:t.ioHintCad):t.ioHintJson}</p>
        {fmt==='cad'&&ioText&&(ioText.skipped>0||ioText.rotated||ioText.shortened>0)&&(<div className="note">{ioText.shortened>0&&(<div>{t.tagCut(ioText.shortened)}</div>)}{ioText.skipped>0&&(<div>{t.skipped(ioText.skipped)}</div>)}{ioText.rotated&&(<div>{t.rotWarn}</div>)}</div>)}
        <textarea id="exp" key={fmt} defaultValue={ioText?ioText.text:''} spellCheck="false"></textarea>
        <div className="row">
          {dl&&(<button className="go" onClick={saveFile}>{fmt==='cad'&&dl.kind==='artifact'?t.saveZip:t.save}</button>)}
          <button onClick={()=>copy(document.getElementById('exp').value)}>{t.copy}</button>
          <button onClick={()=>importText(document.getElementById('exp').value,'')}>{t.loadText}</button>
          <span className="spacer"></span><button onClick={()=>setDlg(null)}>{t.close}</button>
        </div>
        {msg&&(<div className="hint" style={{color:'var(--ink)'}}>{msg}</div>)}
      </Dialog>)}/>);
}
