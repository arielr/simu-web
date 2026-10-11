/**
 * Pictures placed in CADe SIMU drawings (record code 9). The .cad file only names the picture
 * (e.g. "PLC3.bmp"); CADe SIMU reads it from the drawing's folder. Here the user adds the picture once
 * (together with the .cad, or from the inspector) and it is kept in this browser by file name.
 */
const KEY = "simu-web-images";
let store: Record<string, string> = {};
try { store = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { /* no storage */ }

const norm = (name: string) => (name || "").trim().split(/[\\/]/).pop()!.toLowerCase();
export const imageOf = (name: string): string | null => store[norm(name)] || null;
export const isImageFile = (f: File) => /^image\//.test(f.type) || /\.(bmp|png|jpe?g|gif|webp)$/i.test(f.name);

/** reads a picture file (BMP included), stores it as PNG under its file name */
export function addImage(f: File): Promise<string> {
  return new Promise((ok, fail) => {
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      cv.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const data = cv.toDataURL("image/png");
      store[norm(f.name)] = data;
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* too big for storage: kept for this session */ }
      ok(norm(f.name));
    };
    img.onerror = () => { URL.revokeObjectURL(url); fail(new Error(f.name)); };
    img.src = url;
  });
}
