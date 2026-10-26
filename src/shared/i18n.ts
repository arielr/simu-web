/** Strings and language handling shared by all three programs. */
export type Lang = "en" | "he" | "es";
export const LANGS: Lang[] = ["en", "es", "he"];
export const LANG_KEY = "simu-web-lang";

export const COMMON = {
  en: { dir: "ltr" as const, home: "All programs", undo: "Undo", newDoc: "New", file: "File", examples: "Examples", lang: "Language",
    close: "Close", select: "Select", rotate: "Rotate", del: "Delete", search: "Search parts…", zoomIn: "Zoom in", zoomOut: "Zoom out", zoomReset: "Reset zoom",
    name: "Circuit name", autosave: "Saved automatically in this browser",
    open:"Open", saveDlg:"Save", menuSave:"Save…", menuClose:"Close", moreMenu:"Tab menu", fromComputer:"From this computer", fromBrowser:"From this browser", fromDrive:"From Google Drive", toComputer:"To this computer", toBrowser:"In this browser", toDrive:"To Google Drive", chooseFiles:"Choose files…", formatLabel:"Format", nothingStored:"Nothing is saved in this browser yet.", storedOpenTag:"open", savedAt:(d: string)=>`saved ${d}`, countOf:(p: number, w: number)=>`${p} parts · ${w} wires`, driveOff:"Google Drive is not set up in this copy of the app.", driveSignIn:"Sign in and list my Drive files", driveEmpty:"No drawings saved to Drive by this app yet.", savedMsg:"Saved.", saveFail:"Could not save.", openFail:"Could not open.", nothingToSave:"Open a drawing to save it.",
    closeTabTitle: "Close tab", closeTabAsk: (n: string) => `Save “${n}” before closing it?`, saveAndClose: "Save…", closeWithout: "Close without saving", keepOpen: "Keep open",
    newTab: "New tab", closeTabBtn: "Close tab", closeTab: "Close this tab? Its drawing is removed from this browser (save the file first if you need it).", openInTab: "Open in new tab…", untitled: "Untitled",
    programs: { electrical: "Electrical", pneumatic: "Pneumatics", hydraulic: "Hydraulics" } },
  he: { dir: "rtl" as const, home: "כל התוכנות", undo: "בטל", newDoc: "חדש", file: "קובץ", examples: "דוגמאות", lang: "שפה",
    close: "סגור", select: "בחירה", rotate: "סובב", del: "מחק", search: "חיפוש רכיבים…", zoomIn: "הגדל", zoomOut: "הקטן", zoomReset: "איפוס זום",
    name: "שם המעגל", autosave: "נשמר אוטומטית בדפדפן הזה",
    open:"פתיחה", saveDlg:"שמירה", menuSave:"שמירה…", menuClose:"סגירה", moreMenu:"תפריט הלשונית", fromComputer:"מהמחשב", fromBrowser:"מהדפדפן", fromDrive:"מ-Google Drive", toComputer:"למחשב", toBrowser:"בדפדפן", toDrive:"ל-Google Drive", chooseFiles:"בחירת קבצים…", formatLabel:"פורמט", nothingStored:"עדיין אין שום דבר שמור בדפדפן.", storedOpenTag:"פתוח", savedAt:(d: string)=>`נשמר ${d}`, countOf:(p: number, w: number)=>`${p} רכיבים · ${w} חוטים`, driveOff:"Google Drive לא הוגדר בעותק הזה של האפליקציה.", driveSignIn:"התחברות ורשימת הקבצים שלי", driveEmpty:"עדיין לא נשמרו שרטוטים ב-Drive מהאפליקציה.", savedMsg:"נשמר.", saveFail:"לא ניתן לשמור.", openFail:"לא ניתן לפתוח.", nothingToSave:"פתחו שרטוט כדי לשמור אותו.",
    closeTabTitle: "סגירת לשונית", closeTabAsk: (n: string) => `לשמור את “${n}” לפני הסגירה?`, saveAndClose: "שמירה…", closeWithout: "סגור בלי לשמור", keepOpen: "השאר פתוח",
    newTab: "לשונית חדשה", closeTabBtn: "סגור לשונית", closeTab: "לסגור את הלשונית? השרטוט שלה יימחק מהדפדפן (שמור קובץ קודם אם צריך).", openInTab: "פתח בלשונית חדשה…", untitled: "ללא שם",
    programs: { electrical: "חשמל", pneumatic: "פנאומטיקה", hydraulic: "הידראוליקה" } },
  es: { dir: "ltr" as const, home: "Todos los programas", undo: "Deshacer", newDoc: "Nuevo", file: "Archivo", examples: "Ejemplos", lang: "Idioma",
    close: "Cerrar", select: "Seleccionar", rotate: "Girar", del: "Borrar", search: "Buscar componentes…", zoomIn: "Acercar", zoomOut: "Alejar", zoomReset: "Restablecer zoom",
    name: "Nombre del circuito", autosave: "Guardado automáticamente en este navegador",
    open:"Abrir", saveDlg:"Guardar", menuSave:"Guardar…", menuClose:"Cerrar", moreMenu:"Menú de la pestaña", fromComputer:"Desde este equipo", fromBrowser:"Desde este navegador", fromDrive:"Desde Google Drive", toComputer:"Al equipo", toBrowser:"En este navegador", toDrive:"A Google Drive", chooseFiles:"Elegir archivos…", formatLabel:"Formato", nothingStored:"Todavía no hay nada guardado en este navegador.", storedOpenTag:"abierto", savedAt:(d: string)=>`guardado ${d}`, countOf:(p: number, w: number)=>`${p} componentes · ${w} cables`, driveOff:"Google Drive no está configurado en esta copia de la aplicación.", driveSignIn:"Iniciar sesión y listar mis archivos", driveEmpty:"Esta aplicación aún no ha guardado esquemas en Drive.", savedMsg:"Guardado.", saveFail:"No se pudo guardar.", openFail:"No se pudo abrir.", nothingToSave:"Abre un esquema para guardarlo.",
    closeTabTitle: "Cerrar pestaña", closeTabAsk: (n: string) => `¿Guardar “${n}” antes de cerrarlo?`, saveAndClose: "Guardar…", closeWithout: "Cerrar sin guardar", keepOpen: "Mantener abierta",
    newTab: "Pestaña nueva", closeTabBtn: "Cerrar pestaña", closeTab: "¿Cerrar esta pestaña? Su esquema se borra de este navegador (guarda antes el archivo si lo necesitas).", openInTab: "Abrir en pestaña nueva…", untitled: "Sin título",
    programs: { electrical: "Electricidad", pneumatic: "Neumática", hydraulic: "Hidráulica" } },
};
export type Common = (typeof COMMON)["en"];

export function readLang(): Lang {
  try { const l = localStorage.getItem(LANG_KEY); if (l === "he" || l === "en" || l === "es") return l; } catch { /* storage blocked */ }
  return "en";
}
export function writeLang(l: Lang) { try { localStorage.setItem(LANG_KEY, l); } catch { /* storage blocked */ } }
