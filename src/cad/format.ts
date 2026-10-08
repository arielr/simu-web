// @ts-nocheck

/* ---------- CADe SIMU text format (.cad) ----------
   File = "CADe_SIMU" + records + footer ("$$$..." to end).
   Record: *<id>*<code>#<'#'-separated text fields>*<'*'-separated integers>#<optional trailing text>
   Text fields: [tag, ?, pin labels...]. The last 15 integers are always
   [x, y, x2, y2, labelBox x4, ?, rotation (clockwise quarter turns), ?, ?, ?, net, ?]; flags come before them.
   The header record (code 20000) can sit first or last. Records are kept in file order,
   and anything not understood is written back byte-for-byte.
   Coordinates are CADe units; 3 units = 1 grid step. */
export const CADU=3;
export const L2=['1','2'],L4=['1','3','2','4'],L6=['1','3','5','2','4','6'],L8=['1','3','5','7','2','4','6','8'];
export const CAD_PARTS={
  3000:{type:'L',labels:[],box:[-12,-9,6,3]},
  3001:{type:'N',labels:[],box:[-12,-9,6,3]},
  3002:{type:'pe',labels:[],box:[-12,-9,6,3]},
  3003:{type:'supplyLN',labels:[],box:[-12,-9,12,3]},
  3011:{type:'supply',labels:[],box:[-12,-9,18,3]},
  3004:{type:'supply3',labels:[],box:[-12,-9,18,3]},
  3005:{type:'supply3pe',labels:[],box:[-12,-9,24,3]},
  3006:{type:'supply3nn',labels:[],box:[-12,-9,24,3]},
  3007:{type:'supply3n',labels:[],box:[-12,-9,30,3]},
  3008:{type:'dcp',labels:[],box:[-12,-9,6,3]},
  3009:{type:'dcm',labels:[],box:[-12,-9,6,3]},
  3010:{type:'supplyDC',labels:[],box:[-12,-9,12,3]},
  6000:{type:'mcb1',labels:L2,box:[-21,-3,6,21]},
  6001:{type:'mcb1n',labels:L4,box:[-21,-3,12,21]},
  6002:{type:'mcb2',labels:L4,box:[-21,-3,12,21]},
  6003:{type:'mcb3',labels:L6,box:[-21,-3,18,21]},
  6004:{type:'mcb3n',labels:L8,box:[-21,-3,24,21]},
  6005:{type:'breaker2',labels:L4,box:[-21,-3,12,21]},
  6006:{type:'rcd3n',labels:L8,box:[-21,-3,24,21]},
  6007:{type:'ovl3',labels:L6,box:[-21,-3,18,21]},
  6008:{type:'switch2',labels:L4,box:[-21,-3,12,24]},
  6009:{type:'mpcb3',labels:L6,box:[-21,-3,18,24]},
  6010:{type:'mpcb1',labels:L2,box:[-21,-3,6,24]},
  6011:{type:'mpcb1n',labels:L4,box:[-21,-3,12,24]},
  6012:{type:'mpcb3n',labels:L8,box:[-21,-3,24,24]},
  8000:{type:'pb_no',labels:['13','14'],box:[-18,-3,6,15]},
  8001:{type:'pb_nc',labels:['11','12'],box:[-17,-3,6,15]},
  7000:{type:'no',labels:['13','14'],box:[-12,-3,6,15]},
  9000:{type:'coil',labels:['A1','A2'],box:[-15,-3,9,15]},
  9003:{type:'valve',labels:['A1','A2'],box:[-15,-3,9,15]},
  9004:{type:'tcoil',labels:['A1','A2'],tail:['0','3'],box:[-15,-3,9,15]},
  9005:{type:'tcoil_off',labels:['A1','A2'],tail:['0','3'],box:[-15,-3,9,15]},
  9006:{type:'tcoil_both',labels:['A1','A2'],tail:['0','3','0','3'],box:[-15,-3,9,15]},
  3019:{type:'battery',labels:['+','-'],box:[-3,-9,12,12]},
  9010:{type:'bell',labels:['X1','X2'],box:[-15,-3,9,15]},
  7500:{type:'ind_no',labels:['1','2'],box:[-18,-3,9,15]},7520:{type:'ind_nc',labels:['1','2'],box:[-18,-3,9,15]},
  7506:{type:'cap_no',labels:['1','2'],box:[-18,-3,9,15]},7526:{type:'cap_nc',labels:['1','2'],box:[-18,-3,9,15]},
  7512:{type:'mag_no',labels:['1','2'],box:[-18,-3,9,15]},7532:{type:'mag_nc',labels:['1','2'],box:[-18,-3,9,15]},
  7570:{type:'prs_no',labels:['1','2'],box:[-18,-3,9,15]},7582:{type:'prs_nc',labels:['1','2'],box:[-18,-3,9,15]},
  7576:{type:'vac_no',labels:['1','2'],box:[-18,-3,9,15]},7588:{type:'vac_nc',labels:['1','2'],box:[-18,-3,9,15]},
  7594:{type:'tst_no',labels:['1','2'],box:[-18,-3,9,15]},7600:{type:'tst_nc',labels:['1','2'],box:[-18,-3,9,15]},
  9008:{type:'lamp',labels:['X1','X2'],tail:['0'],box:[-15,-3,9,15]},
  9009:{type:'lampf',labels:['X1','X2'],tail:['0'],box:[-15,-3,9,15]},
  9011:{type:'buzzer',labels:['X1','X2'],box:[-15,-3,9,15]},
  9012:{type:'siren',labels:['X1','X2'],box:[-15,-3,9,15]},
  9013:{type:'horn',labels:['X1','X2'],box:[-15,-3,9,15]},
  2006:{type:'km1',labels:L2,box:[-12,-3,6,15]},
  2000:{type:'km2',labels:L4,box:[-12,-3,12,15]},
  2001:{type:'km3',labels:L6,box:[-12,-3,18,15]},
  2002:{type:'km4',labels:L8,box:[-12,-3,24,15]},
  2007:{type:'sw',labels:L2,box:[-18,-3,6,15]},
  2003:{type:'qs2',labels:L4,box:[-18,-3,12,15]},
  2004:{type:'qs3',labels:L6,box:[-18,-3,18,15]},
  2005:{type:'qs4',labels:L8,box:[-18,-3,24,15]},
  5000:{type:'fuse',labels:L2,box:[-12,-3,6,15]},
  5001:{type:'fu1n',labels:L4,box:[-12,-3,12,15]},
  5002:{type:'fu2',labels:L4,box:[-12,-3,12,15]},
  5003:{type:'fu3',labels:L6,box:[-12,-3,18,15]},
  5004:{type:'fu3n',labels:L8,box:[-12,-3,24,15]},
  5005:{type:'fsd1',labels:L2,box:[-15,-3,6,15]},
  5006:{type:'fsd1n',labels:L4,box:[-15,-3,12,15]},
  5007:{type:'fsd2',labels:L4,box:[-15,-3,12,15]},
  5008:{type:'fsd3',labels:L6,box:[-15,-3,18,15]},
  5009:{type:'fsd3n',labels:L8,box:[-15,-3,24,15]},
  7010:{type:'toff_pair',labels:['55','57','56','58'],box:[-15,-3,15,15]},
  8006:{type:'pbm_pair',labels:['11','13','12','14'],box:[-18,-3,15,15]},
  7001:{type:'nc',labels:['11','12'],box:[-12,-3,6,15]},
  7002:{type:'aux_pair',labels:['11','13','12','14'],box:[-12,-3,15,15]},
  7003:{type:'aux_co',labels:['11','12','14'],box:[-12,-3,12,15]},
  7004:{type:'tno',labels:['67','68'],box:[-15,-3,6,15]},
  7005:{type:'tnc',labels:['55','56'],box:[-15,-3,6,15]},
  7006:{type:'ton_pair',labels:['55','57','56','58'],box:[-15,-3,15,15]},
  7007:{type:'ton_co',labels:['55','56','58'],box:[-15,-3,12,15]},
  7008:{type:'toff_no',labels:['67','68'],box:[-15,-3,6,15]},
  7009:{type:'toff_nc',labels:['55','56'],box:[-15,-3,6,15]},
  7011:{type:'toff_co',labels:['55','56','58'],box:[-15,-3,12,15]},
  7012:{type:'tboth_no',labels:['67','68'],box:[-15,-3,6,15]},
  7013:{type:'tboth_nc',labels:['55','56'],box:[-15,-3,6,15]},
  7014:{type:'tboth_pair',labels:['55','57','56','58'],box:[-15,-3,15,15]},
  7015:{type:'tboth_co',labels:['55','56','58'],box:[-15,-3,12,15]},
  8002:{type:'pb_pair',labels:['11','13','12','14'],box:[-18,-3,15,15]},
  8003:{type:'pb_co',labels:['11','12','14'],box:[-18,-3,12,15]},
  8004:{type:'pbm_no',labels:['13','14'],box:[-18,-3,6,15]},
  8005:{type:'pbm_nc',labels:['11','12'],box:[-18,-3,6,15]},
  8007:{type:'pbm_co',labels:['11','12','14'],box:[-18,-3,12,15]},
  8008:{type:'sel_no',labels:['13','14'],box:[-18,-3,6,15]},
  8009:{type:'sel_nc',labels:['11','12'],box:[-18,-3,6,15]},
  8010:{type:'sel_pair',labels:['11','13','12','14'],box:[-18,-3,15,15]},
  8011:{type:'sel_co',labels:['11','12','14'],box:[-18,-3,12,15]},
  8012:{type:'lim_no',labels:['13','14'],box:[-18,-3,6,15]},
  8013:{type:'lim_nc',labels:['11','12'],box:[-18,-3,6,15]},
  8014:{type:'lim_pair',labels:['11','13','12','14'],box:[-18,-3,15,15]},
  8015:{type:'lim_co',labels:['11','12','14'],box:[-18,-3,12,15]},
  8016:{type:'th_no',labels:['97','98'],box:[-18,-3,6,15]},
  8017:{type:'thermal',labels:['95','96'],box:[-18,-3,6,15]},
  8018:{type:'th_pair',labels:['95','97','96','98'],box:[-18,-3,15,15]},
  8019:{type:'th_co',labels:['95','96','98'],box:[-18,-3,12,15]},
  1000:{type:'motor3',labels:['U1','V1','W1','PE'],box:[-12,-6,24,24]},
  2009:{type:'interlock',labels:[],box:[-6,-6,24,3],extra:{12:1}},
  1002:{type:'motor1',labels:['U1','V1','PE'],box:[-12,-6,24,24]},
};
export const CAD_WIRE={4000:'ph',4009:'n',4010:'pe'};
export const CAD_WIRE_CODE={ph:4000,n:4009,pe:4010};
export const CAD_JUNCTION=4001,CAD_HEADER=20000;
export const TYPE_TO_CAD={};Object.entries(CAD_PARTS).forEach(([code,p])=>{if(!(p.type in TYPE_TO_CAD))TYPE_TO_CAD[p.type]=+code;});
export const CAD_DEFAULT_HEADER='*1*20000#XXX#########*0*0*0*0*0*0*0*0*42*486*0*0*0*0*0*0*0*0*0*0*0*0*0#';
export const CAD_DEFAULT_FOOTER='$$$*1*1*1*2*6*0*0*0*0*  0*  0&&&**          **          **          **          **                        **                        **28-Sep-202**1         **1         *CADe_S1.4            *0*1*1*0*0*0*0*0*0*0*0*0*0*0***$$$&&&';
export const REC=/\*(\d+)\*(-?\d+)#([^*]*)((?:\*-?\d+)+)#([^*$]*)/y;
export const recStr=r=>`*${r.id}*${r.code}#${r.text}${r.nums.map(n=>'*'+n).join('')}#${r.trail}`;
export const XI=r=>r.nums.length-15;

