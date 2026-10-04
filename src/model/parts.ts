// @ts-nocheck


export const G=15, W=150, H=110;
export const TWO=[[0,0],[0,4]];
export const C2=[[0,1]];
/* pins: grid offsets · paths: pin pairs joined when the part conducts · src: [L pin, N pin] · load: [pin a, pin b]
   box: local px hit area · lab: tag label offset (px, unrotated) */
export const BOX2={x:-38,y:-4,width:54,height:68};
export const DEFS={
  supply:{group:'supply',pins:[[0,0],[2,0],[4,0]],kind:'src',src:{0:'L1',1:'N'},plabels:['L','N','PE'],prefix:'X',box:{x:-10,y:-24,width:80,height:32},lab:[-14,-12]},
  supply3:{group:'supply',pins:[[0,0],[2,0],[4,0]],kind:'src',src:{0:'L1',1:'L2',2:'L3'},plabels:['L1','L2','L3'],prefix:'X',box:{x:-10,y:-24,width:80,height:32},lab:[-14,-12]},
  supply3n:{group:'supply',pins:[[0,0],[2,0],[4,0],[6,0],[8,0]],kind:'src',src:{0:'L1',1:'L2',2:'L3',3:'N'},plabels:['L1','L2','L3','N','PE'],prefix:'X',box:{x:-10,y:-24,width:140,height:32},lab:[-14,-12]},
  battery:{group:'supply',pins:[[1,0],[1,3]],kind:'src',src:{0:'P',1:'M'},prefix:'G',box:{x:-6,y:-6,width:48,height:57},lab:[28,26]},
  L:{group:'supply',pins:[[0,0]],kind:'src',src:{0:'L1'},box:{x:-12,y:-26,width:24,height:36}},
  N:{group:'supply',pins:[[0,0]],kind:'src',src:{0:'N'},box:{x:-12,y:-26,width:24,height:36}},
  pe:{group:'supply',pins:[[0,0]],kind:'src',src:{},plabels:['PE'],box:{x:-12,y:-26,width:24,height:36}},
  supplyLN:{group:'supply',pins:[[0,0],[2,0]],kind:'src',src:{0:'L1',1:'N'},plabels:['L','N'],prefix:'X',box:{x:-10,y:-24,width:50,height:32},lab:[-14,-12]},
  supply3pe:{group:'supply',pins:[[0,0],[2,0],[4,0],[6,0]],kind:'src',src:{0:'L1',1:'L2',2:'L3'},plabels:['L1','L2','L3','PE'],prefix:'X',box:{x:-10,y:-24,width:110,height:32},lab:[-14,-12]},
  supply3nn:{group:'supply',pins:[[0,0],[2,0],[4,0],[6,0]],kind:'src',src:{0:'L1',1:'L2',2:'L3',3:'N'},plabels:['L1','L2','L3','N'],prefix:'X',box:{x:-10,y:-24,width:110,height:32},lab:[-14,-12]},
  dcp:{group:'supply',pins:[[0,0]],kind:'src',src:{0:'P'},plabels:['+'],box:{x:-12,y:-26,width:24,height:36}},
  dcm:{group:'supply',pins:[[0,0]],kind:'src',src:{0:'M'},plabels:['−'],box:{x:-12,y:-26,width:24,height:36}},
  supplyDC:{group:'supply',pins:[[0,0],[2,0]],kind:'src',src:{0:'P',1:'M'},plabels:['+','−'],prefix:'X',box:{x:-10,y:-24,width:50,height:32},lab:[-14,-12]},
  breaker2:{group:'prot',pins:[[0,0],[2,0],[0,6],[2,6]],kind:'contact',paths:[[0,2],[1,3]],prefix:'F',box:{x:-34,y:-4,width:74,height:98},lab:[40,50],toggle:'off'},
  switch2:{group:'prot',pins:[[0,0],[2,0],[0,7],[2,7]],kind:'contact',paths:[[0,2],[1,3]],prefix:'Q',box:{x:-34,y:-4,width:74,height:113},lab:[40,58],toggle:'off'},
  fuse:{group:'prot',pins:TWO,prefix:'F',kind:'contact',paths:C2,fam:'fu',n:1,lab:[17,34]},
  sw:{group:'ctrl',pins:TWO,prefix:'S',kind:'contact',paths:C2,toggle:'sw',fam:'qs',n:1},
  coil:{group:'relay',pins:TWO,prefix:'KM',kind:'load',load:[0,1]},
  interlock:{group:'relay',pins:[],kind:'mech',prefix:null,box:{x:-8,y:-22,width:76,height:30}},
  tcoil:{group:'timer',pins:TWO,prefix:'KT',kind:'load',load:[0,1]},
  tcoil_off:{group:'timer',pins:TWO,prefix:'KT',kind:'load',load:[0,1]},
  tcoil_both:{group:'timer',pins:TWO,prefix:'KT',kind:'load',load:[0,1]},
  lamp:{group:'load',pins:TWO,prefix:'H',kind:'load',load:[0,1]},
  lampf:{group:'load',pins:TWO,prefix:'H',kind:'load',load:[0,1]},
  buzzer:{group:'load',pins:TWO,prefix:'H',kind:'load',load:[0,1]},
  bell:{group:'load',pins:TWO,prefix:'H',kind:'load',load:[0,1]},
  siren:{group:'load',pins:TWO,prefix:'H',kind:'load',load:[0,1]},
  horn:{group:'load',pins:TWO,prefix:'H',kind:'load',load:[0,1]},
  valve:{group:'load',pins:TWO,prefix:'EV',kind:'load',load:[0,1]},
  motor:{group:'load',pins:TWO,prefix:'M',kind:'load',load:[0,1]},
  motor1:{group:'load',pins:[[0,0],[4,0],[6,0]],prefix:'M',kind:'load',load:[0,1],box:{x:-8,y:-4,width:108,height:68},lab:[52,48]},
  motor3:{group:'load',pins:[[0,0],[2,0],[4,0],[6,0]],prefix:'M',kind:'load',load3:[0,1,2],box:{x:-8,y:-4,width:108,height:68},lab:[52,48]},
  raw:{group:null,pins:[],kind:'raw',box:{x:-10,y:-6,width:56,height:52}},
};
/* contact blocks: actuator (what operates it) x form (NO, NC, NC+NO pair, changeover).
   pair pins: 11,13 top / 12,14 bottom, 3 grid apart. changeover pins: common 11 top-middle, 12 (NC) and 14 (NO) bottom. */
