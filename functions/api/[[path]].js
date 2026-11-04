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
async function createClientWithProjects(env, b, origin, note) {
  const email = clean(b.email, 200).toLowerCase();
  if (!clean(b.name) || !emailOk(email)) throw new Error("Name and a valid email are required.");
  const services = (Array.isArray(b.services) ? b.services : []).filter((s) => STAGES[s.type]);
  if (!services.length) throw new Error("Choose at least one service.");
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
      previewUrl: "", liveUrl: "", updates: [{ at: now(), text: note || "Payment received. Your project has officially started! 🚀" }],
      deliverables: [], metrics: [], messages: [], unreadAdmin: 0, unreadClient: 1,
    };
    await put(env, "project:" + pid, p);
    c.projectIds.push(pid);
  }
  await put(env, "client:" + c.id, c);
  const token = c.pw ? null : await newInvite(env, c.id);
  return { client: c, invite: token ? `${origin}/portal/join/?t=${token}` : null, loginUrl: `${origin}/portal/` };
}
async function adminCreate(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  try {
    const r = await createClientWithProjects(env, b, origin);
    return json({ ok: true, client: publicClient(r.client), invite: r.invite, loginUrl: r.loginUrl });
  } catch (e) { return fail(400, e.message); }
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


/* ---------------- website briefs & enquiries ---------------- */
const BRIEF_ORIGINS = ["https://vixautomationsportfolio.pages.dev", "https://vixautomations.pages.dev", "https://vix.vixautomation.workers.dev"];
const NOTIFY_EMAIL = "vixautomations@gmail.com";
const OFFER_END = "2026-12-04T23:59:59+01:00"; // free design offer deadline (keep in sync with offer.js)
function cors(req) {
  const o = req.headers.get("origin");
  const ok = o && (BRIEF_ORIGINS.includes(o) || /^https:\/\/[a-z0-9-]+\.(vixautomations|vixautomationsportfolio)\.pages\.dev$/.test(o) || /^http:\/\/localhost(:\d+)?$/.test(o));
  return ok ? { "access-control-allow-origin": o, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400", vary: "Origin" } : null;
}
async function sendEmail(env, { subject, text, replyTo }) {
  if (!env.RESEND_API_KEY) return { sent: false, why: "RESEND_API_KEY not set" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM || "Vix Automations Website <onboarding@resend.dev>", to: [env.NOTIFY_EMAIL || NOTIFY_EMAIL], reply_to: replyTo || undefined, subject, text }),
    });
    return r.ok ? { sent: true } : { sent: false, why: "Resend " + r.status + ": " + (await r.text()).slice(0, 200) };
  } catch (e) { return { sent: false, why: "Email service unreachable" }; }
}
async function brief(env, req, h) {
  const reply = (d, st) => json(d, st || 200, h);
  const b = await req.json().catch(() => null);
  if (!b) return reply({ error: "Please try again." }, 400);
  if (b.website) return reply({ ok: true, emailed: true }); // honeypot: bots fill the hidden field
  if (/free design offer/i.test(String(b.source || "")) && Date.now() > Date.parse(OFFER_END)) return reply({ error: "Sorry, the free design offer ended on 4 December 2026." }, 410);
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  const rk = "brate:" + ip, n = +(await env.PORTAL.get(rk)) || 0;
  if (n >= 8) return reply({ error: "Too many messages in a short time. Please email vixautomations@gmail.com directly." }, 429);
  await env.PORTAL.put(rk, String(n + 1), { expirationTtl: 3600 });
  const email = clean(b.email, 200);
  const item = {
    id: rid(9), at: now(), read: false,
    source: clean(b.source, 60) || "website", subject: clean(b.subject, 200) || "New enquiry",
    name: clean(b.name, 100), email: emailOk(email) ? email : "", whatsapp: clean(b.whatsapp, 40), business: clean(b.business, 120),
    service: clean(b.service, 120), text: clean(b.text, 8000),
  };
  if (!item.name || !item.text) return reply({ error: "Please add your name and details." }, 400);
  const mail = await sendEmail(env, {
    subject: item.subject,
    replyTo: item.email,
    text: item.text + "\n\n— — —\nFrom: " + item.name + (item.business ? " (" + item.business + ")" : "") + "\nEmail: " + (item.email || "not given") + "\nWhatsApp/phone: " + (item.whatsapp || "not given") + "\nSent via: " + item.source + "\nReply to this email to answer them directly. All briefs are also saved in your admin portal: https://vixautomations.pages.dev/portal/admin/",
  });
  item.emailed = mail.sent; if (!mail.sent) item.emailError = mail.why;
  await put(env, "brief:" + item.id, item);
  const idx = (await get(env, "briefs:index")) || [];
  idx.push(item.id); await put(env, "briefs:index", idx.slice(-500));
  return reply({ ok: true, emailed: mail.sent });
}
async function adminBriefs(env) {
  const idx = ((await get(env, "briefs:index")) || []).slice().reverse();
  const items = (await Promise.all(idx.map((id) => get(env, "brief:" + id)))).filter(Boolean);
  return json({ briefs: items, emailReady: !!env.RESEND_API_KEY });
}
async function adminBriefUpdate(env, req) {
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 40), item = await get(env, "brief:" + id);
  if (!item) return fail(404, "Not found.");
  if (b.delete) {
    await env.PORTAL.delete("brief:" + id);
    await put(env, "briefs:index", ((await get(env, "briefs:index")) || []).filter((x) => x !== id));
    return json({ ok: true });
  }
  item.read = !!b.read; await put(env, "brief:" + id, item);
  return json({ ok: true });
}
async function adminTestEmail(env) {
  const r = await sendEmail(env, { subject: "✅ Test email from your Vix Automations website", text: "Your website can now send briefs and enquiries to this inbox." });
  return r.sent ? json({ ok: true }) : fail(400, r.why);
}


