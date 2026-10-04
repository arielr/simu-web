// @ts-nocheck
import { DEFS } from "./parts";

/* c.rot = clockwise quarter turns, same as CADe SIMU's rotation field */
export const rotV=(q,x,y)=>q===1?[-y,x]:q===2?[-x,-y]:q===3?[y,-x]:[x,y];
export function pinPos(c,i){const [lx,ly]=DEFS[c.type].pins[i];const [dx,dy]=rotV(c.rot|0,lx,ly);return [c.x+dx,c.y+dy];}
export const pinsOf=c=>DEFS[c.type].pins.map((_,i)=>pinPos(c,i));
export const key=p=>p[0]+','+p[1];
export const elbow=w=>w.v?[w.a[0],w.b[1]]:[w.b[0],w.a[1]];
export function onSeg(p,s,e){
  if(s[0]===e[0]&&p[0]===s[0])return p[1]>=Math.min(s[1],e[1])&&p[1]<=Math.max(s[1],e[1]);
  if(s[1]===e[1]&&p[1]===s[1])return p[0]>=Math.min(s[0],e[0])&&p[0]<=Math.max(s[0],e[0]);
  return false;
}
export class UF{constructor(m){this.p=new Map(m||[]);}
  f(k){let p=this.p.get(k);if(p===undefined){this.p.set(k,k);return k;}if(p===k)return k;const r=this.f(p);this.p.set(k,r);return r;}
  u(a,b){a=this.f(a);b=this.f(b);if(a!==b)this.p.set(a,b);}}

/* union-find over wires only (corners, T-junctions, pins sitting on a wire) */
export function wireNet(comps,wires){
  const uf=new UF();const segs=[];
  wires.forEach(w=>{const e=elbow(w);uf.u(key(w.a),key(e));uf.u(key(e),key(w.b));segs.push([w.a,e],[e,w.b]);});
  const pts=[];wires.forEach(w=>pts.push(w.a,w.b));comps.forEach(c=>pts.push(...pinsOf(c)));
  pts.forEach(p=>segs.forEach(([s,e])=>{if(onSeg(p,s,e))uf.u(key(p),key(s));}));
  return uf;
}
