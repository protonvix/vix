/* Vix Assist: website tour video, opened from any [data-tour] button and a small floating button */
(function () {
  "use strict";
  var SRC = "/media/vix-assist-tour.mp4", POSTER = "/media/vix-assist-tour.jpg";
  var ov = null, last = null;
  // keep tour buttons hidden until the video file exists
  var btns = document.querySelectorAll("[data-tour]");
  btns.forEach(function (b) { b.hidden = true; });
  fetch(SRC, { method: "HEAD" }).then(function (r) {
    if (!r.ok) return;
    document.querySelectorAll("[data-tour]").forEach(function (b) { b.hidden = false; });
    document.documentElement.classList.add("has-tour");
  }).catch(function () {});
  function open() {
    if (ov) return;
    last = document.activeElement;
    ov = document.createElement("div");
    ov.className = "tour-ov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true"); ov.setAttribute("aria-label", "Vix Assist website tour");
    ov.innerHTML = '<div class="tour-box"><button class="tour-x" type="button" aria-label="Close tour">&times;</button><video src="' + SRC + '" poster="' + POSTER + '" controls autoplay playsinline preload="auto"><track kind="captions" src="/media/vix-assist-tour.vtt" srclang="en" label="English" default></video></div>';
    document.body.appendChild(ov);
    document.documentElement.style.overflow = "hidden";
    ov.querySelector(".tour-x").onclick = close;
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    requestAnimationFrame(function () { ov.classList.add("in"); ov.querySelector(".tour-x").focus(); });
  }
  function close() {
    if (!ov) return;
    var v = ov.querySelector("video"); if (v) v.pause();
    var o = ov; ov = null; o.classList.remove("in"); document.documentElement.style.overflow = "";
    setTimeout(function () { o.remove(); }, 350);
    if (last && last.focus) last.focus();
  }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-tour]"); if (b) { e.preventDefault(); open(); } });
  var fab = document.createElement("button");
  fab.type = "button"; fab.className = "tour-fab"; fab.setAttribute("data-tour", "");
  fab.innerHTML = '<i class="ph-fill ph-play-circle" aria-hidden="true"></i>Website tour'; fab.hidden = true;
  document.body.appendChild(fab);
  // the floating button only shows once the hero (with its own tour button) is out of view
  function place() { fab.classList.toggle("in", scrollY > innerHeight * 0.85); }
  addEventListener("scroll", place, { passive: true }); place();
})();
