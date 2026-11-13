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
  const raw = await loadProjects(env, c), projects = [];
  for (const pj of raw) {
    const q = pj.payreqId && (await get(env, "payreq:" + pj.payreqId));
    const bill = q ? await billingFor(env, q, raw.filter((x) => x.payreqId === pj.payreqId)) : null;
    projects.push({ ...withStages(lockProject(pj, bill)), billing: bill });
  }
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
  await sendEmail(env, { subject: `💬 ${c.business || c.name}: new message`, replyTo: c.email, text: `${text}\n\n— ${c.name}${c.business ? " (" + c.business + ")" : ""}, about "${p.title}"\n\nReply in your admin page (Chats): ${new URL(req.url).origin}/portal/admin/` });
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
    const q = p.payreqId && (await get(env, "payreq:" + p.payreqId));
    if (q && !fullyPaid(q)) return fail(402, "This file unlocks once your balance is paid. Open your dashboard to pay.");
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
    const raw = await loadProjects(env, c), projects = [];
    for (const pj of raw) { const q = pj.payreqId && (await get(env, "payreq:" + pj.payreqId)); projects.push({ ...withStages(pj), billing: q ? await billingFor(env, q, raw.filter((x) => x.payreqId === pj.payreqId)) : null }); }
    out.push({ ...publicClient(c), projects });
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
      previewUrl: "", liveUrl: "", payreqId: b.payreqId || "", updates: [{ at: now(), text: note || (+s.amount > 0 ? "Payment received. Your project has officially started! 🚀" : "Your free website design has started! 🚀 We'll share your first design preview here for you to review.") }],
      deliverables: [], metrics: [], messages: [], unreadAdmin: 0, unreadClient: 1,
    };
    await put(env, "project:" + pid, p);
    c.projectIds.push(pid);
  }
  await put(env, "client:" + c.id, c);
  const token = c.pw ? null : await newInvite(env, c.id);
  return { client: c, projectIds: c.projectIds.slice(-services.length), invite: token ? `${origin}/portal/join/?t=${token}` : null, loginUrl: `${origin}/portal/` };
}
async function adminCreate(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  try {
    const r = await createClientWithProjects(env, b, origin);
    const services = (b.services || []).filter((x) => STAGES[x.type]).map((x) => ({ type: x.type, title: clean(x.title, 120) || defaultTitle(x.type), amount: Math.max(0, +x.amount || 0) }));
    const total = services.reduce((n, x) => n + x.amount, 0);
    let mail = { sent: false, why: "" };
    if (b.sendEmail !== false && total > 0) {
      const m = paymentEmail({ name: r.client.name, business: r.client.business, services, total, currency: clean(b.currency, 4) || r.client.currency, method: "bank transfer", reference: "", invite: r.invite, loginUrl: r.loginUrl, origin });
      mail = await sendClientEmail(env, { to: r.client.email, name: r.client.name, subject: m.subject, html: m.html, text: m.text });
    }
    return json({ ok: true, client: publicClient(r.client), invite: r.invite, loginUrl: r.loginUrl, clientEmailed: mail.sent, clientEmailError: mail.sent ? "" : mail.why });
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
    if (s === stages.length - 1 && !p.deliveredAt) {
      p.deliveredAt = now();
      const q = p.payreqId && (await get(env, "payreq:" + p.payreqId));
      if (q && !fullyPaid(q)) {
        const nx = nextItem(q);
        p.updates.push({ at: now(), text: `🎉 Your project is delivered! Your remaining balance of ${fmtMoney(q.total - planOf(q).items.filter((x) => x.status === "paid").reduce((n, x) => n + x.amount, 0), q.currency)} is now due. Your files and links unlock as soon as it's paid.` });
        if (nx && nx.due === "delivery") {
          await sendClientEmail(env, { to: q.email, name: q.name, subject: "🎉 Your project is ready: final payment due",
            html: `<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#3a4152;font-size:15px;line-height:1.6"><div style="font-weight:700;color:#5b4bff">Vix Automations</div><h2 style="color:#0b1020">Your project is ready 🎉</h2><p>Hi ${escH(String(q.name).split(" ")[0])}, great news: your project is complete. Please pay your remaining balance of <b>${escH(fmtMoney(nx.amount, q.currency))}</b> to unlock your files and links.</p><p><a href="https://vixautomations.pages.dev/pay/?r=${escH(q.id)}" style="display:inline-block;background:#5b4bff;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Pay my balance →</a></p></div>`,
            text: `Your project is ready. Please pay your remaining balance of ${fmtMoney(nx.amount, q.currency)} to unlock your files: https://vixautomations.pages.dev/pay/?r=${q.id}` });
        }
      }
    }
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
  let mail = { sent: false, why: "" };
  if (b.kind === "message" && b.email !== false) {
    const c = await get(env, "client:" + p.clientId);
    if (c && c.email) {
      const m = messageEmail({ name: c.name, text, link: new URL(req.url).origin + "/portal/", project: p.title });
      mail = await sendClientEmail(env, { to: c.email, name: c.name, subject: m.subject, html: m.html, text: m.text });
    }
  }
  return json({ ok: true, project: withStages(p), emailed: mail.sent, emailError: mail.sent ? "" : mail.why });
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

/* ---------- phone push notifications (Web Push, no third-party service) ---------- */
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
async function vapidKeys(env) {
  let k = await get(env, "push:vapid");
  if (!k) {
    const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    k = { priv: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
    await put(env, "push:vapid", k);
  }
  return k;
}
async function vapidAuth(env, endpoint) {
  const k = await vapidKeys(env);
  const key = await crypto.subtle.importKey("jwk", k.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:" + NOTIFY_EMAIL })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${k.pub}`;
}
async function hkdf(salt, ikm, info, bytes) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, k, bytes * 8));
}
// RFC 8291 (aes128gcm) payload encryption.
async function encryptPush(sub, payload) {
  const ua = unb64u(sub.keys.p256dh), auth = unb64u(sub.keys.auth);
  const eph = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const as = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256));
  const ikm = await hkdf(auth, shared, cat(enc.encode("WebPush: info\0"), ua, as), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, cat(enc.encode(payload), new Uint8Array([2]))));
  return cat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([as.length]), as, ct);
}
async function pushAdmin(env, { title, body, url }) {
  const subs = (await get(env, "push:subs")) || [];
  if (!subs.length) return { sent: 0 };
  const payload = JSON.stringify({ title: String(title).slice(0, 120), body: String(body || "").slice(0, 300), url: url || "/portal/admin/" });
  let sent = 0; const keep = [];
  await Promise.all(subs.map(async (s) => {
    try {
      const r = await fetch(s.endpoint, { method: "POST", headers: { authorization: await vapidAuth(env, s.endpoint), "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: "86400", urgency: "high" }, body: await encryptPush(s, payload) });
      if (r.status === 404 || r.status === 410) return; // phone unsubscribed: forget it
      if (r.ok) sent++;
      keep.push(s);
    } catch (e) { keep.push(s); }
  }));
  if (keep.length !== subs.length) await put(env, "push:subs", keep);
  return { sent, devices: keep.length };
}
async function pushKey(env) { return json({ key: (await vapidKeys(env)).pub }); }
async function pushSubscribe(env, req) {
  const b = await req.json().catch(() => ({}));
  const s = b.subscription || {};
  if (!/^https:\/\//.test(s.endpoint || "") || !s.keys || !s.keys.p256dh || !s.keys.auth) return fail(400, "Invalid subscription.");
  const subs = ((await get(env, "push:subs")) || []).filter((x) => x.endpoint !== s.endpoint);
  subs.push({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, device: clean(b.device, 80), at: now() });
  await put(env, "push:subs", subs.slice(-10));
  return json({ ok: true, devices: subs.length });
}
async function pushTest(env) {
  const r = await pushAdmin(env, { title: "🔔 Phone alerts are on", body: "You'll get a notification here for every new quote, payment and client message." });
  return json({ ok: true, ...r });
}
async function sendEmail(env, { subject, text, replyTo }) {
  const pushing = pushAdmin(env, { title: subject, body: String(text || "").split("\n").filter(Boolean)[0] || "" }).catch(() => {});
  if (!env.RESEND_API_KEY) { await pushing; return { sent: false, why: "RESEND_API_KEY not set" }; }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM || "Vix Automations Website <onboarding@resend.dev>", to: [env.NOTIFY_EMAIL || NOTIFY_EMAIL], reply_to: replyTo || undefined, subject, text }),
    });
    await pushing;
    return r.ok ? { sent: true } : { sent: false, why: "Resend " + r.status + ": " + (await r.text()).slice(0, 200) };
  } catch (e) { await pushing; return { sent: false, why: "Email service unreachable" }; }
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
    subject: "🔔 " + item.subject,
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



