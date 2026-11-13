/* Vix Assist: "Book a call" on every page.
   Adds a floating button and opens the booking page in a pop-up for any link to book.html.
   Works on other sites too: <script src="https://vixautomations.pages.dev/book-widget.js" defer></script> */
(function () {
  "use strict";
  if (window.__vxBook) return; window.__vxBook = true;
  var me = document.currentScript || document.querySelector('script[src*="book-widget.js"]');
  var ORIGIN = me && /^https?:/.test(me.src) ? new URL(me.src).origin : location.origin;
  var BOOK = ORIGIN + "/book.html";
  if (/\/book\.html$/.test(location.pathname) || /^\/portal\//.test(location.pathname)) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  var css = document.createElement("style");
  css.textContent =
    ".vxb-pill{position:fixed;left:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:10px;padding:10px 18px 10px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:rgba(18,18,24,.86);color:#F4F4F5;font:600 15px/20px Geist,Inter,system-ui,-apple-system,'Segoe UI',sans-serif;text-decoration:none;cursor:pointer;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 18px 50px -12px rgba(111,91,255,.55),inset 0 1px 0 rgba(255,255,255,.08);transform:translateY(140%);opacity:0;transition:transform .5s cubic-bezier(.22,1,.36,1),opacity .5s cubic-bezier(.22,1,.36,1),box-shadow .3s}" +
    ".vxb-pill.in{transform:none;opacity:1}" +
    ".vxb-pill:hover{box-shadow:0 22px 60px -10px rgba(111,91,255,.75),inset 0 1px 0 rgba(255,255,255,.1)}" +
    ".vxb-pill .vxb-ic{position:relative;display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6F5BFF,#4f7cff)}" +
    ".vxb-pill .vxb-ic svg{width:18px;height:18px}" +
    ".vxb-pill .vxb-ic::after{content:'';position:absolute;right:-1px;top:-1px;width:9px;height:9px;border-radius:50%;background:#3DDC97;border:2px solid #121218;animation:vxbP 2s infinite}" +
    ".vxb-pill small{display:block;font-weight:500;font-size:12px;line-height:14px;color:#A6A6AE}" +
    "@keyframes vxbP{0%{box-shadow:0 0 0 0 rgba(61,220,151,.6)}70%{box-shadow:0 0 0 8px rgba(61,220,151,0)}100%{box-shadow:0 0 0 0 rgba(61,220,151,0)}}" +
    ".vxb-ov{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .35s cubic-bezier(.22,1,.36,1)}" +
    ".vxb-ov.in{opacity:1}" +
    ".vxb-box{position:relative;width:min(1160px,100%);height:min(860px,100%);border-radius:24px;overflow:hidden;background:#000;border:1px solid rgba(255,255,255,.14);box-shadow:0 40px 140px -30px rgba(111,91,255,.6);transform:translateY(24px) scale(.98);transition:transform .45s cubic-bezier(.22,1,.36,1)}" +
    ".vxb-ov.in .vxb-box{transform:none}" +
    ".vxb-box iframe{width:100%;height:100%;border:0;display:block;background:#000}" +
    ".vxb-x{position:absolute;top:12px;right:12px;z-index:2;width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(24,24,28,.9);color:#fff;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}" +
    ".vxb-x:hover{background:#2a2a30}" +
    ".vxb-load{position:absolute;inset:0;display:grid;place-items:center;color:#A6A6AE;font:500 14px system-ui,sans-serif}" +
    "@media (max-width:640px){.vxb-pill{left:12px;bottom:12px;padding:8px 14px 8px 8px;font-size:14px}.vxb-pill small{display:none}.vxb-ov{padding:0}.vxb-box{border-radius:0;height:100%;border:0}}" +
    "@media (prefers-reduced-motion:reduce){.vxb-pill,.vxb-ov,.vxb-box{transition:none}.vxb-pill .vxb-ic::after{animation:none}}";
  document.head.appendChild(css);

  var ov = null, lastFocus = null;
  function open(e) {
    if (e) { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; e.preventDefault(); }
    if (ov) return;
    lastFocus = document.activeElement;
    ov = document.createElement("div");
    ov.className = "vxb-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Book a strategy call");
    ov.innerHTML = '<div class="vxb-box"><div class="vxb-load">Loading calendar…</div><button class="vxb-x" type="button" aria-label="Close">&times;</button><iframe title="Book a strategy call" src="' + BOOK + '?embed=1&from=' + encodeURIComponent(location.hostname) + '" allow="clipboard-write"></iframe></div>';
    document.body.appendChild(ov);
    document.documentElement.style.overflow = "hidden";
    ov.querySelector("iframe").addEventListener("load", function () { var l = ov && ov.querySelector(".vxb-load"); if (l) l.remove(); });
    ov.querySelector(".vxb-x").onclick = close;
    ov.addEventListener("click", function (ev) { if (ev.target === ov) close(); });
    requestAnimationFrame(function () { ov.classList.add("in"); ov.querySelector(".vxb-x").focus(); });
  }
  function close() {
    if (!ov) return;
    var o = ov; ov = null; o.classList.remove("in");
    document.documentElement.style.overflow = "";
    setTimeout(function () { o.remove(); }, reduce ? 0 : 350);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  addEventListener("message", function (e) { if (e.origin === ORIGIN && e.data === "vxb-close") close(); });

  // any link to the booking page opens the pop-up instead
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank") return;
    var u; try { u = new URL(a.getAttribute("href"), location.href); } catch (x) { return; }
    if (/\/book\.html$/.test(u.pathname) && (u.origin === location.origin || u.origin === ORIGIN)) open(e);
  });

  // floating button
  var pill = document.createElement("a");
  pill.className = "vxb-pill"; pill.href = BOOK;
  pill.innerHTML = '<span class="vxb-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg></span><span>Book a call<small>Free · Zoom or Google Meet</small></span>';
  pill.addEventListener("click", open);
  document.body.appendChild(pill);
  // a page with its own bottom call-to-action bar on phones keeps that bar instead
  var bar = document.querySelector(".mobile-cta");
  function place() {
    var hideForBar = bar && innerWidth <= 768;
    var shown = !hideForBar && scrollY > Math.min(480, innerHeight * 0.5);
    pill.classList.toggle("in", shown);
    pill.tabIndex = shown ? 0 : -1;
  }
  addEventListener("scroll", place, { passive: true }); addEventListener("resize", place); place();
})();