/* ---------------- Paystack payments ---------------- */
// Secrets (Cloudflare): PAYSTACK_SECRET_KEY. Amounts are stored in the main unit (e.g. naira) and sent to Paystack in the subunit (kobo).
const PS_API = "https://api.paystack.co";
async function paystack(env, path, init) {
  if (!env.PAYSTACK_SECRET_KEY) throw new Error("Online payments are not switched on yet.");
  const r = await fetch(PS_API + path, { ...(init || {}), headers: { authorization: "Bearer " + env.PAYSTACK_SECRET_KEY, "content-type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.status === false) throw new Error(d.message || "Paystack error " + r.status);
  return d.data;
}
const payPublic = (q) => ({ id: q.id, ref: "VIX-" + q.id.slice(0, 6).toUpperCase(), usd: q.usd || null, transferAt: q.transfer ? q.transfer.at : null, name: q.name, business: q.business, currency: q.currency, total: q.total, services: q.services.map((s) => ({ type: s.type, title: s.title || defaultTitle(s.type), amount: s.amount })), status: q.status, note: q.note });
async function adminPayCreate(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const email = clean(b.email, 200).toLowerCase();
  if (!clean(b.name) || !emailOk(email)) return fail(400, "Name and a valid email are required.");
  const services = (Array.isArray(b.services) ? b.services : []).filter((s) => STAGES[s.type] && +s.amount > 0)
    .map((s) => ({ type: s.type, title: clean(s.title, 120), amount: Math.round(+s.amount * 100) / 100, eta: clean(s.eta, 40) }));
  if (!services.length) return fail(400, "Add at least one service with an amount.");
  const currency = ["NGN", "USD", "GHS", "ZAR", "KES"].includes(b.currency) ? b.currency : "NGN";
  const q = { id: rid(12), name: clean(b.name, 80), email, business: clean(b.business, 120), whatsapp: clean(b.whatsapp, 40), currency, services,
    total: services.reduce((n, s) => n + s.amount, 0), note: clean(b.note, 300), status: "pending", createdAt: now() };
  await put(env, "payreq:" + q.id, q);
  const idx = (await get(env, "payreqs:index")) || []; idx.push(q.id); await put(env, "payreqs:index", idx.slice(-1000));
  return json({ ok: true, link: `${origin}/pay/?r=${q.id}`, request: q });
}
async function adminPayList(env) {
  const idx = ((await get(env, "payreqs:index")) || []).slice().reverse();
  const items = (await Promise.all(idx.map((id) => get(env, "payreq:" + id)))).filter(Boolean);
  return json({ requests: items, ready: !!env.PAYSTACK_SECRET_KEY });
}
async function adminPayCancel(env, req) {
  const b = await req.json().catch(() => ({}));
  const q = await get(env, "payreq:" + clean(b.id, 40));
  if (!q) return fail(404, "Not found.");
  if (q.status === "paid") return fail(400, "This one is already paid.");
  q.status = "cancelled"; await put(env, "payreq:" + q.id, q);
  return json({ ok: true });
}
async function payInfo(env, url) {
  const q = await get(env, "payreq:" + clean(url.searchParams.get("r"), 40));
  return q ? json({ request: payPublic(q), ready: !!env.PAYSTACK_SECRET_KEY }) : fail(404, "This payment link is not valid. Please ask us for a new one.");
}
async function payStart(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const q = await get(env, "payreq:" + clean(b.r, 40));
  if (!q) return fail(404, "This payment link is not valid.");
  if (q.status === "paid") return fail(400, "This invoice has already been paid. Thank you!");
  if (q.status === "cancelled") return fail(400, "This payment link has been cancelled. Please ask us for a new one.");
  const reference = "vix_" + q.id + "_" + rid(6).replace(/[^A-Za-z0-9]/g, "");
  try {
    const d = await paystack(env, "/transaction/initialize", { method: "POST", body: JSON.stringify({
      email: q.email, amount: Math.round(q.total * 100), currency: q.currency, reference,
      callback_url: `${origin}/pay/done/`,
      metadata: { payreq: q.id, business: q.business, custom_fields: [{ display_name: "Business", variable_name: "business", value: q.business || q.name }] },
    }) });
    await env.PORTAL.put("payref:" + reference, q.id);
    return json({ url: d.authorization_url });
  } catch (e) { return fail(502, e.message); }
}
async function fulfil(env, reference, tx, origin) {
  const qid = await env.PORTAL.get("payref:" + reference);
  const q = qid && (await get(env, "payreq:" + qid));
  if (!q) return { error: "Payment not recognised." };
  if (q.status === "paid") return { q };
  if (!tx || tx.status !== "success") return { error: "Payment was not completed." };
  if (Number(tx.amount) !== Math.round(q.total * 100) || String(tx.currency).toUpperCase() !== q.currency) return { error: "Payment amount did not match the invoice. We've been notified." };
  // Lock to avoid double fulfilment (webhook + browser at the same time).
  if (await env.PORTAL.get("paylock:" + q.id)) return { q, pending: true };
  await env.PORTAL.put("paylock:" + q.id, "1", { expirationTtl: 120 });
  const amountTxt = (q.currency === "NGN" ? "₦" : q.currency + " ") + q.total.toLocaleString("en-GB");
  const r = await createClientWithProjects(env, { name: q.name, email: q.email, business: q.business, whatsapp: q.whatsapp, currency: q.currency, services: q.services }, origin,
    `Payment of ${amountTxt} received via Paystack. Your project has officially started! 🚀`);
  q.status = "paid"; q.paidAt = now(); q.reference = reference; q.clientId = r.client.id; q.invite = r.invite; q.channel = tx.channel || "";
  await put(env, "payreq:" + q.id, q);
  await sendEmail(env, {
    subject: `💰 Payment received: ${amountTxt} from ${q.business || q.name}`,
    replyTo: q.email,
    text: `${q.name}${q.business ? " (" + q.business + ")" : ""} just paid ${amountTxt} via Paystack.\n\nServices:\n${q.services.map((s) => "• " + (s.title || defaultTitle(s.type)) + ": " + s.amount.toLocaleString("en-GB")).join("\n")}\n\nReference: ${reference}\nEmail: ${q.email}\nWhatsApp: ${q.whatsapp || "not given"}\n\nTheir dashboard and projects were created automatically.${r.invite ? "\nTheir dashboard link (also shown to them after payment): " + r.invite : ""}\n\nOpen your admin page: ${origin}/portal/admin/`,
  });
  return { q, fresh: true };
}
async function payVerify(env, url) {
  const reference = clean(url.searchParams.get("reference"), 100);
  if (!reference) return fail(400, "Missing payment reference.");
  let tx;
  try { tx = await paystack(env, "/transaction/verify/" + encodeURIComponent(reference)); }
  catch (e) { return fail(502, "We couldn't confirm your payment yet. If you were charged, don't worry: we'll confirm it shortly by email."); }
  const r = await fulfil(env, reference, tx, url.origin);
  if (r.error) return fail(400, r.error);
  const c = r.q.clientId && (await get(env, "client:" + r.q.clientId));
  return json({ ok: true, name: r.q.name, business: r.q.business, total: r.q.total, currency: r.q.currency,
    invite: c && !c.pw ? r.q.invite : null, activated: !!(c && c.pw), loginUrl: url.origin + "/portal/" });
}
async function payWebhook(env, req, origin) {
  const raw = await req.text();
  if (!env.PAYSTACK_SECRET_KEY) return new Response("not configured", { status: 503 });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.PAYSTACK_SECRET_KEY), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)))).map((x) => x.toString(16).padStart(2, "0")).join("");
  if (!safeEqual(sig, String(req.headers.get("x-paystack-signature") || ""))) return new Response("bad signature", { status: 401 });
  let ev; try { ev = JSON.parse(raw); } catch { return new Response("bad body", { status: 400 }); }
  if (ev.event === "charge.success" && ev.data && ev.data.reference) {
    // Double-check with Paystack before acting on the event.
    try { const tx = await paystack(env, "/transaction/verify/" + encodeURIComponent(ev.data.reference)); await fulfil(env, ev.data.reference, tx, origin); } catch (e) {}
  }
  return new Response("ok");
}


