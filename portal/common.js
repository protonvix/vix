/* Shared helpers for the client portal and admin. */
window.VX = (function () {
  "use strict";
  function api(path, body, opts) {
    opts = opts || {};
    var init = { method: body === undefined ? "GET" : "POST", credentials: "same-origin", headers: { "x-vix": "1" } };
    if (body instanceof FormData) init.body = body;
    else if (body !== undefined) { init.body = JSON.stringify(body); init.headers["content-type"] = "application/json"; }
    return fetch("/api/" + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || "Something went wrong. Please try again."); e.status = r.status; throw e; }
        return d;
      });
    });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function date(iso, withTime) {
    if (!iso) return "";
    var d = new Date(iso);
    var o = { day: "numeric", month: "short", year: "numeric" };
    if (withTime) { o.hour = "numeric"; o.minute = "2-digit"; }
    return d.toLocaleString("en-GB", o);
  }
  var SYM = { NGN: "₦", GBP: "£", USD: "$", EUR: "€" };
  function money(n, cur) { return (SYM[cur] || (cur ? cur + " " : "")) + Number(n || 0).toLocaleString("en-GB"); }
  function size(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  var TYPE = {
    website: { label: "Website", icon: "ph-browsers" },
    ghl: { label: "GoHighLevel", icon: "ph-flow-arrow" },
    tiktok: { label: "TikTok", icon: "ph-video-camera" },
    other: { label: "Project", icon: "ph-briefcase" }
  };
  function short(n) { return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K" : Number(n).toLocaleString("en-GB"); }

  // Small SVG line chart. rows: [{date, value}]
  function chart(rows, color) {
    var W = 640, H = 220, P = { l: 44, r: 16, t: 16, b: 28 };
    if (!rows.length) return "";
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    var nice = Math.pow(10, Math.floor(Math.log10(max))); max = Math.ceil(max / nice) * nice;
    var x = function (i) { return P.l + (rows.length === 1 ? (W - P.l - P.r) / 2 : i * (W - P.l - P.r) / (rows.length - 1)); };
    var y = function (v) { return H - P.b - (v / max) * (H - P.t - P.b); };
    var pts = rows.map(function (r, i) { return x(i).toFixed(1) + "," + y(r.value).toFixed(1); });
    var grid = [0, .5, 1].map(function (f) { var yy = y(max * f); return '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + yy + '" y2="' + yy + '" stroke="rgba(255,255,255,.07)"/><text x="' + (P.l - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + short(max * f) + "</text>"; }).join("");
    var step = Math.max(1, Math.ceil(rows.length / 6));
    var labels = rows.map(function (r, i) { return i % step === 0 || i === rows.length - 1 ? '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + "</text>" : ""; }).join("");
    var area = "M" + x(0) + "," + (H - P.b) + " L" + pts.join(" L") + " L" + x(rows.length - 1) + "," + (H - P.b) + " Z";
    var dots = rows.map(function (r, i) { return '<circle cx="' + x(i) + '" cy="' + y(r.value) + '" r="3.5" fill="#05060c" stroke="' + color + '" stroke-width="2"><title>' + short(r.value) + "</title></circle>"; }).join("");
    return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Growth chart"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".35"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' + grid + '<path d="' + area + '" fill="url(#ga)"/><polyline points="' + pts.join(" ") + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' + dots + labels + "</svg>";
  }
  return { api: api, esc: esc, date: date, money: money, size: size, TYPE: TYPE, short: short, chart: chart };
})();
