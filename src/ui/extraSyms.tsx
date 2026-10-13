// @ts-nocheck
/** Drawings of the parts in model/extras.ts (original IEC-style symbols; px = grid × 15). */
import { DEFS } from "../model/parts";

const ink = "currentColor";
const L = ({ x1, y1, x2, y2, c, w = 2, d }) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c || ink} strokeWidth={w} strokeDasharray={d} strokeLinecap="round" />;
const T = (x, y, s, size = 11, anchor = "middle", weight = 600, fill = ink) =>
  <text x={x} y={y} fontSize={size} textAnchor={anchor} fontWeight={weight} fill={fill} stroke="none">{s}</text>;
const hot = "color-mix(in srgb,var(--accent) 28%,var(--sheet))";
const box = (x, y, w, h, on, k?) => <rect key={k} x={x} y={y} width={w} height={h} fill={on ? hot : "var(--sheet)"} stroke={ink} strokeWidth={2} />;
const pinLab = (x, y, s, anchor = "start") => T(x, y, s, 8, anchor, 400, "var(--muted)");

/* a NO contact between (x,0) and (x,60), closed or open */
function no(x, cl, c0, c1, k) {
  return (<g key={k}><L x1={x} y1={0} x2={x} y2={20} c={c0} /><L x1={x} y1={40} x2={x} y2={60} c={c1} />
    <L x1={x} y1={40} x2={cl ? x - 2 : x - 11} y2={cl ? 20 : 21} c={cl ? c1 : null} /></g>);
}
/* coil box between A1 at (x,0) and A2 at (x,60) */
function coil(x, on, c0, c1, inner?) {
  return (<><L x1={x} y1={0} x2={x} y2={20} c={c0} /><L x1={x} y1={40} x2={x} y2={60} c={c1} />{box(x - 12, 20, 24, 20, on)}{inner}</>);
}
function motor(s, cs, opts) {
  const cx = 30, cy = opts.cy ?? 75, r = 45;
  const top = (x) => cy - Math.sqrt(Math.max(0, r * r - (x - cx) ** 2)), bot = (x) => cy + Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
  return (<>
    {opts.top.map(([x, i]) => <L key={"t" + i} x1={x} y1={0} x2={x} y2={top(x)} c={cs[i]} />)}
    {(opts.bot || []).map(([x, i]) => <L key={"b" + i} x1={x} y1={opts.by ?? 120} x2={x} y2={bot(x)} c={cs[i]} />)}
    {opts.pe !== undefined && <polyline points={`${opts.pe},0 ${opts.pe},${cy} ${cx + r},${cy}`} fill="none" stroke="var(--pe)" strokeWidth="2" />}
    <circle cx={cx} cy={cy} r={r} fill={s.on ? "color-mix(in srgb,var(--accent) 22%,var(--sheet))" : "var(--sheet)"} stroke={ink} strokeWidth="2" />
    {T(cx, cy + 4, "M", 22)}{T(cx, cy + 24, opts.sub, 12, "middle", 500)}
    {(opts.labels || []).map(([x, y, t], i) => <g key={"l" + i}>{pinLab(x + 3, y, t)}</g>)}
    {s.on && (<g><L x1={cx} y1={cy - r + 3} x2={cx} y2={cy - r + 11} c="var(--accent)" w={3} />
      <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`${s.dir < 0 ? -360 : 360} ${cx} ${cy}`} dur={s.speed === "2" ? "0.4s" : "0.8s"} repeatCount="indefinite" /></g>)}
  </>);
}
/* rotary switch: common at (0,0), outputs at xs on y=60; pos = index of the closed output (-1: none) */
function rotary(cx, xs, closedIdx, labels, cs, posLabelIdx) {
  const tip = closedIdx >= 0 ? [xs[closedIdx], 40] : [cx, 46];
  const mx = Math.min(...xs, cx);
  return (<>
    <L x1={cx} y1={0} x2={cx} y2={20} c={cs[0]} />
    {xs.map((x, i) => <g key={i}><L x1={x} y1={40} x2={x} y2={60} c={cs[i + 1]} /><circle cx={x} cy={40} r={2.6} fill="var(--sheet)" stroke={ink} strokeWidth={1.4} />
      {T(x + (x < cx ? -8 : x > cx ? 8 : 0), x === cx ? 34 : 38, labels[i + posLabelIdx], 9, "middle", 600, "var(--muted)")}</g>)}
    <circle cx={cx} cy={20} r={2.6} fill={ink} />
    <L x1={cx} y1={20} x2={cx + (tip[0] - cx) * 0.92} y2={tip[1] - 2} c={closedIdx >= 0 ? cs[0] : null} />
    <L x1={cx - 6} y1={30} x2={mx - 18} y2={30} d="3 3" w={1.4} />
    <polyline points={`${mx - 18},24 ${mx - 22},24 ${mx - 22},36`} fill="none" stroke={ink} strokeWidth={1.8} /><L x1={mx - 22} y1={36} x2={mx - 26} y2={32} w={1.4} />
  </>);
}
function gateBox(sym, bubble, nIn, s, cs) { // as CADe SIMU: inputs at x 0, box from 3 to 12 units, output at 15 units in line with the last input
  const ys = nIn === 2 ? [0, 30] : [0], yq = ys[ys.length - 1], h = nIn === 2 ? 60 : 30;
  return (<>
    {ys.map((y, i) => <L key={i} x1={0} y1={y} x2={15} y2={y} c={cs[i]} />)}
    <rect x={15} y={-15} width={45} height={h} fill={s.on ? hot : "color-mix(in srgb,var(--muted) 18%,var(--sheet))"} stroke={ink} strokeWidth={2} />
    {T(30, 2, sym, 12, "middle", 700)}
    {bubble && <circle cx={64} cy={yq} r={4} fill="var(--sheet)" stroke={ink} strokeWidth={1.6} />}
    <L x1={bubble ? 68 : 60} y1={yq} x2={75} y2={yq} c={cs[nIn]} />
  </>);
}