/* ---------------- Fixed-price packages: pay directly ---------------- */
// Prices in USD (same as pricing.html). The founding-client discount is applied here, and the
// naira amount is worked out on the server, so a visitor can never change the price they pay.
const PACKAGES = {
  quickstart: { name: "GoHighLevel Quick Start", usd: 499, type: "ghl", eta: "about 7 days", features: ["Sub-account setup & branding", "1 pipeline + custom fields", "1 funnel or landing page", "5 core automations", "Calendar & phone setup", "Recorded training"] },
  growth: { name: "GoHighLevel Growth System", usd: 689, type: "ghl", eta: "2–3 weeks", features: ["Everything in Quick Start", "Full customer journey mapping", "Up to 3 funnels / website", "20+ automations & nurture", "Conversation AI bot", "Reputation management", "Reporting dashboard", "30 days post-launch support"] },
  agency: { name: "GoHighLevel Agency / SaaS", usd: 876, type: "ghl", eta: "3–5 weeks", features: ["Agency account architecture", "SaaS mode & Stripe rebilling", "Custom niche snapshot", "Client onboarding automation", "Custom domain & mobile app branding", "API & integration work", "60 days priority support"] },
};
const PACKAGE_DISCOUNT = 20; // % founding-client discount (keep in sync with pricing.js)
async function usdToNgn(env) {
  const cached = await env.PORTAL.get("fx:NGN");
  if (cached) return +cached;
  let rate = 1550;
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { cf: { cacheTtl: 43200 } });
    const d = await r.json();
    if (d && d.rates && d.rates.NGN > 100) rate = d.rates.NGN;
  } catch (e) {}
  await env.PORTAL.put("fx:NGN", String(rate), { expirationTtl: 43200 });
  return rate;
}
async function fxRates(env) {
  const cached = await get(env, "fx:all2");
  if (cached) return cached;
  let rates = { USD: 1, NGN: 1550, GBP: 0.78, EUR: 0.92 };
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/USD", { cf: { cacheTtl: 43200 } });
    const d = await r.json();
    if (d && d.rates && d.rates.NGN > 100 && d.rates.GBP > 0) rates = { USD: 1, NGN: d.rates.NGN, GBP: d.rates.GBP, EUR: d.rates.EUR || 0.92 };
  } catch (e) {}
  await put(env, "fx:all2", rates, 43200);
  return rates;
}
async function packagePrice(env, key) {
  const pk = PACKAGES[key]; if (!pk) return null;
  const usd = Math.round(pk.usd * (100 - PACKAGE_DISCOUNT)) / 100;
  const ngn = Math.round((usd * (await usdToNgn(env))) / 1000) * 1000;
  return { key, name: pk.name, type: pk.type, eta: pk.eta, features: pk.features, usdList: pk.usd, usd, discount: PACKAGE_DISCOUNT, currency: "NGN", amount: ngn };
}
async function payPackage(env, url) {
  const pr = await packagePrice(env, clean(url.searchParams.get("p"), 30));
  return pr ? json({ package: pr, ready: !!env.PAYSTACK_SECRET_KEY }) : fail(404, "That package was not found.");
}
async function payPackageStart(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return fail(400, "Please try again.");
  const pr = await packagePrice(env, clean(b.p, 30));
  if (!pr) return fail(404, "That package was not found.");
  const email = clean(b.email, 200).toLowerCase();
  if (!clean(b.name) || !emailOk(email)) return fail(400, "Please enter your name and a valid email.");
  const ip = req.headers.get("cf-connecting-ip") || "unknown", rk = "prate:" + ip, n = +(await env.PORTAL.get(rk)) || 0;
  if (n >= 10) return fail(429, "Too many attempts. Please try again in an hour, or message us on WhatsApp.");
  await env.PORTAL.put(rk, String(n + 1), { expirationTtl: 3600 });
  const q = { id: rid(12), name: clean(b.name, 80), email, business: clean(b.business, 120), whatsapp: clean(b.whatsapp, 40), currency: "NGN",
    services: [{ type: pr.type, title: pr.name, amount: pr.amount, eta: pr.eta }], total: pr.amount, usd: pr.usd,
    note: "Paid directly from the website (" + pr.name + ", " + pr.discount + "% founding-client discount applied).", status: "pending", createdAt: now(), source: "website" };
  await put(env, "payreq:" + q.id, q);
  const idx = (await get(env, "payreqs:index")) || []; idx.push(q.id); await put(env, "payreqs:index", idx.slice(-1000));
  if (b.mode === "transfer") return json({ r: q.id });
  return payStart(env, new Request(req.url, { method: "POST", body: JSON.stringify({ r: q.id }) }), origin);
}

