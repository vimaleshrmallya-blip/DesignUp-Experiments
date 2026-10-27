// Data layer. With window.DU_CONFIG = { url, key } set (config.js) it talks to Supabase; otherwise it
// falls back to this browser's localStorage so the site still works as a private demo.
import { createClient } from "@supabase/supabase-js";

const cfg = (typeof window !== "undefined" && window.DU_CONFIG) || {};
export const REMOTE = !!(cfg.url && cfg.key && !/YOUR_/.test(cfg.url + cfg.key));
const sb = REMOTE ? createClient(cfg.url, cfg.key, { auth: { persistSession: true, detectSessionInUrl: true } }) : null;
const BUCKET = "photos";

const ls = {
  get: (k, d) => { try { const j = JSON.parse(localStorage.getItem(k) || "null"); return j == null ? d : j; } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
const pubUrl = (path) => sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
const mapPhoto = (r) => ({ id: r.id, img: pubUrl(r.path), path: r.path, caption: r.caption || "", talk: r.talk || "", day: r.day || "", author: r.author || "", linkedin: r.linkedin || "", status: r.status, mine: false, uid: r.user_id, t: Date.parse(r.created_at) });
const mapNote = (r) => ({ id: r.id, talk: r.talk, kind: r.kind, text: r.body, author: r.author, linkedin: r.linkedin || "", status: r.status, uid: r.user_id, t: Date.parse(r.created_at) });

export const auth = {
  user: async () => { if (!REMOTE) return null; const { data } = await sb.auth.getSession(); const u = data.session && data.session.user; return u ? { id: u.id, email: u.email, name: (u.user_metadata && (u.user_metadata.name || u.user_metadata.full_name)) || "", picture: (u.user_metadata && u.user_metadata.picture) || "" } : null; },
  onChange: (cb) => { if (!REMOTE) return () => {}; const { data } = sb.auth.onAuthStateChange(() => cb()); return () => data.subscription.unsubscribe(); },
  providers: (cfg.providers && cfg.providers.length ? cfg.providers : ["google"]),
  signIn: (provider) => sb.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + window.location.pathname } }),
  signOut: () => sb.auth.signOut(),
  isAdmin: async () => { if (!REMOTE) return false; const { data, error } = await sb.rpc("is_admin"); return !error && data === true; },
};

export async function load() {
  if (!REMOTE) return { photos: ls.get("du-photos-v1", []).map((p) => ({ ...p, status: "approved" })), notes: ls.get("du-notes-v1", []).map((n) => ({ ...n, status: "approved" })) };
  const [a, b] = await Promise.all([
    sb.from("photos").select("*").order("created_at", { ascending: false }).limit(500),
    sb.from("notes").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
  return { photos: (a.data || []).map(mapPhoto), notes: (b.data || []).map(mapNote), error: (a.error || b.error || {}).message };
}

// imgs: array of data URLs (already resized)
export async function addPhotos(imgs, meta, user) {
  if (!REMOTE) {
    const all = ls.get("du-photos-v1", []), stamp = Date.now();
    const add = imgs.map((img, i) => ({ id: "ph" + stamp.toString(36) + i, img, caption: meta.caption, talk: meta.talk, day: meta.day, author: meta.author, consent: true }));
    if (!ls.set("du-photos-v1", [...all, ...add])) return { error: "Browser storage is full: remove some photos first." };
    return { count: add.length, pending: false };
  }
  let n = 0;
  for (const img of imgs) {
    const blob = await (await fetch(img)).blob();
    const path = user.id + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + ".jpg";
    const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (up.error) return { error: up.error.message, count: n };
    const ins = await sb.from("photos").insert({ path, caption: meta.caption, talk: meta.talk, day: meta.day, author: meta.author, linkedin: meta.linkedin || null });
    if (ins.error) { await sb.storage.from(BUCKET).remove([path]); return { error: /rate/i.test(ins.error.message) ? "You're adding photos quickly: try again in a little while." : ins.error.message, count: n }; }
    n++;
  }
  return { count: n, pending: true };
}

export async function addNote(n, user) {
  if (!REMOTE) { const all = ls.get("du-notes-v1", []); ls.set("du-notes-v1", [{ id: "n" + Date.now(), talk: n.talk, kind: n.kind, text: n.text, author: n.author, linkedin: n.linkedin, t: Date.now() }, ...all]); return { pending: false }; }
  const r = await sb.from("notes").insert({ talk: n.talk, kind: n.kind, body: n.text, author: n.author, linkedin: n.linkedin || null });
  return r.error ? { error: /rate/i.test(r.error.message) ? "You're posting quickly: try again in a little while." : r.error.message } : { pending: true };
}

export async function remove(kind, item) {
  if (!REMOTE) { const k = kind === "photo" ? "du-photos-v1" : "du-notes-v1"; ls.set(k, ls.get(k, []).filter((x) => x.id !== item.id)); return {}; }
  if (kind === "photo" && item.path) await sb.storage.from(BUCKET).remove([item.path]);
  const r = await sb.from(kind === "photo" ? "photos" : "notes").delete().eq("id", item.id);
  return r.error ? { error: r.error.message } : {};
}

export async function report(kind, id, reason) {
  if (!REMOTE) return {};
  const r = await sb.from("reports").insert({ kind, item_id: id, reason: reason || null });
  return r.error && !/duplicate/i.test(r.error.message) ? { error: r.error.message } : {};
}

export async function setStatus(kind, id, status) {
  const r = await sb.from(kind === "photo" ? "photos" : "notes").update({ status }).eq("id", id);
  return r.error ? { error: r.error.message } : {};
}

// demo mode only: forget every photo saved in this browser
export function clearLocalPhotos() { if (REMOTE) return false; try { localStorage.removeItem("du-photos-v1"); return true; } catch (e) { return false; } }
