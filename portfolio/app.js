/* =========================================================
   Promise Felix portfolio
   EDIT HERE: WhatsApp, email, social links, live site links.
   Leave a social link empty ("") to hide its icon.
   ========================================================= */
const CONFIG = {
  whatsapp: "447868242781",           // digits only, with country code
  email: "vixautomations@gmail.com",
  socials: {
    linkedin: "https://www.linkedin.com/in/promise-felix-a491a7233/",
    instagram: "",
    tiktok: "",
    x: "",
    facebook: "",
    youtube: "",
    github: "",
  },
  // Live links for your projects. Replace with your Netlify links once deployed.
  works: {
    famous: "../automobile/index.html",
    vix: "../index.html",
  },
  // Optional free Google PageSpeed API key for the automatic audit.
  // Get one at https://developers.google.com/speed/docs/insights/v5/get-started
  pagespeedKey: "",
};

const ICONS = { linkedin: "linkedin-logo", instagram: "instagram-logo", tiktok: "tiktok-logo", x: "x-logo", facebook: "facebook-logo", youtube: "youtube-logo", github: "github-logo" };
const LABELS = { linkedin: "LinkedIn", instagram: "Instagram", tiktok: "TikTok", x: "X", facebook: "Facebook", youtube: "YouTube", github: "GitHub" };
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;

/* ---------- Links ---------- */
$$("[data-wa-link]").forEach((a) => (a.href = waLink("Hi Promise, I saw your portfolio and I would like to talk about a website.")));
$$("[data-email-link]").forEach((a) => (a.href = `mailto:${CONFIG.email}`));
$$("[data-work-link]").forEach((a) => (a.href = CONFIG.works[a.dataset.workLink]));
$("[data-year]").textContent = new Date().getFullYear();
const socialHTML =
  `<a href="${waLink("Hi Promise, I saw your portfolio.")}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="ph ph-whatsapp-logo"></i></a>` +
  Object.entries(CONFIG.socials).filter(([, url]) => url)
    .map(([k, url]) => `<a href="${url}" target="_blank" rel="noopener" aria-label="${LABELS[k]}"><i class="ph ph-${ICONS[k]}"></i></a>`).join("") +
  `<a href="mailto:${CONFIG.email}" aria-label="Email"><i class="ph ph-envelope-simple"></i></a>`;
$$("[data-socials]").forEach((el) => (el.innerHTML = socialHTML));

/* ---------- Nav ---------- */
const nav = $("[data-nav]"), toggle = $(".nav__toggle"), menu = $("#mobile-menu");
let lastY = 0, ticking = false;
addEventListener("scroll", () => {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > lastY && y > 500 && !menu.classList.contains("is-open"));
    lastY = y; ticking = false;
  });
}, { passive: true });
function setMenu(open) {
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.style.overflow = open ? "hidden" : "";
  if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add("is-open")); }
  else { menu.classList.remove("is-open"); setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 500); }
}
toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
$$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false); });