/* ---------------- Admin notifications feed ---------------- */
async function adminFeed(env) {
  const seen = (await get(env, "feed:seen")) || {};
  const items = [];
  const bidx = ((await get(env, "briefs:index")) || []).slice(-60);
  for (const id of bidx) {
    const b = await get(env, "brief:" + id); if (!b) continue;
    const offer = /free design/i.test(b.source);
    items.push({ kind: offer ? "offer" : "brief", id: b.id, at: b.at, unread: !b.read, title: b.subject, sub: [b.name, b.business, b.email].filter(Boolean).join(" · ") + " · via " + b.source });
  }
  const pidx = ((await get(env, "payreqs:index")) || []).slice(-60);
  for (const id of pidx) {
    const q = await get(env, "payreq:" + id);
    if (q && q.status === "pending" && q.transfer) items.push({ kind: "transfer", id: q.id, at: q.transfer.at, unread: !seen["tr:" + q.id],
      title: "Bank transfer to check: " + (q.currency === "NGN" ? "₦" : q.currency + " ") + q.total.toLocaleString("en-GB") + " from " + (q.business || q.name),
      sub: "Sent to the " + (q.transfer.currency || "?") + " account" + (q.transfer.payer ? " by " + q.transfer.payer : "") + " · reference VIX-" + q.id.slice(0, 6).toUpperCase() + " · confirm in Payments" });
    if (!q || q.status !== "paid") continue;
    items.push({ kind: "payment", id: q.id, at: q.paidAt, unread: !seen["pay:" + q.id], clientId: q.clientId,
      title: "Payment received: " + (q.currency === "NGN" ? "₦" : q.currency + " ") + q.total.toLocaleString("en-GB") + " from " + (q.business || q.name),
      sub: q.services.map((s) => s.title || defaultTitle(s.type)).join(", ") + (q.source === "website" ? " · paid directly on the website" : " · via payment link") });
  }
  const cidx = (await get(env, "clients:index")) || [];
  for (const cid of cidx) {
    const c = await get(env, "client:" + cid); if (!c) continue;
    for (const pid of c.projectIds || []) {
      const pj = await get(env, "project:" + pid); if (!pj || !pj.unreadAdmin) continue;
      const last = (pj.messages || []).filter((m) => m.from === "client").slice(-1)[0];
      if (last) items.push({ kind: "message", id: pj.id, at: last.at, unread: true, clientId: c.id, title: "New message from " + c.name + " (" + pj.title + ")", sub: last.text.slice(0, 160) });
    }
  }
  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return json({ items: items.slice(0, 80), unread: items.filter((i) => i.unread).length });
}
async function adminFeedSeen(env, req) {
  const b = await req.json().catch(() => ({}));
  const seen = (await get(env, "feed:seen")) || {};
  if (b.kind === "payment") seen["pay:" + clean(b.id, 40)] = 1;
  if (b.kind === "transfer") seen["tr:" + clean(b.id, 40)] = 1;
  if (b.kind === "brief" || b.kind === "offer") { const it = await get(env, "brief:" + clean(b.id, 40)); if (it) { it.read = true; await put(env, "brief:" + it.id, it); } }
  if (b.all) {
    for (const id of ((await get(env, "payreqs:index")) || [])) seen["pay:" + id] = 1;
    for (const id of ((await get(env, "briefs:index")) || [])) { const it = await get(env, "brief:" + id); if (it && !it.read) { it.read = true; await put(env, "brief:" + id, it); } }
  }
  await put(env, "feed:seen", seen);
  return json({ ok: true });
}


