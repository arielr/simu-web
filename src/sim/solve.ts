// @ts-nocheck
import { UF, key, pinPos, wireNet } from "../model/geometry";
import { DEFS } from "../model/parts";
import { PLC_MODELS, plcLayout, plcCom, parseProgram, scan } from "../model/plc";
import { gate } from "../model/extras";
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
    case 'bar':return !!coils['beam:'+c.tag]&&!!inp.sw[c.id];
    case 'pb':return !!inp.press[c.id];case 'th':return !!inp.trip[c.id]||!!(inp.tripTag&&inp.tripTag[c.tag]);default:return !!inp.sw[c.id];}}
export function pathOn(c,p,inp,coils,tm){if(p[2]==='plc')return !!coils['plc:'+c.id+':'+p[3]];
  if(p[2]==='self')return !!coils['self:'+c.id];if(p[2]==='selfnc')return !coils['self:'+c.id];
  if(typeof p[2]==='string'&&p[2].startsWith('pos'))return (+inp.sw[c.id]|0)===+p[2].slice(3);if(p[2]){const a=actuated(c,inp,coils,tm);return p[2]==='no'?a:!a;}return closed(c,inp,coils);}
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
      Object.entries(d.condSrc).forEach(([pi,ph])=>{const r=uf.f(key(pinPos(c,+pi)));if(!pot.has(r))pot.set(r,new Set());pot.get(r).add(ph[0]==='~'?ph+':'+c.id:ph);});});
    // logic outputs deliver + while they are 1
    comps.forEach(c=>{const d=DEFS[c.type];if(!d.logic||!coils['lg:'+c.id])return;const r=uf.f(key(pinPos(c,d.logic.out)));if(!pot.has(r))pot.set(r,new Set());pot.get(r).add('P');});
    let short=false;pot.forEach(v=>{if(v.size>1)short=true;});
    const potOf=p=>{const v=pot.get(uf.f(key(p)));return v&&v.size===1?[...v][0]:null;};
    const loads={},dir={},nc={},tOn={};const out0={};
    comps.forEach(c=>{const d=DEFS[c.type];
      if(d.load){const a=potOf(pinPos(c,d.load[0])),b=potOf(pinPos(c,d.load[1]));
        let on=!short&&!!a&&!!b&&a!==b;
        const live=(i,j)=>{const x=potOf(pinPos(c,i)),y=potOf(pinPos(c,j));return !short&&!!x&&!!y&&x!==y;};
        if(d.load2&&!d.drive)on=on&&live(d.load2[0],d.load2[1]); // DC motor with separate excitation: armature and field
        loads[c.id]=on;
        if(d.dc&&on)dir[c.id]=a==='P'||b==='M'?1:-1;
        if(on&&d.paths&&d.paths.some(p=>p[2]==='self'||p[2]==='selfnc'))nc['self:'+c.id]=true;
        if(d.drive){const id=c.id,tg=c.tag;
          if(d.drive==='step'){let m=!!coils['mem:'+id];if(on){nc['edge:'+id]=true;if(!coils['edge:'+id])m=!m;}if(m){nc['mem:'+id]=true;nc[tg]=true;}}
          else if(d.drive==='bistable'){let m=!!coils['mem:'+id];if(live(d.load2[0],d.load2[1]))m=false;else if(on)m=true;loads[id]=m;if(m){nc['mem:'+id]=true;nc[tg]=true;}}
          else if(d.drive==='flash'){if(on){const t0=coils['t0:'+id]??now;nc['t0:'+id]=t0;const per=Math.max(0.1,+c.delay||d.period)*1000;if(Math.floor((now-t0)/per)%2===0)nc[tg]=true;}}
          else if(d.drive==='timesw'){if(on&&inp.sw[id])nc[tg]=true;}
          else if(d.drive==='beam'){if(on)nc['beam:'+tg]=true;}
          else if(d.drive==='count'){let n=+coils['cnt:'+id]||0;
            if(on){[['C',1,1],['D',2,-1]].forEach(([k,pi,dn])=>{const e=live(pi,4);if(e){nc['e'+k+':'+id]=true;if(!coils['e'+k+':'+id])n=Math.max(0,n+dn);}});if(live(3,4))n=0;}
            if(n)nc['cnt:'+id]=n;(out0.cnt||(out0.cnt={}))[id]=n;if(on&&n>=(+c.delay||d.preset))nc[tg]=true;}}
        if(c.type==='coil'&&on)nc[c.tag]=true;
        if((/^tcoil/.test(c.type)||c.type==='coil')&&on&&ttags.has(c.tag))tOn[c.tag]=true;}
      if(d.drive==='phase'){const ix=[0,1,2].map(i=>PH.indexOf(potOf(pinPos(c,i))));
        let ok=!short&&ix.every(i=>i>=0)&&new Set(ix).size===3;
        if(ok&&d.seq)ok=(ix[1]-ix[0]+3)%3===1&&(ix[2]-ix[1]+3)%3===1;
        if(ok&&d.neu)ok=potOf(pinPos(c,3))==='N';
        loads[c.id]=ok;if(ok)nc[c.tag]=true;}
      if(d.dahl){ // Dahlander: low speed on U1 V1 W1 (U2 V2 W2 open), high speed on U2 V2 W2 with U1 V1 W1 joined
        const three=ix=>ix.every(i=>i>=0)&&new Set(ix).size===3;
        const ia=d.dahl.a.map(i=>PH.indexOf(potOf(pinPos(c,i)))),ib=d.dahl.b.map(i=>PH.indexOf(potOf(pinPos(c,i))));
        const ra=d.dahl.a.map(i=>uf.f(key(pinPos(c,i))));
        const low=three(ia)&&d.dahl.b.every(i=>!potOf(pinPos(c,i))),high=three(ib)&&ra[0]===ra[1]&&ra[1]===ra[2];
        const on=!short&&(low||high);loads[c.id]=on;
        if(on){const ix=low?ia:ib;dir[c.id]=(ix[1]-ix[0]+3)%3===1?1:-1;(out0.speed||(out0.speed={}))[c.id]=low?'1':'2';}}
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
    // logic gates: inputs are 1 at +; timers keep their start time
    comps.forEach(c=>{const d=DEFS[c.type];if(!d.logic)return;
      const ins=d.logic.ins.map(i=>!short&&potOf(pinPos(c,i))==='P');
      const r=gate(d.logic.fn,ins,!!coils['lg:'+c.id],coils['lt:'+c.id],now,Math.max(0.1,+c.delay||1)*1000);
      if(r.q)nc['lg:'+c.id]=true;if(r.t0!==undefined)nc['lt:'+c.id]=r.t0;});
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
    out={uf,pot,short,loads,dir,tOn,tm,delays,potOf,ttags,yd:out0.yd||{},plc:out0.plc||{},speed:out0.speed||{},cnt:out0.cnt||{}};
    if(JSON.stringify(nc)===JSON.stringify(coils)){stable=true;break;}
    coils=nc;
  }
  out.coils=coils;out.stable=stable;
  out.node=p=>out.short?null:out.potOf(p);
  return out;
}