/* ---------------- Payment plans: full, half now + half on delivery, instalments ---------------- */
const PLAN_MAX_DAYS = 45;
const PLAN_INTERVALS = [7, 14, 21, 30];
const roundAmt = (v, c) => (c === "NGN" ? Math.round(v / 100) * 100 : Math.round(v * 100) / 100);
const addDays = (iso, d) => new Date(new Date(iso).getTime() + d * 864e5).toISOString().slice(0, 10);
function buildPlan(q, p) {
  const type = ["full", "half", "instal"].includes(p && p.type) ? p.type : "full";
  let shares, meta = {};
  if (type === "full") shares = [1];
  else if (type === "half") shares = [0.5, 0.5];
  else {
    const count = Math.max(2, Math.min(4, (+p.count) | 0 || 2));
    const interval = PLAN_INTERVALS.includes(+p.interval) ? +p.interval : 14;
    if ((count - 1) * interval > PLAN_MAX_DAYS) throw new Error("Instalments must be fully paid within 45 days. Choose fewer payments or a shorter interval.");
    shares = Array.from({ length: count }, () => 1 / count); meta = { count, interval };
  }
  let acc = 0, accU = 0;
  const items = shares.map((sh, k) => {
    const last = k === shares.length - 1;
    const amount = last ? roundAmt(q.total - acc, q.currency) : roundAmt(q.total * sh, q.currency); acc += amount;
    let usd = null;
    if (q.usd) { usd = last ? Math.round((q.usd - accU) * 100) / 100 : Math.round(q.usd * sh * 100) / 100; accU += usd; }
    const due = k === 0 ? "now" : type === "half" ? "delivery" : addDays(now(), k * meta.interval);
    return { i: k, amount, usd, due, status: "pending" };
  });
  return { type, ...meta, items, createdAt: now() };
}
function planOf(q) {
  if (q.plan) return q.plan;
  return { type: "full", items: [{ i: 0, amount: q.total, usd: q.usd || null, due: "now", status: q.status === "paid" ? "paid" : "pending", paidAt: q.paidAt || null }] };
}
const fullyPaid = (q) => planOf(q).items.every((x) => x.status === "paid");
const nextItem = (q) => planOf(q).items.find((x) => x.status !== "paid") || null;
function planLabel(pl) {
  if (pl.type === "half") return "Half now, half on delivery";
  if (pl.type === "instal") return pl.count + " instalments, every " + (pl.interval === 30 ? "month" : pl.interval / 7 + " week" + (pl.interval > 7 ? "s" : ""));
  return "Paid in full";
}
// Where the next payment stands: now | overdue | soon | scheduled | after-delivery | delivery-due
async function billingFor(env, q, projects) {
  const pl = planOf(q), it = nextItem(q);
  const paid = pl.items.filter((x) => x.status === "paid").reduce((n, x) => n + x.amount, 0);
  let next = null;
  if (it) {
    const delivered = (projects || []).some((x) => x.deliveredAt);
    let state = "scheduled", days = null;
    if (it.due === "now") state = "now";
    else if (it.due === "delivery") state = delivered ? "delivery-due" : "after-delivery";
    else {
      days = Math.ceil((new Date(it.due + "T23:59:59+01:00").getTime() - Date.now()) / 864e5);
      state = days < 0 ? "overdue" : days <= 3 ? "soon" : "scheduled";
    }
    next = { i: it.i, amount: it.amount, usd: it.usd, due: it.due, state, days, claimed: !!(q.transfer && q.transfer.i === it.i && it.status !== "paid") };
  }
  return { payreqId: q.id, type: pl.type, label: planLabel(pl), currency: q.currency, total: q.total, paid, balance: Math.max(0, q.total - paid),
    fullyPaid: !it, items: pl.items.map((x) => ({ i: x.i, amount: x.amount, due: x.due, status: x.status, paidAt: x.paidAt || null })), next, payUrl: "/pay/?r=" + q.id };
}
// Lock finished work until the balance is paid.
function lockProject(pj, bill) {
  if (!bill || bill.fullyPaid) return pj;
  return { ...pj, liveUrl: "", liveLocked: !!pj.liveUrl,
    deliverables: (pj.deliverables || []).map((d) => ({ id: d.id, title: d.title, at: d.at, isNew: d.isNew, locked: true, size: d.size, name: d.name })) };
}
async function markItemPaid(env, q, i, channel, reference, origin) {
  const pl = q.plan || (q.plan = planOf(q));
  const it = pl.items[i]; if (!it || it.status === "paid") return { already: true };
  it.status = "paid"; it.paidAt = now(); it.channel = channel || ""; it.ref = reference || "";
  // Instalment dates count from the day of the first payment.
  if (i === 0 && pl.type === "instal") pl.items.forEach((x, k) => { if (k > 0) x.due = addDays(it.paidAt, k * pl.interval); });
  if (q.transfer && q.transfer.i === i) q.transfer = null;
  return { it };
}
async function afterInstalment(env, q, it, origin) {
  const pl = planOf(q), done = fullyPaid(q), nx = nextItem(q);
  const money = (n) => fmtMoney(n, q.currency);
  const balance = q.total - pl.items.filter((x) => x.status === "paid").reduce((n, x) => n + x.amount, 0);
  const text = done ? `Payment of ${money(it.amount)} received. You've now paid in full ✓ All your files and links are unlocked. Thank you!`
    : `Payment of ${money(it.amount)} received (payment ${it.i + 1} of ${pl.items.length}). Remaining balance: ${money(balance)}${nx && nx.due !== "delivery" && nx.due !== "now" ? ", next payment due " + nx.due : nx && nx.due === "delivery" ? ", due when your project is delivered" : ""}.`;
  for (const pid of q.projectIds || []) {
    const pj = await get(env, "project:" + pid); if (!pj) continue;
    pj.updates.push({ at: now(), text }); pj.unreadClient = (pj.unreadClient || 0) + 1;
    await put(env, "project:" + pj.id, pj);
  }
  const subject = done ? "✅ Paid in full: your project is unlocked" : `Payment received: ${money(it.amount)} (payment ${it.i + 1} of ${pl.items.length})`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#3a4152;font-size:15px;line-height:1.6"><div style="font-weight:700;color:#5b4bff">Vix Automations</div><h2 style="color:#0b1020;margin:12px 0">${escH(subject)}</h2><p>Hi ${escH(String(q.name).split(" ")[0])},</p><p>${escH(text)}</p><p><a href="${escH(origin)}/portal/" style="display:inline-block;background:#5b4bff;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px">Open my client dashboard →</a></p><p style="font-size:13px;color:#7c849c">Questions? Reply to this email or WhatsApp +44 7723 149573.</p></div>`;
  await sendClientEmail(env, { to: q.email, name: q.name, subject, html, text });
  await sendEmail(env, { subject: `💰 ${done ? "Paid in full" : "Instalment received"}: ${money(it.amount)} from ${q.business || q.name}`, replyTo: q.email, text: text + `\n\nPlan: ${planLabel(pl)}\nOpen your admin page: ${origin}/portal/admin/` });
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
  if (!q) return fail(404, "This payment link is not valid. Please ask us for a new one.");
  const projects = (await Promise.all((q.projectIds || []).map((id) => get(env, "project:" + id)))).filter(Boolean);
  return json({ request: payPublic(q), plan: q.plan || null, billing: await billingFor(env, q, projects), maxDays: PLAN_MAX_DAYS, ready: !!env.PAYSTACK_SECRET_KEY });
}
async function payStart(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const q = await get(env, "payreq:" + clean(b.r, 40));
  if (!q) return fail(404, "This payment link is not valid.");
  if (q.status === "cancelled") return fail(400, "This payment link has been cancelled. Please ask us for a new one.");
  if (q.status !== "paid" && b.plan) { try { q.plan = buildPlan(q, b.plan); await put(env, "payreq:" + q.id, q); } catch (e) { return fail(400, e.message); } }
  const it = nextItem(q);
  if (!it) return fail(400, "This invoice has already been paid in full. Thank you!");
  if (b.consent !== true) return fail(400, "Please tick the box to authorise this payment before continuing.");
  q.consents = (q.consents || []).concat({ i: it.i, amount: it.amount, currency: q.currency, at: now(),
    ip: req.headers.get("cf-connecting-ip") || "", country: req.headers.get("cf-ipcountry") || "",
    text: `I authorise Vix Automations to charge ${fmtMoney(it.amount, q.currency)} to my card or account today. This is a one-time payment; no future payment will be taken without my approval.` }).slice(-20);
  await put(env, "payreq:" + q.id, q);
  const pl0 = planOf(q), what = q.services.map((x) => x.title || defaultTitle(x.type)).join(", ") + (pl0.items.length > 1 ? ` (payment ${it.i + 1} of ${pl0.items.length})` : "");
  const reference = "vix_" + q.id + "_" + it.i + "_" + rid(6).replace(/[^A-Za-z0-9]/g, "");
  try {
    const d = await paystack(env, "/transaction/initialize", { method: "POST", body: JSON.stringify({
      email: q.email, amount: Math.round(it.amount * 100), currency: q.currency, reference,
      callback_url: `${origin}/pay/done/`,
      metadata: { payreq: q.id, instalment: it.i + 1, business: q.business, cancel_action: `${origin}/pay/?r=${q.id}`,
        custom_fields: [
          { display_name: "Merchant", variable_name: "merchant", value: "Vix Automations" },
          { display_name: "Payment for", variable_name: "payment_for", value: what.slice(0, 120) },
          { display_name: "Customer", variable_name: "customer", value: (q.business || q.name).slice(0, 80) },
          { display_name: "Authorised by customer", variable_name: "authorised", value: "Yes, one-time payment" },
        ] },
    }) });
    await env.PORTAL.put("payref:" + reference, JSON.stringify({ id: q.id, i: it.i }));
    return json({ url: d.authorization_url });
  } catch (e) { return fail(502, e.message); }
}
async function fulfil(env, reference, tx, origin) {
  const raw = await env.PORTAL.get("payref:" + reference);
  let ref = null; try { ref = JSON.parse(raw); } catch { ref = raw ? { id: raw, i: 0 } : null; }
  if (ref && typeof ref !== "object") ref = { id: String(ref), i: 0 };
  const q = ref && (await get(env, "payreq:" + ref.id));
  if (!q) return { error: "Payment not recognised." };
  const pl = planOf(q), item = pl.items[ref.i || 0];
  if (!item) return { error: "Payment not recognised." };
  if (item.status === "paid") return { q, item };
  if (!tx || tx.status !== "success") return { error: "Payment was not completed." };
  if (Number(tx.amount) !== Math.round(item.amount * 100) || String(tx.currency).toUpperCase() !== q.currency) return { error: "Payment amount did not match the invoice. We've been notified." };
  // Lock to avoid double fulfilment (webhook + browser at the same time).
  const lockKey = "paylock:" + q.id + ":" + item.i;
  if (await env.PORTAL.get(lockKey)) return { q, item, pending: true };
  await env.PORTAL.put(lockKey, "1", { expirationTtl: 120 });
  const channel = "Paystack" + (tx.channel ? " (" + String(tx.channel).replace(/_/g, " ") + ")" : "");
  if (q.status === "paid") {
    // A later instalment / balance payment.
    const m = await markItemPaid(env, q, item.i, channel, reference, origin);
    await put(env, "payreq:" + q.id, q);
    if (m.it) await afterInstalment(env, q, m.it, origin);
    return { q, item, fresh: true };
  }
  const amountTxt = fmtMoney(item.amount, q.currency);
  const planTxt = pl.type === "full" ? "" : " (" + planLabel(pl).toLowerCase() + ")";
  const r = await createClientWithProjects(env, { name: q.name, email: q.email, business: q.business, whatsapp: q.whatsapp, currency: q.currency, services: q.services, payreqId: q.id }, origin,
    `Payment of ${amountTxt} received via Paystack${planTxt}. Your project has officially started! 🚀`);
  await markItemPaid(env, q, item.i, channel, reference, origin);
  q.projectIds = r.projectIds;
  q.status = "paid"; q.paidAt = now(); q.reference = reference; q.clientId = r.client.id; q.invite = r.invite; q.channel = tx.channel || "";
  await emailPaidClient(env, q, r, origin, "Paystack" + (tx.channel ? " (" + String(tx.channel).replace(/_/g, " ") + ")" : ""), reference);
  await put(env, "payreq:" + q.id, q);
  await sendEmail(env, {
    subject: `💰 Payment received: ${amountTxt} from ${q.business || q.name}${planTxt}`,
    replyTo: q.email,
    text: `${q.name}${q.business ? " (" + q.business + ")" : ""} just paid ${amountTxt} via Paystack${planTxt}.\n\nServices:\n${q.services.map((s) => "• " + (s.title || defaultTitle(s.type)) + ": " + s.amount.toLocaleString("en-GB")).join("\n")}\n\nReference: ${reference}\nEmail: ${q.email}\nWhatsApp: ${q.whatsapp || "not given"}\n\nTheir dashboard and projects were created automatically.${r.invite ? "\nTheir dashboard link (also shown to them after payment): " + r.invite : ""}\n\nOpen your admin page: ${origin}/portal/admin/`,
  });
  return { q, item, fresh: true };
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
  const projects = (await Promise.all((r.q.projectIds || []).map((id) => get(env, "project:" + id)))).filter(Boolean);
  return json({ ok: true, name: r.q.name, business: r.q.business, total: r.q.total, currency: r.q.currency, paidNow: r.item ? r.item.amount : r.q.total,
    instalment: !!(r.item && r.item.i > 0), billing: await billingFor(env, r.q, projects),
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
  if (b.plan) { try { buildPlan({ total: pr.amount, currency: "NGN", usd: pr.usd }, b.plan); } catch (e) { return fail(400, e.message); } }
  if (b.mode !== "transfer" && b.consent !== true) return fail(400, "Please tick the box to authorise this payment before continuing.");
  const ip = req.headers.get("cf-connecting-ip") || "unknown", rk = "prate:" + ip, n = +(await env.PORTAL.get(rk)) || 0;
  if (n >= 10) return fail(429, "Too many attempts. Please try again in an hour, or message us on WhatsApp.");
  await env.PORTAL.put(rk, String(n + 1), { expirationTtl: 3600 });
  const q = { id: rid(12), name: clean(b.name, 80), email, business: clean(b.business, 120), whatsapp: clean(b.whatsapp, 40), currency: "NGN",
    services: [{ type: pr.type, title: pr.name, amount: pr.amount, eta: pr.eta }], total: pr.amount, usd: pr.usd,
    note: "Paid directly from the website (" + pr.name + ", " + pr.discount + "% founding-client discount applied).", status: "pending", createdAt: now(), source: "website" };
  await put(env, "payreq:" + q.id, q);
  const idx = (await get(env, "payreqs:index")) || []; idx.push(q.id); await put(env, "payreqs:index", idx.slice(-1000));
  if (b.plan) { try { q.plan = buildPlan(q, b.plan); await put(env, "payreq:" + q.id, q); } catch (e) { return fail(400, e.message); } }
  if (b.mode === "transfer") return json({ r: q.id });
  return payStart(env, new Request(req.url, { method: "POST", headers: { "cf-connecting-ip": req.headers.get("cf-connecting-ip") || "", "cf-ipcountry": req.headers.get("cf-ipcountry") || "" }, body: JSON.stringify({ r: q.id, consent: b.consent === true }) }), origin);
}

/* ---------------- Admin notifications feed ---------------- */
async function adminFeed(env) {
  const seen = (await get(env, "feed:seen")) || {};
  const items = [];
  const bidx = ((await get(env, "briefs:index")) || []).slice(-60);
  for (const id of bidx) {
    const b = await get(env, "brief:" + id); if (!b) continue;
    const offer = /free design/i.test(b.source), founding = /founding/i.test(b.source);
    items.push({ kind: offer ? "offer" : founding ? "founding" : "brief", id: b.id, at: b.at, unread: !b.read, title: b.subject, sub: [b.name, b.business, b.email].filter(Boolean).join(" · ") + " · via " + b.source });
  }
  const pidx = ((await get(env, "payreqs:index")) || []).slice(-60);
  for (const id of pidx) {
    const q = await get(env, "payreq:" + id);
    if (q && q.status !== "cancelled" && q.transfer) items.push({ kind: "transfer", id: q.id, at: q.transfer.at, unread: !seen["tr:" + q.id],
      title: "Bank transfer to check: " + fmtMoney(q.transfer.amount || q.total, q.currency) + " from " + (q.business || q.name),
      sub: "Sent to the " + (q.transfer.currency || "?") + " account" + (q.transfer.payer ? " by " + q.transfer.payer : "") + " · reference VIX-" + q.id.slice(0, 6).toUpperCase() + " · confirm in Payments" });
    if (!q || q.status !== "paid") continue;
    const pl = planOf(q), many = pl.items.length > 1;
    pl.items.forEach((x) => {
      if (x.status === "paid") items.push({ kind: "payment", id: q.id + (x.i ? ":" + x.i : ""), at: x.paidAt || q.paidAt, unread: !seen["pay:" + q.id + (x.i ? ":" + x.i : "")], clientId: q.clientId,
        title: "Payment received: " + fmtMoney(x.amount, q.currency) + " from " + (q.business || q.name) + (many ? " (" + (x.i + 1) + " of " + pl.items.length + ")" : ""),
        sub: q.services.map((s) => s.title || defaultTitle(s.type)).join(", ") + " · " + planLabel(pl) + (q.source === "website" ? " · paid on the website" : "") });
      else if (/^\d{4}-/.test(x.due) && new Date(x.due + "T23:59:59+01:00").getTime() < Date.now()) items.push({ kind: "overdue", id: q.id + ":" + x.i, at: x.due + "T23:59:59+01:00", unread: !seen["od:" + q.id + ":" + x.i], clientId: q.clientId,
        title: "Payment overdue: " + fmtMoney(x.amount, q.currency) + " from " + (q.business || q.name), sub: "Payment " + (x.i + 1) + " of " + pl.items.length + " was due " + x.due + " · their files stay locked until paid" });
    });
  }
  const btz = (await bookSettings(env)).tz;
  for (const id of ((await get(env, "bookings:index")) || []).slice(-60)) {
    const k = await get(env, "booking:" + id); if (!k || k.cancelled) continue;
    items.push({ kind: "call", id: k.id, at: k.at, unread: !k.read, title: "Strategy call booked: " + (k.business || k.name) + " · " + fmtWhen(k.start, btz),
      sub: (k.platform === "zoom" ? "Zoom" : "Google Meet") + " · " + k.email + (k.whatsapp ? " · " + k.whatsapp : "") + (k.link ? "" : " · no call link yet") });
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
  if (b.kind === "payment") seen["pay:" + clean(b.id, 50)] = 1;
  if (b.kind === "transfer") seen["tr:" + clean(b.id, 40)] = 1;
  if (b.kind === "overdue") seen["od:" + clean(b.id, 50)] = 1;
  if (b.kind === "brief" || b.kind === "offer" || b.kind === "founding") { const it = await get(env, "brief:" + clean(b.id, 40)); if (it) { it.read = true; await put(env, "brief:" + it.id, it); } }
  if (b.kind === "call") { const k = await get(env, "booking:" + clean(b.id, 40)); if (k) { k.read = true; await put(env, "booking:" + k.id, k); } }
  if (b.all) {
    for (const id of ((await get(env, "bookings:index")) || [])) { const k = await get(env, "booking:" + id); if (k && !k.read) { k.read = true; await put(env, "booking:" + id, k); } }
    for (const id of ((await get(env, "payreqs:index")) || [])) { seen["pay:" + id] = 1; for (let k = 1; k < 4; k++) seen["pay:" + id + ":" + k] = 1; }
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
  return json({ banks, rates: await fxRates(env), intl: (await paySettings(env)).intl });
}
async function paySettings(env) { return (await get(env, "settings:pay")) || { intl: false }; }
async function adminPaySettingsSave(env, req) {
  const b = await req.json().catch(() => ({}));
  const v = { intl: b.intl === true }; await put(env, "settings:pay", v); return json({ ok: true, settings: v });
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
  if (q.status === "cancelled") return fail(400, "This payment link was cancelled.");
  if (q.status !== "paid" && b.plan) { try { q.plan = buildPlan(q, b.plan); } catch (e) { return fail(400, e.message); } }
  const it = nextItem(q);
  if (!it) return fail(400, "This invoice is already paid in full. Thank you!");
  q.transfer = { at: now(), i: it.i, amount: it.amount, payer: clean(b.payer, 100), currency: BANK_CCY.includes(b.currency) ? b.currency : "", note: clean(b.note, 300) };
  await put(env, "payreq:" + q.id, q);
  const seen = (await get(env, "feed:seen")) || {}; delete seen["tr:" + q.id]; await put(env, "feed:seen", seen);
  const amountTxt = fmtMoney(it.amount, q.currency) + (planOf(q).items.length > 1 ? ` (payment ${it.i + 1} of ${planOf(q).items.length})` : "");
  await sendEmail(env, {
    subject: `🏦 Bank transfer to check: ${amountTxt} from ${q.business || q.name}`,
    replyTo: q.email,
    text: `${q.name}${q.business ? " (" + q.business + ")" : ""} says they've sent a bank transfer.\n\nAmount: ${amountTxt}${it.usd ? " (USD " + it.usd + ")" : ""}\nPaid into: ${q.transfer.currency || "not specified"} account\nSender name on the transfer: ${q.transfer.payer || "not given"}\nReference: VIX-${q.id.slice(0, 6).toUpperCase()}\nNote: ${q.transfer.note || "none"}\n\nWhen the money is in your account, open Admin → Payments and click "Confirm received". Their project and dashboard will start straight away.\n${"https://vixautomations.pages.dev/portal/admin/"}`,
  });
  return json({ ok: true });
}
async function adminPayConfirm(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const q = await get(env, "payreq:" + clean(b.id, 40));
  if (!q) return fail(404, "Not found.");
  if (q.status === "cancelled") return fail(400, "This link was cancelled.");
  const nx = nextItem(q);
  if (!nx) return fail(400, "Already paid in full.");
  if (q.status === "paid") {
    const ch = "bank transfer" + (q.transfer && q.transfer.currency ? " (" + q.transfer.currency + ")" : "");
    const m = await markItemPaid(env, q, nx.i, ch, "VIX-" + q.id.slice(0, 6).toUpperCase(), origin);
    await put(env, "payreq:" + q.id, q);
    if (m.it) await afterInstalment(env, q, m.it, origin);
    const seen0 = (await get(env, "feed:seen")) || {}; seen0["tr:" + q.id] = 1; seen0["pay:" + q.id + ":" + nx.i] = 1; await put(env, "feed:seen", seen0);
    return json({ ok: true, instalment: true, fullyPaid: fullyPaid(q), amount: nx.amount, currency: q.currency });
  }
  const amountTxt = fmtMoney(nx.amount, q.currency);
  const r = await createClientWithProjects(env, { name: q.name, email: q.email, business: q.business, whatsapp: q.whatsapp, currency: q.currency, services: q.services, payreqId: q.id }, origin,
    `Bank transfer received (${amountTxt}${q.transfer && q.transfer.currency && q.transfer.currency !== q.currency ? " paid in " + q.transfer.currency : ""}). Your project has officially started! 🚀`);
  const ch0 = "bank transfer" + (q.transfer && q.transfer.currency ? " (" + q.transfer.currency + ")" : "");
  await markItemPaid(env, q, nx.i, ch0, "VIX-" + q.id.slice(0, 6).toUpperCase(), origin);
  q.projectIds = r.projectIds;
  q.status = "paid"; q.paidAt = now(); q.channel = ch0; q.clientId = r.client.id; q.invite = r.invite;
  const mail = await emailPaidClient(env, q, r, origin, q.channel, "VIX-" + q.id.slice(0, 6).toUpperCase());
  await put(env, "payreq:" + q.id, q);
  const seen = (await get(env, "feed:seen")) || {}; seen["tr:" + q.id] = 1; seen["pay:" + q.id] = 1; await put(env, "feed:seen", seen);
  return json({ ok: true, client: publicClient(r.client), invite: r.invite, loginUrl: r.loginUrl, services: q.services, total: q.total, currency: q.currency, clientEmailed: mail.sent, clientEmailError: mail.sent ? "" : mail.why });
}


/* ---------------- Emails to clients (payment confirmation + dashboard link) ---------------- */
// Two ways to send, used in this order:
//   1) Resend with your own verified domain: set EMAIL_FROM (e.g. "Vix Automations <hello@vixautomations.com>") + RESEND_API_KEY.
//   2) EmailJS connected to your Gmail (no domain needed): set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY.
// The EmailJS template must use {{to_email}} as "To Email", {{subject}} as subject and {{{message_html}}} as the content.
const escH = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function clientEmailReady(env) {
  if (env.RESEND_API_KEY && env.EMAIL_FROM && !/resend\.dev/i.test(env.EMAIL_FROM)) return "resend";
  if (env.EMAILJS_SERVICE_ID && env.EMAILJS_TEMPLATE_ID && env.EMAILJS_PUBLIC_KEY && env.EMAILJS_PRIVATE_KEY) return "emailjs";
  return "";
}
async function sendClientEmail(env, { to, name, subject, html, text }) {
  const how = clientEmailReady(env);
  if (!how) return { sent: false, why: "Client emails are not set up yet." };
  try {
    if (how === "resend") {
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], reply_to: NOTIFY_EMAIL, subject, html, text }) });
      return r.ok ? { sent: true, via: "resend" } : { sent: false, why: "Resend " + r.status + ": " + (await r.text()).slice(0, 200) };
    }
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ service_id: env.EMAILJS_SERVICE_ID, template_id: env.EMAILJS_TEMPLATE_ID, user_id: env.EMAILJS_PUBLIC_KEY, accessToken: env.EMAILJS_PRIVATE_KEY,
        template_params: { to_email: to, to_name: name, subject, message_html: html, message_text: text, reply_to: NOTIFY_EMAIL } }) });
    return r.ok ? { sent: true, via: "emailjs" } : { sent: false, why: "EmailJS " + r.status + ": " + (await r.text()).slice(0, 200) };
  } catch (e) { return { sent: false, why: "Email service unreachable" }; }
}
async function adminBriefReply(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const id = clean(b.id, 40), item = await get(env, "brief:" + id);
  if (!item) return fail(404, "Not found.");
  const text = clean(b.text, 6000);
  if (!text) return fail(400, "Write your reply first.");
  if (!item.email) return fail(400, "This person didn't leave an email address. Reply on WhatsApp instead.");
  // If they're already a client, the reply also lands in their dashboard chat.
  let chat = false;
  const cid = await env.PORTAL.get("email:" + item.email.toLowerCase());
  const c = cid && (await get(env, "client:" + cid));
  if (c && (c.projectIds || []).length) {
    const p = await get(env, "project:" + c.projectIds[c.projectIds.length - 1]);
    if (p) { p.messages = (p.messages || []).concat({ at: now(), from: "vix", text }).slice(-200); p.unreadClient = (p.unreadClient || 0) + 1; await put(env, "project:" + p.id, p); chat = true; }
  }
  const m = messageEmail({ name: item.name, text, link: c ? origin + "/portal/" : "", subject: "Re: " + item.subject.replace(/^(re:\s*)+/i, "") });
  const mail = await sendClientEmail(env, { to: item.email, name: item.name, subject: m.subject, html: m.html, text: m.text });
  item.replies = (item.replies || []).concat({ at: now(), text, emailed: mail.sent, chat }).slice(-50);
  item.read = true;
  await put(env, "brief:" + id, item);
  return json({ ok: true, emailed: mail.sent, emailError: mail.sent ? "" : mail.why, chat, isClient: !!c });
}
function messageEmail({ name, text, link, project, subject }) {
  const first = String(name || "").split(" ")[0] || "there";
  subject = subject || "New message from Vix Automations" + (project ? " about " + project : "");
  const paras = escH(text).split(/\n{2,}/).map((x) => `<p style="margin:0 0 14px">${x.replace(/\n/g, "<br>")}</p>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f3f5fb;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5fb;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3e7f2">
<tr><td style="background:#5b4bff;background:linear-gradient(135deg,#3b2cff,#8b5cff);padding:20px 28px;color:#ffffff;font-size:15px;font-weight:700">Vix Automations</td></tr>
<tr><td style="padding:26px 28px;color:#3a4152;font-size:15px;line-height:1.65">
<p style="margin:0 0 14px">Hi ${escH(first)},</p>${paras}
${link ? `<p style="margin:22px 0 6px"><a href="${escH(link)}" style="display:inline-block;background:#5b4bff;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px">${project ? "Reply in your dashboard" : "Open your client dashboard"}</a></p>` : ""}
<p style="margin:22px 0 0">Best regards,<br><b>Promise Felix</b><br>Vix Automations</p></td></tr>
<tr><td style="padding:16px 28px;background:#f8f9fc;color:#7c849c;font-size:12px">You can reply to this email directly${link ? " or message us from your dashboard" : ""}. WhatsApp: +44 7723 149573</td></tr>
</table></td></tr></table></body></html>`;
  const plain = `Hi ${first},\n\n${text}\n\n${link ? (project ? "Reply in your dashboard: " : "Your client dashboard: ") + link + "\n\n" : ""}Best regards,\nPromise Felix\nVix Automations\nWhatsApp: +44 7723 149573`;
  return { subject, html, text: plain };
}
function fmtMoney(n, c) { return ({ NGN: "₦", USD: "$", GBP: "£", EUR: "€" }[c] || c + " ") + Number(n).toLocaleString("en-GB", { maximumFractionDigits: 2 }); }
function paymentEmail({ name, business, services, total, currency, method, reference, invite, loginUrl, origin, planNote }) {
  const first = String(name || "").split(" ")[0] || "there";
  const link = invite || loginUrl;
  const cta = invite ? "Create my client dashboard" : "Open my client dashboard";
  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const rows = services.map((s) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eceef5;color:#3a4152">${escH(s.title || defaultTitle(s.type))}</td><td style="padding:10px 0;border-bottom:1px solid #eceef5;text-align:right;color:#0b1020;font-weight:600">${escH(fmtMoney(s.amount, currency))}</td></tr>`).join("");
  const subject = `Payment confirmed: your ${services.length === 1 ? (services[0].title || defaultTitle(services[0].type)) : "project"} has started 🚀`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f5fb;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5fb;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3e7f2">
<tr><td style="background:linear-gradient(135deg,#3b2cff,#8b5cff);background-color:#5b4bff;padding:26px 28px;color:#ffffff">
<div style="font-size:15px;font-weight:700;letter-spacing:.02em">Vix Automations</div>
<div style="font-size:26px;font-weight:800;line-height:1.2;margin-top:14px">Payment confirmed ✅</div>
<div style="font-size:15px;opacity:.9;margin-top:6px">Your project has officially started 🚀</div></td></tr>
<tr><td style="padding:26px 28px;color:#3a4152;font-size:15px;line-height:1.6">
<p style="margin:0 0 14px">Hi ${escH(first)},</p>
<p style="margin:0 0 18px">Thank you${business ? " for choosing us for <b>" + escH(business) + "</b>" : ""}! We've received your payment and your project is now underway.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${rows}
<tr><td style="padding:12px 0 0;font-weight:700;color:#0b1020">${planNote ? "Project total" : "Total paid"}</td><td style="padding:12px 0 0;text-align:right;font-size:20px;font-weight:800;color:#5b4bff">${escH(fmtMoney(total, currency))}</td></tr></table>
${planNote ? '<div style="margin-top:14px;padding:12px 14px;border-radius:12px;background:#fff8e6;border:1px solid #ffe2a3;font-size:14px;color:#5a4a1a">' + escH(planNote) + "</div>" : ""}
<p style="margin:16px 0 0;font-size:13px;color:#7c849c">Paid by ${escH(method)} · ${escH(date)}${reference ? " · Ref " + escH(reference) : ""}</p>
<div style="margin:26px 0;padding:20px;border-radius:14px;background:#f5f3ff;border:1px solid #e3ddff">
<div style="font-weight:700;color:#0b1020;margin-bottom:6px">Your private client dashboard</div>
<div style="font-size:14px;margin-bottom:16px">Follow every step of your project, read updates from our team, download your files the moment they're ready, and message us any time.</div>
<a href="${escH(link)}" style="display:inline-block;background:#5b4bff;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">${cta} →</a>
${invite ? '<div style="font-size:12px;color:#7c849c;margin-top:12px">This personal link works once and lasts 14 days. After that, log in at ' + escH(loginUrl) + "</div>" : ""}</div>
<p style="margin:0 0 6px;font-weight:700;color:#0b1020">What happens next</p>
<ol style="margin:0 0 18px;padding-left:20px"><li>We'll contact you within one business day with your next steps.</li><li>You'll see each stage of your project on your dashboard.</li><li>Your deliveries will appear there as soon as they're ready.</li></ol>
<p style="margin:0">Questions? Just reply to this email or message us on WhatsApp: <a href="https://wa.me/447723149573" style="color:#5b4bff">+44 7723 149573</a>.</p>
<p style="margin:18px 0 0">Welcome aboard,<br><b>Promise Felix</b><br>Vix Automations</p></td></tr>
<tr><td style="padding:16px 28px;background:#f8f9fd;color:#9aa1b5;font-size:12px;line-height:1.5">Vix Automations · <a href="${escH(origin)}" style="color:#9aa1b5">${escH(origin.replace("https://", ""))}</a> · <a href="${escH(origin)}/refund.html" style="color:#9aa1b5">Refund policy</a></td></tr>
</table></td></tr></table></body></html>`;
  const text = `Hi ${first},\n\nPayment confirmed. Thank you! Your project has officially started.\n\n${services.map((s) => "• " + (s.title || defaultTitle(s.type)) + ": " + fmtMoney(s.amount, currency)).join("\n")}\nTotal paid: ${fmtMoney(total, currency)}\nPaid by ${method} · ${date}${reference ? " · Ref " + reference : ""}\n\n${cta}:\n${link}\n${invite ? "(This personal link works once and lasts 14 days. After that, log in at " + loginUrl + ")\n" : ""}\nWe'll contact you within one business day with your next steps.\n\nWelcome aboard,\nPromise Felix\nVix Automations\nWhatsApp: +44 7723 149573`;
  return { subject, html, text };
}
async function emailPaidClient(env, q, r, origin, method, reference) {
  const pl = planOf(q), paidNow = pl.items.filter((x) => x.status === "paid").reduce((n, x) => n + x.amount, 0), nx = nextItem(q);
  const planNote = pl.type === "full" ? "" : `Payment plan: ${planLabel(pl)}. Paid today: ${fmtMoney(paidNow, q.currency)}. Remaining: ${fmtMoney(q.total - paidNow, q.currency)}` +
    (nx ? (nx.due === "delivery" ? ", due when your project is delivered." : `, next payment ${fmtMoney(nx.amount, q.currency)} due ${nx.due}.`) : ".") + " Your finished files and links unlock once you've paid in full.";
  const m = paymentEmail({ name: q.name, business: q.business, services: q.services, total: q.total, currency: q.currency, method, reference, invite: r.invite, loginUrl: r.loginUrl, origin, planNote });
  const res = await sendClientEmail(env, { to: q.email, name: q.name, subject: m.subject, html: m.html, text: m.text });
  q.clientEmailed = res.sent; if (!res.sent) q.clientEmailError = res.why;
  return res;
}
async function adminTestClientEmail(env, req, origin) {
  const b = await req.json().catch(() => ({}));
  const to = clean(b.to, 200);
  if (!emailOk(to)) return fail(400, "Enter a valid email address.");
  const m = paymentEmail({ name: "Test Client", business: "Test Business", services: [{ type: "website", title: "Website design", amount: 250000 }], total: 250000, currency: "NGN", method: "card (test)", reference: "TEST-123", invite: origin + "/portal/join/?t=example-test-link", loginUrl: origin + "/portal/", origin });
  const res = await sendClientEmail(env, { to, name: "Test Client", subject: "[TEST] " + m.subject, html: m.html, text: m.text });
  return res.sent ? json({ ok: true, via: res.via }) : fail(400, res.why);
}

/* ---------------- router ---------------- */

/* ---------------- Strategy call booking (Google Meet or Zoom) ---------------- */
// Availability and fallback meeting links are edited in Admin → Settings (KV "settings:book").
// Optional automation, all set in Cloudflare (never in code):
//   GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET → "Connect Google Calendar" in admin: unique Meet links, calendar invites, busy times blocked.
//   ZOOM_ACCOUNT_ID + ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET (Zoom Server-to-Server OAuth app) → a unique Zoom meeting per booking.
//   CALLMEBOT_APIKEY (+ optional WHATSAPP_NOTIFY) → WhatsApp message to the owner for every booking.
const BOOK_DEFAULT = { tz: "Europe/London", days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "19:00", length: 30, notice: 6, ahead: 21, meetLink: "", zoomLink: "" };
const OWNER_WA = "+447723149573";
const LINKEDIN = "https://www.linkedin.com/in/promise-felix-a491a7233/";
async function bookSettings(env) { return Object.assign({}, BOOK_DEFAULT, (await get(env, "settings:book")) || {}); }
function tzParts(ts, tz) {
  const o = {};
  new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(ts)).forEach((x) => { o[x.type] = /^\d+$/.test(x.value) ? +x.value : x.value; });
  return o;
}
const tzOffsetMs = (ts, tz) => { const p = tzParts(ts, tz); return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(ts / 1000) * 1000; };
function zonedTime(y, mo, d, h, mi, tz) {
  const wall = Date.UTC(y, mo, d, h, mi);
  const first = wall - tzOffsetMs(wall, tz);
  return wall - tzOffsetMs(first, tz);
}
const okTz = (tz) => { try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); return true; } catch { return false; } };
const fmtWhen = (iso, tz) => { try { return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)); } catch { return iso; } };

