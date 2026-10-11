// @ts-nocheck
import { UF, key, pinPos, wireNet } from "../model/geometry";
import { DEFS } from "../model/parts";
import { PLC_MODELS, plcLayout, plcCom, parseProgram, scan } from "../model/plc";
const progCache=new Map();const progOf=src=>{if(!progCache.has(src))progCache.set(src,parseProgram(src));return progCache.get(src);};

/* timer per tag: st={on,t,done}. on-delay acts after the coil has been on for d; off-delay acts at once and releases d after the coil drops;
   'both' delays both edges. */
export function timerActs(st,d,now,kind){if(!st)return {ton:false,toff:false,tboth:false};const e=now-st.t;
  const r={ton:st.on&&e>=d,toff:st.on||e<d,tboth:st.on?e>=d:(st.done&&e<d)};
  /* the coil type sets the edges for every timed contact with its tag */
  if(kind==='tcoil_off'){const v=r.toff;return {ton:v,toff:v,tboth:v};}
  if(kind==='tcoil_both'){const v=r.tboth;return {ton:v,toff:v,tboth:v};}
  return r;}
export function actuated(c,inp,coils,tm){const d=DEFS[c.type];
  switch(d.act){case 'aux':return !!coils[c.tag];case 'ton':case 'toff':case 'tboth':return !!(tm[c.tag]&&tm[c.tag][d.act]);
    case 'pb':return !!inp.press[c.id];case 'th':return !!inp.trip[c.id]||!!(inp.tripTag&&inp.tripTag[c.tag]);default:return !!inp.sw[c.id];}}
export function pathOn(c,p,inp,coils,tm){if(p[2]==='plc')return !!coils['plc:'+c.id+':'+p[3]];if(p[2]){const a=actuated(c,inp,coils,tm);return p[2]==='no'?a:!a;}return closed(c,inp,coils);}
export function closed(c,inp,coils){
  const d=DEFS[c.type];
  if(d.fam==='km')return !!coils[c.tag];
  if(d.fam==='fu'||d.fam==='ovl')return true;
  if(d.toggle==='off')return !inp.off[c.id];
  if(d.toggle==='sw')return !!inp.sw[c.id];
  return false;
}

/* potentials: L1/L2/L3/N. A node touching two different potentials is a short. 2-pin loads run between any two different
   potentials; a 3-phase motor runs when U/V/W carry three different phases, and its direction follows the phase sequence. */