export function ExtraSym({ type, s }) {
  const d = DEFS[type];
  if (!d || !(d.multi || d.drive || d.logic || d.dahl || d.kind === "psu2" || d.kind === "mon" || EXTRA_TYPES.has(type))) return null;
  const cs = s.cs || [], on = !!s.on, pos = +s.pos || 0;
  switch (type) {
    case "sw_i0ii": return rotary(15, [0, 30], pos === 0 ? -1 : pos - 1, d.posLabels, cs, 1);
    case "sw_i3": return rotary(0, [-30, 0, 30], pos, d.posLabels, cs, 0);
    case "sw_cross": { // 1 2 on top, 3 4 below; rest: crossed (1–4, 2–3), switched: straight (1–3, 2–4)
      const st = pos === 1;
      return (<>
        <L x1={0} y1={0} x2={0} y2={20} c={cs[0]} /><L x1={30} y1={0} x2={30} y2={20} c={cs[1]} />
        <L x1={0} y1={40} x2={0} y2={60} c={cs[2]} /><L x1={30} y1={40} x2={30} y2={60} c={cs[3]} />
        {st ? <><L x1={0} y1={20} x2={0} y2={40} /><L x1={30} y1={20} x2={30} y2={40} /></> : <><L x1={0} y1={20} x2={30} y2={40} /><L x1={30} y1={20} x2={0} y2={40} /></>}
        <L x1={-4} y1={30} x2={-22} y2={30} d="3 3" w={1.4} /><polyline points="-22,24 -26,24 -26,36" fill="none" stroke={ink} strokeWidth={1.8} />
        {T(15, -4, st ? "=" : "×", 10, "middle", 700, "var(--muted)")}
      </>);
    }
    case "ssr_dc": case "ssr_ac": { // A1 A2 on top, output 1 2 below (as in CADe SIMU)
      const blade = on ? <L x1={9} y1={42} x2={21} y2={42} /> : <L x1={9} y1={42} x2={20} y2={35} />;
      return (<><L x1={0} y1={0} x2={0} y2={14} c={cs[0]} /><L x1={30} y1={0} x2={30} y2={14} c={cs[1]} />
        <L x1={0} y1={46} x2={0} y2={60} c={cs[2]} /><L x1={30} y1={46} x2={30} y2={60} c={cs[3]} />
        {box(-6, 14, 42, 32, on)}{T(15, 28, "SSR " + (type === "ssr_dc" ? "=" : "~"), 8)}
        <polyline points="0,46 0,42 9,42" fill="none" stroke={ink} strokeWidth={1.4} /><polyline points="21,42 30,42 30,46" fill="none" stroke={ink} strokeWidth={1.4} />{blade}
        {pinLab(3, 10, "A1")}{pinLab(33, 10, "A2")}{pinLab(3, 58, "1")}{pinLab(33, 58, "2")}</>);
    }
    case "relay_spst": return (<>{coil(0, on, cs[0], cs[1])}<L x1={12} y1={30} x2={40} y2={30} d="3 3" w={1.4} />{no(45, on, cs[2], cs[3], "c")}
      {pinLab(3, 10, "A1")}{pinLab(3, 56, "A2")}{pinLab(48, 10, "13")}{pinLab(48, 56, "14")}</>);
    case "relay_spdt": return (<>{coil(0, on, cs[0], cs[1])}<L x1={12} y1={30} x2={48} y2={30} d="3 3" w={1.4} />
      <L x1={45} y1={0} x2={45} y2={20} c={cs[3]} /><L x1={75} y1={0} x2={75} y2={20} c={cs[4]} /><L x1={60} y1={40} x2={60} y2={60} c={cs[2]} />
      <L x1={45} y1={20} x2={51} y2={20} /><L x1={60} y1={40} x2={on ? 74 : 47} y2={on ? 21 : 22} c={cs[2]} />
      {pinLab(3, 10, "A1")}{pinLab(3, 56, "A2")}{pinLab(48, 10, "12")}{pinLab(78, 10, "14")}{pinLab(63, 56, "11")}</>);
    case "ssr3": return (<>{[0, 30, 60].map((x, i) => no(x, on, cs[i], cs[i + 3], i))}
      <L x1={-6} y1={30} x2={78} y2={30} d="3 3" w={1.2} />{coil(90, on, cs[6], cs[7], T(90, 34, "SSR", 8))}</>);
    case "step_relay": return coil(0, on, cs[0], cs[1], <><L x1={-12} y1={26} x2={12} y2={26} w={1.2} /><path d="M -6 36 l 6 -6 l 6 6" fill="none" stroke={ink} strokeWidth={1.4} /></>);
    case "bistable": return (<>
      <L x1={0} y1={0} x2={0} y2={20} c={cs[0]} /><L x1={30} y1={0} x2={30} y2={20} c={cs[1]} /><L x1={0} y1={40} x2={0} y2={60} c={cs[2]} />
      {box(-12, 20, 54, 20, on)}<L x1={15} y1={20} x2={15} y2={40} w={1.2} />{T(0, 34, "S", 10)}{T(30, 34, "R", 10)}
      <L x1={30} y1={40} x2={30} y2={46} w={1.2} /><L x1={30} y1={46} x2={0} y2={46} w={1.2} />{pinLab(3, 10, "A1")}{pinLab(33, 10, "B1")}</>);
    case "flasher": case "pulse_gen": return coil(0, on, cs[0], cs[1],
      <polyline points={type === "flasher" ? "-8,35 -8,26 -2,26 -2,35 4,35 4,26 9,26" : "-8,35 -4,35 -4,26 0,26 0,35 4,35 4,26 8,26 8,35"} fill="none" stroke={ink} strokeWidth={1.3} />);
    case "time_sw": return coil(0, on, cs[0], cs[1], <><circle cx={0} cy={30} r={7} fill="none" stroke={ink} strokeWidth={1.3} /><path d="M 0 25 L 0 30 L 4 32" fill="none" stroke={ink} strokeWidth={1.3} />
      {s.act && <circle cx={14} cy={18} r={3} fill="var(--ok)" />}</>);
    case "pulse_cnt": return (<>
      {[0, 30, 60, 90].map((x, i) => <L key={i} x1={x} y1={0} x2={x} y2={20} c={cs[i]} />)}<L x1={0} y1={40} x2={0} y2={60} c={cs[4]} />
      {box(-12, 20, 114, 20, on)}{T(45, 34, `${s.cnt || 0} / ${s.preset || d.preset}`, 11)}
      {["A1", "C", "D", "R"].map((t, i) => <g key={t}>{pinLab(i * 30 + 3, 10, t)}</g>)}{pinLab(3, 56, "A2")}</>);
    case "ph_loss": case "ph_seq": case "ph_nseq": case "ph_nfault": {
      const n = d.pins.length, w = (n - 1) * 30 + 24;
      return (<>{d.pins.map((p, i) => <L key={i} x1={i * 30} y1={0} x2={i * 30} y2={20} c={cs[i]} />)}
        {box(-12, 20, w, 26, false)}{T(w / 2 - 12, 37, d.seq ? "L1→L2→L3" : d.neu ? "3~ + N" : "3~", 10)}
        <circle cx={w - 18} cy={26} r={3.5} fill={on ? "var(--ok)" : "color-mix(in srgb,var(--muted) 30%,transparent)"} />
        {d.plabels.map((t, i) => <g key={t}>{pinLab(i * 30 + 3, 10, t)}</g>)}</>);
    }
    case "motor_dahl": return motor(s, cs, { top: [[0, 0], [30, 1], [60, 2]], bot: [[0, 4], [30, 5], [60, 6]], pe: 90, cy: 60, sub: "3~ " + (s.speed ? (s.speed === "2" ? "▲▲" : "▲") : "1/2"),
      labels: [[0, 10, "U1"], [30, 10, "V1"], [60, 10, "W1"], [0, 116, "U2"], [30, 116, "V2"], [60, 116, "W2"]] });
    case "motor_rotor": return motor(s, cs, { top: [[0, 0], [30, 1], [60, 2]], bot: [[0, 4], [30, 5], [60, 6]], pe: 90, cy: 60, sub: "3~",
      labels: [[0, 116, "K"], [30, 116, "L"], [60, 116, "M"]] });
    case "motor_3on1": return motor(s, cs, { top: [[0, 0], [30, 1], [60, 2]], pe: 90, sub: "3~ C" });
    case "motor1b": return (<>{motor(s, cs, { top: [[0, 0], [60, 1]], bot: [[0, 3], [60, 4]], by: 135, pe: 90, cy: 60, sub: "1~", labels: [[0, 10, "U1"], [60, 10, "V1"], [0, 131, "U2"], [60, 131, "V2"]] })}
      <L x1={-8} y1={112} x2={8} y2={112} w={1.8} /><L x1={-8} y1={117} x2={8} y2={117} w={1.8} /></>);
    case "motor_dcpm": case "motor_dcsep": { // CADe SIMU: A1 left and A2 right of a small motor on the terminal row, PE below, field F1–F2 above
      const sep = type === "motor_dcsep";
      return (<><L x1={0} y1={0} x2={18} y2={0} c={cs[0]} /><L x1={72} y1={0} x2={90} y2={0} c={cs[1]} /><L x1={45} y1={25} x2={45} y2={45} c="var(--pe)" />
        <rect x={16} y={-6} width={5} height={12} fill={ink} /><rect x={69} y={-6} width={5} height={12} fill={ink} />
        <circle cx={45} cy={0} r={24} fill={on ? "color-mix(in srgb,var(--accent) 22%,var(--sheet))" : "var(--sheet)"} stroke={ink} strokeWidth={2} />
        {T(45, -4, "M", 14)}<L x1={37} y1={6} x2={53} y2={6} w={1.4} /><L x1={37} y1={10} x2={41} y2={10} w={1.4} /><L x1={43} y1={10} x2={47} y2={10} w={1.4} /><L x1={49} y1={10} x2={53} y2={10} w={1.4} />
        {sep ? <><L x1={0} y1={-45} x2={30} y2={-45} c={cs[3]} /><L x1={60} y1={-45} x2={90} y2={-45} c={cs[4]} /><rect x={30} y={-50} width={30} height={10} fill={ink} />{pinLab(0, -50, "F1")}{pinLab(80, -50, "F2")}</>
          : <path d="M 33 -34 L 33 -40 L 57 -40 L 57 -34" fill="none" stroke={ink} strokeWidth={3} />}
        {pinLab(0, 12, "A1")}{pinLab(78, 12, "A2")}{pinLab(48, 44, "PE")}
        {on && <g><L x1={45} y1={-21} x2={45} y2={-14} c="var(--accent)" w={3} /><animateTransform attributeName="transform" type="rotate" from="0 45 0" to={`${s.dir < 0 ? -360 : 360} 45 0`} dur="0.8s" repeatCount="indefinite" /></g>}</>);
    }
    case "brake": return (<><L x1={0} y1={0} x2={0} y2={24} c={cs[0]} /><L x1={30} y1={0} x2={30} y2={24} c={cs[1]} />
      <polyline points="60,0 60,40 44,40" fill="none" stroke="var(--pe)" strokeWidth="2" />{box(-10, 24, 54, 32, on)}{T(17, 45, "FR", 13, "middle", 700)}</>);
    case "psu_v": case "psu_v3": { // in 1 2 (3) on top, + − below, PE at the right side (as in CADe SIMU)
      const three = type === "psu_v3", outs = three ? [15, 45] : [0, 30], w = three ? 88 : 58, pe = three ? 90 : 60, nIn = three ? 3 : 2;
      return (<>{[...Array(nIn)].map((_, i) => <L key={"i" + i} x1={i * 30} y1={0} x2={i * 30} y2={18} c={cs[i]} />)}
        {outs.map((x, i) => <L key={"o" + i} x1={x} y1={72} x2={x} y2={90} c={cs[nIn + i]} />)}
        <L x1={w - 10} y1={45} x2={pe} y2={45} c="var(--pe)" />
        {box(-10, 18, w, 54, on)}<L x1={-10} y1={72} x2={w - 10} y2={18} w={1.2} />{T(4, 38, "~", 15)}{T(w - 26, 64, "=", 15)}
        {[...Array(nIn)].map((_, i) => <g key={"l" + i}>{pinLab(i * 30 + 3, 10, String(i + 1))}</g>)}{pinLab(outs[0] + 3, 86, "+")}{pinLab(outs[1] + 3, 86, "−")}{pinLab(pe - 12, 40, "PE")}</>);
    }
    case "rectifier": // 3 (+) on top, 4 (−) below, AC 1 and 2 left and right
      return (<><L x1={0} y1={0} x2={0} y2={15} c={cs[2]} /><L x1={0} y1={75} x2={0} y2={90} c={cs[3]} />
        <L x1={-45} y1={45} x2={-30} y2={45} c={cs[0]} /><L x1={30} y1={45} x2={45} y2={45} c={cs[1]} />
        <path d="M 0 15 L 30 45 L 0 75 L -30 45 Z" fill={on ? hot : "var(--sheet)"} stroke={ink} strokeWidth={2} />
        <path d="M -8 52 L 8 52 L 0 38 Z" fill={ink} /><L x1={-8} y1={37} x2={8} y2={37} w={2} /><L x1={0} y1={30} x2={0} y2={60} w={1.2} />
        {pinLab(4, 10, "+")}{pinLab(4, 88, "−")}{pinLab(-44, 40, "1")}{pinLab(36, 40, "2")}</>);
    case "trafo": case "trafo3": { // primary on top, secondary 5 grid steps below; windings drawn as bumps on an iron core
      const xs = type === "trafo" ? [0, 45] : [0, 30, 60], n = xs.length;
      const bumps = (y, x0, x1) => { const k = 4, w = (x1 - x0) / k; let d = `M ${x0} ${y}`; for (let i = 0; i < k; i++) d += ` a ${w / 2} ${w / 2} 0 0 ${y < 37 ? 0 : 1} ${w} 0`; return <path d={d} fill="none" stroke={ink} strokeWidth={1.8} />; };
      return (<>{xs.map((x, i) => <L key={"p" + i} x1={x} y1={0} x2={x} y2={26} c={cs[i]} />)}{xs.map((x, i) => <L key={"s" + i} x1={x} y1={49} x2={x} y2={75} c={cs[n + i]} />)}
        {bumps(26, 0, xs[n - 1])}{bumps(49, 0, xs[n - 1])}
        <L x1={-4} y1={35} x2={xs[n - 1] + 4} y2={35} w={2.4} c={on ? "var(--accent)" : null} /><L x1={-4} y1={40} x2={xs[n - 1] + 4} y2={40} w={2.4} c={on ? "var(--accent)" : null} />
        {d.plabels.map((t, i) => <g key={t}>{pinLab(xs[i % n] + 3, i < n ? 10 : 72, t)}</g>)}</>);
    }
    case "bar_tx": return (<><L x1={0} y1={0} x2={0} y2={22} c={cs[0]} /><L x1={0} y1={38} x2={0} y2={60} c={cs[1]} />{box(-8, 22, 16, 16, on)}
      <path d="M 10 26 l 12 0 m -3 -3 l 3 3 l -3 3 M 10 34 l 12 0 m -3 -3 l 3 3 l -3 3" fill="none" stroke={on ? "var(--accent)" : ink} strokeWidth={1.4} /></>);
    case "lg_and": return gateBox("&", false, 2, s, cs);
    case "lg_or": return gateBox("≥1", false, 2, s, cs);
    case "lg_nand": return gateBox("&", true, 2, s, cs);
    case "lg_nor": return gateBox("≥1", true, 2, s, cs);
    case "lg_xor": return gateBox("=1", false, 2, s, cs);
    case "lg_not": return gateBox("1", true, 1, s, cs);
    case "lg_sr": return (<>{gateBox("", false, 2, s, cs)}{T(19, 4, "S", 10, "start")}{T(19, 34, "R", 10, "start")}{T(56, 34, "Q", 10, "end")}</>);
    case "lg_ton": case "lg_toff": return (<>{gateBox("", false, 1, s, cs)}
      <polyline points={type === "lg_ton" ? "22,8 30,8 30,-6 52,-6" : "22,-6 44,-6 44,8 52,8"} fill="none" stroke={ink} strokeWidth={1.3} />{T(37, 12, (s.delay || 1) + "s", 8, "middle", 500)}</>);
  }
  return null;
}
const EXTRA_TYPES = new Set(["ssr_dc", "ssr_ac", "ssr3", "relay_spst", "relay_spdt", "rectifier", "trafo", "trafo3", "psu_v", "psu_v3", "motor_rotor", "motor_3on1", "motor1b", "motor_dcpm", "motor_dcsep", "brake", "bar_tx"]);