async function googleToken(env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  const g = await get(env, "google:oauth"); if (!g || !g.refresh) return null;
  if (g.access && g.exp > Date.now() + 60000) return g.access;
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: g.refresh, grant_type: "refresh_token" }) });
  if (!r.ok) { g.error = "Google refused the saved connection (" + r.status + "). Connect Google again in Admin → Settings."; await put(env, "google:oauth", g); return null; }
  const j = await r.json(); g.access = j.access_token; g.exp = Date.now() + (j.expires_in || 3000) * 1000; delete g.error;
  await put(env, "google:oauth", g);
  return g.access;
}
async function googleBusy(env, from, to) {
  const t = await googleToken(env); if (!t) return [];
  const cached = await get(env, "google:busy"); if (cached && cached.until > Date.now()) return cached.busy;
  try {
    const r = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", { method: "POST", headers: { authorization: "Bearer " + t, "content-type": "application/json" },
      body: JSON.stringify({ timeMin: new Date(from).toISOString(), timeMax: new Date(to).toISOString(), items: [{ id: "primary" }] }) });
    if (!r.ok) return [];
    const busy = (((await r.json()).calendars || {}).primary || {}).busy || [];
    await env.PORTAL.put("google:busy", JSON.stringify({ busy, until: Date.now() + 120000 }), { expirationTtl: 300 });
    return busy;
  } catch { return []; }
}
async function googleEvent(env, { summary, description, start, end, attendee, meet, location }) {
  const t = await googleToken(env); if (!t) return null;
  const body = { summary, description, location, start: { dateTime: start }, end: { dateTime: end }, attendees: attendee ? [{ email: attendee }] : [], reminders: { useDefault: true } };
  if (meet) body.conferenceData = { createRequest: { requestId: rid(10), conferenceSolutionKey: { type: "hangoutsMeet" } } };
  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", { method: "POST", headers: { authorization: "Bearer " + t, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) return null;
  const j = await r.json();
  const video = ((j.conferenceData || {}).entryPoints || []).find((e) => e.entryPointType === "video");
  return { id: j.id, htmlLink: j.htmlLink, meet: j.hangoutLink || (video && video.uri) || "" };
}
const zoomReady = (env) => !!(env.ZOOM_ACCOUNT_ID && env.ZOOM_CLIENT_ID && env.ZOOM_CLIENT_SECRET);
async function zoomMeeting(env, { topic, start, length, agenda }) {
  if (!zoomReady(env)) return null;
  const tr = await fetch("https://zoom.us/oauth/token?grant_type=account_credentials&account_id=" + encodeURIComponent(env.ZOOM_ACCOUNT_ID), { method: "POST", headers: { authorization: "Basic " + btoa(env.ZOOM_CLIENT_ID + ":" + env.ZOOM_CLIENT_SECRET) } });
  if (!tr.ok) return null;
  const token = (await tr.json()).access_token;
  const r = await fetch("https://api.zoom.us/v2/users/me/meetings", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ topic, type: 2, start_time: start.replace(/\.\d{3}Z$/, "Z"), duration: length, timezone: "UTC", agenda: agenda.slice(0, 1900), settings: { join_before_host: true, waiting_room: false } }) });
  if (!r.ok) return null;
  return (await r.json()).join_url || null;
}
async function whatsappOwner(env, text) {
  if (!env.CALLMEBOT_APIKEY) return { sent: false, why: "CALLMEBOT_APIKEY not set" };
  try {
    const phone = env.WHATSAPP_NOTIFY || OWNER_WA;
    const r = await fetch("https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(phone) + "&text=" + encodeURIComponent(text.slice(0, 1500)) + "&apikey=" + encodeURIComponent(env.CALLMEBOT_APIKEY));
    const t = await r.text();
    return r.ok && !/error|invalid/i.test(t.slice(0, 400)) ? { sent: true } : { sent: false, why: "CallMeBot " + r.status + ": " + t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) };
  } catch { return { sent: false, why: "WhatsApp service unreachable" }; }
}

