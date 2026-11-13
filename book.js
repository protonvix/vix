/* Vix Assist: strategy call booking */
(function () {
  "use strict";
  if (/[?&]embed=1/.test(location.search)) {
    document.body.classList.add("bk-embed");
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && window.parent !== window) window.parent.postMessage("vxb-close", "*"); });
  }
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var here = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
  var tz = here, slots = [], byDay = {}, view = null, chosenDay = null, chosen = null, LEN = 30, WA = "447723149573";

  function parts(iso) {
    var p = {}; new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(iso)).forEach(function (x) { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day;
  }
  var fmt = function (iso, o) { return new Intl.DateTimeFormat("en-GB", Object.assign({ timeZone: tz }, o)).format(new Date(iso)); };
  var timeOf = function (iso) { return fmt(iso, { hour: "numeric", minute: "2-digit", hour12: !/^(Europe|Africa)\//.test(tz) }).replace(/\s?([ap])m$/i, function (_, a) { return a.toLowerCase() + "m"; }); };
  var longDay = function (iso) { return fmt(iso, { weekday: "long", day: "numeric", month: "long" }); };
  function platform() { return document.querySelector('input[name="platform"]:checked').value; }
  var PNAME = function () { return platform() === "zoom" ? "Zoom" : "Google Meet"; };

  /* time zone picker */
  var zones = ["Europe/London", "Europe/Dublin", "Europe/Paris", "Africa/Lagos", "Africa/Johannesburg", "Africa/Nairobi", "Asia/Dubai", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "Australia/Sydney", "Australia/Melbourne", "Australia/Perth", "Pacific/Auckland", "Asia/Singapore", "Asia/Kolkata"];
  if (zones.indexOf(here) < 0) zones.unshift(here);
  $("#tz").innerHTML = zones.map(function (z) { return "<option" + (z === here ? " selected" : "") + ' value="' + z + '">' + z.replace(/_/g, " ").replace("/", " · ") + (z === here ? " (yours)" : "") + "</option>"; }).join("");
  $("#tz").onchange = function () { tz = this.value; setTzLabel(); group(); drawCal(); if (chosenDay) pickDay(Object.keys(byDay).indexOf(chosenDay) > -1 ? chosenDay : null); };
  function setTzLabel() { $("#tz-label").textContent = tz.split("/").pop().replace(/_/g, " ") + " time"; }
  setTzLabel();

  function group() { byDay = {}; slots.forEach(function (s) { var k = parts(s); (byDay[k] = byDay[k] || []).push(s); }); }

  function drawCal() {
    var keys = Object.keys(byDay).sort();
    if (!view) { var f = keys[0] || parts(new Date().toISOString()); view = { y: +f.slice(0, 4), m: +f.slice(5, 7) - 1 }; }
    var first = new Date(Date.UTC(view.y, view.m, 1)), days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate(), lead = (first.getUTCDay() + 6) % 7;
    $("#month").textContent = first.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
    var today = parts(new Date().toISOString()), h = "";
    for (var i = 0; i < lead; i++) h += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var k = view.y + "-" + String(view.m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"), open = !!byDay[k];
      h += '<button type="button" class="day' + (open ? " open" : "") + (k === chosenDay ? " sel" : "") + (k === today ? " today" : "") + '"' + (open ? ' data-k="' + k + '" aria-label="' + esc(longDay(byDay[k][0])) + ", " + byDay[k].length + ' times open"' : " disabled") + ">" + d + "</button>";
    }
    $("#grid").innerHTML = h;
    var ym = function (k) { return +k.slice(0, 4) * 12 + +k.slice(5, 7) - 1; }, cur = view.y * 12 + view.m;
    $("#prev").disabled = !keys.length || ym(keys[0]) >= cur;
    $("#next").disabled = !keys.length || ym(keys[keys.length - 1]) <= cur;
  }
  $("#grid").addEventListener("click", function (e) { var b = e.target.closest(".day.open"); if (b) pickDay(b.dataset.k); });
  $("#prev").onclick = function () { view.m--; if (view.m < 0) { view.m = 11; view.y--; } drawCal(); };
  $("#next").onclick = function () { view.m++; if (view.m > 11) { view.m = 0; view.y++; } drawCal(); };

  function pickDay(k) {
    chosenDay = k; drawCal();
    if (!k) { $("#day-label").textContent = "Pick a date"; $("#times").innerHTML = '<p class="hint"><i class="ph ph-calendar-blank" aria-hidden="true"></i>Days with open times are highlighted.</p>'; return; }
    $("#day-label").textContent = longDay(byDay[k][0]);
    $("#times").innerHTML = byDay[k].map(function (s, i) { return '<button type="button" class="slot" style="animation-delay:' + Math.min(i * 30, 400) + 'ms" data-s="' + s + '">' + timeOf(s) + "</button>"; }).join("");
    if (innerWidth < 980) $("#day-label").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("#times").addEventListener("click", function (e) { var b = e.target.closest(".slot"); if (b) { chosen = b.dataset.s; step(2); } });

  function step(n) {
    ["#s0", "#s1", "#s2", "#s3"].forEach(function (s, i) { $(s).hidden = i !== n; });
    document.querySelectorAll(".bk-steps li").forEach(function (li) { var s = +li.dataset.s; li.classList.toggle("on", s === n); li.classList.toggle("did", s < n); });
    if (n === 2) {
      $("#chosen").innerHTML = '<i class="ph-fill ph-calendar-check" aria-hidden="true"></i><div><span class="svc-tag">' + esc(serviceLabel()) + '</span><b>' + esc(longDay(chosen)) + " at " + esc(timeOf(chosen)) + "</b><small>" + LEN + " minutes on " + PNAME() + " · " + esc(tz.replace(/_/g, " ")) + " time</small></div>";
      setTimeout(function () { $('#s2 [name="name"]').focus({ preventScroll: innerWidth < 980 }); }, 50);
    }
    $(".bk-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("#back").onclick = function () { step(1); };

  /* step 0: service */
  var SERVICE = "";
  function serviceLabel() { var r = document.querySelector('input[name="service"]:checked'); return r ? r.closest(".svc").querySelector("b").textContent : ""; }
  document.querySelectorAll('input[name="service"]').forEach(function (r) { r.onchange = function () { SERVICE = r.value; setTimeout(function () { step(1); }, 220); }; });
  document.querySelectorAll(".bk-steps li").forEach(function (li) { li.style.cursor = "pointer"; li.onclick = function () { var n = +li.dataset.s; if (n === 0 || (n === 1 && SERVICE) || (n === 2 && SERVICE && chosen)) step(n); }; });
  (function () { var q = new URLSearchParams(location.search).get("service"); var r = q && document.querySelector('input[name="service"][value="' + q.replace(/[^a-z-]/g, "") + '"]'); if (r) { r.checked = true; SERVICE = r.value; step(1); } })();
  document.querySelectorAll('input[name="platform"]').forEach(function (r) { r.onchange = function () { if (!$("#s2").hidden) step(2); }; });

  function load() {
    $("#times").innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    return fetch("/api/book/slots").then(function (r) { return r.json(); }).then(function (d) {
      if (!d.slots) throw new Error(d.error || "x");
      slots = d.slots; LEN = d.length || 30; WA = d.whatsapp || WA;
      $("#len-label").textContent = LEN + " minutes";
      group(); drawCal();
      var keys = Object.keys(byDay).sort();
      if (!keys.length) { $("#times").innerHTML = '<p class="hint"><i class="ph ph-info" aria-hidden="true"></i>No open times right now. Message me on WhatsApp or LinkedIn and I\'ll fit you in.</p>'; return; }
      pickDay(chosenDay && byDay[chosenDay] ? chosenDay : keys[0]);
    }).catch(function () {
      $("#month").textContent = "Calendar unavailable";
      $("#times").innerHTML = '<p class="hint"><i class="ph ph-wifi-slash" aria-hidden="true"></i>The calendar didn\'t load. Refresh the page, or message me on WhatsApp and I\'ll book you in by hand.</p>';
    });
  }

  /* confirm */
  $("#s2").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, d = Object.fromEntries(new FormData(f)), err = $("#err"), btn = $("#confirm");
    f.querySelectorAll(".invalid").forEach(function (x) { x.classList.remove("invalid"); });
    if (!d.name.trim()) { f.elements.name.classList.add("invalid"); err.textContent = "Please add your name."; f.elements.name.focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) { f.elements.email.classList.add("invalid"); err.textContent = "Please enter a valid email so I can send your call link."; f.elements.email.focus(); return; }
    err.textContent = ""; btn.disabled = true; btn.firstChild.textContent = "Booking ";
    fetch("/api/book", { method: "POST", headers: { "content-type": "application/json", "x-vix": "1" }, body: JSON.stringify(Object.assign(d, { start: chosen, platform: platform(), tz: tz, service: SERVICE })) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var x = new Error(j.error || "That didn't go through."); x.status = r.status; throw x; } return j; }); })
      .then(function (j) { done(j.booking, d); })
      .catch(function (x) {
        err.textContent = x.message + (x.status === 409 ? "" : " You can also message me on WhatsApp: +44 7723 149573.");
        btn.disabled = false; btn.firstChild.textContent = "Confirm my call ";
        if (x.status === 409) { chosen = null; load().then(function () { setTimeout(function () { step(1); }, 1600); }); }
      });
  });

  function ics(b) {
    var st = function (iso) { return iso.replace(/[-:]|\.\d{3}/g, ""); };
    var body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Vix Assist//Booking//EN", "METHOD:PUBLISH", "BEGIN:VEVENT", "UID:" + st(b.start) + "-" + Math.random().toString(36).slice(2) + "@vixassist", "DTSTAMP:" + st(new Date().toISOString()), "DTSTART:" + st(b.start), "DTEND:" + st(b.end),
      "SUMMARY:Strategy call with Promise (Vix Assist)", "DESCRIPTION:" + (b.link ? "Join on " + (b.platform === "zoom" ? "Zoom" : "Google Meet") + ": " + b.link + "\\n\\n" : "") + "Questions? WhatsApp +44 7723 149573", b.link ? "LOCATION:" + b.link : "", "BEGIN:VALARM", "TRIGGER:-PT15M", "ACTION:DISPLAY", "DESCRIPTION:Strategy call in 15 minutes", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(body);
  }
  function done(b, d) {
    step(3);
    var P = b.platform === "zoom" ? "Zoom" : "Google Meet";
    $("#d-when").textContent = longDay(b.start) + " at " + timeOf(b.start) + " · " + b.length + " minutes on " + P;
    $("#d-link").innerHTML = b.link ? '<a class="join" href="' + esc(b.link) + '" target="_blank" rel="noopener"><i class="ph ph-video-camera" aria-hidden="true"></i>Your ' + P + " link</a><code>" + esc(b.link) + "</code>"
      : "<span>I'll send your " + P + " link to <b>" + esc(d.email) + "</b> before the call.</span>";
    $("#d-gcal").href = b.gcal; $("#d-ics").href = ics(b);
    $("#d-note").textContent = b.invited ? "A calendar invite is on its way to " + d.email + "." : b.emailed ? "A confirmation is on its way to " + d.email + ". Check Spam if you don't see it." : "Save the time to your calendar with the buttons above.";
    $("#d-wa").href = "https://wa.me/" + WA + "?text=" + encodeURIComponent("Hi Promise, I just booked a strategy call for " + longDay(b.start) + " at " + timeOf(b.start) + ". My name is " + d.name + ".");
  }

  load();
})();