export const PH=['L1','L2','L3'];
export function solve(comps,wires,inp,prevCoils,timers,now){
  const base=wireNet(comps,wires);
  const delays={};comps.forEach(c=>{if(DEFS[c.type].timer&&c.delay&&!(c.tag in delays))delays[c.tag]=(+c.delay)*1000;});
  comps.forEach(c=>{if(/^tcoil/.test(c.type))delays[c.tag]=(+c.delay||3)*1000;});
  const ttags=new Set(comps.filter(c=>/^tcoil/.test(c.type)||DEFS[c.type].timer).map(c=>c.tag));
  const tkind={};comps.forEach(c=>{if(/^tcoil/.test(c.type))tkind[c.tag]=c.type;});
  const tm={};ttags.forEach(g=>{tm[g]=timerActs(timers[g],delays[g]??3000,now,tkind[g]);});
  let coils={...prevCoils},out=null,stable=false;
  for(let it=0;it<16;it++){
    const uf=new UF(base.p);
    comps.forEach(c=>{const d=DEFS[c.type];if(d.paths)d.paths.forEach(p=>{if(pathOn(c,p,inp,coils,tm))uf.u(key(pinPos(c,p[0])),key(pinPos(c,p[1])));});});
    const pot=new Map();
    comps.forEach(c=>{const d=DEFS[c.type];if(!d.src)return;
      Object.entries(d.src).forEach(([pi,ph])=>{const r=uf.f(key(pinPos(c,+pi)));if(!pot.has(r))pot.set(r,new Set());pot.get(r).add(ph);});});
    // supplies that only deliver while they are powered (PLC sensor supply, 24 V power supply)
    comps.forEach(c=>{const d=DEFS[c.type];if(!d.condSrc||!coils['pwr:'+c.id])return;
      Object.entries(d.condSrc).forEach(([pi,ph])=>{const r=uf.f(key(pinPos(c,+pi)));if(!pot.has(r))pot.set(r,new Set());pot.get(r).add(ph);});});
    let short=false;pot.forEach(v=>{if(v.size>1)short=true;});
    const potOf=p=>{const v=pot.get(uf.f(key(p)));return v&&v.size===1?[...v][0]:null;};
    const loads={},dir={},nc={},tOn={};const out0={};
    comps.forEach(c=>{const d=DEFS[c.type];
      if(d.load){const a=potOf(pinPos(c,d.load[0])),b=potOf(pinPos(c,d.load[1]));
        const on=!short&&!!a&&!!b&&a!==b;loads[c.id]=on;
        if(c.type==='coil'&&on)nc[c.tag]=true;
        if((/^tcoil/.test(c.type)||c.type==='coil')&&on&&ttags.has(c.tag))tOn[c.tag]=true;}
      if(d.load3){const ps=d.load3.map(i=>potOf(pinPos(c,i)));const ix=ps.map(p=>PH.indexOf(p));
        const on=!short&&ix.every(i=>i>=0)&&new Set(ix).size===3;loads[c.id]=on;
        if(on)dir[c.id]=(ix[1]-ix[0]+3)%3===1?1:-1;}
      if(d.yd){ // 6-terminal motor: star (ends joined, 3 phases on the starts) or delta (each winding across two phases)
        const ps=d.yd.u.map(i=>potOf(pinPos(c,i))),ix=ps.map(p=>PH.indexOf(p));
        const es=d.yd.e.map(i=>uf.f(key(pinPos(c,i)))),ep=d.yd.e.map(i=>PH.indexOf(potOf(pinPos(c,i))));
        const three=ix.every(i=>i>=0)&&new Set(ix).size===3;
        const star=three&&es[0]===es[1]&&es[1]===es[2];
        const delta=three&&ep.every(i=>i>=0)&&ix.every((p,k)=>p!==ep[k]);
        const on=!short&&(star||delta);loads[c.id]=on;
        if(on){dir[c.id]=(ix[1]-ix[0]+3)%3===1?1:-1;(out0.yd||(out0.yd={}))[c.id]=star?'Y':'Δ';}}});
    // PLCs and power supplies: powered when their supply terminals carry two different potentials; a PLC scans its program
    const plc={};
    comps.forEach(c=>{const d=DEFS[c.type];if(!d.pwr)return;
      const a=potOf(pinPos(c,d.pwr[0])),b=potOf(pinPos(c,d.pwr[1]));const on=!short&&!!a&&!!b&&a!==b;if(on)nc['pwr:'+c.id]=true;
      if(d.kind!=='plc')return;
      const lay=plcLayout(c.type),ins={};
      lay.inputs.forEach(i=>{const ci=plcCom(lay,i);const pi=potOf(pinPos(c,i)),pc=ci>=0?potOf(pinPos(c,ci)):null;if(pi&&pc&&pi!==pc)ins[lay.pins[i].addr]=true;});
      const mem={},pre='plc:'+c.id+':';Object.keys(coils).forEach(k=>{if(k.startsWith(pre))mem[k.slice(pre.length)]=true;});
      let st={mem:{},timers:{}};
      if(on){st=scan(progOf(c.prog||''),ins,mem,coils['plct:'+c.id]||{},now);
        Object.entries(st.mem).forEach(([k,v])=>{if(v)nc[pre+k]=true;});if(Object.keys(st.timers).length)nc['plct:'+c.id]=st.timers;}
      plc[c.id]={on,ins,mem:on?st.mem:{}};});
    out0.plc=plc;
    comps.forEach(c=>{if(c.type!=='interlock'||!nc[c.tag]||!nc[c.tag2])return;
      if(coils[c.tag]&&!coils[c.tag2])delete nc[c.tag2];else if(coils[c.tag2]&&!coils[c.tag])delete nc[c.tag];else{delete nc[c.tag];delete nc[c.tag2];}});
    out={uf,pot,short,loads,dir,tOn,tm,delays,potOf,ttags,yd:out0.yd||{},plc:out0.plc||{}};
    if(JSON.stringify(nc)===JSON.stringify(coils)){stable=true;break;}
    coils=nc;
  }
  out.coils=coils;out.stable=stable;
  out.node=p=>out.short?null:out.potOf(p);
  return out;
}