async function bookOpenSlots(env, s) {
  const nowT = Date.now(), [sh, sm] = s.start.split(":").map(Number), [eh, em] = s.end.split(":").map(Number);
  const taken = new Set(((await get(env, "book:taken")) || []).map((x) => x.start));
  const out = [], days = new Set();
  for (let k = 0; k <= s.ahead + 1; k++) {
    const p = tzParts(nowT + k * 864e5, s.tz), key = p.year + "-" + p.month + "-" + p.day;
    if (days.has(key)) continue; days.add(key);
    if (days.size > s.ahead + 1) break;
    if (!s.days.includes(new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay())) continue;
    for (let m = sh * 60 + sm; m + s.length <= eh * 60 + em; m += s.length) {
      const t = zonedTime(p.year, p.month - 1, p.day, Math.floor(m / 60), m % 60, s.tz);
      if (t < nowT + s.notice * 36e5) continue;
      const iso = new Date(t).toISOString();
      if (!taken.has(iso)) out.push(iso);
    }
  }
  if (!out.length) return out;
  const busy = (await googleBusy(env, out[0], Date.parse(out[out.length - 1]) + s.length * 6e4)).map((b) => [Date.parse(b.start), Date.parse(b.end)]);
  return busy.length ? out.filter((iso) => { const a = Date.parse(iso), b = a + s.length * 6e4; return !busy.some(([x, y]) => a < y && b > x); }) : out;
}
async function bookSlots(env) {
  const s = await bookSettings(env);
  return json({ tz: s.tz, length: s.length, slots: await bookOpenSlots(env, s), platforms: ["meet", "zoom"], linkedin: LINKEDIN, whatsapp: OWNER_WA.replace(/\D/g, "") });
}
async function bookCreate(env, req, origin) {
  const b = await req.json().catch(() => null);
  if (!b) return fail(400, "Please try again.");
  if (b.website) return json({ ok: true, booking: {} }); // honeypot
  const ip = req.headers.get("cf-connecting-ip") || "unknown", rk = "bkrate:" + ip, n = +(await env.PORTAL.get(rk)) || 0;
  if (n >= 5) return fail(429, "Too many bookings from this connection. Please message me on WhatsApp instead.");
  const name = clean(b.name, 100), email = clean(b.email, 200), start = clean(b.start, 40), platform = b.platform === "zoom" ? "zoom" : "meet";
  if (!name) return fail(400, "Please add your name.");
  if (!emailOk(email)) return fail(400, "Please enter a valid email so I can send your call link.");
  const s = await bookSettings(env);
  if (!(await bookOpenSlots(env, s)).includes(start)) return fail(409, "Sorry, that time was just taken. Please pick another time.");
  await env.PORTAL.put(rk, String(n + 1), { expirationTtl: 3600 });
  const taken = ((await get(env, "book:taken")) || []).filter((x) => Date.parse(x.start) > Date.now() - 864e5);
  const bk = { id: rid(9), at: now(), start, end: new Date(Date.parse(start) + s.length * 6e4).toISOString(), length: s.length, platform, name, email,
    whatsapp: clean(b.whatsapp, 40), business: clean(b.business, 120), website: clean(b.site, 200), notes: clean(b.notes, 2000), tz: okTz(clean(b.tz, 60)) ? clean(b.tz, 60) : s.tz, read: false };
  taken.push({ start, id: bk.id }); await put(env, "book:taken", taken);

  const PLAT = platform === "zoom" ? "Zoom" : "Google Meet";
  const title = "Vix Assist strategy call: " + (bk.business || bk.name);
  const about = "Free " + s.length + " minute GoHighLevel strategy call with Promise (Vix Assist).\n\nBooked by: " + bk.name + (bk.business ? " (" + bk.business + ")" : "") + "\nEmail: " + bk.email + (bk.whatsapp ? "\nWhatsApp: " + bk.whatsapp : "") + (bk.website ? "\nWebsite: " + bk.website : "") + (bk.notes ? "\n\nWhat they want to cover:\n" + bk.notes : "");
  let link = "", via = "";
  if (platform === "zoom") { try { link = (await zoomMeeting(env, { topic: title, start, length: s.length, agenda: about })) || ""; if (link) via = "zoom"; } catch {} if (!link && s.zoomLink) { link = s.zoomLink; via = "zoom-room"; } }
  try {
    const ev = await googleEvent(env, { summary: title, description: about + (link ? "\n\nJoin on Zoom: " + link : ""), start, end: bk.end, attendee: bk.email, meet: platform === "meet", location: link || undefined });
    if (ev) { bk.calendar = ev.htmlLink; bk.eventId = ev.id; if (platform === "meet" && ev.meet) { link = ev.meet; via = "google"; } }
  } catch {}
  if (platform === "meet" && !link && s.meetLink) { link = s.meetLink; via = "meet-room"; }
  bk.link = link; bk.via = via;

  const ownerWhen = fmtWhen(start, s.tz), theirWhen = fmtWhen(start, bk.tz);
  const ownerText = "📅 New strategy call booked\n\n" + bk.name + (bk.business ? " · " + bk.business : "") +
    "\nWhen: " + ownerWhen + " (" + s.tz + ")" + (bk.tz !== s.tz ? "\nTheir time: " + theirWhen + " (" + bk.tz + ")" : "") +
    "\nOn: " + PLAT + "\nCall link: " + (link || "none yet. Add your " + PLAT + " link in Admin → Settings, then send them one.") +
    "\nEmail: " + bk.email + (bk.whatsapp ? "\nWhatsApp: " + bk.whatsapp : "") + (bk.website ? "\nWebsite: " + bk.website : "") + (bk.notes ? "\n\nThey want to cover:\n" + bk.notes : "") +
    (bk.calendar ? "\n\nAdded to your Google Calendar: " + bk.calendar : "");
  const gcal = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("Strategy call with Promise (Vix Assist)") + "&dates=" + start.replace(/[-:]|\.\d{3}/g, "") + "/" + bk.end.replace(/[-:]|\.\d{3}/g, "") + "&details=" + encodeURIComponent((link ? "Join on " + PLAT + ": " + link + "\n\n" : "") + "Questions before the call? WhatsApp " + OWNER_WA + " or email " + NOTIFY_EMAIL) + (link ? "&location=" + encodeURIComponent(link) : "");
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:560px">' +
    "<p>Hi " + escH(bk.name.split(" ")[0]) + ",</p><p>Your free GoHighLevel strategy call is booked.</p>" +
    '<p style="background:#f4f2ff;border-radius:10px;padding:14px 16px"><b>' + escH(theirWhen) + "</b> (" + escH(bk.tz) + ")<br>" + s.length + " minutes on " + PLAT + "<br>" +
    (link ? '<a href="' + escH(link) + '" style="color:#5b45ff;font-weight:bold">Join the call: ' + escH(link) + "</a>" : "I'll send your " + PLAT + " link before the call.") + "</p>" +
    '<p><a href="' + escH(gcal) + '" style="color:#5b45ff">Add it to Google Calendar</a></p>' +
    "<p>If you'd like to get ahead, reply with your GoHighLevel plan and the one thing in your account that frustrates you most. I'll look at it before we talk.</p>" +
    '<p>Need to move the time? Reply to this email or message me on <a href="https://wa.me/' + OWNER_WA.replace(/\D/g, "") + '">WhatsApp</a>. You can also find me on <a href="' + LINKEDIN + '">LinkedIn</a>.</p><p>Talk soon,<br>Promise<br>Vix Assist</p></div>';
  const [mail, wa, cmail] = await Promise.all([
    sendEmail(env, { subject: "📅 Strategy call booked: " + (bk.business || bk.name) + " · " + ownerWhen, text: ownerText + "\n\nAll calls are listed in your admin portal: " + origin + "/portal/admin/", replyTo: bk.email }),
    whatsappOwner(env, ownerText),
    sendClientEmail(env, { to: bk.email, name: bk.name, subject: "Your strategy call with Promise · " + theirWhen, html, text: html.replace(/<br>/g, "\n").replace(/<\/p>/g, "\n\n").replace(/<[^>]+>/g, "") }),
  ]);
  bk.notified = { email: mail.sent, whatsapp: wa.sent, client: cmail.sent, why: [mail.why, wa.why, cmail.why].filter(Boolean).join(" · ") };
  await put(env, "booking:" + bk.id, bk);
  const idx = (await get(env, "bookings:index")) || []; idx.push(bk.id); await put(env, "bookings:index", idx.slice(-500));
  return json({ ok: true, booking: { start, end: bk.end, length: s.length, platform, link, gcal, invited: !!bk.calendar, emailed: cmail.sent } });
}

