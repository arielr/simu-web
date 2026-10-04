/** Strings and language handling shared by all three programs. */
export type Lang = "en" | "he";
export const LANG_KEY = "simu-web-lang";

export const COMMON = {
  en: { dir: "ltr" as const, home: "All programs", undo: "Undo", newDoc: "New", file: "File", examples: "Examples", lang: "Language",
    close: "Close", select: "Select", rotate: "Rotate", del: "Delete", search: "Search parts…", zoomIn: "Zoom in", zoomOut: "Zoom out", zoomReset: "Reset zoom",
    name: "Circuit name", autosave: "Saved automatically in this browser",
    programs: { electrical: "Electrical", pneumatic: "Pneumatics", hydraulic: "Hydraulics" } },
  he: { dir: "rtl" as const, home: "כל התוכנות", undo: "בטל", newDoc: "חדש", file: "קובץ", examples: "דוגמאות", lang: "שפה",
    close: "סגור", select: "בחירה", rotate: "סובב", del: "מחק", search: "חיפוש רכיבים…", zoomIn: "הגדל", zoomOut: "הקטן", zoomReset: "איפוס זום",
    name: "שם המעגל", autosave: "נשמר אוטומטית בדפדפן הזה",
    programs: { electrical: "חשמל", pneumatic: "פנאומטיקה", hydraulic: "הידראוליקה" } },
};
export type Common = (typeof COMMON)["en"];

export function readLang(): Lang {
  try { const l = localStorage.getItem(LANG_KEY); if (l === "he" || l === "en") return l; } catch { /* storage blocked */ }
  return "en";
}
export function writeLang(l: Lang) { try { localStorage.setItem(LANG_KEY, l); } catch { /* storage blocked */ } }
