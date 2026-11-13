/* Vix Assist homepage */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tagline: words light up one by one ---------- */
  var tag = $("#tagline");
  if (tag) {
    var words = tag.textContent.trim().split(/\s+/);
    tag.innerHTML = words.map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" ");
    var ws = tag.querySelectorAll(".w");
    if (reduce) ws.forEach(function (w) { w.classList.add("on"); });
    else {
      var ticking = false;
      var update = function () {
        ticking = false;
        var line = window.innerHeight * 0.62;
        ws.forEach(function (w) { w.classList.toggle("on", w.getBoundingClientRect().top < line); });
      };
      window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
      update();
    }
  }

  /* ---------- plan buttons preselect the form ---------- */
  document.querySelectorAll("[data-plan]").forEach(function (b) {
    b.addEventListener("click", function () { var s = $('#audit-form [name="plan"]'); if (s) s.value = b.dataset.plan; });
  });

  /* ---------- live GoHighLevel console demo ---------- */
  var board = $("#board"), feed = $("#feed"), toast = $("#toast");
  var people = ["Sarah Whitfield", "Daniel Okoro", "Priya Raman", "Tom Gallagher", "Ngozi Adeyemi", "Liam Carter", "Hannah Brooks", "Marcus Bell", "Aisha Bello", "Chloe Turner", "Ryan Doyle", "Fatima Khan"];
  var sources = ["Facebook ad", "Website form", "Google Business", "Instagram DM", "Missed call", "Referral"];
  var cols = board ? board.querySelectorAll(".col") : [];
  var pi = 0;
  function card(name, src, colIdx, won) {
    var c = document.createElement("div");
    c.className = "card enter" + (won ? " won" : "");
    c.innerHTML = "<b>" + name + "</b><span>" + src + "</span>";
    var col = cols[colIdx];
    col.insertBefore(c, col.children[1] || null);
    requestAnimationFrame(function () { requestAnimationFrame(function () { c.classList.remove("enter"); }); });
    while (col.querySelectorAll(".card").length > 3) col.removeChild(col.lastElementChild);
    return c;
  }
  function count() { cols.forEach(function (c) { var n = c.querySelectorAll(".card").length; c.querySelector("h4 span").textContent = n + Math.floor(Math.random() * 3); }); }
  var evs = [
    ["ph-paper-plane-tilt", "Instant reply sent to", "in 8s"],
    ["ph-calendar-check", "Appointment booked for", "now"],
    ["ph-bell-ringing", "Reminder sent to", "24h before"],
    ["ph-star", "Review request sent to", "after job"],
    ["ph-phone-call", "Missed call text back to", "in 5s"]
  ];
  var toasts = [
    ["Workflow published", "No show recovery · 4 steps tested"],
    ["A2P 10DLC approved", "US texting is live"],
    ["312 contacts imported", "Tagged and added to pipeline"],
    ["Calendar reminders fixed", "24h and 1h reminders on"],
    ["Conversation AI updated", "Now books into Team calendar"]
  ];
  function event(icon, text, name, when) {
    var e = document.createElement("div");
    e.className = "ev enter";
    e.innerHTML = '<i class="ph ' + icon + '"></i><span>' + text + " <b>" + name + "</b></span><time>" + when + "</time>";
    feed.insertBefore(e, feed.firstChild);
    requestAnimationFrame(function () { requestAnimationFrame(function () { e.classList.remove("enter"); }); });
    while (feed.children.length > 3) feed.removeChild(feed.lastChild);
  }
  var ti = 0, booked = 23;
  function step() {
    var name = people[pi % people.length], src = sources[pi % sources.length]; pi++;
    card(name, src, 0);
    var ev = evs[pi % evs.length];
    event(ev[0], ev[1], name.split(" ")[0], ev[2]);
    var adv = people[(pi + 7) % people.length];
    if (pi % 2 === 0) card(adv, "Replied by SMS", 1);
    if (pi % 3 === 0) { card(people[(pi + 4) % people.length], "Tue 10:30 · confirmed", 2); booked++; $("#k-booked").textContent = booked; }
    if (pi % 4 === 0) card(people[(pi + 9) % people.length], "Paid · review sent", 3, true);
    $("#k-reply").textContent = "0:0" + (6 + (pi % 4));
    count();
    if (pi % 3 === 1) {
      var t = toasts[ti++ % toasts.length];
      $("#toast-t").textContent = t[0]; $("#toast-s").textContent = t[1];
      toast.classList.add("show"); setTimeout(function () { toast.classList.remove("show"); }, 2600);
    }
  }
  if (board) {
    for (var i = 0; i < 3; i++) step();
    feed.querySelectorAll(".ev").forEach(function (e) { e.classList.remove("enter"); });
    if (!reduce) {
      var timer = setInterval(function () { if (document.visibilityState === "visible") step(); }, 2400);
      setTimeout(function () { toast.classList.add("show"); setTimeout(function () { toast.classList.remove("show"); }, 2600); }, 900);
    }
  }

  /* ---------- audit form ---------- */
  var f = $("#audit-form");
  if (f) f.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("#audit-err"), d = Object.fromEntries(new FormData(f)), btn = f.querySelector("button");
    f.querySelectorAll(".invalid").forEach(function (x) { x.classList.remove("invalid"); });
    var bad = [];
    if (!d.name.trim()) bad.push("name");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) bad.push("email");
    if (!d.message.trim()) bad.push("message");
    if (bad.length) {
      bad.forEach(function (n) { f.elements[n].classList.add("invalid"); });
      err.textContent = bad.indexOf("email") > -1 ? "Please enter a valid email address so I can send your audit." : "Please fill in your name and what I should look at first.";
      f.elements[bad[0]].focus(); return;
    }
    err.textContent = ""; btn.disabled = true; btn.firstChild.textContent = "Sending ";
    var text = "Free GoHighLevel audit request\n\nSetup: " + d.setup + "\nPlan interest: " + d.plan + "\n\nWhat to look at first:\n" + d.message;
    fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "Vix Assist audit form", subject: "New GoHighLevel audit request: " + (d.business || d.name), name: d.name, email: d.email, whatsapp: d.whatsapp, business: d.business, service: "GoHighLevel VA: " + d.plan, text: text, website: d.website }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || "Request failed"); return j; }); })
      .then(function () { f.style.display = "none"; $("#audit-done").classList.add("show"); })
      .catch(function (x) { err.textContent = (x.message || "That didn't send.") + " You can also message me on WhatsApp: +44 7723 149573."; btn.disabled = false; btn.firstChild.textContent = "Book my free audit "; });
  });
})();

/* replay the logo animation on hover */
(function () {
  var logo = document.getElementById("logo-anim");
  if (logo) logo.parentElement.addEventListener("mouseenter", function () { logo.src = "brand/vix-icon-animated.svg?r=" + Date.now(); });
})();