const navLinks = $$(".nav__links a");
const secObs = new IntersectionObserver((es) => es.forEach((e) => {
  if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${e.target.id}`));
}), { rootMargin: "-45% 0px -50% 0px" });
["top", "work", "services", "process", "faq"].forEach((id) => secObs.observe(document.getElementById(id)));

/* ---------- Hero tilt ---------- */
const stage = $("[data-tilt]");
if (stage && !reduceMotion && matchMedia("(pointer: fine)").matches) {
  let raf = 0;
  stage.closest(".hero").addEventListener("pointermove", (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      stage.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
    });
  });
  stage.style.transition = "transform 800ms cubic-bezier(0.22, 1, 0.36, 1)";
  stage.style.transformStyle = "preserve-3d";
}

/* ---------- Reveals ---------- */
const revObs = new IntersectionObserver((es, o) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add("is-in"); o.unobserve(e.target);
}), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
$$(".reveal").forEach((el) => {
  const sib = $$(":scope > .reveal", el.parentElement), i = sib.indexOf(el);
  if (i > 0) el.style.transitionDelay = `${Math.min(i * 80, 400)}ms`;
  revObs.observe(el);
});

/* ---------- Tagline words ---------- */
const tag = $("[data-words]");
if (tag) {
  const accent = new Set(["first", "meeting", "WhatsApp."]);
  tag.innerHTML = tag.textContent.trim().split(/\s+/).map((w) => `<span class="w${accent.has(w) ? " is-accent" : ""}">${w}</span>`).join(" ");
  const words = $$(".w", tag);
  let raf = 0;
  const update = () => { raf = 0; const t = innerHeight * 0.72; words.forEach((w) => w.classList.toggle("is-on", w.getBoundingClientRect().top < t)); };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) addEventListener("scroll", onScroll, { passive: true });
    else removeEventListener("scroll", onScroll);
    update();
  }).observe(tag);
}

/* =========================================================
   Project wizard
   ========================================================= */
const form = $("[data-wizard-form]");
const wizard = $("[data-wizard]");
const F = (n) => form.elements[n];
const steps = $$(".wstep", form);
const dots = $$("[data-step-dot]");
const btnPrev = $("[data-prev]"), btnNext = $("[data-next]"), btnSubmit = $("[data-submit]");
const doneBox = $("[data-done]");
const state = { issues: [], goals: [], siteType: "", domain: "", niche: "", audit: null };
let step = 1;

const SERVICE_LABEL = { design: "New website design", redesign: "Website redesign", audit: "Free website audit" };
const STYLE_LABEL = { cinematic: "Cinematic and bold (like Famous Automobile)", clean: "Clean and professional (like Vix Automations)", unsure: "Not sure, recommend one" };

// Chips
$$("[data-chips]").forEach((group) => {
  const key = group.dataset.chips;
  const single = group.classList.contains("chips--single");
  group.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip"); if (!chip) return;
    const v = chip.dataset.value;
    if (single) {
      $$(".chip", group).forEach((c) => c.classList.toggle("is-on", c === chip));
      state[key] = v;
      if (key === "niche") {
        const other = $(".other-input", group.parentElement);
        other.hidden = !chip.hasAttribute("data-other");
        if (!other.hidden) other.focus();
      }
    } else {
      chip.classList.toggle("is-on");
      state[key] = $$(".chip.is-on", group).map((c) => c.dataset.value);
    }
    chip.setAttribute("aria-pressed", chip.classList.contains("is-on"));
    clearError(key);
  });
});

const service = () => (F("service").value || "");
function showError(key, msg) {
  const el = $(`[data-error="${key}"]`, form); if (el) el.textContent = msg;
  const input = form.elements[key]; if (input && input.setAttribute) input.setAttribute("aria-invalid", "true");
}
function clearError(key) {
  const el = $(`[data-error="${key}"]`, form); if (el) el.textContent = "";
  const input = form.elements[key]; if (input && input.removeAttribute) input.removeAttribute("aria-invalid");
}
["url", "company", "name", "email"].forEach((k) => F(k).addEventListener("input", () => clearError(k)));
$$("input[name=service]", form).forEach((r) => r.addEventListener("change", () => clearError("service")));

function normaliseUrl(raw) {
  let v = raw.trim(); if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try { const u = new URL(v); return u.hostname.includes(".") ? u.href : ""; } catch { return ""; }
}

function validateStep(n) {
  if (n === 1 && !service()) { showError("service", "Choose one option to continue."); return false; }
  if (n === 2) {
    if (service() === "design") {
      if (!state.siteType) { showError("siteType", "Pick the kind of website you want."); return false; }
    } else {
      if (!normaliseUrl(F("url").value)) { showError("url", "Enter your website address, for example yourbusiness.com"); F("url").focus(); return false; }
    }
  }
  if (n === 3) {
    let ok = true;
    if (F("company").value.trim().length < 2) { showError("company", "Enter your company or brand name."); ok = false; }
    const niche = state.niche === "Other" ? F("nicheOther").value.trim() : state.niche;
    if (!niche) { showError("niche", "Pick your niche, or choose Other and type it."); ok = false; }
    if (!ok) return false;
  }
  if (n === 4) {
    let ok = true;
    if (F("name").value.trim().length < 2) { showError("name", "Enter your name so I know who I am replying to."); ok = false; }
    const em = F("email").value.trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { showError("email", "That email address does not look right."); ok = false; }
    return ok;
  }
  return true;
}

function goTo(n) {
  step = n;
  steps.forEach((s) => s.classList.toggle("is-active", +s.dataset.step === n));
  dots.forEach((d) => {
    const i = +d.dataset.stepDot;
    d.classList.toggle("is-active", i === n);
    d.classList.toggle("is-done", i < n);
  });
  btnPrev.hidden = n === 1;
  btnNext.hidden = n === 4;
  btnSubmit.hidden = n !== 4;
  if (n === 2) {
    const design = service() === "design";
    $("[data-has-site]").hidden = design;
    $("[data-no-site]").hidden = !design;
    $("[data-step2-title]").textContent = design ? "Your new website" : service() === "audit" ? "Which website should I audit?" : "Which website should I redesign?";
  }
  if (n === 4) renderSummary();
  const top = wizard.getBoundingClientRect().top;
  if (top < 0 || top > innerHeight * 0.5) wizard.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}
btnNext.addEventListener("click", () => { if (validateStep(step)) goTo(step + 1); });
btnPrev.addEventListener("click", () => goTo(step - 1));

// Jump-in buttons from other sections
function startWith(opts) {
  if (opts.service) { F("service").value = opts.service; }
  if (opts.style) { F("style").value = opts.style; }
  doneBox.hidden = true; form.hidden = false;
  document.getElementById("start").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  setTimeout(() => goTo(opts.service ? 2 : 1), reduceMotion ? 0 : 500);
}
$$("[data-pick-service]").forEach((b) => b.addEventListener("click", () => startWith({ service: b.dataset.pickService })));
$$("[data-like-style]").forEach((b) => b.addEventListener("click", () => startWith({ style: b.dataset.likeStyle })));

/* ---------- Quick audit (Google PageSpeed) ---------- */
const auditBox = $("[data-audit]");
$("[data-run-audit]").addEventListener("click", runAudit);
async function runAudit() {
  const url = normaliseUrl(F("url").value);
  if (!url) { showError("url", "Enter your website address, for example yourbusiness.com"); return; }
  F("url").value = url;
  auditBox.hidden = false;
  $("[data-audit-loading]").hidden = false;
  $("[data-audit-result]").hidden = true;
  $("[data-audit-fallback]").hidden = true;
  state.audit = null;
  const cats = ["performance", "accessibility", "best-practices", "seo"];
  const api = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  api.searchParams.set("url", url);
  api.searchParams.set("strategy", "mobile");
  cats.forEach((c) => api.searchParams.append("category", c));
  if (CONFIG.pagespeedKey) api.searchParams.set("key", CONFIG.pagespeedKey);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(api, { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (!res.ok || !data.lighthouseResult) throw new Error("audit unavailable");
    const c = data.lighthouseResult.categories;
    const a = data.lighthouseResult.audits;
    const scores = {
      Speed: Math.round(c.performance.score * 100),
      Accessibility: Math.round(c.accessibility.score * 100),
      "Best practice": Math.round(c["best-practices"].score * 100),
      SEO: Math.round(c.seo.score * 100),
    };
    state.audit = { scores, lcp: a["largest-contentful-paint"]?.displayValue };
    $("[data-scores]").innerHTML = Object.entries(scores).map(([k, v]) => {
      const col = v >= 90 ? "var(--mint)" : v >= 50 ? "#FEBC2E" : "#FF6B6F";
      return `<div class="score"><div class="score__ring" style="--c:${col}" data-p="${v}"><b>${v}</b></div>${k}</div>`;
    }).join("");
    requestAnimationFrame(() => $$(".score__ring").forEach((r) => animateRing(r, +r.dataset.p)));
    const weakest = Object.entries(scores).sort((x, y) => x[1] - y[1])[0];
    $("[data-audit-note]").textContent = `Mobile check done. Main content shows after ${state.audit.lcp || "an unknown time"}. Your weakest area is ${weakest[0].toLowerCase()} at ${weakest[1]} out of 100. I will include fixes for this in your full audit.`;
    $("[data-audit-loading]").hidden = true;
    $("[data-audit-result]").hidden = false;
  } catch {
    $("[data-audit-loading]").hidden = true;
    $("[data-audit-fallback]").hidden = false;
  }
}
function animateRing(el, target) {
  const start = performance.now(), dur = reduceMotion ? 1 : 1200;
  const tick = (now) => {
    const t = Math.min((now - start) / dur, 1), v = Math.round(target * (1 - Math.pow(1 - t, 4)));
    el.style.setProperty("--p", v); if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- Summary + send ---------- */
function collect() {
  const s = service();
  const niche = state.niche === "Other" ? F("nicheOther").value.trim() : state.niche;
  const rows = [["Service", SERVICE_LABEL[s]]];
  if (s === "design") {
    rows.push(["Website type", state.siteType]);
    if (state.domain) rows.push(["Domain", state.domain]);
  } else {
    rows.push(["Website", normaliseUrl(F("url").value)]);
    if (state.audit) rows.push(["Quick check", Object.entries(state.audit.scores).map(([k, v]) => `${k} ${v}`).join(", ")]);
    if (state.issues.length) rows.push(["Problems", state.issues.join(", ")]);
  }
  rows.push(["Company", F("company").value.trim()], ["Niche", niche]);
  if (F("style").value) rows.push(["Style", STYLE_LABEL[F("style").value]]);
  if (state.goals.length) rows.push(["Goals", state.goals.join(", ")]);
  if (F("timeline").value) rows.push(["Timeline", F("timeline").value]);
  if (F("notes").value.trim()) rows.push(["Notes", F("notes").value.trim()]);
  return rows.filter(([, v]) => v);
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function renderSummary() {
  $("[data-summary]").innerHTML = `<h4>Your request</h4><dl>${collect().map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
}
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (step !== 4) { btnNext.click(); return; }
  if (!validateStep(4)) return;
  const name = F("name").value.trim();
  const lines = [
    `Hi Promise, I'm ${name}. I filled in the project form on your portfolio.`,
    "",
    ...collect().map(([k, v]) => `${k}: ${v}`),
  ];
  if (F("email").value.trim()) lines.push(`Email: ${F("email").value.trim()}`);
  const link = waLink(lines.join("\n"));
  $("[data-done-link]").href = link;
  form.hidden = true;
  $(".wizard__progress").hidden = true;
  doneBox.hidden = false;
  window.open(link, "_blank", "noopener");
});
$("[data-restart]").addEventListener("click", () => {
  form.reset();
  Object.assign(state, { issues: [], goals: [], siteType: "", domain: "", niche: "", audit: null });
  $$(".chip.is-on", form).forEach((c) => c.classList.remove("is-on"));
  $(".other-input", form).hidden = true;
  auditBox.hidden = true;
  doneBox.hidden = true; form.hidden = false; $(".wizard__progress").hidden = false;
  goTo(1);
});