export function parseCad(text){
  if(!text.startsWith('CADe_SIMU'))throw new Error('not a CADe SIMU file');
  const end=text.indexOf('$$$');if(end<0)throw new Error('no footer');
  const body=text.slice(9,end),footer=text.slice(end);
  const items=[];let pos=0;
  while(pos<body.length){REC.lastIndex=pos;const m=REC.exec(body);if(!m)throw new Error('cannot read record at '+pos);
    items.push({id:+m[1],code:+m[2],text:m[3],nums:m[4].split('*').slice(1).map(Number),trail:m[5]});pos=REC.lastIndex;}
  const idCount={};items.forEach(r=>{idCount[r.id]=(idCount[r.id]||0)+1;});
  const comps=[],wires=[];let unknown=0;const g=v=>Math.round(v/CADU);
  const order=items.map((r,i)=>{
    const raw={k:'raw',s:recStr(r)};
    if(r.code===CAD_HEADER)return {k:'header',s:recStr(r)};
    if(r.code===CAD_JUNCTION){const xi=XI(r);return {k:'junction',s:recStr(r),p:[g(r.nums[xi]),g(r.nums[xi+1])]};}
    if(r.code<0)return raw; // sub-record belonging to the previous part
    const xi=XI(r);if(xi<0)return raw;
    const cad={key:i,...r};
    if(CAD_WIRE[r.code]){
      if(idCount[r.id]>1||r.nums.length!==23)return raw; // stray duplicate records: keep as-is, don't draw
      wires.push({id:'w'+i,a:[g(r.nums[xi]),g(r.nums[xi+1])],b:[g(r.nums[xi+2]),g(r.nums[xi+3])],v:false,kind:CAD_WIRE[r.code],cad});return {k:'obj',key:i};}
    const p=CAD_PARTS[r.code];const fields=r.text.split('#');
    const tag=(fields[0]||'').replace(/^-/,'');
    if(p&&r.nums.length===23&&!r.trail){const c={id:'c'+i,type:p.type,x:g(r.nums[xi]),y:g(r.nums[xi+1]),rot:(r.nums[xi+9]|0)&3,tag,cad};
      if(p.type==='interlock')c.tag2=(fields[1]||'').replace(/^-/,'');
      if(/^tcoil/.test(p.type)&&+fields[5]>0)c.delay=+fields[5];
      comps.push(c);}
    else{unknown++;comps.push({id:'c'+i,type:'raw',x:g(r.nums[xi]),y:g(r.nums[xi+1]),rot:(r.nums[xi+9]|0)&3,tag,labels:fields.slice(2).filter(Boolean).length,cad});}
    return {k:'obj',key:i};
  });
  return {comps,wires,cadOrder:order,cadFooter:footer,unknown};
}