export const ACTS={aux:{group:'relay',link:'coil'},ton:{group:'timer',link:'tcoil',timer:1},toff:{group:'timer',link:'tcoil',timer:1},tboth:{group:'timer',link:'tcoil',timer:1},
  pb:{group:'ctrl',prefix:'S'},pbm:{group:'ctrl',prefix:'S',latch:1},
  ind:{group:'sensor',prefix:'B',latch:1,sensor:'I'},cap:{group:'sensor',prefix:'B',latch:1,sensor:'C'},mag:{group:'sensor',prefix:'B',latch:1,sensor:'M'},
  prs:{group:'sensor',prefix:'B',latch:1,sensor:'P'},vac:{group:'sensor',prefix:'B',latch:1,sensor:'V'},tst:{group:'sensor',prefix:'B',latch:1,sensor:'θ'},sel:{group:'ctrl',prefix:'S',latch:1},lim:{group:'ctrl',prefix:'S',latch:1},th:{group:'prot',prefix:'F'}};
export const FORMS={no:{pins:TWO,paths:[[0,1,'no']]},nc:{pins:TWO,paths:[[0,1,'nc']]},
  pair:{pins:[[0,0],[3,0],[0,4],[3,4]],paths:[[0,2,'nc'],[1,3,'no']],box:{x:-40,y:-4,width:100,height:68},lab:[54,34]},
  co:{pins:[[0,0],[0,4],[2,4]],paths:[[0,1,'nc'],[0,2,'no']],box:{x:-40,y:-4,width:84,height:68},lab:[38,34]}};
