// @ts-nocheck
import { pdesc, pname } from "../i18n/descriptions";
import { ACTS, BOX2, DEFS, LAMP, NC_TYPES } from "../model/parts";

export function fit(str,px,size){const n=Math.max(3,Math.floor(px/(size*0.6)));return str.length>n?str.slice(0,n-1)+'…':str;}
export function Face({b,cat,name,sub,terms}){
  const [x,y,w,h]=b;const top=terms.slice(0,Math.ceil(terms.length/2)),bot=terms.slice(Math.ceil(terms.length/2));
  const row=(list,yy,lab)=>list.map((l,i)=>{const tx=x+w*(i+1)/(list.length+1);return (<g key={lab+i}><circle cx={tx} cy={yy} r="5" fill="var(--sheet)" stroke="currentColor" strokeWidth="1.4"/><Ln x1={tx-3} y1={yy-3} x2={tx+3} y2={yy+3} w={1}/>
    <text x={tx} y={lab==='t'?yy-9:yy+16} textAnchor="middle" fontSize="9" fill="var(--muted)">{l}</text></g>);});
  const ty=y+(top.length?74:36),by=y+h-(bot.length?38:10);const mh=Math.max(20,by-ty);const cx=x+w/2,cy=ty+mh/2;const r=Math.max(8,Math.min(w,mh)*0.36);
  let icon=null;
  switch(cat){
    case 'mcb':case 'rcd':{const n=Math.max(1,Math.min(4,top.length||1));icon=(<>{[...Array(n)].map((_,i)=>{const lx=x+w*(i+1)/(n+1);return (<g key={i}><rect x={lx-7} y={cy-16} width="14" height="32" rx="3" fill="color-mix(in srgb,currentColor 12%,var(--sheet))" stroke="currentColor"/><rect x={lx-5} y={cy-14} width="10" height="12" rx="2" fill="currentColor"/></g>);})}
      {cat==='rcd'&&(<><rect x={x+w-30} y={cy+20} width="16" height="10" rx="2" fill="var(--accent)"/><text x={x+w-22} y={cy+28} textAnchor="middle" fontSize="8" fill="var(--accent-ink)">T</text></>)}</>);break;}
    case 'mpb':icon=(<><circle cx={cx} cy={cy-10} r={r*0.7} fill="var(--sheet)" stroke="currentColor"/><Ln x1={cx} y1={cy-10} x2={cx+r*0.5} y2={cy-10-r*0.4}/><rect x={cx-26} y={cy+r*0.4} width="20" height="14" rx="2" fill="#2f9a4a"/><rect x={cx+6} y={cy+r*0.4} width="20" height="14" rx="2" fill="#d23a2e"/></>);break;
    case 'ovl':icon=(<><circle cx={cx-12} cy={cy} r={Math.min(r,18)} fill="var(--sheet)" stroke="currentColor"/><Ln x1={cx-12} y1={cy} x2={cx-4} y2={cy-8}/><rect x={cx+10} y={cy-8} width="14" height="16" rx="2" fill="#d23a2e"/></>);break;
    case 'rotary':case 'isolator':{const iso=cat==='isolator';icon=(<>{iso&&(<rect x={cx-r-10} y={cy-r-10} width={2*r+20} height={2*r+20} rx="6" fill="#f2c94c"/>)}<circle cx={cx} cy={cy} r={r} fill={iso?'#d23a2e':'color-mix(in srgb,currentColor 15%,var(--sheet))'} stroke="currentColor"/>
      <rect x={cx-r*0.9} y={cy-6} width={r*1.8} height="12" rx="6" fill={iso?'#a8241b':'currentColor'} transform={`rotate(-35 ${cx} ${cy})`}/>{!iso&&(<text x={cx} y={cy-r-6} textAnchor="middle" fontSize="9" fill="var(--muted)">ON</text>)}</>);break;}
    case 'contactor':case 'aux':icon=(<><rect x={cx-w*0.3} y={cy-14} width={w*0.6} height="28" rx="3" fill="color-mix(in srgb,currentColor 10%,var(--sheet))" stroke="currentColor"/><rect x={cx-10} y={cy-8} width="20" height="16" fill="var(--neu)" opacity=".6"/></>);break;
    case 'dial':icon=(<><circle cx={cx} cy={cy} r={r} fill="var(--sheet)" stroke="currentColor"/>{[...Array(8)].map((_,i)=>{const a=(-135+i*270/7)*Math.PI/180;return (<Ln key={i} x1={cx+Math.cos(a)*r*0.75} y1={cy+Math.sin(a)*r*0.75} x2={cx+Math.cos(a)*r*0.92} y2={cy+Math.sin(a)*r*0.92} w={1}/>);})}<Ln x1={cx} y1={cy} x2={cx+r*0.5} y2={cy-r*0.5} w={2.5}/></>);break;
    case 'relay':case 'module':icon=(<><rect x={cx-w*0.32} y={cy-mh*0.3} width={w*0.64} height={mh*0.6} rx="3" fill="color-mix(in srgb,var(--neu) 10%,var(--sheet))" stroke="currentColor"/><rect x={cx-10} y={cy-7} width="20" height="14" fill="none" stroke="currentColor"/><Ln x1={cx-10} y1={cy+7} x2={cx+10} y2={cy-7} w={1}/></>);break;
    case 'button':icon=(<rect x={cx-15} y={cy-15} width="30" height="30" rx="6" fill="#2f9a4a" stroke="currentColor"/>);break;
    case 'lamp':icon=(<circle cx={cx} cy={cy} r={Math.min(14,w*0.35)} fill="#3fb35e" stroke="currentColor"/>);break;
    case 'led':icon=(<circle cx={cx} cy={cy} r="7" fill="#8ad44a" stroke="currentColor"/>);break;
    case 'box':icon=(<>{['#3fb35e','#3fb35e','#f2a62a','#e5483b'].map((c,i)=>{const lx=x+w*(i+1)/5;return (<g key={i}><circle cx={lx} cy={cy-16} r="11" fill={c} stroke="currentColor"/><rect x={lx-10} y={cy+6} width="20" height="20" rx="3" fill={i<2?'#1f7a3a':'#c0392b'} stroke="currentColor"/></g>);})}</>);break;
    case 'terminal':icon=(<rect x={cx-8} y={cy-12} width="16" height="24" rx="2" fill="color-mix(in srgb,currentColor 12%,var(--sheet))" stroke="currentColor"/>);break;
    case 'motor':icon=(<><circle cx={cx} cy={cy} r={Math.min(r,22)} fill="color-mix(in srgb,var(--neu) 15%,var(--sheet))" stroke="currentColor"/><text x={cx} y={cy+4} textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">M 3~</text></>);break;
    case 'plc':case 'io':case 'board':icon=(<><rect x={x+w*0.12} y={cy-mh*0.22} width={w*0.4} height={mh*0.35} rx="2" fill="color-mix(in srgb,var(--neu) 18%,var(--sheet))" stroke="currentColor"/>{[...Array(6)].map((_,i)=>(<rect key={i} x={x+w*0.6+(i%3)*14} y={cy-mh*0.2+Math.floor(i/3)*16} width="10" height="10" rx="2" fill="none" stroke="currentColor"/>))}</>);break;
    case 'table':icon=(<>{[...Array(8)].map((_,i)=>(<Ln key={i} x1={x+8} y1={y+44+i*((h-56)/8)} x2={x+w-8} y2={y+44+i*((h-56)/8)} w={0.8} c="var(--muted)"/>))}</>);break;
  }
  return (<><rect x={x} y={y} width={w} height={h} rx="6" fill="color-mix(in srgb,var(--muted) 9%,var(--sheet))" stroke="currentColor" strokeWidth="1.4"/>
    {top.length>0&&(<Ln x1={x} y1={y+40} x2={x+w} y2={y+40} w={0.8} c="var(--grid)"/>)}{row(top,y+22,'t')}{row(bot,y+h-26,'b')}{icon}
    <clipPath id={'cp'+x+'_'+y+'_'+w}><rect x={x+2} y={y} width={w-4} height={h}/></clipPath>
    <g clipPath={`url(#cp${x}_${y}_${w})`}><text x={x+8} y={top.length?y+54:y+16} fontSize="11" fontWeight="600" fill="currentColor" fontFamily="var(--f-ui)">{fit(name,w-16,11)}</text>
    <text x={x+8} y={top.length?y+67:y+29} fontSize="9" fill="var(--muted)">{fit(sub,w-16,9)}</text></g></>);
}
/* ---------- symbols (local px; 2-pin parts: pin0 at 0,0, pin1 at 0,60) ---------- */
export function Ln({x1,y1,x2,y2,c,d,w}){return (<line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c||'currentColor'} strokeWidth={w||2} strokeDasharray={d||null} strokeLinecap="round"/>);}
export function Pole({x,h,cl,c0,c1,brk}){
  const t=h*0.36,b=h*0.64;const end=cl?[x-2,t]:[x-12,t+2];
  return (<><Ln x1={x} y1={0} x2={x} y2={t} c={c0}/><Ln x1={x} y1={b} x2={x} y2={h} c={c1}/>
    <Ln x1={x} y1={b} x2={end[0]} y2={end[1]} c={cl?c1:null}/>
    {brk&&(<><Ln x1={x-4} y1={t-4} x2={x+4} y2={t+4} w={1.6}/><Ln x1={x+4} y1={t-4} x2={x-4} y2={t+4} w={1.6}/></>)}</>);
}
export function Poles({d,s}){
  const cs=s.cs||[];const n=d.n,h=60,cl=s.closed,fam=d.fam,t=h*0.36,b=h*0.64,my=h/2;const out=[];
  for(let i=0;i<n;i++){const x=30*i,c0=cs[i]||'currentColor',c1=cs[n+i]||'currentColor';const isN=d.neu&&i===n-1;
    if(fam==='fu'&&isN)out.push((<g key={i}><Ln x1={x} y1={0} x2={x} y2={60} c={cs[i]||null}/><text x={x+4} y="34" fontSize="9" fill="var(--muted)">N</text></g>));
    else if(fam==='fsd'){out.push((<g key={i}><Pole x={x} h={h} cl={cl} c0={c0} c1={c1}/>{!isN&&(<rect x={x-(cl?5:10)} y="24" width="8" height="14" fill="var(--sheet)" stroke="currentColor" strokeWidth="1.6" transform={`rotate(${cl?4:22} ${x-(cl?1:6)} 31)`}/>)}</g>));}
    else if(fam==='ovl')out.push((<g key={i}><Ln x1={x} y1={0} x2={x} y2={22} c={c0}/><Ln x1={x} y1={38} x2={x} y2={60} c={c1}/><polyline points={`${x},22 ${x+6},22 ${x+6},30 ${x-6},30 ${x-6},38 ${x},38`} fill="none" stroke={s.tripped?'var(--live)':'currentColor'} strokeWidth="1.8"/></g>));
    else if(fam==='fu')out.push((<g key={i}><Ln x1={x} y1={0} x2={x} y2={16} c={c0}/><Ln x1={x} y1={44} x2={x} y2={60} c={c1}/><rect x={x-6} y="16" width="12" height="28" fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={x} y1={16} x2={x} y2={44} w={1.5} c={cs[n+i]||null}/></g>));
    else out.push((<g key={i}><Pole x={x} h={h} cl={cl} c0={c0} c1={c1} brk={fam==='mcb'}/>{fam==='km'&&(<path d={`M ${x} ${t-6} A 6 6 0 0 1 ${x} ${t+6}`} fill="none" stroke="currentColor" strokeWidth="1.6"/>)}</g>));}
  const dx=cl?-1:-6;
  if(fam!=='fu'&&fam!=='ovl'){const x0=d.toggle?-22:dx;if(n>1||d.toggle)out.push((<Ln key="lk" x1={x0} y1={my} x2={30*(n-1)+dx} y2={my} d="3 3" w={1.5}/>));
    if(fam==='rcd')out.push((<g key="ac"><ellipse cx={15*(n-1)} cy={my+18} rx={15*(n-1)+8} ry="5" fill="none" stroke="currentColor" strokeWidth="1.4"/></g>));
    if(fam==='mcb'||fam==='fsd'||fam==='mpcb'||fam==='rcd')out.push((<rect key="ac" x="-30" y={my-6} width="8" height="12" fill="none" stroke="currentColor" strokeWidth="1.6"/>));
    if(fam==='qs')out.push((<g key="ac"><polyline points={`-18,${my-7} -22,${my-7} -22,${my+7}`} fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={-22} y1={my+7} x2={-26} y2={my+3} w={1.5}/></g>));}
  return out;
}
/* actuator glyphs drawn left of the contact, centred on (gx,30) */
export function Glyph({act,gx,s}){
  const p=s.pressed?4:0;
  switch(act){
    case 'pb':return (<polyline points={`${gx+4+p},23 ${gx+p},23 ${gx+p},37 ${gx+4+p},37`} fill="none" stroke="currentColor" strokeWidth="2"/>);
    case 'pbm':return (<path d={`M ${gx} 22 A 8 8 0 0 0 ${gx} 38 Z`} fill="color-mix(in srgb,currentColor 22%,transparent)" stroke="currentColor" strokeWidth="2"/>);
    case 'sel':return (<><polyline points={`${gx+4},23 ${gx},23 ${gx},37`} fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={gx} y1={37} x2={gx-4} y2={33} w={1.5}/></>);
    case 'lim':return (<circle cx={gx-3} cy="30" r="4.5" fill="var(--sheet)" stroke="currentColor" strokeWidth="1.8"/>);
    case 'th':return (<polyline points={`${gx+4},24 ${gx-2},24 ${gx-2},30 ${gx-8},30 ${gx-8},36 ${gx-14},36`} fill="none" stroke={s.tripped?'var(--live)':'currentColor'} strokeWidth="2"/>);
    case 'ind':case 'cap':case 'mag':case 'prs':case 'vac':case 'tst':return (<><rect x={gx-10} y="22" width="14" height="16" fill={s.act?'color-mix(in srgb,var(--accent) 35%,var(--sheet))':'var(--sheet)'} stroke="currentColor" strokeWidth="1.6"/><text x={gx-3} y="34" textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor">{ACTS[act].sensor}</text></>);
    case 'ton':return (<><path d={`M ${gx} 23 A 7 7 0 0 1 ${gx} 37`} fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={gx} y1={23} x2={gx} y2={37}/></>);
    case 'toff':return (<><path d={`M ${gx} 23 A 7 7 0 0 0 ${gx} 37`} fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={gx} y1={23} x2={gx} y2={37}/></>);
    case 'tboth':return (<path d={`M ${gx} 23 A 7 7 0 0 1 ${gx} 37 A 7 7 0 0 1 ${gx} 23`} fill="none" stroke="currentColor" strokeWidth="2"/>);
  }return null;
}
export function Contact({d,s}){
  const cs=s.cs||[];const A=!!s.act;const C=i=>cs[i]||'currentColor';
  const one=(x,isNC,cl,ct,cb)=>{const end=isNC?(cl?[x+9,19]:[x-11,23]):(cl?[x-2,20]:[x-11,21]);
    return (<><Ln x1={x} y1={0} x2={x} y2={20} c={ct}/><Ln x1={x} y1={40} x2={x} y2={60} c={cb}/>{isNC&&(<Ln x1={x} y1={20} x2={x+10} y2={20}/>)}<Ln x1={x} y1={40} x2={end[0]} y2={end[1]} c={cl?cb:null}/></>);};
  const mid=(x,isNC,cl)=>isNC?(cl?x+4:x-5):(cl?x-1:x-5);
  let body,mx;
  if(d.form==='no'||d.form==='nc'){const nc=d.form==='nc',cl=nc?!A:A;body=one(0,nc,cl,C(0),C(1));mx=mid(0,nc,cl);}
  else if(d.form==='pair'){body=(<>{one(0,true,!A,C(0),C(2))}{one(45,false,A,C(1),C(3))}</>);mx=mid(45,false,A);
    body=(<>{body}<Ln x1={mid(0,true,!A)} y1={30} x2={mx} y2={30} d="3 3" w={1.5}/></>);mx=mid(0,true,!A);}
  else{const end=A?[17,41]:[5,39];
    body=(<><Ln x1={0} y1={0} x2={0} y2={20} c={C(0)}/><Ln x1={0} y1={40} x2={0} y2={60} c={C(1)}/><Ln x1={0} y1={40} x2={6} y2={40}/>
      <Ln x1={30} y1={40} x2={30} y2={60} c={C(2)}/><Ln x1={30} y1={40} x2={16} y2={40}/><Ln x1={0} y1={20} x2={end[0]} y2={end[1]} c={cs[0]||null}/></>);mx=A?8.5:2.5;}
  const gx=-22;const hasAct=d.act!=='aux';
  return (<>{body}{hasAct&&(<><Ln x1={gx} y1={30} x2={mx} y2={30} d="3 3" w={1.5}/><Glyph act={d.act} gx={gx} s={s}/></>)}</>);
}
export function Sym({type,s}){
  s=s||{};if(DEFS[type]&&DEFS[type].fam&&DEFS[type].n)return (<Poles d={DEFS[type]} s={s}/>);
  if(DEFS[type]&&DEFS[type].form)return (<Contact d={DEFS[type]} s={s}/>);const cs=s.cs||[];const c0=cs[0]||'currentColor',c1=cs[1]||'currentColor';
  const leads=(t,b)=>(<><Ln x1={0} y1={0} x2={0} y2={t} c={c0}/><Ln x1={0} y1={b} x2={0} y2={60} c={c1}/></>);
  const contact=(isNC,cl)=>{
    const end=isNC?(cl?[9,19]:[-11,23]):(cl?[-2,20]:[-11,21]);
    return (<>{leads(20,40)}{isNC&&(<Ln x1={0} y1={20} x2={10} y2={20}/>)}<Ln x1={0} y1={40} x2={end[0]} y2={end[1]} c={cl?c1:null}/></>);};
  const mid=(isNC,cl)=>isNC?(cl?[4,30]:[-5,31]):(cl?[-1,30]:[-5,31]);
  switch(type){
    case 'L':case 'N':return (<><circle r="5" fill={cs[0]||'currentColor'}/><text y="-11" textAnchor="middle" fontSize="14" fontWeight="600" fill="currentColor">{type}</text></>);
    case 'pe':case 'dcp':case 'dcm':case 'supplyLN':case 'supply3pe':case 'supply3nn':case 'supplyDC':case 'supply3':case 'supply3n':case 'supply':{const lb=DEFS[type].plabels;return (<><Ln x1={-4} y1={-6} x2={(lb.length-1)*30+4} y2={-6} w={1} d="2 3"/>{lb.map((l,i)=>(<g key={l}><circle cx={i*30} r="5" fill={cs[i]||(l==='PE'?'var(--pe)':l==='N'||l==='−'?'var(--neu)':'currentColor')}/><text x={i*30} y="-12" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">{l}</text></g>))}</>);}
    case 'supply_old':return (<><Ln x1={-4} y1={-6} x2={64} y2={-6} w={1} d="2 3"/>{['L','N','PE'].map((l,i)=>(<g key={l}><circle cx={i*30} r="5" fill={cs[i]||(i===2?'var(--pe)':'currentColor')}/><text x={i*30} y="-12" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">{l}</text></g>))}</>);
    case 'breaker2':case 'switch2':{const h=type==='breaker2'?90:105;const cl=s.closed;const brk=type==='breaker2';const my=h/2;const dx=cl?-1:-6;
      return (<><Pole x={0} h={h} cl={cl} c0={cs[0]} c1={cs[2]} brk={brk}/><Pole x={30} h={h} cl={cl} c0={cs[1]} c1={cs[3]} brk={brk}/>
        <Ln x1={-24} y1={my} x2={30+dx} y2={my} d="3 3" w={1.5}/>
        {brk?(<rect x="-30" y={my-6} width="8" height="12" fill="none" stroke="currentColor" strokeWidth="1.6"/>):(<><polyline points={`-20,${my-7} -24,${my-7} -24,${my+7}`} fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={-24} y1={my+7} x2={-28} y2={my+3} w={1.5}/></>)}</>);}
    case 'fuse_old':return (<>{leads(16,44)}<rect x="-6" y="16" width="12" height="28" fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={0} y1={16} x2={0} y2={44} w={1.5} c={c1}/></>);
    case 'no':case 'nc':case 'pb_no':case 'pb_nc':case 'sw':case 'thermal':case 'tno':case 'tnc':{
      const isNC=NC_TYPES.includes(type);const cl=s.closed;const m=mid(isNC,cl);
      const press=s.pressed?4:0;
      let act=null;
      if(type==='pb_no'||type==='pb_nc')act=(<><Ln x1={-22+press} y1={30} x2={m[0]} y2={m[1]} d="3 3" w={1.5}/><polyline points={`${-18+press},23 ${-22+press},23 ${-22+press},37 ${-18+press},37`} fill="none" stroke="currentColor" strokeWidth="2"/></>);
      if(type==='sw')act=(<><Ln x1={-22} y1={30} x2={m[0]} y2={m[1]} d="3 3" w={1.5}/><polyline points="-18,23 -22,23 -22,37" fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={-22} y1={37} x2={-26} y2={33} w={1.5}/></>);
      if(type==='thermal')act=(<><Ln x1={-18} y1={30} x2={m[0]} y2={m[1]} d="3 3" w={1.5}/><polyline points="-18,24 -24,24 -24,30 -30,30 -30,36 -36,36" fill="none" stroke={s.tripped?'var(--live)':'currentColor'} strokeWidth="2"/></>);
      if(type==='tno'||type==='tnc')act=(<><Ln x1={-16} y1={30} x2={m[0]} y2={m[1]} d="3 3" w={1.5}/><path d="M -16 23 A 7 7 0 0 0 -16 37" fill="none" stroke="currentColor" strokeWidth="2"/><Ln x1={-16} y1={23} x2={-16} y2={37} w={2}/></>);
      return (<>{contact(isNC,cl)}{act}</>);}
    case 'coil':return (<>{leads(18,42)}<rect x="-13" y="18" width="26" height="24" fill={s.on?'var(--accent)':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/></>);
    case 'tcoil_off':case 'tcoil_both':case 'tcoil':return (<>{leads(18,42)}<rect x="-13" y="18" width="26" height="24" fill={s.on?'var(--accent)':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/><rect x="-23" y="18" width="10" height="24" fill={s.done?'var(--accent)':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/><Ln x1={-23} y1={18} x2={-13} y2={42} w={1.5}/><Ln x1={-13} y1={18} x2={-23} y2={42} w={1.5}/></>);
    case 'lamp':{const col=LAMP[s.color||'red'];return (<>{leads(18,42)}<circle className="lampglow" cy="30" r="12" fill={s.on?col:'var(--sheet)'} stroke="currentColor" strokeWidth="2" style={s.on?{filter:`drop-shadow(0 0 7px ${col})`}:null}/><Ln x1={-8.5} y1={21.5} x2={8.5} y2={38.5} w={1.5}/><Ln x1={8.5} y1={21.5} x2={-8.5} y2={38.5} w={1.5}/></>);}
    case 'lampf':{const col=LAMP[s.color||'amber'];return (<>{leads(18,42)}<circle className={s.on?'lampglow blink':''} cy="30" r="12" fill={s.on?col:'var(--sheet)'} stroke="currentColor" strokeWidth="2" style={s.on?{filter:`drop-shadow(0 0 7px ${col})`}:null}/><Ln x1={-8.5} y1={21.5} x2={8.5} y2={38.5} w={1.5}/><Ln x1={8.5} y1={21.5} x2={-8.5} y2={38.5} w={1.5}/><polyline points="16,34 16,26 20,26 20,34 24,34" fill="none" stroke="currentColor" strokeWidth="1.4"/></>);}
    case 'bell':case 'buzzer':case 'siren':case 'horn':{
      const body=type==='bell'?(<><path d="M -10 38 A 10 10 0 0 1 10 38 Z" fill={s.on?'color-mix(in srgb,var(--accent) 30%,var(--sheet))':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/><Ln x1={-12} y1={38} x2={12} y2={38}/></>):type==='buzzer'?(<><path d="M -2 20 A 10 10 0 0 1 -2 40" fill={s.on?'color-mix(in srgb,var(--accent) 30%,var(--sheet))':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/><Ln x1={-8} y1={22} x2={-8} y2={38}/></>)
        :type==='siren'?(<path d="M -6 20 L 10 30 L -6 40 Z" fill={s.on?'color-mix(in srgb,var(--accent) 30%,var(--sheet))':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/>)
        :(<><rect x="-8" y="23" width="10" height="14" fill="var(--sheet)" stroke="currentColor" strokeWidth="2"/><path d="M 2 25 L 18 18 L 18 42 L 2 35" fill={s.on?'color-mix(in srgb,var(--accent) 30%,var(--sheet))':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/></>);
      return (<><Ln x1={0} y1={0} x2={0} y2={20} c={c0}/><Ln x1={0} y1={40} x2={0} y2={60} c={c1}/>{body}{s.on&&(<g className="blink" fill="none" stroke="var(--accent)" strokeWidth="1.8"><path d="M 22 24 A 8 8 0 0 1 22 36"/><path d="M 27 20 A 13 13 0 0 1 27 40"/></g>)}</>);}
    case 'valve':return (<>{leads(18,42)}<rect x="-13" y="18" width="26" height="24" fill={s.on?'var(--accent)':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/><Ln x1={-13} y1={42} x2={13} y2={18} w={1.5}/>
      <path d={s.on?'M 18 22 L 30 38 L 30 22 L 18 38 Z':'M 18 22 L 30 30 L 18 38 Z M 30 22 L 30 38'} fill="none" stroke="currentColor" strokeWidth="1.6"/></>);
    case 'motor':return (<>{leads(15,45)}<circle cy="30" r="15" fill={s.on?'color-mix(in srgb,var(--accent) 25%,var(--sheet))':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/><text y="34" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">M</text><text y="43" textAnchor="middle" fontSize="9" fill="currentColor">~</text>{s.on&&(<g><Ln x1={0} y1={17} x2={0} y2={21} c="var(--accent)" w={3}/><animateTransform attributeName="transform" type="rotate" from="0 0 30" to="360 0 30" dur="0.8s" repeatCount="indefinite"/></g>)}</>);
    case 'motor1':{const cx=30,cy=38;return (<><polyline points="0,0 0,16 17,30" fill="none" stroke={c0} strokeWidth="2"/><polyline points="60,0 60,16 43,30" fill="none" stroke={c1} strokeWidth="2"/>
      <polyline points="90,0 90,34" fill="none" stroke="var(--pe)" strokeWidth="2"/><Ln x1={81} y1={34} x2={99} y2={34}/><Ln x1={84} y1={39} x2={96} y2={39}/><Ln x1={87} y1={44} x2={93} y2={44}/>
      <circle cx={cx} cy={cy} r="17" fill={s.on?'color-mix(in srgb,var(--accent) 25%,var(--sheet))':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/><text x={cx} y={cy+3} textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">M</text><text x={cx} y={cy+13} textAnchor="middle" fontSize="9" fill="currentColor">1~</text>
      {s.on&&(<g><Ln x1={cx} y1={cy-15} x2={cx} y2={cy-11} c="var(--accent)" w={3}/><animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="0.8s" repeatCount="indefinite"/></g>)}</>);}
    case 'motor3':{const cx=30,cy=40;return (<><polyline points="0,0 0,16 16,30" fill="none" stroke={c0} strokeWidth="2"/><Ln x1={30} y1={0} x2={30} y2={22} c={cs[1]}/><polyline points="60,0 60,16 44,30" fill="none" stroke={cs[2]||'currentColor'} strokeWidth="2"/>
      <polyline points="90,0 90,34" fill="none" stroke="var(--pe)" strokeWidth="2"/><Ln x1={81} y1={34} x2={99} y2={34}/><Ln x1={84} y1={39} x2={96} y2={39}/><Ln x1={87} y1={44} x2={93} y2={44}/>
      <circle cx={cx} cy={cy} r="18" fill={s.on?'color-mix(in srgb,var(--accent) 25%,var(--sheet))':'var(--sheet)'} stroke="currentColor" strokeWidth="2"/><text x={cx} y={cy+3} textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">M</text><text x={cx} y={cy+13} textAnchor="middle" fontSize="9" fill="currentColor">3~</text>
      {s.on&&(<g><Ln x1={cx} y1={cy-16} x2={cx} y2={cy-12} c="var(--accent)" w={3}/><path d={s.dir>0?`M ${cx+21} ${cy-6} l 4 -6 l 3 7`:`M ${cx-21} ${cy-6} l -4 -6 l -3 7`} fill="none" stroke="var(--accent)" strokeWidth="2"/><animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${s.dir>0?360:-360} ${cx} ${cy}`} dur="0.8s" repeatCount="indefinite"/></g>)}</>);}
    case 'interlock':return (<><Ln x1={0} y1={0} x2={60} y2={0} d="4 3" w={1.5}/><path d="M 22 -12 L 38 -12 L 30 0 Z" fill="none" stroke="currentColor" strokeWidth="1.6"/>
      <text x="0" y="-6" fontSize="11" fontWeight="600" fill="currentColor">{s.tag||''}</text><text x="60" y="-6" textAnchor="end" fontSize="11" fontWeight="600" fill="currentColor">{s.tag2||''}</text></>);
    case 'battery':return (<><Ln x1={15} y1={0} x2={15} y2={18} c={c0}/><Ln x1={3} y1={18} x2={27} y2={18} w={2.4}/><Ln x1={9} y1={26} x2={21} y2={26} w={4}/><Ln x1={15} y1={26} x2={15} y2={45} c={c1}/>
      <text x={30} y={14} fontSize="11" fill="currentColor">+</text><text x={30} y={38} fontSize="11" fill="currentColor">−</text></>);
    case 'raw':if(s.big&&s.cat)return (<Face b={s.big} cat={s.cat} name={s.name||''} sub={`CADe ${s.code}${s.tag?' · '+s.tag:''}`} terms={s.terms||[]}/>);
      if(s.big){const [x,y,w,h]=s.big;return (<><rect x={x} y={y} width={w} height={h} rx="4" fill="color-mix(in srgb,var(--muted) 10%,transparent)" stroke="var(--muted)" strokeDasharray="6 4"/>
      <text x={x+8} y={y+18} fontSize="12" fontWeight="600" fill="currentColor" fontFamily="var(--f-ui)">{s.name||''}</text><text x={x+8} y={y+34} fontSize="10" fill="var(--muted)">CADe {s.code}{s.tag?' · '+s.tag:''}</text></>);}
      if(s.line)return (<Ln x1={0} y1={0} x2={s.line[0]} y2={s.line[1]} c="var(--muted)" w={1.6}/>);return (<><title>{s.cname||''}</title><rect x="-6" y="-2" width="48" height="44" rx="3" fill="color-mix(in srgb,var(--muted) 12%,transparent)" stroke="var(--muted)" strokeDasharray="4 3"/><text x="18" y="20" textAnchor="middle" fontSize="10" fill="var(--muted)">{s.code}</text><text x="18" y="32" textAnchor="middle" fontSize="7.5" fill="var(--muted)" fontFamily="var(--f-ui)">{fit(s.cname||'',44,7.5)}</text></>);
  }return null;
}
export const ICON_VB={battery:'-8 -4 48 54',aux_co:'-30 -2 64 64',fsd3:'-34 -2 108 64',interlock:'-6 -22 72 30',L:'-14 -24 28 32',N:'-14 -24 28 32',supply:'-10 -26 84 36',supply3:'-10 -26 84 36',supply3n:'-10 -26 144 36',motor3:'-8 -4 108 64',km3:'-30 -2 104 64',mcb3:'-34 -2 108 64',fu3:'-10 -2 84 64',qs3:'-30 -2 104 64',breaker2:'-34 -4 74 98',switch2:'-34 -4 74 113',motor1:'-8 -4 108 64'};
export function Icon({type}){
  return (<svg width="26" height="30" viewBox={ICON_VB[type]||'-30 -2 48 64'} aria-hidden="true"><Sym type={type} s={{tag:'KM1',tag2:'KM2',act:false,closed:NC_TYPES.includes(type)||['breaker2','switch2'].includes(type)||DEFS[type].fam==='fu'||DEFS[type].toggle==='off',color:'amber'}}/></svg>);}

export function Preview({type}){const d=DEFS[type];const b=d.box||BOX2;const vb=ICON_VB[type]||`${b.x-6} ${b.y-6} ${b.width+12} ${b.height+12}`;
  return (<div className="preview"><svg viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden="true"><Sym type={type} s={{tag:'KM1',tag2:'KM2',act:false,color:type==='lampf'?'amber':'green',closed:NC_TYPES.includes(type)||['breaker2','switch2'].includes(type)||d.fam==='fu'||d.toggle==='off'}}/></svg></div>);}
export function About({t,lang,type}){const ds=pdesc(lang,type);
  return (<><Preview type={type}/><div className="about-name">{pname(t,type)}</div>{ds&&(<><p className="about">{ds[0]}</p><p className="about sim"><b>{t.inSim}</b> {ds[1]}</p></>)}</>);}
