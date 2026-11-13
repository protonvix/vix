/* Vix Assist: shared behaviour for every page.
   Menu, dropdown, nav state, and the scroll animations (headlines rise word by word,
   paragraphs soften in, blocks fade up). */
(function () {
  "use strict";
  if (window.__vxSite) return; window.__vxSite = true;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* nav: hairline once you scroll */
  var nav = $(".nav");
  if (nav) { var onS = function () { nav.classList.toggle("scrolled", scrollY > 8); }; addEventListener("scroll", onS, { passive: true }); onS(); }

  /* mobile menu */
  var mb = $(".menu-btn"), panel = $("#mpanel");
  if (mb && panel) {
    var setMenu = function (open) {
      document.body.classList.toggle("menu-open", open);
      mb.setAttribute("aria-expanded", open); mb.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      panel.setAttribute("aria-hidden", !open);
      document.body.style.overflow = open ? "hidden" : "";
      $$("a", panel).forEach(function (a, i) { a.style.transitionDelay = open ? Math.min(i * 50, 400) + "ms" : "0ms"; });
    };
    mb.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    panel.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  /* dropdown (click for touch) */
  var dd = $("#dd");
  if (dd) {
    var ddb = dd.querySelector("button");
    ddb.addEventListener("click", function () { var o = !dd.classList.contains("open"); dd.classList.toggle("open", o); ddb.setAttribute("aria-expanded", o); });
    document.addEventListener("click", function (e) { if (!dd.contains(e.target)) { dd.classList.remove("open"); ddb.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") dd.classList.remove("open"); });
  }

  /* current section in nav */
  var links = $$('.nav-links a[href^="#"]');
  if (links.length && "IntersectionObserver" in window) {
    var secIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.setAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id); }); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var s = document.getElementById(a.getAttribute("href").slice(1)); if (s) secIO.observe(s); });
  }


  /* enquiry forms on service pages: <form data-brief="source"> posts to /api/brief */
  $$("form[data-brief]").forEach(function (f) {
    var done = f.parentNode.querySelector(".done"), err = f.querySelector(".err"), btn = f.querySelector("button[type=submit]"), label = btn.innerHTML;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = Object.fromEntries(new FormData(f)), bad = [];
      $$(".invalid", f).forEach(function (x) { x.classList.remove("invalid"); });
      if (!(d.name || "").trim()) bad.push("name");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((d.email || "").trim())) bad.push("email");
      if (f.elements.message && f.elements.message.required && !(d.message || "").trim()) bad.push("message");
      if (bad.length) { bad.forEach(function (n) { f.elements[n].classList.add("invalid"); }); err.textContent = bad.indexOf("email") > -1 ? "Please enter a valid email so I can reply." : "Please fill in your name and a few details."; f.elements[bad[0]].focus(); return; }
      err.textContent = ""; btn.disabled = true; btn.textContent = "Sending…";
      var text = (f.dataset.subject || "Website enquiry") + "\n\nService: " + (d.service || "-") + "\n\n" + (d.message || "");
      fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: f.dataset.brief, subject: (f.dataset.subject || "Website enquiry") + ": " + (d.business || d.name), name: d.name, email: d.email, whatsapp: d.whatsapp, business: d.business, service: d.service, text: text, website: d.website }) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "That didn't send."); return j; }); })
        .then(function () { f.style.display = "none"; if (done) done.classList.add("show"); })
        .catch(function (x) { err.textContent = x.message + " You can also message me on WhatsApp: +44 7723 149573."; btn.disabled = false; btn.innerHTML = label; });
    });
  });
  /* "Ask for a quote" buttons preselect the service */
  $$("[data-pick]").forEach(function (b) {
    b.addEventListener("click", function () { var s = $("form[data-brief] select[name=service]"); if (!s) return; var k = b.dataset.pick.toLowerCase(); Array.prototype.some.call(s.options, function (o) { if (o.text.toLowerCase() === k) { s.value = o.value; return true; } }); });
  });

  /* split headlines into masked words */
  function split(el) {
    if (el.dataset.split === "done") return;
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var m = document.createElement("span"); m.className = "wm";
            var w = document.createElement("span"); w.className = "wi"; w.style.setProperty("--i", i++); w.textContent = p;
            m.appendChild(w); frag.appendChild(m);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    })(el);
    el.dataset.split = "done";
    el.classList.add("split");
  }
  var heads = $$(".hero h1, .page-h1, .h2, .fcta h2, .cta-band h2, .prose h2, [data-split]").filter(function (el) { return !el.closest(".no-split"); });
  var paras = $$(".hero .sub, .page-hero .lead, .head .lead, [data-fade]");
  var blocks = $$(".rv");

  if (reduce || !("IntersectionObserver" in window)) {
    blocks.concat(paras).forEach(function (el) { el.classList.add("in"); });
    return;
  }
  heads.forEach(split);
  paras.forEach(function (p) { p.classList.add("fade"); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  heads.concat(paras, blocks).forEach(function (el) { io.observe(el); });
  // the first screen animates straight away
  requestAnimationFrame(function () {
    heads.concat(paras, blocks).forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight * 0.92) el.classList.add("in"); });
  });
})();
