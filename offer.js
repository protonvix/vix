/* Free website design offer: countdown, style picker and claim form.
   The offer end date lives in ONE place: VIX_OFFER_END below (also used by home.js). */
window.VIX_OFFER_END = window.VIX_OFFER_END || "2026-12-04T23:59:59+01:00"; // 4 Dec 2026, 11:59 pm Lagos time
(function () {
  "use strict";
  var END = new Date(window.VIX_OFFER_END).getTime();
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return n < 10 ? "0" + n : String(n); };
  var ended = function () { return Date.now() > END; };

  /* Offer over: hide everything live, show the ended message. */
  function closeOffer() {
    $$("[data-live]").forEach(function (el) { el.hidden = true; });
    $$(".count").forEach(function (el) { el.hidden = true; });
    var e = $("#ended"); if (e) e.hidden = false;
    var sub = $(".o-sub"); if (sub) sub.textContent = "This limited-time offer has now ended. Thank you to every brand that joined.";
    var tag = $("#o-ends"); if (tag) tag.textContent = "Offer ended on 4 December 2026";
    var live = $(".o-live"); if (live) live.hidden = true;
    var h1 = $(".o-h1"); if (h1) h1.innerHTML = "Our free design offer <em>has ended.</em>";
  }

  /* Countdown */
  var last = {};
  function tick() {
    var ms = Math.max(0, END - Date.now());
    var v = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
    $$("[data-u]").forEach(function (b) {
      var u = b.dataset.u, txt = u === "d" ? String(v.d) : pad(v[u]);
      if (b.textContent !== txt) { b.textContent = txt; if (!reduce && last[u] !== undefined) { b.classList.remove("tick"); void b.offsetWidth; b.classList.add("tick"); } }
    });
    last = v;
    if (ms <= 0) { closeOffer(); return false; }
    return true;
  }
  if (ended()) { closeOffer(); } else { tick(); var timer = setInterval(function () { if (!tick()) clearInterval(timer); }, 1000); }

  /* Reveal on scroll */
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12 });
  $$(".reveal").forEach(function (el) { io.observe(el); });

  /* Style picker */
  var STYLES = ["Midnight Luxe", "Clean Estate", "Bold Editorial", "Glass Tech", "Warm Organic", "Corporate Trust", "Neo Brutal", "Fresh Clinic", "Photo Showcase", "Playful Colour",
    "Aurora SaaS", "Velvet Beauty", "Trade Pro", "Power Gym", "Haven Stay", "Swift Rentals", "Smile Care", "Noir Realty", "Morning Café", "Gala Events"];
  var picker = $("#picker"), chosen = "";
  if (picker) {
    picker.innerHTML = STYLES.map(function (n, i) {
      return '<button type="button" class="pick-card" role="radio" aria-checked="false" data-style="' + n + ' (#' + (i + 1) + ')"><img src="assets/designs/d' + (i + 1) + '-sm.jpg" alt="" loading="lazy" width="600" height="400"><span>' + n + "</span></button>";
    }).join("");
    picker.addEventListener("click", function (e) {
      var b = e.target.closest(".pick-card"); if (!b) return;
      var on = b.getAttribute("aria-checked") !== "true";
      $$(".pick-card", picker).forEach(function (x) { x.setAttribute("aria-checked", "false"); });
      b.setAttribute("aria-checked", String(on));
      chosen = on ? b.dataset.style : "";
      $("#chosen b").textContent = chosen || "Not chosen yet";
      if (on) $("#claim-form").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }

  /* Page chips (max 4) */
  $$(".chips-row").forEach(function (row) {
    row.addEventListener("click", function (e) {
      var c = e.target.closest(".chip"); if (!c) return;
      var on = c.getAttribute("aria-pressed") === "true";
      if (!on && $$('[aria-pressed="true"]', row).length >= +row.dataset.max) return;
      c.setAttribute("aria-pressed", String(!on));
    });
  });

  /* Claim form */
  var form = $("#claim-form");
  if (!form) return;
  var status = $(".form-status", form);
  function say(msg, cls) { status.textContent = msg; status.className = "form-status" + (cls ? " " + cls : ""); }
  form.addEventListener("input", function (e) { e.target.classList.remove("invalid"); if (e.target.name === "agree") e.target.closest(".agree").classList.remove("invalid"); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (ended()) { closeOffer(); return; }
    var ok = true;
    $$("[required]", form).forEach(function (f) {
      var v = f.type === "checkbox" ? f.checked : f.value.trim(), good = !!v && (f.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim()));
      (f.type === "checkbox" ? f.closest(".agree") : f).classList.toggle("invalid", !good); if (!good) ok = false;
    });
    if (!ok) { say("Please fill in your name, email, business, industry, and tick the box.", "err"); return; }
    var d = Object.fromEntries(new FormData(form).entries());
    var pages = $$('.chips-row [aria-pressed="true"]', form).map(function (c) { return c.textContent; }).join(", ") || "Home";
    var text = "FREE WEBSITE DESIGN REQUEST\n\n" +
      "Business: " + d.business + "\nIndustry: " + d.industry + "\nCurrent website: " + (d.current || "None") +
      "\n\nStyle chosen: " + (chosen || "Not chosen (describe below / our recommendation)") + "\nPages: " + pages + "\nBrand colours: " + (d.colours || "Not specified") +
      "\n\nAbout the brand:\n" + (d.notes || "Not given") +
      "\n\nContact\nName: " + d.name + "\nEmail: " + d.email + "\nWhatsApp: " + (d.whatsapp || "Not given") +
      "\n\nThey agreed: the design is free; building and launching is a separate, optional paid service.";
    var btn = $("button[type=submit]", form), label = btn.innerHTML; btn.disabled = true; btn.textContent = "Sending…"; say("");
    fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "Free design offer", subject: "🎁 FREE DESIGN request: " + d.business + " (" + d.industry + ")", name: d.name, email: d.email, whatsapp: d.whatsapp, business: d.business, service: "Free website design", text: text, website: d.website }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "failed"); return j; }); })
      .then(function () {
        form.hidden = true; $("#claimed").hidden = false;
        $("#claimed-text").textContent = "Thank you, " + d.name.split(" ")[0] + "! We've received your request for " + d.business + ". We'll email you at " + d.email + " within one business day to confirm, and your free design will be ready in 5 to 7 business days.";
        confetti(); $("#claimed").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      })
      .catch(function (x) {
        say((x && x.message && x.message !== "failed" ? x.message + " " : "Sorry, that didn't send. ") + "You can also email your request to vixautomations@gmail.com.", "err");
        btn.disabled = false; btn.innerHTML = label;
      });
  });
  function confetti() {
    if (reduce) return;
    var box = $(".burst"), colors = ["#9db4ff", "#c3a6ff", "#7ff3d4", "#ffd166", "#ff5c87"];
    for (var i = 0; i < 60; i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%"; p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.6 + "s"; p.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
      box.appendChild(p);
    }
  }
})();