/* order: from parseCad (or null for a new drawing). wires: straight segments. dots: junction points. */
export interface WriteCadInput { comps: any[]; wires: any[]; dots: number[][]; order?: any[] | null; footer?: string | null; netOf?: (p: number[]) => number; pinsOf?: (c: any) => number[][] }
export function writeCad({comps,wires,dots,order,footer,netOf,pinsOf}: WriteCadInput){
  const hasNet=!!netOf;netOf=netOf||(()=>0);order=order||[{k:'header',s:CAD_DEFAULT_HEADER}];
  let next=1;
  const allIds=[];order.forEach(o=>{const m=o.s&&/^\*(\d+)\*/.exec(o.s);if(m)allIds.push(+m[1]);});
  [...comps,...wires].forEach(o=>{if(o.cad)allIds.push(o.cad.id);});
  next=Math.max(0,...allIds)+1;
  const byKey={},fresh=[];let skipped=0;
  const partRec=c=>{
    const code=c.type==='raw'?c.cad.code:(c.cad&&CAD_PARTS[c.cad.code]&&CAD_PARTS[c.cad.code].type===c.type?c.cad.code:TYPE_TO_CAD[c.type]);
    if(!code){skipped++;return null;}
    let r;
    if(c.cad&&c.cad.code===code)r={...c.cad,nums:[...c.cad.nums]};
    else{const p=CAD_PARTS[code];const f=['','',...p.labels,...(p.tail||[])];while(f.length<10)f.push('');
      const flags=p.labels.map(()=>1);while(flags.length<8)flags.push(0);
      r={id:next++,code,text:f.join('#'),nums:[...flags,0,0,0,0,...p.box,0,0,0,1,0,0,0],trail:''};
      if(p.extra)Object.entries(p.extra).forEach(([k,v])=>{r.nums[XI(r)+ +k]=v;});}
    const xi=XI(r);
    if(c.type!=='raw'){const f=r.text.split('#');f[0]=c.tag?'-'+c.tag:'';if(c.type==='interlock')f[1]=c.tag2?'-'+c.tag2:'';if(/^tcoil/.test(c.type)&&f.length>5&&String(+c.delay||3)!==f[5])f[5]=String(+c.delay||3);r.text=f.join('#');r.nums[xi+9]=c.rot||0;
      const ps=pinsOf?pinsOf(c):[];const nz=/^(coil|motor|supply)/.test(c.type);
      if(hasNet&&ps.length>=2){r.nums[xi+13]=nz?0:netOf(ps[0]);r.nums[xi+14]=nz?0:netOf(ps[1]);}}
    r.nums[xi]=c.x*CADU;r.nums[xi+1]=c.y*CADU;
    return recStr(r);};
  const wireRec=w=>{const code=CAD_WIRE_CODE[w.kind||'ph'];
    const r=w.cad?{...w.cad,code,nums:[...w.cad.nums]}:{id:next++,code,text:'#########',nums:Array(23).fill(0),trail:''};
    const xi=XI(r);r.nums[xi]=w.a[0]*CADU;r.nums[xi+1]=w.a[1]*CADU;r.nums[xi+2]=w.b[0]*CADU;r.nums[xi+3]=w.b[1]*CADU;if(hasNet||!w.cad)r.nums[xi+13]=netOf(w.a);
    return recStr(r);};
  const usedIds=new Set();
  comps.forEach(c=>{
    // a copied part keeps its record; give the copy a new record number
    if(c.cad&&usedIds.has(c.cad.id))c={...c,cad:{...c.cad,id:next++,key:undefined}};
    if(c.cad)usedIds.add(c.cad.id);
    const s=partRec(c);if(s==null)return;if(c.cad&&c.cad.key!==undefined&&!(c.cad.key in byKey))byKey[c.cad.key]=s;else fresh.push(s);});
  wires.forEach(w=>{if(w.cad&&!(w.cad.key in byKey)){byKey[w.cad.key]=wireRec(w);}else fresh.push(wireRec(w.cad?{...w,cad:null}:w));});
  const kept=new Set(order.filter(o=>o.k==='junction').map(o=>o.p[0]+','+o.p[1]));
  dots.forEach(p=>{if(kept.has(p[0]+','+p[1]))return;const x=p[0]*CADU,y=p[1]*CADU;
    fresh.push(recStr({id:next++,code:CAD_JUNCTION,text:'#########',nums:[0,0,0,0,0,0,0,0,x,y,x,y,-6,-3,3,3,0,0,0,0,0,netOf(p),0],trail:''}));});
  const out=['CADe_SIMU'];
  const hdrLast=order.length>1&&order[order.length-1].k==='header';
  order.forEach((o,i)=>{
    if(hdrLast&&i===order.length-1)out.push(...fresh);
    if(o.k==='header'||o.k==='raw'||o.k==='junction')out.push(o.s);
    else if(o.k==='obj'&&o.key in byKey)out.push(byKey[o.key]);});
  if(!hdrLast)out.push(...fresh);
  out.push(footer||CAD_DEFAULT_FOOTER);
  return {text:out.join(''),skipped};
}
export function latin1(str){const b=new Uint8Array(str.length);for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);b[i]=c<256?c:63;}return b;}
export function crc32(b){let crc=~0;for(let i=0;i<b.length;i++){crc^=b[i];for(let k=0;k<8;k++)crc=(crc>>>1)^(0xEDB88320&-(crc&1));}return ~crc>>>0;}
export function zipOne(name,data){
  const fn=new TextEncoder().encode(name),crc=crc32(data),n=data.length;
  const lh=new DataView(new ArrayBuffer(30));
  lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(12,0x21,true);lh.setUint32(14,crc,true);lh.setUint32(18,n,true);lh.setUint32(22,n,true);lh.setUint16(26,fn.length,true);
  const cd=new DataView(new ArrayBuffer(46));
  cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(14,0x21,true);cd.setUint32(16,crc,true);cd.setUint32(20,n,true);cd.setUint32(24,n,true);cd.setUint16(28,fn.length,true);
  const end=new DataView(new ArrayBuffer(22));
  end.setUint32(0,0x06054b50,true);end.setUint16(8,1,true);end.setUint16(10,1,true);end.setUint32(12,46+fn.length,true);end.setUint32(16,30+fn.length+n,true);
  return new Blob([lh,fn,data,cd,fn,end]);
}
