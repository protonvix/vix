// Vix Automations client portal API (Cloudflare Pages Function).
// Bindings (set in the Cloudflare dashboard): KV namespace "PORTAL", secret "ADMIN_PASSWORD".

const STAGES = {
  website: ["Brief received", "Design", "Build", "Your review", "Launched"],
  ghl: ["Discovery", "Blueprint", "Build & test", "Launch & training", "Live & optimising"],
  tiktok: ["Onboarding", "Content plan", "Filming & editing", "Posting 4x weekly", "Monthly report"],
  other: ["Kick-off", "In progress", "Review", "Complete"],
};
const METRICS = {
  website: ["visitors", "enquiries"],
  ghl: ["leads", "appointments", "reviews", "automations"],
  tiktok: ["views", "followers", "likes", "videos"],
  other: [],
};
const SESSION_DAYS = 30;
const INVITE_DAYS = 14;
const MAX_FILE = 20 * 1024 * 1024; // KV values can be up to 25 MB

/* ---------------- helpers ---------------- */
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const fail = (status, error) => json({ error }, status);
const rid = (bytes = 24) => {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const now = () => new Date().toISOString();
const clean = (v, max = 500) => String(v == null ? "" : v).trim().slice(0, max);
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const httpUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch { return ""; } };

function cookies(req) {
  const out = {};
  (req.headers.get("cookie") || "").split(/;\s*/).forEach((p) => { const i = p.indexOf("="); if (i > 0) out[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1)); });
  return out;
}
const setCookie = (name, value, maxAge) => `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function hashPassword(password, saltB64) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return { salt: btoa(String.fromCharCode(...salt)), hash: btoa(String.fromCharCode(...new Uint8Array(bits))) };
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const get = async (env, key) => env.PORTAL.get(key, "json");
const put = async (env, key, val, ttl) => env.PORTAL.put(key, JSON.stringify(val), ttl ? { expirationTtl: ttl } : undefined);

async function tooMany(env, key) {
  const n = +(await env.PORTAL.get("fail:" + key)) || 0;
  return n >= 10;
}
async function noteFail(env, key) {
  const n = +(await env.PORTAL.get("fail:" + key)) || 0;
  await env.PORTAL.put("fail:" + key, String(n + 1), { expirationTtl: 900 });
}

async function clientFromSession(env, req) {
  const t = cookies(req).vx_s; if (!t) return null;
  const s = await get(env, "sess:" + t); if (!s) return null;
  return get(env, "client:" + s.clientId);
}
async function isAdmin(env, req) {
  const t = cookies(req).vx_a; if (!t) return false;
  return !!(await env.PORTAL.get("asess:" + t));
}

async function loadProjects(env, client) {
  const list = await Promise.all((client.projectIds || []).map((id) => get(env, "project:" + id)));
  return list.filter(Boolean);
}
const publicClient = (c) => ({ id: c.id, name: c.name, email: c.email, business: c.business, whatsapp: c.whatsapp, currency: c.currency, createdAt: c.createdAt, activated: !!c.pw });
const withStages = (p) => ({ ...p, stages: STAGES[p.type] || STAGES.other, metricKeys: METRICS[p.type] || [] });

async function newInvite(env, clientId) {
  const token = rid(24);
  await put(env, "invite:" + token, { clientId }, INVITE_DAYS * 86400);
  return token;
}

/* ---------------- client routes ---------------- */
async function join(env, req) {
  const b = await req.json().catch(() => ({}));
  const inv = await get(env, "invite:" + clean(b.invite, 100));
  if (!inv) return fail(400, "This link has expired or was already used. Message us on WhatsApp for a new one.");
  const pw = String(b.password || "");
  if (pw.length < 8) return fail(400, "Please choose a password with at least 8 characters.");
  const c = await get(env, "client:" + inv.clientId);
  if (!c) return fail(404, "Account not found.");
  c.pw = await hashPassword(pw);
  if (b.name) c.name = clean(b.name, 80);
  c.activatedAt = now();
  await put(env, "client:" + c.id, c);
  await env.PORTAL.delete("invite:" + clean(b.invite, 100));
  return startSession(env, c);
}
async function startSession(env, c) {
  const t = rid(32);
  await put(env, "sess:" + t, { clientId: c.id }, SESSION_DAYS * 86400);
  return json({ ok: true }, 200, { "set-cookie": setCookie("vx_s", t, SESSION_DAYS * 86400) });
}
async function inviteInfo(env, url) {
  const inv = await get(env, "invite:" + clean(url.searchParams.get("t"), 100));
  if (!inv) return fail(404, "This link has expired or was already used.");
  const c = await get(env, "client:" + inv.clientId);
  return c ? json({ name: c.name, email: c.email, business: c.business }) : fail(404, "Account not found.");
}
async function login(env, req) {
  const b = await req.json().catch(() => ({}));
  const email = clean(b.email, 200).toLowerCase();
  if (await tooMany(env, email)) return fail(429, "Too many attempts. Please wait 15 minutes and try again.");
  const id = await env.PORTAL.get("email:" + email);
  const c = id && (await get(env, "client:" + id));
  if (!c || !c.pw) { await noteFail(env, email); return fail(401, "Email or password is incorrect."); }
  const h = await hashPassword(String(b.password || ""), c.pw.salt);
  if (!safeEqual(h.hash, c.pw.hash)) { await noteFail(env, email); return fail(401, "Email or password is incorrect."); }
  return startSession(env, c);
}
async function logout(env, req) {
  const c = cookies(req);
  if (c.vx_s) await env.PORTAL.delete("sess:" + c.vx_s);
  if (c.vx_a) await env.PORTAL.delete("asess:" + c.vx_a);
  const res = json({ ok: true });
  res.headers.append("set-cookie", setCookie("vx_s", "", 0));
  res.headers.append("set-cookie", setCookie("vx_a", "", 0));
  return res;
}
async function me(env, req) {
  const c = await clientFromSession(env, req);
  if (!c) return fail(401, "Please log in.");
  const projects = (await loadProjects(env, c)).map(withStages);
  return json({ client: publicClient(c), projects });
}
async function clientMessage(env, req) {
  const c = await clientFromSession(env, req);
  if (!c) return fail(401, "Please log in.");
  const b = await req.json().catch(() => ({}));
  const text = clean(b.text, 2000);
  if (!text) return fail(400, "Please write a message.");
  const p = await get(env, "project:" + clean(b.projectId, 60));
  if (!p || p.clientId !== c.id) return fail(404, "Project not found.");
  p.messages = (p.messages || []).concat({ at: now(), from: "client", text }).slice(-200);
  p.unreadAdmin = (p.unreadAdmin || 0) + 1;
  await put(env, "project:" + p.id, p);
  return json({ ok: true, project: withStages(p) });
}
async function seen(env, req) {
  const c = await clientFromSession(env, req);
  if (!c) return fail(401, "Please log in.");
  const b = await req.json().catch(() => ({}));
  const p = await get(env, "project:" + clean(b.projectId, 60));
  if (!p || p.clientId !== c.id) return fail(404, "Project not found.");
  let changed = false;
  (p.deliverables || []).forEach((d) => { if (d.isNew) { d.isNew = false; changed = true; } });
  if (p.unreadClient) { p.unreadClient = 0; changed = true; }
  if (changed) await put(env, "project:" + p.id, p);
  return json({ ok: true });
}
async function download(env, req, fileId) {
  const meta = await get(env, "filemeta:" + fileId);
  if (!meta) return fail(404, "File not found.");
  const admin = await isAdmin(env, req);
  if (!admin) {
    const c = await clientFromSession(env, req);
    const p = c && (await get(env, "project:" + meta.projectId));
    if (!p || p.clientId !== c.id) return fail(403, "You don't have access to this file.");
  }
  const body = await env.PORTAL.get("file:" + fileId, "arrayBuffer");
  if (!body) return fail(404, "File not found.");
  const name = meta.name.replace(/[^\w.\- ]/g, "_");
  return new Response(body, { headers: { "content-type": meta.type || "application/octet-stream", "content-disposition": `attachment; filename="${name}"`, "cache-control": "private, no-store" } });
}

/* ---------------- admin routes ---------------- */
async function adminLogin(env, req) {
  if (!env.ADMIN_PASSWORD) return fail(500, "ADMIN_PASSWORD is not set in Cloudflare yet.");
  if (await tooMany(env, "admin")) return fail(429, "Too many attempts. Please wait 15 minutes.");
  const b = await req.json().catch(() => ({}));
  if (!safeEqual(String(b.password || ""), env.ADMIN_PASSWORD)) { await noteFail(env, "admin"); return fail(401, "Wrong password."); }
  const t = rid(32);
  await env.PORTAL.put("asess:" + t, "1", { expirationTtl: 12 * 3600 });
  return json({ ok: true }, 200, { "set-cookie": setCookie("vx_a", t, 12 * 3600) });
}
async function adminClients(env) {
  const ids = (await get(env, "clients:index")) || [];
  const out = [];
  for (const id of ids) {
    const c = await get(env, "client:" + id); if (!c) continue;
    out.push({ ...publicClient(c), projects: (await loadProjects(env, c)).map(withStages) });
  }
  return json({ clients: out.reverse() });
}
async function adminCreate(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const email = clean(b.email, 200).toLowerCase();
  if (!clean(b.name) || !emailOk(email)) return fail(400, "Name and a valid email are required.");
  const services = (Array.isArray(b.services) ? b.services : []).filter((s) => STAGES[s.type]);
  if (!services.length) return fail(400, "Choose at least one service.");
  let id = await env.PORTAL.get("email:" + email);
  let c = id && (await get(env, "client:" + id));
  if (!c) {
    id = rid(9);
    c = { id, name: clean(b.name, 80), email, business: clean(b.business, 120), whatsapp: clean(b.whatsapp, 40), currency: clean(b.currency, 4) || "NGN", createdAt: now(), pw: null, projectIds: [] };
    const idx = (await get(env, "clients:index")) || [];
    idx.push(id); await put(env, "clients:index", idx);
    await env.PORTAL.put("email:" + email, id);
  }
  for (const s of services) {
    const pid = rid(9);
    const p = {
      id: pid, clientId: c.id, type: s.type, title: clean(s.title, 120) || defaultTitle(s.type),
      amount: Math.max(0, +s.amount || 0), currency: clean(b.currency, 4) || c.currency, paidAt: now(),
      stage: 0, progress: 5, status: "Your project has started", eta: clean(s.eta, 40),
      previewUrl: "", liveUrl: "", updates: [{ at: now(), text: "Payment received. Your project has officially started! 🚀" }],
      deliverables: [], metrics: [], messages: [], unreadAdmin: 0, unreadClient: 1,
    };
    await put(env, "project:" + pid, p);
    c.projectIds.push(pid);
  }
  await put(env, "client:" + c.id, c);
  const token = c.pw ? null : await newInvite(env, c.id);
  return json({ ok: true, client: publicClient(c), invite: token ? `${origin}/portal/join/?t=${token}` : null, loginUrl: `${origin}/portal/` });
}
function defaultTitle(t) {
  return { website: "Website design", ghl: "GoHighLevel setup & automation", tiktok: "TikTok marketing", other: "Project" }[t];
}
async function adminInvite(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const c = await get(env, "client:" + clean(b.clientId, 60));
  if (!c) return fail(404, "Client not found.");
  const token = await newInvite(env, c.id);
  return json({ ok: true, invite: `${origin}/portal/join/?t=${token}` });
}
async function adminProject(env, req) {
  const b = await req.json().catch(() => ({}));
  const p = await get(env, "project:" + clean(b.id, 60));
  if (!p) return fail(404, "Project not found.");
  const stages = STAGES[p.type] || STAGES.other;
  if (b.stage != null) {
    const s = Math.max(0, Math.min(stages.length - 1, +b.stage | 0));
    if (s !== p.stage) { p.updates.push({ at: now(), text: `Stage update: ${stages[s]}` }); p.unreadClient = (p.unreadClient || 0) + 1; }
    p.stage = s;
  }
  if (b.progress != null) p.progress = Math.max(0, Math.min(100, +b.progress | 0));
  if (b.status != null) p.status = clean(b.status, 160);
  if (b.eta != null) p.eta = clean(b.eta, 40);
  if (b.previewUrl != null) p.previewUrl = httpUrl(b.previewUrl);
  if (b.liveUrl != null) p.liveUrl = httpUrl(b.liveUrl);
  if (b.title != null && clean(b.title)) p.title = clean(b.title, 120);
  await put(env, "project:" + p.id, p);
  return json({ ok: true, project: withStages(p) });
}
async function adminPost(env, req) {
  const b = await req.json().catch(() => ({}));
  const p = await get(env, "project:" + clean(b.projectId, 60));
  if (!p) return fail(404, "Project not found.");
  const text = clean(b.text, 2000);
  if (!text) return fail(400, "Write something first.");
  if (b.kind === "message") { p.messages.push({ at: now(), from: "vix", text }); p.unreadAdmin = 0; }
  else p.updates.push({ at: now(), text });
  p.unreadClient = (p.unreadClient || 0) + 1;
  await put(env, "project:" + p.id, p);
  return json({ ok: true, project: withStages(p) });
}
async function adminMetric(env, req) {
  const b = await req.json().catch(() => ({}));
  const p = await get(env, "project:" + clean(b.projectId, 60));
  if (!p) return fail(404, "Project not found.");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? b.date : now().slice(0, 10);
  const row = { date };
  (METRICS[p.type] || []).forEach((k) => { if (b.values && b.values[k] !== "" && b.values[k] != null) row[k] = Math.max(0, +b.values[k] || 0); });
  p.metrics = (p.metrics || []).filter((m) => m.date !== date).concat(row).sort((x, y) => x.date.localeCompare(y.date)).slice(-60);
  await put(env, "project:" + p.id, p);
  return json({ ok: true, project: withStages(p) });
}
async function adminDeliverable(env, req) {
  const ct = req.headers.get("content-type") || "";
  let projectId, title, url = "", file = null;
  if (ct.includes("multipart/form-data")) {
    const f = await req.formData();
    projectId = clean(f.get("projectId"), 60); title = clean(f.get("title"), 120); url = httpUrl(f.get("url") || "");
    const up = f.get("file");
    if (up && typeof up === "object" && up.size) file = up;
  } else {
    const b = await req.json().catch(() => ({}));
    projectId = clean(b.projectId, 60); title = clean(b.title, 120); url = httpUrl(b.url || "");
  }
  const p = await get(env, "project:" + projectId);
  if (!p) return fail(404, "Project not found.");
  if (!url && !file) return fail(400, "Add a link or choose a file.");
  const d = { id: rid(9), title: title || (file ? file.name : "Delivery"), at: now(), isNew: true };
  if (file) {
    if (file.size > MAX_FILE) return fail(400, "Files must be 20 MB or smaller. For bigger files, upload to Google Drive and add the link.");
    await env.PORTAL.put("file:" + d.id, await file.arrayBuffer());
    await put(env, "filemeta:" + d.id, { name: file.name, type: file.type, size: file.size, projectId: p.id });
    d.fileId = d.id; d.size = file.size; d.name = file.name;
  } else d.url = url;
  p.deliverables.push(d);
  p.updates.push({ at: now(), text: `New delivery ready: ${d.title} 🎉` });
  p.unreadClient = (p.unreadClient || 0) + 1;
  await put(env, "project:" + p.id, p);
  return json({ ok: true, project: withStages(p) });
}
async function adminRemove(env, req) {
  const b = await req.json().catch(() => ({}));
  const p = await get(env, "project:" + clean(b.projectId, 60));
  if (!p) return fail(404, "Project not found.");
  const d = (p.deliverables || []).find((x) => x.id === b.deliverableId);
  if (!d) return fail(404, "Delivery not found.");
  p.deliverables = p.deliverables.filter((x) => x !== d);
  if (d.fileId) { await env.PORTAL.delete("file:" + d.fileId); await env.PORTAL.delete("filemeta:" + d.fileId); }
  await put(env, "project:" + p.id, p);
  return json({ ok: true, project: withStages(p) });
}
async function adminMarkRead(env, req) {
  const b = await req.json().catch(() => ({}));
  const p = await get(env, "project:" + clean(b.projectId, 60));
  if (!p) return fail(404, "Project not found.");
  p.unreadAdmin = 0; await put(env, "project:" + p.id, p);
  return json({ ok: true });
}

/* ---------------- router ---------------- */
export async function onRequest(ctx) {
  const { request: req, env } = ctx;
  if (!env.PORTAL) {
    // Setup help: list the names (never the values) of the settings this deployment can see.
    const seen = Object.keys(env || {}).filter((k) => k !== "ASSETS");
    return json({ error: "The portal database (KV binding PORTAL) is not connected yet.", settingsSeen: seen, adminPasswordSet: !!env.ADMIN_PASSWORD }, 500);
  }
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const m = req.method;
  // CSRF guard: every state-changing request must come from our own pages.
  if (m !== "GET" && m !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin && origin !== url.origin) return fail(403, "Request blocked.");
    if (req.headers.get("x-vix") !== "1") return fail(403, "Request blocked.");
  }
  try {
    if (path === "join" && m === "POST") return join(env, req);
    if (path === "invite" && m === "GET") return inviteInfo(env, url);
    if (path === "login" && m === "POST") return login(env, req);
    if (path === "logout" && m === "POST") return logout(env, req);
    if (path === "me" && m === "GET") return me(env, req);
    if (path === "message" && m === "POST") return clientMessage(env, req);
    if (path === "seen" && m === "POST") return seen(env, req);
    if (path.startsWith("file/") && m === "GET") return download(env, req, path.slice(5));

    if (path === "admin/login" && m === "POST") return adminLogin(env, req);
    if (path.startsWith("admin/")) {
      if (!(await isAdmin(env, req))) return fail(401, "Admin login required.");
      const a = path.slice(6);
      if (a === "session" && m === "GET") return json({ ok: true });
      if (a === "clients" && m === "GET") return adminClients(env);
      if (a === "clients" && m === "POST") return adminCreate(env, req, url.origin);
      if (a === "invite" && m === "POST") return adminInvite(env, req, url.origin);
      if (a === "project" && m === "POST") return adminProject(env, req);
      if (a === "post" && m === "POST") return adminPost(env, req);
      if (a === "metric" && m === "POST") return adminMetric(env, req);
      if (a === "deliverable" && m === "POST") return adminDeliverable(env, req);
      if (a === "deliverable/remove" && m === "POST") return adminRemove(env, req);
      if (a === "read" && m === "POST") return adminMarkRead(env, req);
    }
    return fail(404, "Not found.");
  } catch (e) {
    return fail(500, "Something went wrong. Please try again.");
  }
}
