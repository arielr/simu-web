/** Strings and language handling shared by all three programs. */
export type Lang = "en" | "he" | "es";
export const LANGS: Lang[] = ["en", "es", "he"];
export const LANG_KEY = "simu-web-lang";

export const COMMON = {
  en: { dir: "ltr" as const, home: "All programs", undo: "Undo", newDoc: "New", file: "File", examples: "Examples", lang: "Language",
    close: "Close", select: "Select", rotate: "Rotate", del: "Delete", search: "Search parts…", zoomIn: "Zoom in", zoomOut: "Zoom out", zoomReset: "Reset zoom",
    name: "Circuit name", autosave: "Saved automatically in this browser",
    newTab: "New tab", closeTabBtn: "Close tab", closeTab: "Close this tab? Its drawing is removed from this browser (save the file first if you need it).", openInTab: "Open in new tab…", untitled: "Untitled",
    programs: { electrical: "Electrical", pneumatic: "Pneumatics", hydraulic: "Hydraulics" } },
  he: { dir: "rtl" as const, home: "כל התוכנות", undo: "בטל", newDoc: "חדש", file: "קובץ", examples: "דוגמאות", lang: "שפה",
    close: "סגור", select: "בחירה", rotate: "סובב", del: "מחק", search: "חיפוש רכיבים…", zoomIn: "הגדל", zoomOut: "הקטן", zoomReset: "איפוס זום",
    name: "שם המעגל", autosave: "נשמר אוטומטית בדפדפן הזה",
    newTab: "לשונית חדשה", closeTabBtn: "סגור לשונית", closeTab: "לסגור את הלשונית? השרטוט שלה יימחק מהדפדפן (שמור קובץ קודם אם צריך).", openInTab: "פתח בלשונית חדשה…", untitled: "ללא שם",
    programs: { electrical: "חשמל", pneumatic: "פנאומטיקה", hydraulic: "הידראוליקה" } },
  es: { dir: "ltr" as const, home: "Todos los programas", undo: "Deshacer", newDoc: "Nuevo", file: "Archivo", examples: "Ejemplos", lang: "Idioma",
    close: "Cerrar", select: "Seleccionar", rotate: "Girar", del: "Borrar", search: "Buscar componentes…", zoomIn: "Acercar", zoomOut: "Alejar", zoomReset: "Restablecer zoom",
    name: "Nombre del circuito", autosave: "Guardado automáticamente en este navegador",
    newTab: "Pestaña nueva", closeTabBtn: "Cerrar pestaña", closeTab: "¿Cerrar esta pestaña? Su esquema se borra de este navegador (guarda antes el archivo si lo necesitas).", openInTab: "Abrir en pestaña nueva…", untitled: "Sin título",
    programs: { electrical: "Electricidad", pneumatic: "Neumática", hydraulic: "Hidráulica" } },
};
export type Common = (typeof COMMON)["en"];

export function readLang(): Lang {
  try { const l = localStorage.getItem(LANG_KEY); if (l === "he" || l === "en" || l === "es") return l; } catch { /* storage blocked */ }
  return "en";
}
export function writeLang(l: Lang) { try { localStorage.setItem(LANG_KEY, l); } catch { /* storage blocked */ } }
