// @ts-nocheck
/**
 * Parts list grouped and ordered like CADe SIMU's own toolbars (read from its resources):
 * Alimentaciones, Fusibles/Seccionadores, Automáticos/Diferenciales/Relés térmicos/Disyuntores,
 * Contactores/Interruptores, Motores, Contactos auxiliares/temporizados, Accionamientos, Detectores,
 * Bobinas/Señalizaciones, Relés electrónicos, Lógica, Entrada/Salida, Cables y Conexiones.
 * Parts that CADe SIMU does not have go at the end of the nearest group.
 */
import { DEFS } from "./parts";

const forms = (a) => ["no", "nc", "pair", "co"].map((f) => a + "_" + f);
export const CADE_GROUPS: [string, string[]][] = [
  ["supply", ["L", "N", "pe", "supplyLN", "supply", "supply3", "supply3pe", "supply3nn", "supply3n", "dcp", "dcm", "supplyDC",
    "trafo", "trafo3", "rectifier", "psu_v", "psu_v3", "battery"]],
  ["fuse", ["fuse", "fu1n", "fu2", "fu3", "fu3n", "fsd1", "fsd1n", "fsd2", "fsd3", "fsd3n"]],
  ["breaker", ["mcb1", "mcb1n", "mcb2", "mcb3", "mcb3n", "mcb4", "breaker2", "rcd3n", "ovl3", "mpcb1", "mpcb1n", "switch2", "mpcb3", "mpcb3n"]],
  ["contactor", ["km1", "km2", "km3", "km4", "sw", "qs2", "qs3", "qs4", "interlock", "ssr3"]],
  ["motor", ["motor3", "motor6", "motor1", "motor1b", "motor_3on1", "motor_dahl", "motor_rotor", "motor_dcpm", "motor_dcsep", "brake", "motor"]],
  ["contact", ["no", "nc", "aux_pair", "aux_co", "tno", "tnc", "ton_pair", "ton_co", ...forms("toff"), ...forms("tboth")]],
  ["actuator", ["pb_no", "pb_nc", "pb_pair", "pb_co", ...forms("pbm"), ...forms("sel"), "sw_i0ii", "sw_i3", "sw_cross", ...forms("lim"),
    "th_no", "thermal", "th_pair", "th_co"]],
  ["sensor", ["ind_no", "ind_nc", "cap_no", "cap_nc", "mag_no", "mag_nc", "bar_tx", "bar_no", "bar_nc", "prs_no", "prs_nc", "vac_no", "vac_nc", "tst_no", "tst_nc"]],
  ["coil", ["coil", "bistable", "step_relay", "valve", "tcoil", "tcoil_off", "tcoil_both", "flasher", "pulse_gen", "time_sw", "pulse_cnt",
    "lamp", "lampf", "bell", "buzzer", "siren", "horn"]],
  ["erelay", ["ssr_dc", "ssr_ac", "ph_nfault", "ph_loss", "ph_nseq", "ph_seq", "relay_spst", "relay_spdt"]],
  ["logic", ["lg_and", "lg_or", "lg_not", "lg_xor", "lg_nand", "lg_nor", "lg_sr", "lg_ton", "lg_toff"]],
  ["io", ["plc_m221", "plc_m241", "plc_s7200", "plc_s71214", "plc_c24", "psu24"]],
];
/* where a part not listed above goes, by its old group */
const FALLBACK = { supply: "supply", prot: "breaker", power: "contactor", ctrl: "actuator", relay: "coil", timer: "coil", load: "coil", sensor: "sensor", logic: "logic", plc: "io" };

/** [group id, part keys in order] for the parts list */
export function paletteGroups(): [string, string[]][] {
  const seen = new Set<string>();
  const out = CADE_GROUPS.map(([g, ks]) => [g, ks.filter((k) => DEFS[k] && !seen.has(k) && seen.add(k))] as [string, string[]]);
  Object.keys(DEFS).forEach((k) => {
    const d = DEFS[k];
    if (seen.has(k) || !d.group) return;
    const g = FALLBACK[d.group] || "coil";
    out.find(([id]) => id === g)![1].push(k);
  });
  return out;
}
