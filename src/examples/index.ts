// @ts-nocheck
import raw_sample from "./files/sample.cad?raw";
import raw_catalog1 from "./files/catalog1.cad?raw";
import raw_catalog2 from "./files/catalog2.cad?raw";
import raw_catalog3 from "./files/catalog3.cad?raw";
import raw_catalog4 from "./files/catalog4.cad?raw";
import raw_catalog5 from "./files/catalog5.cad?raw";
import raw_test_mcb_rcd from "./files/test-mcb-rcd.cad?raw";
import raw_test_timer_battery from "./files/test-timer-battery.cad?raw";
import { parseCad } from "../cad/format";
import { I18N } from "../i18n/strings";

export const CAD_SAMPLE=raw_sample;
export const CAD_CATALOG=raw_catalog1;
export const CAD_CATALOG2=raw_catalog2;
export const CAD_CATALOG3=raw_catalog3;
export const CAD_CATALOG4=raw_catalog4;
export const CAD_CATALOG5=raw_catalog5;
export const CAD_TEST6=raw_test_mcb_rcd;
export const CAD_TEST7=raw_test_timer_battery;
/* ---------- examples ---------- */
export function timerExample(lang){
  let n=0;const C=(type,x,y,tag,ex)=>({id:'c'+(++n),type,x,y,rot:0,tag,...(ex||{})});
  const Wr=(a,b,kind)=>({id:'w'+(++n),a,b,v:false,kind:kind||'ph'});
  const comps=[C('L',4,4,''),C('N',4,34,''),C('thermal',8,6,'F1'),C('pb_nc',8,11,'S0'),C('pb_no',8,16,'S1'),C('no',12,16,'KM1'),C('coil',8,26,'KM1'),
    C('no',18,8,'KM1'),C('lamp',18,16,'H1',{color:'green'}),C('no',24,8,'KM1'),C('motor',24,16,'M1'),
    C('nc',30,8,'KM1'),C('lamp',30,16,'H2',{color:'red'}),C('no',36,8,'KM1'),C('tcoil',36,16,'KT1',{delay:3}),
    C('tno',42,8,'KT1'),C('lamp',42,16,'H3',{color:'amber'})];
  const wires=[Wr([4,4],[42,4]),Wr([4,34],[42,34],'n'),Wr([8,4],[8,6]),Wr([8,10],[8,11]),Wr([8,15],[8,16]),Wr([8,15],[12,16]),Wr([12,20],[8,20]),Wr([8,20],[8,26]),Wr([8,30],[8,34],'n')];
  [18,24,30,36,42].forEach(x=>wires.push(Wr([x,4],[x,8]),Wr([x,12],[x,16]),Wr([x,20],[x,34],'n')));
  return {name:I18N[lang].exName,comps,wires};
}
export function threePhaseExample(lang){
  let n=0;const C=(type,x,y,tag,ex)=>({id:'c'+(++n),type,x,y,rot:0,tag,...(ex||{})});
  const Wr=(a,b,kind,v)=>({id:'w'+(++n),a,b,v:!!v,kind:kind||'ph'});
  const comps=[C('supply3n',6,4,'X1'),C('fsd3',6,8,'F1'),C('km3',6,16,'KM1'),C('motor3',6,26,'M1'),
    C('pb_nc',22,16,'S0'),C('pb_no',22,21,'S1'),C('no',26,21,'KM1'),C('coil',22,29,'KM1')];
  const wires=[];[6,8,10].forEach(x=>wires.push(Wr([x,4],[x,8]),Wr([x,12],[x,16]),Wr([x,20],[x,26])));
  wires.push(Wr([14,4],[12,26],'pe',true),Wr([6,14],[22,16]),Wr([22,20],[22,21]),Wr([22,20],[26,21]),Wr([26,25],[22,25]),Wr([22,25],[22,29]),
    Wr([12,4],[30,2],'n',true),Wr([30,2],[30,35],'n'),Wr([22,33],[30,35],'n',true));
  return {name:I18N[lang].ex3Name,comps,wires};
}
export function catalogExample(lang){const d=parseCad(CAD_CATALOG);return {name:I18N[lang].exAllName,comps:d.comps,wires:d.wires,cadOrder:d.cadOrder,cadFooter:d.cadFooter};}
export function catalog2Example(lang){const d=parseCad(CAD_CATALOG2);return {name:I18N[lang].exAll2Name,comps:d.comps,wires:d.wires,cadOrder:d.cadOrder,cadFooter:d.cadFooter};}
export function catalog3Example(lang){const d=parseCad(CAD_CATALOG3);return {name:I18N[lang].exAll3Name,comps:d.comps,wires:d.wires,cadOrder:d.cadOrder,cadFooter:d.cadFooter};}
export function catalog4Example(lang){const d=parseCad(CAD_CATALOG4);return {name:I18N[lang].exAll4Name,comps:d.comps,wires:d.wires,cadOrder:d.cadOrder,cadFooter:d.cadFooter};}
export function catalog5Example(lang){const d=parseCad(CAD_CATALOG5);return {name:I18N[lang].exAll5Name,comps:d.comps,wires:d.wires,cadOrder:d.cadOrder,cadFooter:d.cadFooter};}
export function test7Example(lang){const d=parseCad(CAD_TEST7);return {name:I18N[lang].exT7Name,comps:d.comps,wires:d.wires,cadOrder:d.cadOrder,cadFooter:d.cadFooter};}
export function test6Example(lang){const d=parseCad(CAD_TEST6);return {name:I18N[lang].exT6Name,comps:d.comps,wires:d.wires,cadOrder:d.cadOrder,cadFooter:d.cadFooter};}
export function cadExample(lang){const d=parseCad(CAD_SAMPLE);return {name:I18N[lang].exCadName,comps:d.comps,wires:d.wires,cadOrder:d.cadOrder,cadFooter:d.cadFooter};}
