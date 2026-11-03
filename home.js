/* Vix Automations · homepage interactions */
(function () {
  "use strict";
  var EMAIL = "vixautomations@gmail.com";
  var WA_UK = "447723149573";
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var wa = function (text) { return "https://wa.me/" + WA_UK + "?text=" + encodeURIComponent(text); };

  var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

  /* Header + progress bar */
  var hdr = $(".hdr"), bar = $("#progress");
  function onScroll() {
    var y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    hdr.classList.toggle("solid", y > 30);
    bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* Full-screen menu */
  var menu = $("#menu"), btn = $("#menu-btn"), img = $("#menu-img");
  function setMenu(open) {
    menu.classList.toggle("open", open);
    menu.setAttribute("aria-hidden", String(!open));
    btn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("locked", open);
    $$(".roll", menu).forEach(function (r, i) { r.style.transitionDelay = open ? (0.25 + i * 0.06) + "s" : "0s"; });
    if (open) setTimeout(function () { var a = $(".menu-links a", menu); if (a) a.focus({ preventScroll: true }); }, 500);
  }
  btn.addEventListener("click", function () { setMenu(!menu.classList.contains("open")); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); btn.focus(); } });
  $$(".menu-links a").forEach(function (a) {
    a.addEventListener("mouseenter", function () {
      var src = a.dataset.img; if (!src || img.getAttribute("src") === src) return;
      img.classList.add("swap");
      setTimeout(function () { img.src = src; img.onload = function () { img.classList.remove("swap"); }; }, 180);
    });
  });

  /* Hero headline: words rise in */
  var h1 = $("#hero-h");
  (function split(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (p) {
          if (!p) return;
          if (!p.trim()) { frag.appendChild(document.createTextNode(p)); return; }
          var w = document.createElement("span"); w.className = "w";
          var s = document.createElement("span"); s.textContent = p; w.appendChild(s); frag.appendChild(w);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1) {
        var w = document.createElement("span"); w.className = "w";
        n.parentNode.insertBefore(w, n); var s = document.createElement("span"); w.appendChild(s); s.appendChild(n);
      }
    });
  })(h1);
  $$(".w > span", h1).forEach(function (s, i) { s.style.transitionDelay = (0.15 + i * 0.07) + "s"; });
  requestAnimationFrame(function () { setTimeout(function () { h1.classList.add("go"); }, 60); });

  /* Count-up numbers */
  function fmtShort(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 1 : 1).replace(/\.0$/, "") + "K" : String(Math.round(n)); }
  function count(el) {
    var target = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
    var pre = el.dataset.prefix || "", suf = el.dataset.suffix || "", short = "short" in el.dataset;
    var render = function (v) { el.textContent = short ? fmtShort(v) : pre + v.toFixed(dec) + suf; };
    if (reduce) { render(target); return; }
    var t0 = null;
    render(0);
    requestAnimationFrame(function f(ts) { if (!t0) t0 = ts; var p = Math.min((ts - t0) / 1800, 1); render(target * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(f); });
  }

  /* Reveal on scroll */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      $$("[data-count]", e.target).forEach(count);
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
  $$(".reveal").forEach(function (el, i) {
    var sib = el.parentElement ? $$(":scope > .reveal", el.parentElement).indexOf(el) : 0;
    el.style.transitionDelay = Math.min(sib, 5) * 0.08 + "s";
    io.observe(el);
  });

  /* Spotlight on tiles */
  $$(".tile").forEach(function (t) {
    t.addEventListener("pointermove", function (e) {
      var r = t.getBoundingClientRect();
      t.style.setProperty("--mx", e.clientX - r.left + "px"); t.style.setProperty("--my", e.clientY - r.top + "px");
    });
  });

  /* Magnetic links */
  if (!reduce) $$(".mag, .menu-btn").forEach(function (m) {
    m.addEventListener("pointermove", function (e) { var r = m.getBoundingClientRect(); m.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * 0.2 + "px," + (e.clientY - r.top - r.height / 2) * 0.3 + "px)"; });
    m.addEventListener("pointerleave", function () { m.style.transform = ""; });
  });

  /* Video */
  var video = $("#ghl-video"), frame = $("#video-frame");
  $$("[data-play]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!b.closest("#video-frame")) frame.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      video.muted = false; video.currentTime = 0;
      var p = video.play(); if (p && p.catch) p.catch(function () {});
    });
  });
  video.addEventListener("play", function () { frame.classList.add("playing"); });
  video.addEventListener("ended", function () { frame.classList.remove("playing"); });

  /* 3D tilt on the TikTok phone */
  var stage = $(".tt-stage"), phone = $("#tt-phone");
  if (stage && !reduce) {
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      phone.style.transform = "rotateY(" + (-16 + x * 24) + "deg) rotateX(" + (6 - y * 16) + "deg)";
    });
    stage.addEventListener("pointerleave", function () { phone.style.transform = ""; });
  }

  /* Design gallery */
  var DESIGNS = [
    [1, "Midnight Luxe", ["auto"], "Dark, cinematic and premium, with full-screen photography.", "Luxury car dealers, rentals, jewellers"],
    [2, "Clean Estate", ["estate"], "Bright and airy, with a large property search up front.", "Real estate agencies, brokers, shortlets"],
    [3, "Bold Editorial", ["food", "creative"], "Huge headlines and a confident magazine feel.", "Restaurants, fashion brands, events"],
    [4, "Glass Tech", ["business"], "Dark tech look with glowing glass panels.", "Startups, fintech, software, apps"],
    [5, "Warm Organic", ["food"], "Soft warm tones, elegant type and arched imagery.", "Restaurants, cafés, bakeries, wellness"],
    [6, "Corporate Trust", ["business"], "Structured, calm and confident in deep blue.", "Law, finance, consulting, logistics"],
    [7, "Neo Brutal", ["creative"], "Loud colour, thick outlines and bold type.", "Agencies, streetwear, creators"],
    [8, "Fresh Clinic", ["health"], "Calm mint, rounded shapes and a friendly feel.", "Clinics, pharmacies, wellness"],
    [9, "Photo Showcase", ["creative", "estate", "auto"], "Full-screen photography with minimal text.", "Photographers, hotels, venues, showrooms"],
    [10, "Playful Colour", ["business", "creative"], "Bright colour blocks and a cheerful layout.", "Schools, kids brands, churches, retail"],
    [11, "Aurora SaaS", ["business"], "Glowing gradients and a product dashboard hero.", "Software, apps, online services"],
    [12, "Velvet Beauty", ["health"], "Soft blush tones, elegant serif and arched photos.", "Salons, spas, lash and nail studios"],
    [13, "Trade Pro", ["business"], "Strong photo hero with trust stats up front.", "Roofers, builders, plumbers, cleaners"],
    [14, "Power Gym", ["health", "creative"], "Huge type, neon accents and a free-trial offer.", "Gyms, trainers, sports clubs"],
    [15, "Haven Stay", ["food", "estate"], "Calm luxury with a booking bar under the hero.", "Hotels, shortlets, resorts"],
    [16, "Swift Rentals", ["auto"], "Clean booking widget with your fleet beside it.", "Car rentals, chauffeur and airport services"],
    [17, "Smile Care", ["health"], "Fresh, gentle and easy to book.", "Dentists, clinics, physios"],
    [18, "Noir Realty", ["estate"], "Black and gold split layout for premium listings.", "Luxury real estate, developers"],
    [19, "Morning Café", ["food"], "Warm kraft tones, bold type and round photos.", "Cafés, brunch spots, bakeries"],
    [20, "Gala Events", ["creative"], "Rich gradients and a floating photo gallery.", "Event planners, weddings, venues"]
  ];
  var gallery = $("#gallery");
  gallery.innerHTML = DESIGNS.map(function (d) {
    var feat = [1, 11, 15, 18].indexOf(d[0]) > -1;
    return '<article class="design reveal' + (feat ? " feat" : "") + '" data-tags="' + d[2].join(" ") + '">' +
      '<button class="shot" type="button" data-preview="' + d[0] + '" aria-label="Preview the ' + d[1] + ' design"><img src="assets/designs/d' + d[0] + (feat ? "" : "-sm") + '.jpg" alt="' + d[1] + ' website design" loading="lazy" width="600" height="400"></button>' +
      '<div class="meta"><h3>' + d[1] + '<small>#' + String(d[0]).padStart(2, "0") + '</small></h3><p>' + d[3] + '</p>' +
      '<a class="btn btn-glass pick" target="_blank" rel="noopener" href="' + wa("Hello Vix Automations, I'd like a website in the " + d[1] + " design (#" + d[0] + "). Can we talk?") + '">Choose this design</a></div></article>';
  }).join("");
  $$(".design", gallery).forEach(function (el) { io.observe(el); });
  $$("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("[data-filter]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      var f = b.dataset.filter;
      $$(".design", gallery).forEach(function (el) { el.classList.toggle("out", f !== "all" && el.dataset.tags.split(" ").indexOf(f) < 0); el.classList.toggle("feat", f === "all" && ["1","11","15","18"].indexOf(el.querySelector("[data-preview]").dataset.preview) > -1); el.classList.add("in"); });
    });
  });
  var dlg = $("#preview");
  gallery.addEventListener("click", function (e) {
    var p = e.target.closest("[data-preview]"); if (!p) return;
    var d = DESIGNS[+p.dataset.preview - 1];
    $("#preview-img").src = "assets/designs/d" + d[0] + ".jpg"; $("#preview-img").alt = d[1] + " website design";
    $("#preview-name").textContent = d[1] + " · #" + String(d[0]).padStart(2, "0");
    $("#preview-desc").textContent = d[3]; $("#preview-best").textContent = "Best for: " + d[4];
    $("#preview-choose").href = wa("Hello Vix Automations, I'd like a website in the " + d[1] + " design (#" + d[0] + "). Can we talk?");
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
  });
  dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });

  /* Contact form: email (FormSubmit) + WhatsApp */
  var form = $("#contact-form"), status = $(".form-status", form);
  function say(msg, type) { status.textContent = msg; status.className = "form-status" + (type ? " " + type : ""); }
  form.addEventListener("input", function (e) { e.target.classList.remove("invalid"); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    $$("[required]", form).forEach(function (f) {
      var v = f.value.trim(), good = v && (f.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      f.classList.toggle("invalid", !good); if (!good) ok = false;
    });
    if (!ok) { say("Please add your name, a valid email and what you need.", "err"); return; }
    var d = Object.fromEntries(new FormData(form).entries());
    var text = "Hello Vix Automations, I'm " + d.name + (d.business ? " from " + d.business : "") + ".\nI need: " + d.service + (d.message ? "\n\n" + d.message : "") + "\n\nEmail: " + d.email + (d.whatsapp ? "\nWhatsApp: " + d.whatsapp : "");
    window.open(wa(text), "_blank", "noopener");
    var payload = Object.assign({ _subject: "New enquiry from " + d.name + " (" + d.service + ")", _template: "box", _captcha: "false", _replyto: d.email }, d);
    var ctl = "AbortController" in window ? new AbortController() : null;
    if (ctl) setTimeout(function () { ctl.abort(); }, 15000);
    say("Sending…");
    fetch("https://formsubmit.co/ajax/" + EMAIL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { if (!r.ok) throw 0; form.reset(); say("Thank you! Your message is in our inbox, and WhatsApp has opened so you can send it there too.", "ok"); })
      .catch(function () { say("WhatsApp has opened with your message. Please tap send there, or email us at " + EMAIL + ".", "ok"); });
  });
})();
