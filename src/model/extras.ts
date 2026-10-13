// @ts-nocheck
/**
 * More CADe SIMU parts: multi-position switches, relays with their own contact, impulse/step relays,
 * flasher and pulse relays, counters, phase monitoring relays, more motors, power supplies and
 * transformers, light barriers and logic gates. Terminal names follow CADe SIMU's records.
 *
 * Behaviour keys read by sim/solve.ts:
 *   multi: n            click cycles positions 0..n-1 (inp.sw[id]); paths with 'pos<k>' conduct in position k
 *   paths 'self'/'selfnc' contacts of the part's own coil (load)
 *   drive: how the part sets coils[tag] (contacts with the same tag follow it):
 *     'step' toggles on each energisation, 'bistable' set/reset coils, 'flash' blinks while powered,
 *     'timesw' on while powered and switched on by a click, 'count' counts pulses up to a preset,
 *     'phase' (phase relays) on while the phases are healthy
 *   logic: digital gate; inputs are high at + (P), the output delivers + while true
 *   pwr + condSrc: supplies that deliver while powered; a condSrc potential starting with '~' is private
 *   to the part (isolated transformer secondary)
 */
const B = (x, y, w, h) => ({ x, y, width: w, height: h });

export const EXTRA_DEFS = {
  /* switches */
  sw_i0ii: { group: 'ctrl', prefix: 'S', kind: 'contact', pins: [[1, 0], [0, 4], [2, 4]], plabels: ['1', '2', '3'], multi: 3, posLabels: ['0', 'I', 'II'],
    paths: [[0, 1, 'pos1'], [0, 2, 'pos2']], box: B(-38, -6, 82, 72), lab: [40, 20] },
  sw_i3: { group: 'ctrl', prefix: 'S', kind: 'contact', pins: [[0, 0], [-2, 4], [0, 4], [2, 4]], plabels: ['1', '2', '3', '4'], multi: 3, posLabels: ['I', 'II', 'III'],
    paths: [[0, 1, 'pos0'], [0, 2, 'pos1'], [0, 3, 'pos2']], box: B(-44, -6, 82, 72), lab: [24, 20] },
  sw_cross: { group: 'ctrl', prefix: 'S', kind: 'contact', pins: [[0, 0], [2, 0], [0, 4], [2, 4]], plabels: ['1', '2', '3', '4'], multi: 2, posLabels: ['×', '='],
    paths: [[0, 3, 'pos0'], [1, 2, 'pos0'], [0, 2, 'pos1'], [1, 3, 'pos1']], box: B(-30, -6, 76, 72), lab: [40, 34] },

  /* relays with their own contact */
  ssr_dc: { group: 'relay', prefix: 'K', kind: 'load', pins: [[0, 0], [2, 0], [0, 4], [2, 4]], plabels: ['A1', 'A2', '1', '2'], load: [0, 1], paths: [[2, 3, 'self']], box: B(-12, -4, 60, 68), lab: [44, 34] },
  ssr_ac: { group: 'relay', prefix: 'K', kind: 'load', pins: [[0, 0], [2, 0], [0, 4], [2, 4]], plabels: ['A1', 'A2', '1', '2'], load: [0, 1], paths: [[2, 3, 'self']], box: B(-12, -4, 60, 68), lab: [44, 34] },
  ssr3: { group: 'power', prefix: 'K', kind: 'load', pins: [[0, 0], [2, 0], [4, 0], [0, 4], [2, 4], [4, 4], [6, 0], [6, 4]], plabels: ['1', '3', '5', '2', '4', '6', 'A1', 'A2'],
    load: [6, 7], paths: [[0, 3, 'self'], [1, 4, 'self'], [2, 5, 'self']], box: B(-14, -4, 122, 68), lab: [104, 34] },
  relay_spst: { group: 'relay', prefix: 'K', kind: 'load', pins: [[0, 0], [0, 4], [3, 0], [3, 4]], plabels: ['A1', 'A2', '13', '14'], load: [0, 1], paths: [[2, 3, 'self']], box: B(-30, -4, 86, 68), lab: [52, 34] },
  relay_spdt: { group: 'relay', prefix: 'K', kind: 'load', pins: [[0, 0], [0, 4], [4, 4], [3, 0], [5, 0]], plabels: ['A1', 'A2', '11', '12', '14'], load: [0, 1],
    paths: [[2, 3, 'selfnc'], [2, 4, 'self']], box: B(-30, -4, 118, 68), lab: [84, 34] },

  /* coils that drive contacts with the same tag */
  step_relay: { group: 'relay', prefix: 'KA', kind: 'load', pins: [[0, 0], [0, 4]], plabels: ['A1', 'A2'], load: [0, 1], drive: 'step', box: B(-36, -4, 72, 68), lab: [22, 34] },
  bistable: { group: 'relay', prefix: 'KA', kind: 'load', pins: [[-1, 0], [1, 0], [0, 4]], plabels: ['A1', 'B1', 'A2'], load: [0, 2], load2: [1, 2], drive: 'bistable', box: B(-36, -4, 72, 68), lab: [24, 34] },
  flasher: { group: 'timer', prefix: 'KF', kind: 'load', pins: [[0, 0], [0, 4]], plabels: ['A1', 'A2'], load: [0, 1], drive: 'flash', period: 1, box: B(-36, -4, 72, 68), lab: [22, 34] },
  pulse_gen: { group: 'timer', prefix: 'KT', kind: 'load', pins: [[0, 0], [0, 4]], plabels: ['A1', 'A2'], load: [0, 1], drive: 'flash', period: 1, box: B(-36, -4, 72, 68), lab: [22, 34] },
  time_sw: { group: 'timer', prefix: 'KH', kind: 'load', pins: [[0, 0], [0, 4]], plabels: ['A1', 'A2'], load: [0, 1], drive: 'timesw', latch: 1, box: B(-36, -4, 72, 68), lab: [22, 34] },
  pulse_cnt: { group: 'timer', prefix: 'KC', kind: 'load', pins: [[0, 0], [2, 0], [3, 0], [4, 0], [2, 4]], plabels: ['A1', 'C', 'D', 'R', 'A2'], load: [0, 4], drive: 'count', preset: 5,
    box: B(-20, -4, 100, 68), lab: [-44, 34] },

  /* phase monitoring relays: their contacts (same tag) close while the supply is healthy */
  ph_loss: { group: 'prot', prefix: 'KP', kind: 'mon', pins: [[0, 0], [2, 0], [4, 0]], plabels: ['L1', 'L2', 'L3'], drive: 'phase', seq: false, neu: false, box: B(-18, -4, 96, 68), lab: [-44, 34] },
  ph_seq: { group: 'prot', prefix: 'KP', kind: 'mon', pins: [[0, 0], [2, 0], [4, 0]], plabels: ['L1', 'L2', 'L3'], drive: 'phase', seq: true, neu: false, box: B(-18, -4, 96, 68), lab: [-44, 34] },
  ph_nseq: { group: 'prot', prefix: 'KP', kind: 'mon', pins: [[0, 0], [2, 0], [4, 0], [0, 4]], plabels: ['L1', 'L2', 'L3', 'N'], drive: 'phase', seq: true, neu: true, box: B(-18, -4, 96, 68), lab: [-44, 34] },
  ph_nfault: { group: 'prot', prefix: 'KP', kind: 'mon', pins: [[0, 0], [2, 0], [4, 0], [0, 4]], plabels: ['L1', 'L2', 'L3', 'N'], drive: 'phase', seq: false, neu: true, box: B(-18, -4, 96, 68), lab: [-44, 34] },

  /* motors */
  motor_dahl: { group: 'load', prefix: 'M', kind: 'load', pins: [[0, 0], [2, 0], [4, 0], [6, 0], [0, 8], [2, 8], [4, 8]], plabels: ['U1', 'V1', 'W1', 'PE', 'U2', 'V2', 'W2'],
    dahl: { a: [0, 1, 2], b: [4, 5, 6] }, box: B(-20, -4, 120, 132), lab: [-46, 64] },
  motor_rotor: { group: 'load', prefix: 'M', kind: 'load', pins: [[0, 0], [2, 0], [4, 0], [6, 0], [0, 8], [2, 8], [4, 8]], plabels: ['U1', 'V1', 'W1', 'PE', 'K', 'L', 'M'],
    load3: [0, 1, 2], box: B(-20, -4, 120, 132), lab: [-46, 64] },
  motor_3on1: { group: 'load', prefix: 'M', kind: 'load', pins: [[0, 0], [2, 0], [4, 0], [6, 0]], plabels: ['U1', 'V1', 'W1', 'PE'], load: [0, 1], box: B(-20, -4, 120, 128), lab: [-46, 80] },
  motor1b: { group: 'load', prefix: 'M', kind: 'load', pins: [[0, 0], [4, 0], [6, 0], [0, 9], [4, 9]], plabels: ['U1', 'V1', 'PE', 'U2', 'V2'], load: [0, 1], box: B(-20, -4, 120, 147), lab: [-46, 64] },
  motor_dcpm: { group: 'load', prefix: 'M', kind: 'load', pins: [[0, 0], [6, 0], [3, 3]], plabels: ['A1', 'A2', 'PE'], load: [0, 1], dc: true, box: B(-6, -30, 102, 82), lab: [-30, 30] },
  motor_dcsep: { group: 'load', prefix: 'M', kind: 'load', pins: [[0, 0], [6, 0], [3, 3], [0, -3], [6, -3]], plabels: ['A1', 'A2', 'PE', 'F1', 'F2'], load: [0, 1], load2: [3, 4], dc: true,
    box: B(-6, -56, 102, 108), lab: [-30, 30] },
  brake: { group: 'load', prefix: 'Fr', kind: 'load', pins: [[0, 0], [2, 0], [4, 0]], plabels: ['U1', 'V1', 'PE'], load: [0, 1], box: B(-14, -4, 88, 72), lab: [72, 40] },

  /* supplies */
  psu_v: { group: 'supply', prefix: 'V', kind: 'psu2', pins: [[0, 0], [2, 0], [0, 6], [2, 6], [4, 3]], plabels: ['1', '2', '3', '4', 'PE'], pwr: [0, 1], condSrc: { 2: 'P', 3: 'M' },
    box: B(-14, -4, 82, 98), lab: [-40, 46] },
  psu_v3: { group: 'supply', prefix: 'V', kind: 'psu2', pins: [[0, 0], [2, 0], [4, 0], [1, 6], [3, 6], [6, 3]], plabels: ['1', '2', '3', '4', '5', 'PE'], pwr: [0, 1], condSrc: { 3: 'P', 4: 'M' },
    box: B(-14, -4, 112, 98), lab: [-40, 46] },
  rectifier: { group: 'supply', prefix: 'V', kind: 'psu2', pins: [[-3, 3], [3, 3], [0, 0], [0, 6]], plabels: ['1', '2', '3', '4'], pwr: [0, 1], condSrc: { 2: 'P', 3: 'M' },
    box: B(-50, -4, 100, 98), lab: [8, 10] },
  trafo: { group: 'supply', prefix: 'T', kind: 'psu2', pins: [[0, 0], [3, 0], [0, 5], [3, 5]], plabels: ['1', '2', '3', '4'], pwr: [0, 1], condSrc: { 2: '~a', 3: '~b' },
    box: B(-10, -4, 66, 84), lab: [-34, 40] },
  trafo3: { group: 'supply', prefix: 'T', kind: 'psu2', pins: [[0, 0], [2, 0], [4, 0], [0, 5], [2, 5], [4, 5]], plabels: ['1', '2', '3', '4', '5', '6'], pwr: [0, 1],
    condSrc: { 3: 'L1', 4: 'L2', 5: 'L3' }, box: B(-10, -4, 82, 84), lab: [-34, 40] },

  /* light barrier emitter (its receivers are the bar_no / bar_nc contacts with the same tag) */
  bar_tx: { group: 'sensor', prefix: 'B', kind: 'load', pins: [[0, 0], [0, 4]], plabels: ['1', '2'], load: [0, 1], drive: 'beam', box: B(-40, -4, 76, 68), lab: [22, 34] },

  /* logic: inputs at + are 1; the output gives + while it is 1 */
  lg_and: { group: 'logic', prefix: 'U', kind: 'logic', pins: [[0, 0], [0, 2], [5, 2]], plabels: ['1', '2', 'Q'], logic: { fn: 'and', ins: [0, 1], out: 2 }, box: B(-4, -20, 84, 70), lab: [16, -20] },
  lg_or: { group: 'logic', prefix: 'U', kind: 'logic', pins: [[0, 0], [0, 2], [5, 2]], plabels: ['1', '2', 'Q'], logic: { fn: 'or', ins: [0, 1], out: 2 }, box: B(-4, -20, 84, 70), lab: [16, -20] },
  lg_nand: { group: 'logic', prefix: 'U', kind: 'logic', pins: [[0, 0], [0, 2], [5, 2]], plabels: ['1', '2', 'Q'], logic: { fn: 'nand', ins: [0, 1], out: 2 }, box: B(-4, -20, 84, 70), lab: [16, -20] },
  lg_nor: { group: 'logic', prefix: 'U', kind: 'logic', pins: [[0, 0], [0, 2], [5, 2]], plabels: ['1', '2', 'Q'], logic: { fn: 'nor', ins: [0, 1], out: 2 }, box: B(-4, -20, 84, 70), lab: [16, -20] },
  lg_xor: { group: 'logic', prefix: 'U', kind: 'logic', pins: [[0, 0], [0, 2], [5, 2]], plabels: ['1', '2', 'Q'], logic: { fn: 'xor', ins: [0, 1], out: 2 }, box: B(-4, -20, 84, 70), lab: [16, -20] },
  lg_not: { group: 'logic', prefix: 'U', kind: 'logic', pins: [[0, 0], [5, 0]], plabels: ['1', 'Q'], logic: { fn: 'not', ins: [0], out: 1 }, box: B(-4, -20, 84, 40), lab: [16, -20] },
  lg_sr: { group: 'logic', prefix: 'U', kind: 'logic', pins: [[0, 0], [0, 2], [5, 2]], plabels: ['S', 'R', 'Q'], logic: { fn: 'sr', ins: [0, 1], out: 2 }, box: B(-4, -20, 84, 70), lab: [16, -20] },
  lg_ton: { group: 'logic', prefix: 'T', kind: 'logic', pins: [[0, 0], [5, 0]], plabels: ['IN', 'Q'], logic: { fn: 'ton', ins: [0], out: 1 }, timed: 1, box: B(-4, -20, 84, 40), lab: [16, -20] },
  lg_toff: { group: 'logic', prefix: 'T', kind: 'logic', pins: [[0, 0], [5, 0]], plabels: ['IN', 'Q'], logic: { fn: 'toff', ins: [0], out: 1 }, timed: 1, box: B(-4, -20, 84, 40), lab: [16, -20] },
};
/* parts whose seconds (period, delay) or preset is set in the panel */
export const TIMED = new Set(['flasher', 'pulse_gen', 'lg_ton', 'lg_toff']);

