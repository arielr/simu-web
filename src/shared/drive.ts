/**
 * Google Drive for saving and opening drawings. Needs an OAuth client ID for this site:
 * it is read at build time from VITE_GOOGLE_CLIENT_ID. With the "drive.file" scope the app
 * only sees the files it saved itself.
 */
const CLIENT_ID: string = ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string | undefined) || "";
const SCOPE = "https://www.googleapis.com/auth/drive.file";

export const driveConfigured = () => CLIENT_ID !== "";

let token: { value: string; exp: number } | null = null;
let gis: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (!gis) gis = new Promise<void>((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => res();
    s.onerror = () => { gis = null; rej(new Error("gis")); };
    document.head.appendChild(s);
  });
  return gis;
}

/** an access token, asking Google (a popup) when there is none or it has run out */
async function accessToken(): Promise<string> {
  if (!driveConfigured()) throw new Error("drive-not-configured");
  if (token && token.exp > Date.now() + 30000) return token.value;
  await loadGis();
  return new Promise<string>((res, rej) => {
    const g = (window as any).google;
    const client = g.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r: any) => {
        if (r.error) { rej(new Error(r.error)); return; }
        token = { value: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
        res(r.access_token);
      },
      error_callback: (e: any) => rej(new Error(e?.type || "auth")),
    });
    client.requestAccessToken({ prompt: token ? "" : "consent" });
  });
}

async function api(url: string, init: RequestInit = {}): Promise<Response> {
  const t = await accessToken();
  const r = await fetch(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${t}` } });
  if (!r.ok) throw new Error("drive " + r.status);
  return r;
}

export interface DriveFile { id: string; name: string }

/** the drawings this app saved to Drive, newest first */
export async function driveList(): Promise<DriveFile[]> {
  const q = encodeURIComponent("trashed = false and (name contains '.cad' or name contains '.json')");
  const r = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&orderBy=modifiedTime%20desc&pageSize=100`);
  return ((await r.json()).files || []) as DriveFile[];
}

export async function driveDownload(id: string): Promise<Blob> {
  return (await api(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`)).blob();
}

/** creates a file in the user's Drive (multipart upload) */
export async function driveSave(name: string, mime: string, data: BlobPart): Promise<void> {
  const b = "simuweb" + Math.random().toString(36).slice(2);
  const body = new Blob([
    `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, mimeType: mime })}\r\n`,
    `--${b}\r\nContent-Type: ${mime}\r\n\r\n`, data, `\r\n--${b}--`,
  ]);
  await api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST", headers: { "Content-Type": `multipart/related; boundary=${b}` }, body,
  });
}