/* ---------------- Bank transfer (manual) payments ---------------- */
// Account details are entered by the owner in Admin → Settings and stored in KV ("settings:banks"), not in code.
const BANK_CCY = ["USD", "GBP", "EUR", "NGN"];
async function payBanks(env) {
  const banks = ((await get(env, "settings:banks")) || []).filter((b) => b && b.accountNumber);
  return json({ banks, rates: await fxRates(env) });
}
async function adminBanksSave(env, req) {
  const b = await req.json().catch(() => ({}));
  const list = (Array.isArray(b.banks) ? b.banks : []).slice(0, 8).map((x) => ({
    id: clean(x.id, 20) || rid(6), label: clean(x.label, 60), currency: BANK_CCY.includes(x.currency) ? x.currency : "NGN",
    bank: clean(x.bank, 80), accountName: clean(x.accountName, 100), accountNumber: clean(x.accountNumber, 40), extra: clean(x.extra, 600),
  })).filter((x) => x.accountNumber);
  await put(env, "settings:banks", list);
  return json({ ok: true, banks: list });
}
async function payTransferClaim(env, req) {
  const b = await req.json().catch(() => ({}));
  const q = await get(env, "payreq:" + clean(b.r, 40));
  if (!q) return fail(404, "This payment link is not valid.");
  if (q.status !== "pending") return fail(400, q.status === "paid" ? "This invoice is already paid. Thank you!" : "This payment link was cancelled.");
  q.transfer = { at: now(), payer: clean(b.payer, 100), currency: BANK_CCY.includes(b.currency) ? b.currency : "", note: clean(b.note, 300) };
  await put(env, "payreq:" + q.id, q);
  const seen = (await get(env, "feed:seen")) || {}; delete seen["tr:" + q.id]; await put(env, "feed:seen", seen);
  const amountTxt = (q.currency === "NGN" ? "₦" : q.currency + " ") + q.total.toLocaleString("en-GB");
  await sendEmail(env, {
    subject: `🏦 Bank transfer to check: ${amountTxt} from ${q.business || q.name}`,
    replyTo: q.email,
    text: `${q.name}${q.business ? " (" + q.business + ")" : ""} says they've sent a bank transfer.\n\nInvoice: ${amountTxt}${q.usd ? " (USD " + q.usd + ")" : ""}\nPaid into: ${q.transfer.currency || "not specified"} account\nSender name on the transfer: ${q.transfer.payer || "not given"}\nReference: VIX-${q.id.slice(0, 6).toUpperCase()}\nNote: ${q.transfer.note || "none"}\n\nWhen the money is in your account, open Admin → Payments and click "Confirm received". Their project and dashboard will start straight away.\n${"https://vixautomations.pages.dev/portal/admin/"}`,
  });
  return json({ ok: true });
}
async function adminPayConfirm(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const q = await get(env, "payreq:" + clean(b.id, 40));
  if (!q) return fail(404, "Not found.");
  if (q.status === "paid") return fail(400, "Already confirmed.");
  if (q.status === "cancelled") return fail(400, "This link was cancelled.");
  const amountTxt = (q.currency === "NGN" ? "₦" : q.currency + " ") + q.total.toLocaleString("en-GB");
  const r = await createClientWithProjects(env, { name: q.name, email: q.email, business: q.business, whatsapp: q.whatsapp, currency: q.currency, services: q.services }, origin,
    `Bank transfer received (${amountTxt}${q.transfer && q.transfer.currency && q.transfer.currency !== q.currency ? " paid in " + q.transfer.currency : ""}). Your project has officially started! 🚀`);
  q.status = "paid"; q.paidAt = now(); q.channel = "bank transfer" + (q.transfer && q.transfer.currency ? " (" + q.transfer.currency + ")" : ""); q.clientId = r.client.id; q.invite = r.invite;
  await put(env, "payreq:" + q.id, q);
  const seen = (await get(env, "feed:seen")) || {}; seen["tr:" + q.id] = 1; seen["pay:" + q.id] = 1; await put(env, "feed:seen", seen);
  return json({ ok: true, client: publicClient(r.client), invite: r.invite, loginUrl: r.loginUrl, services: q.services, total: q.total, currency: q.currency });
}

