// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { CAD_CATALOG_NAMES, RAW_CAT, RAW_NAMES, rawTerminals } from "../cad/catalog";
import { parseCad, writeCad } from "../cad/format";
import { detectSaver } from "../platform/save";
import { cadExample, catalog2Example, catalog3Example, catalog4Example, catalog5Example, catalogExample, test6Example, test7Example, threePhaseExample, timerExample } from "../examples/index";
import { pname } from "../i18n/descriptions";
import { I18N } from "../i18n/strings";
import { elbow, key, onSeg, pinsOf, rotV, wireNet } from "../model/geometry";
import { BOX2, DEFS, G, H, LAMP, NC_TYPES, PALETTE_HIDE, VARIANTS, W } from "../model/parts";
import { actuated, closed, solve } from "../sim/solve";
import { About, Icon, Sym } from "./symbols";

export const STORE='simu-web-v6';
export function initLang(){try{const l=localStorage.getItem('simu-web-lang');if(l==='he'||l==='en')return l;}catch(e){}return 'en';}
export function loadSaved(){try{const s=JSON.parse(localStorage.getItem(STORE));if(s&&Array.isArray(s.comps))return s;}catch(e){}return cadExample(initLang());}
export let uid=Date.now();const nid=p=>p+(++uid).toString(36);
export const safeName=s=>(s||'drawing').replace(/[\\/:*?"<>|]+/g,' ').trim().slice(0,80)||'drawing';

export function App({onHome}={}){
  const [lang,setLang]=useState(initLang);const t=I18N[lang];
  useEffect(()=>{try{localStorage.setItem('simu-web-lang',lang);}catch(e){}document.title='SIMU Web · '+t.elecTitle;},[lang]);
  const init=useMemo(loadSaved,[]);
  const [name,setName]=useState(init.name||'');
  const [comps,setComps]=useState(init.comps);
  const [wires,setWires]=useState(init.wires);
  const [cadMeta,setCadMeta]=useState({order:init.cadOrder||null,footer:init.cadFooter||null});
  const [mode,setMode]=useState('edit');
  const [tool,setTool]=useState('select');
  const [sel,setSel]=useState(null);
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
  const [msg,setMsg]=useState('');
  const [dl,setDl]=useState(null);
  const svgRef=useRef(),stageRef=useRef(),drag=useRef(null),hist=useRef([]);

  useEffect(()=>{let live=true;detectSaver().then(d=>{if(live)setDl(d);});return()=>{live=false;};},[]);
  useEffect(()=>{try{localStorage.setItem(STORE,JSON.stringify({name,comps,wires,cadOrder:cadMeta.order,cadFooter:cadMeta.footer}));}catch(e){}},[name,comps,wires,cadMeta]);
  const snap=()=>{hist.current.push({comps,wires});if(hist.current.length>80)hist.current.shift();};
  const undo=()=>{const h=hist.current.pop();if(h){setComps(h.comps);setWires(h.wires);setSel(null);}};

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
  const coilTags=ty=>[...new Set(comps.filter(c=>c.type===ty).map(c=>c.tag))];
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
      if(key(wStart)!==key(P.g)){snap();setWires(ws=>[...ws,{id:nid('w'),a:wStart,b:P.g,v:vFirst,kind:'ph'}]);}
      setWStart(P.g);return;}
    if(cEl){const c=comps.find(x=>x.id===cEl.dataset.cid);setSel({k:'c',id:c.id});
      drag.current={id:c.id,dx:P.g[0]-c.x,dy:P.g[1]-c.y,moved:false};svgRef.current.setPointerCapture(e.pointerId);return;}
    if(wEl){setSel({k:'w',id:wEl.dataset.wid});return;}
    setSel(null);startPan(e);
  };
  const startPan=e=>{const s=stageRef.current;drag.current={pan:true,x:e.clientX,y:e.clientY,l:s.scrollLeft,t:s.scrollTop};svgRef.current.setPointerCapture(e.pointerId);};
  const onMove=e=>{const P=pt(e);setHover(P.g);const d=drag.current;if(!d)return;
    if(d.pan){const s=stageRef.current;s.scrollLeft=d.l-(e.clientX-d.x);s.scrollTop=d.t-(e.clientY-d.y);return;}
    const nx=P.g[0]-d.dx,ny=P.g[1]-d.dy;
    setComps(cs=>{const c=cs.find(x=>x.id===d.id);if(!c||(c.x===nx&&c.y===ny))return cs;if(!d.moved){d.moved=true;snap();}return cs.map(x=>x.id===d.id?{...x,x:nx,y:ny}:x);});
  };
  const onUp=()=>{drag.current=null;};

  const del=()=>{if(!sel)return;snap();if(sel.k==='c')setComps(cs=>cs.filter(c=>c.id!==sel.id));else setWires(ws=>ws.filter(w=>w.id!==sel.id));setSel(null);};
  const rot=()=>{if(sel?.k!=='c')return;const c=comps.find(x=>x.id===sel.id);if(['src','raw'].includes(DEFS[c.type].kind))return;snap();setComps(cs=>cs.map(x=>x.id===sel.id?{...x,rot:((x.rot|0)+1)%4}:x));};
  const flip=()=>{if(sel?.k!=='w')return;snap();setWires(ws=>ws.map(w=>w.id===sel.id?{...w,v:!w.v}:w));};
  const upd=(id,patch)=>setComps(cs=>cs.map(x=>x.id===id?{...x,...patch}:x));
  const updW=(id,patch)=>setWires(ws=>ws.map(x=>x.id===id?{...x,...patch}:x));

  useEffect(()=>{const k=e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||dlg)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
    if(mode!=='edit')return;
    if(e.key==='Delete'||e.key==='Backspace')del();
    else if(e.key==='r'||e.key==='R'||e.key==='ר')rot();
    else if(e.key==='f'||e.key==='F'||e.key==='כ')flip();
    else if(e.key==='w'||e.key==='W'||e.key==="'"){setTool('wire');setWStart(null);}
    else if(e.key==='Shift')setVFirst(v=>!v);
    else if(e.key==='Escape'){setWStart(null);setTool('select');}};
    window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k);});

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
  const groups=[...new Set(Object.values(DEFS).map(d=>d.group).filter(Boolean))];
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
      if(txt.startsWith('CADe_SIMU')){const d=parseCad(txt);loadDrawing({...d,name:(fname||'').replace(/\.[^.]*$/,'')||t.untitled},t.cadLoaded(d.unknown));return;}
      const d=JSON.parse(txt);const cs=d.components||d.comps,ws=d.wires;if(!Array.isArray(cs)||!Array.isArray(ws))throw 0;
      loadDrawing({comps:cs.filter(c=>DEFS[c.type]),wires:ws,name:d.name,cadOrder:d.cadOrder,cadFooter:d.cadFooter},t.loaded);
    }catch(e){setMsg(t.badFile);}};
  const onFile=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();
    r.onload=()=>importText(r.result,f.name);r.readAsText(f,'windows-1252');e.target.value='';};
  const copy=async txt=>{try{await navigator.clipboard.writeText(txt);setMsg(t.copied);}catch(e){const ta=document.getElementById('exp');ta&&ta.select();setMsg(t.copyManual);}};
  const saveFile=async()=>{if(!dl){setMsg(t.noSave);return;}
    try{
      const ok=fmt==='cad'?await dl.saveCad(safeName(name),ioText.text):await dl.saveJson(safeName(name),ioText.text);
      if(!ok)return;
      setMsg(t.saved);
    }catch(err){if(err&&err.code==='declined')return;setMsg(t.noSave);}};
  useEffect(()=>{if(!msg)return;const i=setTimeout(()=>setMsg(''),6000);return()=>clearTimeout(i);},[msg]);

  const labelPos=c=>{const d=DEFS[c.type];if(d.kind==='src'&&c.type!=='supply')return null;
    const [dx,dy]=d.lab||[17,34];if(c.type==='raw')return [c.x*G+18,c.y*G+56];if(c.type==='interlock')return null;
    if(!c.rot)return [c.x*G+dx,c.y*G+dy];const q=c.rot|0;const [rx,ry]=rotV(q,dx,dy);return [c.x*G+rx+(q===1?-14:0),c.y*G+ry+(q===2?12:q===3?4:-6)];};
  const wireStroke=w=>{const col=res?nodeColor(w.a):null;if(col)return col;return w.kind==='n'?'var(--neu)':w.kind==='pe'?'var(--pe)':'currentColor';};

  return (<div className="app" dir={t.dir} lang={lang}>
    <div className="bar">
      {onHome&&(<button className="home" onClick={onHome} title={t.home} aria-label={t.home}>⌂</button>)}
      <span className="brand" dir="ltr">SIMU Web<small>{t.elecTitle}</small></span>
      <div className="seg" role="group" aria-label="mode">
        <button className={mode==='edit'?'on':''} onClick={()=>toMode('edit')}>{t.edit}</button>
        <button className={mode==='sim'?'on':''} onClick={()=>toMode('sim')}>{t.sim}</button>
      </div>
      {mode==='edit'&&(<div className="seg" role="group" aria-label="tool">
        <button className={tool==='select'?'on':''} onClick={()=>{setTool('select');setWStart(null);}}>{t.select}</button>
        <button className={tool==='wire'?'on':''} onClick={()=>{setTool('wire');setWStart(null);}}>{t.wire}</button>
      </div>)}
      <button onClick={undo} title="Ctrl+Z">{t.undo}</button>
      <input className="proj" id="proj" value={name} onInput={e=>setName(e.target.value)} aria-label={t.projLabel}/>
      <span className="spacer"></span>
      <div className="seg"><button onClick={()=>setZoom(z=>Math.max(.5,+(z-.25).toFixed(2)))} aria-label="zoom out">−</button><button className="mono" onClick={()=>setZoom(1)}>{Math.round(zoom*100)}%</button><button onClick={()=>setZoom(z=>Math.min(2.5,+(z+.25).toFixed(2)))} aria-label="zoom in">+</button></div>
      <button onClick={()=>{snap();toMode('edit');setComps([]);setWires([]);setName(t.newName);setCadMeta({order:null,footer:null});setSel(null);}}>{t.newDoc}</button>
      <select id="examples" aria-label={t.examples} value="" onChange={e=>{const v=e.target.value;if(v==='cad')loadDrawing(cadExample(lang),'');if(v==='timer')loadDrawing(timerExample(lang),'');if(v==='p3')loadDrawing(threePhaseExample(lang),'');if(v==='all')loadDrawing(catalogExample(lang),'');if(v==='all2')loadDrawing(catalog2Example(lang),'');if(v==='all3')loadDrawing(catalog3Example(lang),'');if(v==='all4')loadDrawing(catalog4Example(lang),'');if(v==='all5')loadDrawing(catalog5Example(lang),'');if(v==='t6')loadDrawing(test6Example(lang),'');if(v==='t7')loadDrawing(test7Example(lang),'');}}>
        <option value="">{t.examples}…</option><option value="cad">{t.exCad}</option><option value="timer">{t.exTimer}</option><option value="p3">{t.ex3}</option><option value="t6">{t.exT6}</option><option value="t7">{t.exT7}</option><option value="all">{t.exAll}</option><option value="all2">{t.exAll2}</option><option value="all3">{t.exAll3}</option><option value="all4">{t.exAll4}</option><option value="all5">{t.exAll5}</option></select>
      <button className="go" onClick={()=>setDlg('io')}>{t.file}</button>
      <select id="lang" aria-label={t.lang} value={lang} onChange={e=>setLang(e.target.value)}><option value="en">English</option><option value="he">עברית</option></select>
    </div>

    <div className="main">
      <div className="drawer" aria-label={t.parts_}>
        {groups.map(g=>(<div key={g} style={{display:'contents'}}><div className="grp">{t.groups[g]}</div>
          {Object.entries(DEFS).filter(([k,d])=>d.group===g&&!PALETTE_HIDE.has(k)).map(([t2])=>(<button key={t2} className={'part'+(placing===t2?' on':'')} disabled={mode==='sim'} onClick={()=>{toMode('edit');setTool('place:'+t2);}}><Icon type={t2}/><span>{pname(t,t2)}</span></button>))}</div>))}
      </div>

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

          {wires.map(w=>{const e=elbow(w);const col=wireStroke(w);const pts=`${w.a[0]*G},${w.a[1]*G} ${e[0]*G},${e[1]*G} ${w.b[0]*G},${w.b[1]*G}`;
            const isSel=sel?.k==='w'&&sel.id===w.id;const live=res&&nodeColor(w.a);
            return (<g key={w.id} data-wid={w.id}>
              <polyline points={pts} fill="none" stroke="transparent" strokeWidth="12"/>
              {isSel&&(<polyline points={pts} fill="none" stroke="var(--sel)" strokeWidth="7" opacity=".35" strokeLinejoin="round"/>)}
              <polyline points={pts} fill="none" stroke={col} strokeWidth={live?2.6:2} strokeDasharray={!res&&w.kind==='pe'?'7 3':null} strokeLinejoin="round"/></g>);})}
          {dots.map(p=>{const col=nodeColor(p);return (<circle key={'d'+key(p)} cx={p[0]*G} cy={p[1]*G} r="3.6" fill={col||'currentColor'} pointerEvents="none"/>);})}

          {comps.map(c=>{const d=DEFS[c.type];const ps=pinsOf(c);
            let s={cs:ps.map(nodeColor),color:c.color,code:c.cad&&c.cad.code,cname:c.cad&&CAD_CATALOG_NAMES[c.cad.code],tag:c.tag,tag2:c.tag2};
            if(c.type==='raw'){const n=c.cad.nums,xi=n.length-15;if(RAW_NAMES[c.cad.code]){s.name=RAW_NAMES[c.cad.code];s.cat=RAW_CAT[c.cad.code];s.terms=rawTerminals(c.cad.text);const bw=Math.max(n[xi+6],12),bh=Math.max(n[xi+7],12);s.big=c.cad.code>=10204&&c.cad.code<=10208?[-30,-8,Math.max(bw*5,90),bh*5]:[n[xi+4]*5,n[xi+5]*5,Math.max(bw*5,96),Math.max(bh*5,60)];}
              else if(n[xi+2]||n[xi+3])s.line=[Math.round(n[xi+2]/3)*G-c.x*G,Math.round(n[xi+3]/3)*G-c.y*G];}
            if(res){if(d.kind==='load'){s.on=res.loads[c.id];s.dir=res.dir[c.id];if(/^tcoil/.test(c.type)){const m=res.tm[c.tag];s.done=!!(m&&(c.type==='tcoil'?m.ton:c.type==='tcoil_off'?m.toff:m.tboth));}}
              else if(d.form)s.act=actuated(c,inp,res.coils,res.tm);
              else if(d.kind==='contact')s.closed=closed(c,inp,res.coils);
              s.pressed=!!inp.press[c.id];s.tripped=!!inp.trip[c.id]||!!(inp.tripTag&&inp.tripTag[c.tag]);}
            else{s.closed=NC_TYPES.includes(c.type)||d.fam==='fu'||d.toggle==='off';}
            const isSel=sel?.k==='c'&&sel.id===c.id;
            const hit=s.big?{x:s.big[0],y:s.big[1],width:s.big[2],height:s.big[3]}:s.line?{x:Math.min(0,s.line[0])-4,y:Math.min(0,s.line[1])-4,width:Math.abs(s.line[0])+8,height:Math.abs(s.line[1])+8}:d.box||BOX2;
            const interactive=mode==='sim'&&(['pb','th'].includes(d.act)||!!d.latch||!!d.toggle||!!d.trip);const linked=mode==='sim'&&!!d.link;
            return (<g key={c.id} data-cid={c.id} transform={`translate(${c.x*G},${c.y*G})${c.rot?` rotate(${90*c.rot})`:''}`} style={{cursor:interactive?'pointer':linked?'help':mode==='edit'&&tool==='select'?'move':null}}>
              <rect {...hit} fill={interactive?'color-mix(in srgb,var(--accent) 10%,transparent)':'transparent'} stroke={isSel?'var(--sel)':'none'} strokeDasharray="4 3" rx="4"/>
              <Sym type={c.type} s={s}/>
              {mode==='edit'&&d.pins.map((pp,i)=>(<circle key={i} cx={pp[0]*G} cy={pp[1]*G} r="2.6" fill="var(--sheet)" stroke="currentColor" strokeWidth="1.4"/>))}
            </g>);})}
          {comps.map(c=>{const lp=c.type==='raw'&&RAW_NAMES[c.cad.code]?null:labelPos(c);if(!lp||!c.tag)return null;const d=DEFS[c.type];
            const st=(/^tcoil/.test(c.type)||d.timer)&&res&&sim.timers[c.tag];const dl=tcDelay(c.tag);const el=st?(now-st.t)/1000:0;
            const extra=!st?'':st.on?` ${Math.min(el,dl).toFixed(1)}/${dl}s`:el<dl?` ↓${(dl-el).toFixed(1)}s`:'';
            return (<text key={'t'+c.id} x={lp[0]} y={lp[1]} fontSize="12" fontWeight="600" fill="currentColor" textAnchor={c.type==='raw'?'middle':null} pointerEvents="none">{c.tag}<tspan fill="var(--accent)">{extra}</tspan></text>);})}

          {mode==='edit'&&tool==='wire'&&wStart&&hover&&(()=>{const w={a:wStart,b:hover,v:vFirst};const e=elbow(w);
            return (<polyline points={`${w.a[0]*G},${w.a[1]*G} ${e[0]*G},${e[1]*G} ${w.b[0]*G},${w.b[1]*G}`} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 4" pointerEvents="none"/>);})()}
          {mode==='edit'&&(tool!=='select')&&hover&&(<circle cx={hover[0]*G} cy={hover[1]*G} r="5" fill="none" stroke="var(--accent)" strokeWidth="2" pointerEvents="none"/>)}
          {placing&&hover&&(<g transform={`translate(${hover[0]*G},${hover[1]*G})`} opacity=".45" pointerEvents="none"><Sym type={placing}/></g>)}
        </svg>
      </div>

      <div className="insp">
        {mode==='sim'?(<><h3>{t.simTitle}</h3>
          <p className="hint">{t.simHint}</p>
          <div className="legend"><div><span style={{background:'var(--live)'}}></span>{t.legL}</div><div><span style={{background:'var(--l2)'}}></span>{t.legL2}</div><div><span style={{background:'var(--l3)'}}></span>{t.legL3}</div><div><span style={{background:'var(--neu)'}}></span>{t.legN}</div><div><span style={{background:'var(--accent)'}}></span>{t.legOn}</div></div>
          <div className="grp" style={{marginTop:'14px'}}>{t.coilState}</div>
          {comps.filter(c=>c.type==='motor3'&&res&&res.loads[c.id]).map(c=>(<div key={c.id} className="mono" style={{fontSize:'12px',display:'flex',justifyContent:'space-between'}}><span dir="ltr">{c.tag}</span><b style={{color:'var(--accent)'}}>{res.dir[c.id]>0?t.dirFwd:t.dirRev}</b></div>))}
          {comps.filter(c=>c.type==='coil'||/^tcoil/.test(c.type)).map(c=>(<div key={c.id} className="mono" style={{fontSize:'12px',display:'flex',justifyContent:'space-between'}}><span dir="ltr">{c.tag}</span><b style={{color:res&&res.loads[c.id]?'var(--ok)':'var(--muted)'}}>{res&&res.loads[c.id]?'ON':'OFF'}</b></div>))}</>)
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
          {/^tcoil/.test(selC.type)&&(<div className="field"><label htmlFor="dly">{t.delay}</label><input id="dly" type="number" min="0.1" step="0.5" dir="ltr" value={selC.delay} onInput={e=>upd(selC.id,{delay:e.target.value})}/></div>)}
          {(selC.type==='lamp'||selC.type==='lampf')&&(<div className="field"><label htmlFor="clr">{t.color}</label><select id="clr" value={selC.color} onChange={e=>upd(selC.id,{color:e.target.value})}>{Object.keys(LAMP).map(k=>(<option key={k} value={k}>{t.colors[k]}</option>))}</select></div>)}
          <div className="row">{DEFS[selC.type].kind!=='src'&&(<button onClick={rot}>{t.rotate}{selC.rot?` · ${selC.rot*90}°`:''}</button>)}<button onClick={del}>{t.del}</button></div></>)
        :selW?(<><h3>{t.wireTitle}</h3><p className="hint">{t.wireHint}</p>
          <div className="field"><label htmlFor="wk">{t.wireKind}</label><select id="wk" value={selW.kind||'ph'} onChange={e=>{snap();updW(selW.id,{kind:e.target.value});}}>{['ph','n','pe'].map(k=>(<option key={k} value={k}>{t.kinds[k]}</option>))}</select></div>
          <div className="row"><button onClick={flip}>{t.flip}</button><button onClick={del}>{t.del}</button></div></>)
        :placing?(<><h3>{t.placeMode}</h3><About t={t} lang={lang} type={placing}/><p className="hint" style={{marginTop:'10px'}}>{t.placeHelp}</p></>)
        :(<><h3>{tool==='wire'?t.wireMode:placing?t.placeMode:t.editMode}</h3>
          <p className="hint">{tool==='wire'?t.wireHelp(vFirst):placing?t.placeHelp:t.editHelp}</p>
          <div className="hint" style={{marginTop:'10px',display:'grid',gap:'4px'}}>
            <div><span className="kbd">W</span> {t.keys1}</div>
            <div><span className="kbd">Del</span> {t.keys2}</div></div></>)}
      </div>
    </div>

    <div className="status">
      <span className={'chip'+(mode==='sim'?' sim':'')}>{mode==='sim'?'SIM':'EDIT'}</span>
      {hover&&(<span className="mono" dir="ltr">x {hover[0]*3} · y {hover[1]*3}</span>)}
      <span><b>{comps.length}</b> {t.parts_} · <b>{wires.length}</b> {t.wires_}</span>
      {msg&&(<span style={{color:'var(--ink)'}}>{msg}</span>)}
      <span className="spacer"></span><span>{t.autosave}</span>
    </div>

    {dlg==='io'&&(<div className="modal" onPointerDown={e=>{if(e.target===e.currentTarget)setDlg(null);}}>
      <div className="dlg" role="dialog" aria-label={t.ioTitle}>
        <h2>{t.ioTitle}</h2>
        <div className="row"><label className="hint" htmlFor="file">{t.openFile}</label><input id="file" type="file" accept=".cad,.json,.txt" onChange={onFile} style={{maxWidth:'100%'}}/></div>
        <div className="seg" role="group" style={{justifySelf:'start'}}>
          <button className={fmt==='cad'?'on':''} onClick={()=>setFmt('cad')}>{t.fmtCad}</button>
          <button className={fmt==='json'?'on':''} onClick={()=>setFmt('json')}>{t.fmtJson}</button>
        </div>
        <p className="hint" style={{margin:0}}>{fmt==='cad'?(dl&&dl.kind==='browser'?t.ioHintCadDirect:t.ioHintCad):t.ioHintJson}</p>
        {fmt==='cad'&&ioText&&(ioText.skipped>0||ioText.rotated)&&(<div className="note">{ioText.skipped>0&&(<div>{t.skipped(ioText.skipped)}</div>)}{ioText.rotated&&(<div>{t.rotWarn}</div>)}</div>)}
        <textarea id="exp" key={fmt} defaultValue={ioText?ioText.text:''} spellCheck="false"></textarea>
        <div className="row">
          {dl&&(<button className="go" onClick={saveFile}>{fmt==='cad'&&dl.kind==='artifact'?t.saveZip:t.save}</button>)}
          <button onClick={()=>copy(document.getElementById('exp').value)}>{t.copy}</button>
          <button onClick={()=>importText(document.getElementById('exp').value,'')}>{t.loadText}</button>
          <span className="spacer"></span><button onClick={()=>setDlg(null)}>{t.close}</button>
        </div>
        {msg&&(<div className="hint" style={{color:'var(--ink)'}}>{msg}</div>)}
      </div></div>)}
  </div>);
}