async function adminBook(env, url) {
  const s = await bookSettings(env), g = (await get(env, "google:oauth")) || {};
  const idx = ((await get(env, "bookings:index")) || []).slice(-80).reverse();
  const list = (await Promise.all(idx.map((id) => get(env, "booking:" + id)))).filter(Boolean);
  return json({ settings: s, redirect: url.origin + "/api/google/callback",
    google: { clientSet: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), connected: !!g.refresh, email: g.email || "", error: g.error || "" },
    zoom: zoomReady(env), whatsapp: !!env.CALLMEBOT_APIKEY, bookings: list });
}
async function adminBookSave(env, req) {
  const b = await req.json().catch(() => ({}));
  const s = await bookSettings(env), hm = (v, d) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)) ? String(v) : d);
  if (b.tz !== undefined) { if (!okTz(clean(b.tz, 60))) return fail(400, "Unknown time zone. Use a name like Europe/London or Africa/Lagos."); s.tz = clean(b.tz, 60); }
  if (Array.isArray(b.days)) s.days = b.days.map(Number).filter((d) => d >= 0 && d <= 6);
  s.start = hm(b.start, s.start); s.end = hm(b.end, s.end);
  if (s.end <= s.start) return fail(400, "Your end time must be after your start time.");
  if ([15, 20, 30, 45, 60].includes(+b.length)) s.length = +b.length;
  if (b.notice !== undefined) s.notice = Math.max(0, Math.min(72, +b.notice || 0));
  if (b.ahead !== undefined) s.ahead = Math.max(3, Math.min(60, +b.ahead || 21));
  for (const k of ["meetLink", "zoomLink"]) if (b[k] !== undefined) { const v = clean(b[k], 300); if (v && !httpUrl(v)) return fail(400, "Meeting links must start with https://"); s[k] = v; }
  await put(env, "settings:book", s);
  return json({ ok: true, settings: s });
}
async function adminBookCancel(env, req) {
  const b = await req.json().catch(() => ({}));
  const bk = await get(env, "booking:" + clean(b.id, 40)); if (!bk) return fail(404, "Booking not found.");
  bk.cancelled = now(); bk.read = true; await put(env, "booking:" + bk.id, bk);
  await put(env, "book:taken", ((await get(env, "book:taken")) || []).filter((x) => x.id !== bk.id));
  return json({ ok: true });
}
async function adminWhatsTest(env) {
  const r = await whatsappOwner(env, "✅ Vix Assist: WhatsApp booking alerts are working. You'll get a message here for every strategy call booked on your website.");
  return r.sent ? json({ ok: true }) : fail(400, r.why);
}
const GOOGLE_SCOPES = "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy";
async function adminGoogleConnect(env, url) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail(400, "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Cloudflare first.");
  const state = rid(16); await env.PORTAL.put("gstate:" + state, "1", { expirationTtl: 600 });
  const q = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: url.origin + "/api/google/callback", response_type: "code", scope: GOOGLE_SCOPES, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state });
  return Response.redirect("https://accounts.google.com/o/oauth2/v2/auth?" + q, 302);
}
async function googleCallback(env, req, url) {
  const back = (m) => Response.redirect(url.origin + "/portal/admin/?google=" + encodeURIComponent(m), 302);
  if (!(await isAdmin(env, req))) return back("Log in to admin first, then press Connect Google again.");
  const state = url.searchParams.get("state") || "";
  if (!state || !(await env.PORTAL.get("gstate:" + state))) return back("That link expired. Press Connect Google again.");
  await env.PORTAL.delete("gstate:" + state);
  if (url.searchParams.get("error")) return back("Google connection was cancelled.");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code: url.searchParams.get("code") || "", client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: url.origin + "/api/google/callback", grant_type: "authorization_code" }) });
  if (!r.ok) return back("Google said no (" + r.status + "). Check the redirect URL in Google Cloud matches exactly.");
  const j = await r.json();
  if (!j.refresh_token) return back("Google didn't return a long-term key. Remove Vix Assist at myaccount.google.com/permissions and connect again.");
  let email = ""; try { email = JSON.parse(new TextDecoder().decode(unb64u(j.id_token.split(".")[1]))).email || ""; } catch {}
  await put(env, "google:oauth", { refresh: j.refresh_token, access: j.access_token, exp: Date.now() + (j.expires_in || 3000) * 1000, email, at: now() });
  return back("connected");
}
async function adminGoogleDisconnect(env) { await env.PORTAL.delete("google:oauth"); await env.PORTAL.delete("google:busy"); return json({ ok: true }); }

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
    if (path === "book/slots" && m === "GET") return bookSlots(env);
    if (path === "book" && m === "POST") return bookCreate(env, req, url.origin);
    if (path === "google/callback" && m === "GET") return googleCallback(env, req, url);

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
      if (a === "briefs/reply" && m === "POST") return adminBriefReply(env, req, url.origin);
      if (a === "test-email" && m === "POST") return adminTestEmail(env);
      if (a === "payreqs" && m === "GET") return adminPayList(env);
      if (a === "payreqs" && m === "POST") return adminPayCreate(env, req, url.origin);
      if (a === "payreqs/cancel" && m === "POST") return adminPayCancel(env, req);
      if (a === "feed" && m === "GET") return adminFeed(env);
      if (a === "feed/seen" && m === "POST") return adminFeedSeen(env, req);
      if (a === "banks" && m === "POST") return adminBanksSave(env, req);
      if (a === "paysettings" && m === "POST") return adminPaySettingsSave(env, req);
      if (a === "push/key" && m === "GET") return pushKey(env);
      if (a === "push/subscribe" && m === "POST") return pushSubscribe(env, req);
      if (a === "push/test" && m === "POST") return pushTest(env);
      if (a === "client-email" && m === "GET") return json({ ready: clientEmailReady(env) });
      if (a === "client-email/test" && m === "POST") return adminTestClientEmail(env, req, url.origin);
      if (a === "payreqs/confirm" && m === "POST") return adminPayConfirm(env, req, url.origin);
      if (a === "book" && m === "GET") return adminBook(env, url);
      if (a === "book" && m === "POST") return adminBookSave(env, req);
      if (a === "book/cancel" && m === "POST") return adminBookCancel(env, req);
      if (a === "book/whatsapp-test" && m === "POST") return adminWhatsTest(env);
      if (a === "google/connect" && m === "GET") return adminGoogleConnect(env, url);
      if (a === "google/disconnect" && m === "POST") return adminGoogleDisconnect(env);
    }
    return fail(404, "Not found.");
  } catch (e) {
    return fail(500, "Something went wrong. Please try again.");
  }
}
