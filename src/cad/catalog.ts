// @ts-nocheck
import catalogNames from "./catalog.json";


/* display names for CADe SIMU parts that are kept but not simulated */
export const CAD_CATALOG_NAMES=catalogNames as Record<string,string>;
export const RAW_NAMES={10200:'INPUT table I0.0–I0.7',10201:'OUTPUT table Q0.0–Q0.7',10202:'LOGO! 8 base module',10214:'LOGO! expansion module',10203:'S7-1200 CPU 1214C AC/DC/RLY',
  10215:'S7-1200 SM 1223 DI/DQ',10210:'PLC I/O module I0.0–I1.7 / Q0.0–Q1.7',10212:'ET 200SP module',10213:'ET 200SP module',10204:'PLC digital input',10205:'PLC digital output',
  10206:'PLC CPU supply',10207:'PLC 1M terminal',10208:'PLC 1L terminal',10220:'Arduino UNO',
  1001:'Motor 3~ 6 terminals (star/delta)',6017:'Circuit breaker 3P+N (photo)',6018:'Residual-current device 3P+N (photo)',6015:'Motor protection breaker (photo)',
  6016:'Thermal overload relay (photo)',6019:'Rotary switch ON/OFF (photo)',6020:'Main isolator switch (photo)',7018:'Contactor 3P + aux (photo)',
  7019:'Auxiliary contact block (photo)',7020:'Timer block (photo)',7021:'Timer block (photo)',7016:'Plug-in relay with socket (photo)',
  7017:'Plug-in timer relay with socket (photo)',1076:'Relay module (photo)',8100:'Push button (photo)',8101:'Pilot lamp (photo)',8103:'LED (photo)',
  8102:'Control box: 4 lamps + 4 buttons (photo)',4011:'Terminal (photo)'};
/* front-panel style for parts CADe SIMU draws as photos or devices */
export const RAW_CAT={1001:'motor',6017:'mcb',6018:'rcd',6015:'mpb',6016:'ovl',6019:'rotary',6020:'isolator',7018:'contactor',7019:'aux',7020:'dial',7021:'dial',7016:'relay',7017:'dial',
  1076:'module',8100:'button',8101:'lamp',8103:'led',8102:'box',4011:'terminal',10202:'plc',10214:'plc',10203:'plc',10215:'plc',10210:'io',10212:'io',10213:'io',10220:'board',10200:'table',10201:'table'};
export function rawTerminals(text){const f=text.split('#').slice(2);const out=[];for(const l of f){if(!l||l==='0')break;out.push(l.trim());}return out;}
