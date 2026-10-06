/** Headless simulation loop (same steps as the editor): used by tests and tools. */
import type { FComp, Tube } from "./model";
import { solveFluid, moveCylinders, startSim, activeMarks, SimState } from "./sim";
import { partOf } from "./model";
import { solveElectric, stepElectric, emptyElec, ElecState, ElecResult } from "./elec";

export class Runner {
  sim: SimState;
  hyd: boolean;
  el: ElecState = emptyElec();
  t = 0;
  last: { el: ElecResult; dir: Record<string, number>; pos: Record<string, number> } | null = null;
  constructor(public comps: FComp[], public tubes: Tube[]) {
    this.sim = startSim(comps);
    this.hyd = comps.some((c) => partOf(c)?.ports.some((p) => p.kind === "HConnection"));
  }
  step(dt = 0.05) {
    this.t += dt * 1000;
    const er = solveElectric(this.comps, this.tubes, this.sim.act, activeMarks(this.comps, this.sim.ext), this.el, this.t);
    this.el = stepElectric(this.comps, er, this.el, this.t);
    const fr = solveFluid(this.comps, this.tubes, this.sim, er.solenoids);
    const s1 = { ...this.sim, pos: { ...this.sim.pos, ...fr.pos } };
    const m = moveCylinders(this.comps, s1, fr, dt, this.hyd);
    this.sim = { ...s1, ext: m.ext, vel: m.vel, force: m.force };
    this.last = { el: er, dir: fr.dir, pos: fr.pos };
    return this;
  }
  run(seconds: number, dt = 0.05) { for (let i = 0; i < seconds / dt; i++) this.step(dt); return this; }
  /** toggle a selector switch */
  toggle(id: string) { return this.press(id, !this.sim.act[id]); }
  press(id: string, on = true) { this.sim = { ...this.sim, act: { ...this.sim.act, [id]: on } }; return this; }
}
