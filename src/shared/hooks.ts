/** React hooks shared by all three programs. */
import { useEffect, useRef, useState } from "react";
import { readLang, writeLang, Lang } from "./i18n";
import { detectSaver, Saver } from "../platform/save";

/** language, shared between programs through localStorage */
export function useLang(initial?: Lang): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(initial || readLang);
  useEffect(() => writeLang(lang), [lang]);
  return [lang, setLang];
}

/** undo stack over a snapshot of the document; `push` before every change */
export function useHistory<T>(current: () => T, restore: (s: T) => void, limit = 80) {
  const stack = useRef<T[]>([]);
  const push = () => { stack.current.push(current()); if (stack.current.length > limit) stack.current.shift(); };
  const undo = () => { const s = stack.current.pop(); if (s !== undefined) restore(s); };
  return { push, undo };
}

/** keeps a value in localStorage under `key` */
export function usePersist(key: string, value: unknown) {
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ } }, [key, value]);
}
export function loadPersisted<T>(key: string, valid: (v: any) => boolean): T | null {
  try { const v = JSON.parse(localStorage.getItem(key) || "null"); return v && valid(v) ? v : null; } catch { return null; }
}

/** how files reach the user here (browser download or claude.ai artifact) */
export function useSaver() {
  const [saver, setSaver] = useState<Saver | null>(null);
  useEffect(() => { let live = true; detectSaver().then((s) => { if (live) setSaver(s); }).catch(() => {}); return () => { live = false; }; }, []);
  return saver;
}

/** a status message that clears itself */
export function useFlash(ms = 6000): [string, (m: string) => void] {
  const [msg, setMsg] = useState("");
  useEffect(() => { if (!msg) return; const i = setTimeout(() => setMsg(""), ms); return () => clearTimeout(i); }, [msg, ms]);
  return [msg, setMsg];
}

/** global keyboard shortcuts, ignored while typing in a field */
export function useKeys(handler: (e: KeyboardEvent) => void, enabled = true) {
  const h = useRef(handler);
  h.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest?.("input,textarea,select")) return; h.current(e); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [enabled]);
}

export function useTitle(title: string) { useEffect(() => { document.title = title; }, [title]); }

let uid = Date.now();
export const nid = (p: string) => p + (++uid).toString(36);
export const safeName = (s: string, fallback = "circuit") => (s || fallback).replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) || fallback;
