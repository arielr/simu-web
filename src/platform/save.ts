import { latin1, zipOne } from "../cad/format";

/**
 * Where the app runs decides how a file reaches the user:
 * - inside a claude.ai artifact, downloads go through the host's `downloads` capability,
 *   which does not accept the .cad extension, so .cad files travel inside a .zip;
 * - anywhere else (dev server, GitHub Pages, any static host) the browser saves the file directly.
 */
export interface Saver {
  kind: "artifact" | "browser";
  /** saves a CADe SIMU drawing; resolves false when the user cancelled */
  saveCad(baseName: string, text: string): Promise<boolean>;
  saveJson(baseName: string, text: string): Promise<boolean>;
}

export function browserSaver(): Saver {
  const download = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return Promise.resolve(true);
  };
  return {
    kind: "browser",
    // CADe SIMU files are single-byte (Windows-1252) text
    saveCad: (base, text) => download(base + ".cad", new Blob([latin1(text)], { type: "application/octet-stream" })),
    saveJson: (base, text) => download(base + ".json", new Blob([text], { type: "application/json" })),
  };
}

export function artifactSaver(dl: any): Saver {
  const save = async (filename: string, data: any) => {
    try {
      await dl.save({ filename, data });
      return true;
    } catch (err: any) {
      if (err && err.code === "declined") return false;
      throw err;
    }
  };
  return {
    kind: "artifact",
    saveCad: (base, text) => save(base + ".zip", zipOne(base + ".cad", latin1(text))),
    saveJson: (base, text) => save(base + ".json", text),
  };
}

/** resolves to the right saver for this page; null if saving is unavailable */
export async function detectSaver(): Promise<Saver | null> {
  const c = (window as any).claude;
  if (c && typeof c.use === "function") {
    try {
      const dl = await c.use("downloads");
      return dl ? artifactSaver(dl) : null;
    } catch {
      return null;
    }
  }
  return browserSaver();
}
