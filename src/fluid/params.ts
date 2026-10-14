/**
 * Editable component parameters, after the property dialogs of FluidSIM (fl_sim_p.res):
 * Drosselventil "Öffnungsgrad", Druckschalter "Schaltdruck", DBV/Druckregler "Solldruck",
 * Rückschlagventil "Vorspanndruck", Relais mit Verzögerung "Verzögerungszeit",
 * Zählrelais "Zählerwert", Lampe "Signalfarbe", Zeitschaltuhr, Merker "Initialzustand", …
 * Keys are the property names FluidSIM writes in .ct files, so edited values go back out unchanged.
 */
import type { Lang } from "../shared/i18n";

export interface Param {
  en: string; he: string; es: string; de: string;
  unit?: string | ((hyd: boolean) => string);
  min?: number; max?: number; step?: number; int?: boolean;
  /** fixed choices: [value, en, he, es] */
  choices?: [string, string, string, string][];
  text?: boolean;
}

/** Windows colour values (0x00BBGGRR) used by FluidSIM's signal colours */
export const SIG_COLORS: [string, string, string, string][] = [
  ["65535", "Yellow", "צהוב", "Amarillo"],
  ["255", "Red", "אדום", "Rojo"],
  ["65280", "Green", "ירוק", "Verde"],
  ["16711680", "Blue", "כחול", "Azul"],
  ["33023", "Orange", "כתום", "Naranja"],
  ["16777215", "White", "לבן", "Blanco"],
];
/** css colour of a FluidSIM colour value */
export function colorOf(v: string | undefined, fallback = "#ffd84a"): string {
  const n = parseInt(v || "", 10);
  if (!(n >= 0)) return fallback;
  const r = n & 255, g = (n >> 8) & 255, b = (n >> 16) & 255;
  return `rgb(${r},${g},${b})`;
}

const flowUnit = (hyd: boolean) => (hyd ? "" : "l/min");

export const PARAMS: Record<string, Param> = {
  label: { en: "Label", he: "תווית", es: "Etiqueta", de: "Marke", text: true },
  LEVEL: { en: "Opening", he: "פתיחה", es: "Apertura", de: "Öffnungsgrad", unit: "%", min: 0, max: 100, step: 5 },
  DELAY_TIME: { en: "Delay time", he: "זמן השהיה", es: "Tiempo de retardo", de: "Verzögerungszeit", unit: "s", min: 0, max: 100, step: 0.1 },
  N: { en: "Counter value", he: "ערך מונה", es: "Valor del contador", de: "Zählerwert", min: 0, max: 9999, step: 1, int: true },
  P_SOLL: { en: "Set pressure", he: "לחץ מכוון", es: "Presión de consigna", de: "Solldruck", unit: "bar", min: 0, max: 400, step: 0.1 },
  PNOM: { en: "Set pressure", he: "לחץ מכוון", es: "Presión de consigna", de: "Solldruck", unit: "bar", min: 0, max: 400, step: 0.1 },
  PNOM_MIN: { en: "Minimum pressure", he: "לחץ מינימלי", es: "Presión mínima", de: "Minimaldruck", unit: "bar", min: 0, max: 400, step: 0.1 },
  PNOM_MAX: { en: "Maximum pressure", he: "לחץ מקסימלי", es: "Presión máxima", de: "Maximaldruck", unit: "bar", min: 0, max: 400, step: 0.1 },
  P_V: { en: "Opening pressure", he: "לחץ פתיחה", es: "Presión de apertura", de: "Vorspanndruck", unit: "bar", min: 0, max: 200, step: 0.1 },
  P_LIM: { en: "Operating pressure", he: "לחץ עבודה", es: "Presión de trabajo", de: "Betriebsdruck", unit: "bar", min: 0, max: 400, step: 0.1 },
  PMAX: { en: "Maximum pressure", he: "לחץ מקסימלי", es: "Presión máxima", de: "Maximaldruck", unit: "bar", min: 0, max: 400, step: 0.1 },
  PMIN: { en: "Minimum pressure", he: "לחץ מינימלי", es: "Presión mínima", de: "Minimaldruck", unit: "bar", min: 0, max: 400, step: 0.1 },
  FLOW: { en: "Delivery", he: "ספיקה", es: "Caudal", de: "Förderleistung", unit: "l/min", min: 0, max: 5000, step: 0.1 },
  Q_SOLL: { en: "Set flow", he: "ספיקה מכוונת", es: "Caudal de consigna", de: "Solldurchfluss", unit: "l/min", min: 0, max: 5000, step: 0.1 },
  FLOW_SOLL: { en: "Set flow", he: "ספיקה מכוונת", es: "Caudal de consigna", de: "Solldurchfluss", unit: "l/min", min: 0, max: 5000, step: 0.1 },
  NN_FLOW: { en: "Standard nominal flow", he: "ספיקה נומינלית", es: "Caudal nominal", de: "Normal-Nenndurchfluss", unit: flowUnit, min: 0, step: 0.01 },
  TH: { en: "On time", he: "זמן פעולה", es: "Tiempo encendido", de: "Einschalten nach", unit: "s", min: 0, step: 0.1 },
  TL: { en: "Off time", he: "זמן הפסקה", es: "Tiempo apagado", de: "Ausschalten nach", unit: "s", min: 0, step: 0.1 },
  VOL: { en: "Volume", he: "נפח", es: "Volumen", de: "Volumen", unit: "l", min: 0, step: 0.1 },
  RPM: { en: "Speed", he: "מהירות סיבוב", es: "Velocidad", de: "Drehzahl", unit: "1/min", min: 0, step: 10 },
  DISPLACEMENT: { en: "Displacement", he: "נפח סבב", es: "Cilindrada", de: "Fördervolumen", unit: "cm³", min: 0, step: 0.1 },
  M_EXT: { en: "Load torque", he: "מומנט עומס", es: "Par de carga", de: "Lastmoment", unit: "Nm", step: 0.1 },
  sig_color: { en: "Signal colour", he: "צבע אות", es: "Color de señal", de: "Signalfarbe", choices: SIG_COLORS },
  INIT: { en: "Initial state", he: "מצב התחלתי", es: "Estado inicial", de: "Initialzustand", choices: [["0", "Off", "כבוי", "Apagado"], ["1", "On", "פועל", "Encendido"]] },
};

export function paramName(k: string, lang: Lang): string {
  const p = PARAMS[k]; return p ? p[lang] : k;
}
export function paramUnit(k: string, hyd: boolean): string {
  const u = PARAMS[k]?.unit; return typeof u === "function" ? u(hyd) : u || "";
}
/** the value clamped to the dialog's range, written back as FluidSIM writes numbers */
export function cleanParam(k: string, raw: string): string | null {
  const p = PARAMS[k]; if (!p) return null;
  if (p.text || p.choices) return raw;
  let n = parseFloat(raw.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  if (p.min !== undefined) n = Math.max(p.min, n);
  if (p.max !== undefined) n = Math.min(p.max, n);
  if (p.int) n = Math.round(n);
  return String(+n.toFixed(6));
}

/** throttles: both directions (drossel, adjustable orifice) and one-way flow controls */
export const THROTTLE2 = /^(drossel|DV_P1|OrificeVariable[PH])$/;
export const THROTTLE1 = /^(drorueck|DRSV\d*)$/;