export const NAMED={no:['aux','no'],nc:['aux','nc'],tno:['ton','no'],tnc:['ton','nc'],pb_no:['pb','no'],pb_nc:['pb','nc'],thermal:['th','nc']};
export const contactDef=(act,form)=>({...ACTS[act],act,form,kind:'contact',box:{x:-40,y:-4,width:56,height:68},...FORMS[form]});
Object.keys(ACTS).forEach(a=>(ACTS[a].sensor?['no','nc']:Object.keys(FORMS)).forEach(f=>{DEFS[a+'_'+f]=contactDef(a,f);}));
Object.entries(NAMED).forEach(([k,[a,f]])=>{delete DEFS[a+'_'+f];DEFS[k]=contactDef(a,f);});
export const SHOW_CONTACTS=new Set(['ind_no','cap_no','prs_no','tst_no','no','nc','aux_co','tno','tnc','toff_no','toff_nc','pb_no','pb_nc','pbm_nc','sel_no','lim_no','lim_nc','thermal']);
/* multi-pole families: top pins 1,3,5,7 at 2-grid spacing, bottom pins 2,4,6,8 four steps below */
export const FAMS={ovl:{group:'power',prefix:'F',trip:1},mpcb:{group:'power',prefix:'Q',toggle:'off'},rcd:{group:'power',prefix:'F',toggle:'off'},km:{group:'power',prefix:'KM',link:'coil'},fu:{group:'power',prefix:'F'},fsd:{group:'power',prefix:'F',toggle:'off'},mcb:{group:'power',prefix:'Q',toggle:'off'},qs:{group:'power',prefix:'S',toggle:'sw'}};
export function polesDef(fam,n,neu){const pins=[];for(let i=0;i<n;i++)pins.push([2*i,0]);for(let i=0;i<n;i++)pins.push([2*i,4]);
  return {...FAMS[fam],fam,n,kind:'contact',pins,paths:[...Array(n)].map((_,i)=>[i,n+i]),box:{x:-34,y:-4,width:30*(n-1)+52,height:68},lab:[30*(n-1)+14,34],neu:!!neu};}
[1,2,3,4].forEach(n=>{DEFS['km'+n]=polesDef('km',n);DEFS['mcb'+n]=polesDef('mcb',n);if(n>1){DEFS['fu'+n]=polesDef('fu',n);DEFS['qs'+n]=polesDef('qs',n);}if(n<4)DEFS['fsd'+n]=polesDef('fsd',n);});
DEFS.mcb1n=polesDef('mcb',2,true);DEFS.mcb3n=polesDef('mcb',4,true);DEFS.rcd3n=polesDef('rcd',4,true);DEFS.ovl3=polesDef('ovl',3);
[1,3].forEach(n=>{DEFS['mpcb'+n]=polesDef('mpcb',n);DEFS['mpcb'+n+'n']=polesDef('mpcb',n+1,true);});
DEFS.fu1n=polesDef('fu',2,true);DEFS.fu3n=polesDef('fu',4,true);DEFS.fsd1n=polesDef('fsd',2,true);DEFS.fsd3n=polesDef('fsd',4,true);
/* variants offered by the "poles" selector, per family */
export const VARIANTS={mpcb:[['mpcb1','1P'],['mpcb1n','1P+N'],['switch2','2P'],['mpcb3','3P'],['mpcb3n','3P+N']],km:[['km1','1P'],['km2','2P'],['km3','3P'],['km4','4P']],fu:[['fuse','1P'],['fu1n','1P+N'],['fu2','2P'],['fu3','3P'],['fu3n','3P+N']],
  fsd:[['fsd1','1P'],['fsd1n','1P+N'],['fsd2','2P'],['fsd3','3P'],['fsd3n','3P+N']],mcb:[['mcb1','1P'],['mcb1n','1P+N'],['mcb2','2P'],['mcb3','3P'],['mcb3n','3P+N'],['mcb4','4P']],qs:[['sw','1P'],['qs2','2P'],['qs3','3P'],['qs4','4P']]};
export const PALETTE_HIDE=new Set(['mcb1n','mcb3n','mpcb1','mpcb1n','mpcb3n','tcoil_both','bell',...Object.keys(DEFS).filter(k=>DEFS[k].act&&!SHOW_CONTACTS.has(k)),'km1','km2','km4','mcb1','mcb2','mcb4','fu1n','fu2','fu3n','fu4','fsd1','fsd1n','fsd2','fsd3n','qs2','qs4','pe','dcp','dcm','supplyLN','supply3pe','supply3nn']);
export const NC_TYPES=Object.keys(DEFS).filter(k=>DEFS[k].form==='nc');
export const LAMP={red:'#e5483b',green:'#33b35a',amber:'#f2a62a',white:'#f4f1e6',blue:'#3f7ee8'};