/* CADe SIMU codes. Terminal names, label boxes and extra fields come from CADe SIMU's own records;
   terminal positions measured in CADe SIMU (VERIFIED below); the others are drawn here and not checked yet. */
export const VERIFIED = new Set([9001, 9002, 9014, 9015, 9016, 9040, 9041, 9042, 9043, 10000, 10010, 10020, 10030, 10040, 10041, 1003, 1004, 1006, 1007, 1008, 1009, 1010, 1070, 1071, 1072, 1074, 1075, 3012, 3013, 3014, 3017, 3018, 7551, 7559, 8020, 8022]);
export const EXTRA_CAD = {
  8020: { type: 'sw_i0ii', labels: ['1', '2', '3'], box: [-18, -3, 12, 15], flags: [1,1,1,0,0,0,0,0] },
  8021: { type: 'sw_i3', labels: ['1', '2', '3', '4'], box: [-18, -3, 12, 15] },
  8022: { type: 'sw_cross', labels: ['1', '2', '3', '4'], box: [-18, -3, 12, 15], flags: [1,1,1,1,0,0,0,0] },
  1070: { type: 'ssr_dc', labels: ['A1', 'A2', '1', '2'], box: [-12, -3, 15, 15], flags: [1,1,1,1,0,0,0,0] },
  1071: { type: 'ssr_ac', labels: ['A1', 'A2', '1', '2'], box: [-12, -3, 15, 15], flags: [1,1,1,1,0,0,0,0] },
  1072: { type: 'ssr3', labels: ['1', '3', '5', '2', '4', '6', 'A1', 'A2'], box: [-12, -3, 27, 15], flags: [1,1,1,1,1,1,1,1] },
  1074: { type: 'relay_spst', labels: ['A1', 'A2', '13', '14'], box: [-15, -3, 15, 15], flags: [1,1,1,1,0,0,0,0] },
  1075: { type: 'relay_spdt', labels: ['A1', 'A2', '12', '11', '14'], box: [-15, -3, 21, 15], flags: [1,1,1,1,1,0,0,0] },
  9001: { type: 'bistable', labels: ['A1', 'B1', 'A2'], box: [-15, -3, 9, 15], flags: [1,1,1,0,0,0,0,0] },
  9002: { type: 'step_relay', labels: ['A1', 'A2'], box: [-15, -3, 9, 15], flags: [1,1,0,0,0,0,0,0] },
  9007: { type: 'flasher', labels: ['A1', 'A2'], box: [-15, -3, 9, 15] },
  9014: { type: 'time_sw', labels: ['A1', 'A2', '0', '0', '0', '0', '0', '0'], box: [-15, -3, 9, 15], flags: [1,1,0,0,0,0,0,0] },
  9015: { type: 'pulse_gen', labels: ['A1', 'A2', '0', '1', '0', '1'], box: [-15, -3, 9, 15], flags: [1,1,0,0,0,0,0,0] },
  9016: { type: 'pulse_cnt', labels: ['A1', 'C', 'D', 'R', '0', '0', 'A2'], box: [-15, -3, 18, 15], flags: [1,1,1,1,0,0,1,0] },
  9040: { type: 'ph_nfault', labels: ['L1', 'L2', 'L3', 'N'], box: [-15, -3, 18, 15], flags: [1,1,1,1,0,0,0,0] },
  9041: { type: 'ph_loss', labels: ['L1', 'L2', 'L3'], box: [-15, -3, 18, 15], flags: [1,1,1,0,0,0,0,0] },
  9042: { type: 'ph_nseq', labels: ['L1', 'L2', 'L3'], box: [-15, -3, 18, 15], flags: [1,1,1,0,0,0,0,0] },
  9043: { type: 'ph_seq', labels: ['L1', 'L2', 'L3'], box: [-15, -3, 18, 15], flags: [1,1,1,0,0,0,0,0] },
  1003: { type: 'motor_dahl', labels: ['U1', 'V1', 'W1', 'PE', 'U2', 'V2', 'W2'], box: [-12, -6, 24, 27], flags: [1,1,1,1,1,1,1,0] },
  1004: { type: 'motor_rotor', labels: ['U1', 'V1', 'W1', 'PE', 'K', 'L', 'M'], box: [-12, -6, 24, 27], flags: [1,1,1,1,1,1,1,0] },
  1006: { type: 'motor_dcpm', labels: ['A1', 'A2', 'PE'], box: [-3, -12, 24, 15], flags: [1,1,1,0,0,0,0,0] },
  1007: { type: 'motor_dcsep', labels: ['A1', 'A2', 'PE', 'F1', 'F2'], box: [-3, -12, 24, 15], flags: [1,1,1,1,1,0,0,0] },
  1008: { type: 'motor1b', labels: ['U1', 'V1', 'PE', 'U2', 'V2'], box: [-12, -6, 24, 30], flags: [1,1,1,1,1,0,0,0] },
  1009: { type: 'brake', labels: ['U1', 'V1', 'PE'], box: [-12, -3, 21, 15], flags: [1,1,1,0,0,0,0,0] },
  1010: { type: 'motor_3on1', labels: ['U1', 'V1', 'W1', 'PE'], box: [-12, -6, 24, 30], flags: [1,1,1,1,0,0,0,0] },
  3012: { type: 'trafo', labels: ['1', '2', '3', '4'], box: [-14, -3, 15, 18], flags: [1,1,1,1,0,0,0,0] },
  3013: { type: 'rectifier', labels: ['1', '2', '3', '4'], box: [-14, -3, 15, 21], flags: [1,1,1,1,0,0,0,0] },
  3014: { type: 'psu_v', labels: ['1', '2', '3', '4', 'PE'], box: [-14, -3, 15, 21], flags: [1,1,1,1,1,0,0,0] },
  3017: { type: 'trafo3', labels: ['1', '2', '3', '4', '5', '6'], box: [-14, -3, 18, 18], flags: [1,1,1,1,1,1,0,0] },
  3018: { type: 'psu_v3', labels: ['1', '2', '3', '4', '5', 'PE'], box: [-14, -3, 21, 21], flags: [1,1,1,1,1,1,0,0] },
  7551: { type: 'bar_tx', labels: ['1', '2'], box: [-18, -3, 9, 15], flags: [1,1,0,0,0,0,0,0] },
  7553: { type: 'bar_no', labels: ['1', '2'], box: [-18, -3, 9, 15] },
  7559: { type: 'bar_nc', labels: ['1', '2'], box: [-18, -3, 9, 15], flags: [1,1,0,0,0,0,0,0] },
  10000: { type: 'lg_and', labels: [], box: [-3, -9, 21, 15], flags: [0,0,0,0,0,0,0,0] },
  10010: { type: 'lg_or', labels: [], box: [-3, -9, 21, 15], flags: [0,0,0,0,0,0,0,0] },
  10020: { type: 'lg_nand', labels: [], box: [-3, -9, 21, 15], flags: [0,0,0,0,0,0,0,0] },
  10030: { type: 'lg_nor', labels: [], box: [-3, -9, 21, 15], flags: [0,0,0,0,0,0,0,0] },
  10040: { type: 'lg_not', labels: [], box: [-3, -9, 21, 9], flags: [0,0,0,0,0,0,0,0] },
  10041: { type: 'lg_xor', labels: [], box: [-3, -9, 21, 15], flags: [0,0,0,0,0,0,0,0] },
  10064: { type: 'lg_sr', labels: ['S', 'R', 'Q'], box: [-3, -9, 21, 15], flags: [0,0,0,0,0,0,0,0] },
  10066: { type: 'lg_ton', labels: ['IN', 'Q', '0', '1'], box: [-3, -9, 21, 15], flags: [0,0,0,0,0,0,0,0] },
  10067: { type: 'lg_toff', labels: ['IN', 'Q', '0', '1'], box: [-3, -9, 21, 15], flags: [0,0,0,0,0,0,0,0] },
};

/* one step of a gate: inputs (booleans), previous output, timer start (ms or undefined) */
export function gate(fn, ins, prev, t0, now, delayMs) {
  const [a, b] = ins;
  switch (fn) {
    case 'and': return { q: a && b };
    case 'or': return { q: a || b };
    case 'nand': return { q: !(a && b) };
    case 'nor': return { q: !(a || b) };
    case 'xor': return { q: a !== b };
    case 'not': return { q: !a };
    case 'sr': return { q: b ? false : a ? true : prev };
    case 'ton': { if (!a) return { q: false }; const t = t0 ?? now; return { q: now - t >= delayMs, t0: t }; }
    case 'toff': { if (a) return { q: true, t0: undefined }; if (!prev && t0 === undefined) return { q: false }; const t = t0 ?? now; return now - t >= delayMs ? { q: false } : { q: true, t0: t }; }
  }
  return { q: false };
}