/* ---------------- router ---------------- */
export async function onRequest(ctx) {
  const { request: req } = ctx;
  // Accept the KV binding whatever its capitalisation (PORTAL, Portal, portal).
  const kv = ctx.env.PORTAL || ctx.env.Portal || ctx.env.portal;
  const env = Object.assign({}, ctx.env, kv ? { PORTAL: kv } : {});
  if (!env.PORTAL) {
    // Setup help: list the names (never the values) of the settings this deployment can see.
    const seen = Object.keys(env || {}).filter((k) => k !== "ASSETS");
    return json({ error: "The portal database (KV binding PORTAL) is not connected yet.", settingsSeen: seen, adminPasswordSet: !!env.ADMIN_PASSWORD }, 500);
  }
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const m = req.method;
  if (path === "paystack/webhook" && m === "POST") return payWebhook(env, req, url.origin);
  // Public brief/enquiry endpoint, also used by the portfolio site (cross-origin).
  if (path === "brief") {
    const h = cors(req);
    if (m === "OPTIONS") return new Response(null, { status: h ? 204 : 403, headers: h || {} });
    if (m === "POST") {
      if (req.headers.get("origin") && !h) return fail(403, "Request blocked.");
      return brief(env, req, h || {});
    }
  }
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
    if (path === "pay/info" && m === "GET") return payInfo(env, url);
    if (path === "pay/start" && m === "POST") return payStart(env, req, url.origin);
    if (path === "pay/verify" && m === "GET") return payVerify(env, url);
    if (path === "pay/package" && m === "GET") return payPackage(env, url);
    if (path === "pay/package" && m === "POST") return payPackageStart(env, req, url.origin);
    if (path === "pay/banks" && m === "GET") return payBanks(env);
    if (path === "pay/transfer" && m === "POST") return payTransferClaim(env, req);

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
      if (a === "briefs" && m === "GET") return adminBriefs(env);
      if (a === "briefs" && m === "POST") return adminBriefUpdate(env, req);
      if (a === "test-email" && m === "POST") return adminTestEmail(env);
      if (a === "payreqs" && m === "GET") return adminPayList(env);
      if (a === "payreqs" && m === "POST") return adminPayCreate(env, req, url.origin);
      if (a === "payreqs/cancel" && m === "POST") return adminPayCancel(env, req);
      if (a === "feed" && m === "GET") return adminFeed(env);
      if (a === "feed/seen" && m === "POST") return adminFeedSeen(env, req);
      if (a === "banks" && m === "POST") return adminBanksSave(env, req);
      if (a === "payreqs/confirm" && m === "POST") return adminPayConfirm(env, req, url.origin);
    }
    return fail(404, "Not found.");
  } catch (e) {
    return fail(500, "Something went wrong. Please try again.");
  }
}
