/* Client dashboard */
(function () {
  "use strict";
  var api = VX.api, esc = VX.esc, $ = function (s) { return document.querySelector(s); };
  var data = null, current = null, metricKey = null;
  var COLORS = { visitors: "#9db4ff", enquiries: "#7ff3d4", leads: "#9db4ff", appointments: "#7ff3d4", reviews: "#ffd166", automations: "#c3a6ff", views: "#ff5c87", followers: "#7ff3d4", likes: "#ffd166", videos: "#9db4ff" };

  function showLogin() { $("#login-view").hidden = false; $("#dash-view").hidden = true; }
  function load() {
    return api("me").then(function (d) {
      data = d; $("#login-view").hidden = true; $("#dash-view").hidden = false;
      if (!current || !data.projects.some(function (p) { return p.id === current; })) current = data.projects[0] && data.projects[0].id;
      render();
    }).catch(function (e) { if (e.status === 401) showLogin(); else alert(e.message); });
  }

  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = new FormData(e.target), btn = e.target.querySelector("button");
    btn.disabled = true; $("#login-err").textContent = "";
    api("login", { email: f.get("email"), password: f.get("password") }).then(load).catch(function (er) { $("#login-err").textContent = er.message; }).finally(function () { btn.disabled = false; });
  });
  $("#logout").addEventListener("click", function () { api("logout", {}).finally(function () { location.reload(); }); });
  $("#toast-x").addEventListener("click", function () { $("#toast").classList.remove("show"); });

  function render() {
    var c = data.client, first = (c.name || "").split(" ")[0];
    $("#hello-h").innerHTML = "Welcome, <em>" + esc(first || "there") + "</em>";
    $("#hello-p").textContent = c.business ? c.business + " · Client since " + VX.date(c.createdAt) : "Client since " + VX.date(c.createdAt);
    var tabs = $("#tabs");
    tabs.innerHTML = data.projects.length > 1 ? data.projects.map(function (p) {
      return '<button class="tab" role="tab" type="button" data-id="' + p.id + '" aria-selected="' + (p.id === current) + '"><i class="ph ' + (VX.TYPE[p.type] || VX.TYPE.other).icon + '" aria-hidden="true"></i>' + esc(p.title) + (p.unreadClient ? "<b>" + p.unreadClient + "</b>" : "") + "</button>";
    }).join("") : "";
    tabs.onclick = function (e) { var b = e.target.closest("[data-id]"); if (b) { current = b.dataset.id; metricKey = null; render(); } };
    var p = data.projects.find(function (x) { return x.id === current; });
    if (!p) { $("#project").innerHTML = '<div class="card empty"><i class="ph ph-hourglass" aria-hidden="true"></i>Your project will appear here shortly.</div>'; return; }
    $("#project").innerHTML = view(p);
    wire(p);
    announce(p);
    assistant.refresh(p);
  }

  function view(p) {
    var t = VX.TYPE[p.type] || VX.TYPE.other, last = p.stage >= p.stages.length - 1;
    var C = 2 * Math.PI * 56, off = C * (1 - p.progress / 100);
    var html = '<div class="grid">', bl = p.billing;
    var DUE = { now: "Payment due now", overdue: "Payment overdue", soon: "Payment due soon", "delivery-due": "Your project is delivered: final payment due" };
    function dueDate(x) { return x.due === "delivery" ? "on delivery" : x.due === "now" ? "today" : new Date(x.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
    if (bl && bl.next && DUE[bl.next.state] && !bl.next.claimed) {
      html += '<section class="card c12 paybar ' + bl.next.state + '"><span class="pb-ic"><i class="ph-fill ph-credit-card" aria-hidden="true"></i></span><div><b>' + DUE[bl.next.state] + ": " + VX.money(bl.next.amount, bl.currency) + "</b><span>" +
        (bl.next.state === "overdue" ? "This payment was due " + dueDate(bl.next) + ". " : bl.next.state === "soon" ? "Due " + dueDate(bl.next) + (bl.next.days === 0 ? " (today)" : "") + ". " : "") +
        "Your finished files and live website unlock once you've paid in full.</span></div><a class=\"btn btn-p\" href=\"" + esc(bl.payUrl) + "\">Pay now</a></section>";
    } else if (bl && bl.next && bl.next.claimed) {
      html += '<section class="card c12 paybar claimed"><span class="pb-ic"><i class="ph-fill ph-hourglass-medium" aria-hidden="true"></i></span><div><b>We\'re confirming your bank transfer of ' + VX.money(bl.next.amount, bl.currency) + "</b><span>Thank you! We'll update this as soon as it arrives.</span></div></section>";
    }
    html += '<section class="card c8" id="sec-progress"><div class="overview"><div class="ring"><svg viewBox="0 0 132 132"><circle class="t" cx="66" cy="66" r="56"/><circle class="v" cx="66" cy="66" r="56" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" data-off="' + off + '"/></svg><b>' + p.progress + '%<small>complete</small></b></div>' +
      '<div><span class="badge' + (last ? " live" : "") + '"><i class="ph ' + t.icon + '" aria-hidden="true"></i>' + t.label + "</span>" +
      '<h2 class="ov-title">' + esc(p.title) + '</h2><p class="ov-status">' + esc(p.status) + "</p>" +
      '<div class="facts"><span><i class="ph ph-calendar-check" aria-hidden="true"></i>Started ' + VX.date(p.paidAt) + "</span>" +
      (p.eta ? '<span><i class="ph ph-flag-checkered" aria-hidden="true"></i>Expected ' + esc(p.eta) + "</span>" : "") +
      (bl ? '<span><i class="ph ph-receipt" aria-hidden="true"></i>' + (bl.fullyPaid ? "Paid in full" : "Paid " + VX.money(bl.paid, bl.currency) + " of " + VX.money(bl.total, bl.currency)) + "</span>" : p.amount ? '<span><i class="ph ph-receipt" aria-hidden="true"></i>Paid ' + VX.money(p.amount, p.currency) + "</span>" : "") + "</div></div></div>" +
      '<ol class="stages" style="margin-top:22px">' + p.stages.map(function (s, i) { return '<li class="' + (i < p.stage ? "done" : i === p.stage ? "now" : "") + '">' + esc(s) + "</li>"; }).join("") + "</ol></section>";

    // deliveries + links
    var items = "";
    if (p.liveUrl) items += lnk(p.liveUrl, "ph-globe", "Visit your live website", p.liveUrl, false, true);
    if (p.liveLocked) items += lockedItem("ph-globe", "Your live website", bl);
    if (p.previewUrl) items += lnk(p.previewUrl, "ph-eye", "Preview your project", p.previewUrl, false, true);
    (p.deliverables || []).slice().reverse().forEach(function (d) {
      if (d.locked) { items += lockedItem(d.size ? "ph-file-arrow-down" : "ph-link", d.title, bl, d.isNew); return; }
      var href = d.fileId ? "/api/file/" + d.fileId : d.url;
      items += lnk(href, d.fileId ? "ph-download-simple" : "ph-link", d.title, d.fileId ? (d.name || "File") + " · " + VX.size(d.size) + " · " + VX.date(d.at) : VX.date(d.at), d.isNew, !d.fileId);
      items += (p.reviews && p.reviews[d.id]) ? '<div class="rv-act"><span class="done"><i class="ph-fill ph-check-circle" aria-hidden="true"></i>You reviewed this delivery. Thank you!</span></div>'
        : '<div class="rv-act"><button type="button" data-rv-d="' + esc(d.id) + '" data-rv-t="' + esc(d.title) + '"><i class="ph ph-star" aria-hidden="true"></i>Review this delivery</button></div>';
    });
    html += '<section class="card c4" id="sec-deliveries"><h2><i class="ph ph-package" aria-hidden="true"></i>Your deliveries</h2><div class="links">' + (items || '<div class="empty"><i class="ph ph-hourglass-medium" aria-hidden="true"></i>Your files and links will pop up here as soon as they\'re ready.</div>') + "</div></section>";

    // payments
    if (bl && bl.type !== "full") {
      var pct = Math.round(bl.paid / bl.total * 100);
      html += '<section class="card c12" id="sec-payments"><h2><i class="ph ph-wallet" aria-hidden="true"></i>Your payments</h2><div class="pay-sum"><div><span class="muted">' + esc(bl.label) + "</span><b>" + VX.money(bl.paid, bl.currency) + ' <small>of ' + VX.money(bl.total, bl.currency) + " paid</small></b>" +
        '<div class="pay-bar"><i style="width:' + pct + '%"></i></div></div>' + (bl.next && !bl.next.claimed ? '<a class="btn btn-p" href="' + esc(bl.payUrl) + '">Pay ' + VX.money(bl.next.amount, bl.currency) + (bl.next.state === "scheduled" || bl.next.state === "after-delivery" ? " early" : " now") + "</a>" : bl.fullyPaid ? '<span class="badge live">Paid in full ✓</span>' : "") + "</div>" +
        '<ol class="pay-sched">' + bl.items.map(function (x) {
          var st = x.status === "paid" ? "paid" : bl.next && bl.next.i === x.i ? bl.next.state : "upcoming";
          var lab = x.status === "paid" ? "Paid " + VX.date(x.paidAt) : bl.next && bl.next.i === x.i && DUE[bl.next.state] ? DUE[bl.next.state].replace(/:.*/, "") : x.due === "delivery" ? "Due on delivery" : "Due " + dueDate(x);
          return '<li class="' + st + '"><span>Payment ' + (x.i + 1) + "</span><em>" + lab + "</em><b>" + VX.money(x.amount, bl.currency) + "</b></li>";
        }).join("") + "</ol>" +
        (bl.fullyPaid ? "" : '<p class="note" style="margin:12px 0 0"><i class="ph ph-lock-simple" aria-hidden="true"></i> Your finished files and live website are released once you\'ve paid in full.</p>') + "</section>";
    }

    // growth
    if (p.metricKeys.length) {
      html += '<section class="card c12"><h2><i class="ph ph-chart-line-up" aria-hidden="true"></i>Your growth</h2>';
      if ((p.metrics || []).length) {
        if (!metricKey || p.metricKeys.indexOf(metricKey) < 0) metricKey = p.metricKeys[0];
        html += '<div class="kpis">' + p.metricKeys.map(function (k) {
          var rows = p.metrics.filter(function (m) { return m[k] != null; }), lastV = rows.length ? rows[rows.length - 1][k] : 0, prev = rows.length > 1 ? rows[rows.length - 2][k] : null;
          var ch = prev ? Math.round((lastV - prev) / prev * 100) : null;
          return '<button type="button" class="kpi" data-k="' + k + '" aria-pressed="' + (k === metricKey) + '"><span>' + k + "</span><b>" + VX.short(lastV) + "</b>" + (ch != null ? '<small class="' + (ch >= 0 ? "up" : "down") + '">' + (ch >= 0 ? "▲ " : "▼ ") + Math.abs(ch) + "% vs last</small>" : '<small class="muted">Latest</small>') + "</button>";
        }).join("") + "</div>";
        var rows = p.metrics.filter(function (m) { return m[metricKey] != null; }).map(function (m) { return { date: m.date, value: m[metricKey] }; });
        html += '<div id="chart">' + VX.chart(rows, COLORS[metricKey] || "#9db4ff") + "</div>";
      } else html += '<div class="empty"><i class="ph ph-chart-bar" aria-hidden="true"></i>Your growth numbers (' + p.metricKeys.join(", ") + ") will appear here once your " + (p.type === "tiktok" ? "videos start posting" : p.type === "website" ? "website is live" : "system is live") + ".</div>";
      html += "</section>";
    }

    // updates
    html += '<section class="card c6" id="sec-updates"><h2><i class="ph ph-megaphone" aria-hidden="true"></i>Project updates</h2><ul class="feed">' + (p.updates || []).slice().reverse().map(function (u) { return "<li>" + esc(u.text) + "<time>" + VX.date(u.at, true) + "</time></li>"; }).join("") + "</ul></section>";

    // messages
    html += '<section class="card c6" id="sec-messages"><h2><i class="ph ph-chats-circle" aria-hidden="true"></i>Messages</h2><div class="chat" id="chat">' +
      ((p.messages || []).length ? p.messages.map(function (m) { return '<div class="msg ' + (m.from === "client" ? "mine" : "them") + '">' + esc(m.text) + "<time>" + (m.from === "client" ? "You" : "Vix Assist") + " · " + VX.date(m.at, true) + "</time></div>"; }).join("") : '<div class="empty"><i class="ph ph-chat-teardrop-text" aria-hidden="true"></i>Ask a question or request a change. We usually reply within one business day.</div>') +
      '</div><form class="send" id="send"><label class="sr" style="flex:1"><span hidden>Message</span><textarea name="text" rows="2" placeholder="Request a change or ask a question…" required></textarea></label><button class="btn btn-p" type="submit"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i>Send</button></form><p class="err" id="send-err"></p></section>';

    var reviewedProject = p.reviews && p.reviews.project;
    html += '<section class="card c12 help" id="sec-reviews"><div><h2><i class="ph ph-star" aria-hidden="true"></i>How are we doing?</h2><p class="muted">Review each delivery as it arrives, the project as a whole, or how easy our website is to use. Your reviews show a <b>Verified client</b> badge and appear on vixassist.com once approved.</p></div><div class="acts">' +
      (reviewedProject ? '<span class="note ok"><i class="ph-fill ph-check-circle" aria-hidden="true"></i> Project reviewed</span>' : '<button class="btn btn-p" type="button" data-rv-d="" data-rv-t="' + esc(p.title) + '"><i class="ph ph-pencil-simple" aria-hidden="true"></i>Review this project</button>') +
      '<button class="btn btn-g" type="button" data-rv-site><i class="ph ph-browser" aria-hidden="true"></i>Rate our website</button><a class="btn btn-g" href="/reviews.html#all" target="_blank" rel="noopener">Read reviews</a></div></section>';
    html += '<section class="card c12 help" id="sec-help"><div><h2>Need anything?</h2><p class="muted">Message us here, on WhatsApp or by email. A real person replies.</p></div><div class="acts"><a class="btn btn-wa" href="https://wa.me/447723149573" target="_blank" rel="noopener"><i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i>WhatsApp UK</a><a class="btn btn-g" href="https://wa.me/message/WV3WLO4FC656K" target="_blank" rel="noopener">WhatsApp Nigeria</a><a class="btn btn-g" href="mailto:support@vixassist.com">Email us</a></div></section>';
    return html + "</div>";
  }

  function lockedItem(icon, title, bl, isNew) {
    return '<div class="lnk locked' + (isNew ? " new" : "") + '"><span class="ic"><i class="ph ' + icon + '" aria-hidden="true"></i></span><div><b>' + esc(title) + (isNew ? '<span class="pill-new">Ready</span>' : "") + "</b><span>🔒 Unlocks when you've paid in full" + (bl && bl.next ? " · " + VX.money(bl.balance, bl.currency) + " left" : "") + '</span></div>' + (bl ? '<a class="btn btn-p btn-sm" href="' + esc(bl.payUrl) + '">Pay</a>' : "") + "</div>";
  }
  function lnk(href, icon, title, sub, isNew, ext) {
    return '<a class="lnk' + (isNew ? " new" : "") + '" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + '><span class="ic"><i class="ph ' + icon + '" aria-hidden="true"></i></span><div><b>' + esc(title) + (isNew ? '<span class="pill-new">New</span>' : "") + "</b><span>" + esc(sub) + '</span></div><i class="ph ' + (ext ? "ph-arrow-up-right" : "ph-download-simple") + '" aria-hidden="true"></i></a>';
  }

  function wire(p) {
    requestAnimationFrame(function () { var v = document.querySelector(".ring .v"); if (v) v.style.strokeDashoffset = v.dataset.off; });
    document.querySelectorAll("[data-rv-d]").forEach(function (b) { b.addEventListener("click", function () { reviewBox(p, b.dataset.rvD, b.dataset.rvT); }); });
    document.querySelectorAll("[data-rv-site]").forEach(function (b) { b.addEventListener("click", function () { reviewBox(p, null, "Our website"); }); });
    var chat = $("#chat"); if (chat) chat.scrollTop = chat.scrollHeight;
    document.querySelectorAll(".kpi").forEach(function (b) { b.addEventListener("click", function () { metricKey = b.dataset.k; render(); }); });
    $("#send").addEventListener("submit", function (e) {
      e.preventDefault();
      var ta = e.target.text, btn = e.target.querySelector("button");
      if (!ta.value.trim()) return;
      btn.disabled = true; $("#send-err").textContent = "";
      api("message", { projectId: p.id, text: ta.value }).then(function (d) {
        var i = data.projects.findIndex(function (x) { return x.id === p.id; }); data.projects[i] = d.project; render();
      }).catch(function (er) { $("#send-err").textContent = er.message; btn.disabled = false; });
    });
  }



  /* review a delivery, the whole project, or the website, without leaving the dashboard */
  function reviewBox(p, deliverableId, title) {
    var site = deliverableId === null, m = document.getElementById("rv-modal");
    if (!m) { m = document.createElement("div"); m.id = "rv-modal"; m.className = "rv-modal"; m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); document.body.appendChild(m); }
    var heading = site ? "How easy is our website to use?" : deliverableId ? "How was this delivery?" : "How was your project overall?";
    m.innerHTML = '<form class="rv-box" novalidate><button class="x" type="button" aria-label="Close" data-x><i class="ph ph-x" aria-hidden="true"></i></button>' +
      "<h2>" + heading + '</h2><p class="muted" style="margin:0">' + (site ? "Tell us about the design and ease of use of vixassist.com and this dashboard." : "About: <b>" + esc(title) + "</b>") + "</p>" +
      '<div><b style="font-size:13px">Your rating</b><div class="rv-stars" role="radiogroup" aria-label="Star rating">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="false" aria-label="' + n + ' star' + (n > 1 ? "s" : "") + '" data-s="' + n + '">★</button>'; }).join("") + "<span></span></div></div>" +
      '<label>Headline (optional)<input name="title" maxlength="120" placeholder="Sum it up in a few words"></label>' +
      '<label>Your review<textarea name="text" rows="4" maxlength="3000" placeholder="' + (site ? "What was easy, and what was confusing or slow?" : "What did you like, and what could be better?") + '"></textarea></label>' +
      '<p class="err" role="alert" style="margin:0"></p><div class="rv-cta"><button class="btn btn-p" type="submit">Submit review</button><button class="btn btn-g" type="button" data-x>Cancel</button></div>' +
      '<p class="muted" style="margin:0;font-size:12px">Your review is checked before it appears on vixassist.com with a Verified client badge.</p></form>';
    m.hidden = false;
    var f = m.querySelector("form"), rating = 0, stars = f.querySelectorAll("[data-s]");
    var paint = function (n) { stars.forEach(function (b, i) { b.classList.toggle("on", i < n); b.setAttribute("aria-checked", i + 1 === rating); }); };
    f.querySelector(".rv-stars").addEventListener("click", function (e) { var b = e.target.closest("[data-s]"); if (!b) return; rating = +b.dataset.s; paint(rating); f.querySelector(".err").textContent = ""; f.querySelector(".rv-stars span").textContent = ["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]; });
    var close = function () { m.hidden = true; };
    m.querySelectorAll("[data-x]").forEach(function (b) { b.onclick = close; });
    m.onclick = function (e) { if (e.target === m) close(); };
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = f.querySelector(".err"), btn = f.querySelector("[type=submit]"); err.textContent = "";
      if (!rating) { err.textContent = "Please choose a star rating."; return; }
      btn.disabled = true;
      var body = { rating: rating, title: f.elements.title.value, text: f.elements.text.value };
      if (site) body.experience = "site"; else { body.projectId = p.id; body.deliverableId = deliverableId; if (deliverableId) body.experience = "delivery"; }
      api("reviews", body).then(function () {
        if (!site) { p.reviews = p.reviews || {}; p.reviews[deliverableId || "project"] = "pending"; data.projects.forEach(function (x) { if (x.id === p.id) x.reviews = p.reviews; }); render(); }
        m.hidden = false;
        m.innerHTML = '<div class="rv-box rv-ok"><i class="ph-fill ph-check-circle" aria-hidden="true"></i><b>Thank you for your review!</b><p class="muted">It will appear on vixassist.com once it has been approved, usually within one working day.</p><div class="rv-cta" style="justify-content:center"><a class="btn btn-g" href="/reviews.html#all" target="_blank" rel="noopener">See all reviews</a><button class="btn btn-p" type="button" data-x>Done</button></div></div>';
        m.querySelector("[data-x]").onclick = close;
      }).catch(function (x) { err.textContent = x.message; btn.disabled = false; });
    });
    setTimeout(function () { stars[4].focus(); }, 50);
  }

  /* live chat: check for new messages from Vix every 15 seconds */
  function chatHtml(p) {
    return (p.messages || []).map(function (m) { return '<div class="msg ' + (m.from === "client" ? "mine" : "them") + '">' + esc(m.text) + "<time>" + (m.from === "client" ? "You" : "Vix Assist") + " · " + VX.date(m.at, true) + "</time></div>"; }).join("");
  }
  setInterval(function () {
    if (!data || $("#dash-view").hidden || document.visibilityState !== "visible") return;
    api("me").then(function (d) {
      var oldP = data.projects.find(function (x) { return x.id === current; });
      var newP = d.projects.find(function (x) { return x.id === current; });
      data = d;
      if (!oldP || !newP) return;
      var before = (oldP.messages || []).length, after = (newP.messages || []).length;
      if (after > before) {
        var chat = $("#chat");
        if (chat) { chat.innerHTML = chatHtml(newP); chat.scrollTop = chat.scrollHeight; }
        var last = newP.messages[after - 1];
        if (last && last.from === "vix") {
          $("#toast-t").textContent = "💬 New message from Vix Assist";
          $("#toast-s").textContent = last.text.length > 90 ? last.text.slice(0, 90) + "…" : last.text;
          $("#toast").classList.add("show"); setTimeout(function () { $("#toast").classList.remove("show"); }, 8000);
          api("seen", { projectId: newP.id }).catch(function () {});
        }
      }
    }).catch(function () {});
  }, 15000);

  var announced = {};
  function announce(p) {
    if (announced[p.id]) return; announced[p.id] = true;
    var fresh = (p.deliverables || []).filter(function (d) { return d.isNew; });
    var title, sub, bl = p.billing;
    var DUEPOP = { now: "💳 Payment due now", overdue: "⚠️ Your payment is overdue", soon: "💳 Payment due soon", "delivery-due": "🎉 Your project is ready: final payment due" };
    if (bl && bl.next && DUEPOP[bl.next.state] && !bl.next.claimed) { title = DUEPOP[bl.next.state] + ": " + VX.money(bl.next.amount, bl.currency); sub = (fresh.some(function (d) { return d.locked; }) ? "Your new delivery is ready and unlocks once you've paid in full. " : "") + "Tap Pay now at the top of your dashboard."; }
    else if (fresh.length) { title = fresh.length === 1 ? "🎉 " + fresh[0].title + " is ready!" : "🎉 " + fresh.length + " new deliveries are ready!"; sub = fresh.some(function (d) { return d.locked; }) ? "It unlocks once you've paid in full. See Your payments below." : "Find them under Your deliveries, then tap Review this delivery to tell us how it went."; }
    else if (p.unreadClient) { title = "You have " + p.unreadClient + " new update" + (p.unreadClient > 1 ? "s" : ""); sub = "Your project is moving forward."; }
    else return;
    $("#toast-t").textContent = title; $("#toast-s").textContent = sub;
    setTimeout(function () { $("#toast").classList.add("show"); }, 700);
    setTimeout(function () { $("#toast").classList.remove("show"); }, 9000);
    api("seen", { projectId: p.id }).catch(function () {});
  }

  /* ---------- Dashboard assistant: answers questions about the account, takes the client
     to the right section, sends issues to the team, and suggests a fitting upgrade ---------- */
  var assistant = (function () {
    var box, log, form, input, history = [], aiOff = false, busy = false, greetedFor = null;
    var LINKS = { book_call: "/book/", pricing: "/#pricing", guides: "/gohighlevel-guides", whatsapp: "https://wa.me/447723149573" };
    function cur() { return data && data.projects.find(function (x) { return x.id === current; }); }
    function build() {
      if (box) return;
      var btn = document.createElement("button");
      btn.type = "button"; btn.className = "as-btn"; btn.id = "as-btn"; btn.setAttribute("aria-controls", "as-panel"); btn.setAttribute("aria-expanded", "false");
      btn.innerHTML = '<i class="ph-fill ph-sparkle" aria-hidden="true"></i><span>Ask assistant</span><b class="as-dot" hidden></b>';
      box = document.createElement("section");
      box.className = "as-panel"; box.id = "as-panel"; box.hidden = true; box.setAttribute("aria-label", "Dashboard assistant");
      box.innerHTML = '<header><span class="as-av"><i class="ph-fill ph-sparkle" aria-hidden="true"></i></span><div><b>Your Vix Assist assistant</b><small>Answers about your project · sends issues to the team</small></div><button type="button" class="as-x" aria-label="Close assistant"><i class="ph ph-x" aria-hidden="true"></i></button></header>' +
        '<div class="as-log" aria-live="polite"></div>' +
        '<div class="as-quick"></div>' +
        '<form class="as-form"><label class="sr" style="flex:1"><span hidden>Ask a question</span><input name="q" autocomplete="off" maxlength="1500" placeholder="Ask about your project, payments, anything…"></label><button class="btn btn-p btn-sm" type="submit" aria-label="Send"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i></button></form>';
      document.body.appendChild(btn); document.body.appendChild(box);
      log = box.querySelector(".as-log"); form = box.querySelector(".as-form"); input = form.elements.q;
      btn.addEventListener("click", function () { toggle(box.hidden); });
      box.querySelector(".as-x").addEventListener("click", function () { toggle(false); });
      form.addEventListener("submit", function (e) { e.preventDefault(); var q = input.value.trim(); if (q) { input.value = ""; ask(q); } });
      box.querySelector(".as-quick").addEventListener("click", function (e) { var b = e.target.closest("[data-q]"); if (b) ask(b.dataset.q); });
      log.addEventListener("click", function (e) { var b = e.target.closest("[data-act]"); if (b) act(b.dataset.act); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !box.hidden) toggle(false); });
    }
    function toggle(open) {
      box.hidden = !open; var b = document.getElementById("as-btn"); b.setAttribute("aria-expanded", String(open)); b.classList.toggle("open", open);
      if (open) { b.querySelector(".as-dot").hidden = true; setTimeout(function () { input.focus(); }, 50); log.scrollTop = log.scrollHeight; }
    }
    function fmt(t) {
      return esc(t).replace(/\b((?:https?:\/\/)?(?:www\.)?vixassist\.com(?:\/[^\s<]*)?)/g, function (u) { var clean = u.replace(/[.,)]+$/, ""), rest = u.slice(clean.length); return '<a href="' + (clean.indexOf("http") === 0 ? clean : "https://" + clean) + '" target="_blank" rel="noopener">' + clean + "</a>" + rest; })
        .replace(/\bsupport@vixassist\.com\b/g, '<a href="mailto:support@vixassist.com">support@vixassist.com</a>').replace(/\n/g, "<br>");
    }
    function add(who, html, actions) {
      var d = document.createElement("div"); d.className = "as-msg " + (who === "me" ? "as-me" : "as-bot"); d.innerHTML = html;
      if (actions && actions.length) d.innerHTML += '<div class="as-acts">' + actions.map(function (a) { return '<button type="button" class="btn btn-g btn-sm" data-act="' + esc(a.type) + '">' + esc(a.label) + "</button>"; }).join("") + "</div>";
      log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
    }
    function act(type) {
      var p = cur();
      var SEC = { progress: "sec-progress", deliveries: "sec-deliveries", payments: "sec-payments", updates: "sec-updates", messages: "sec-messages" };
      if (SEC[type]) {
        var el = document.getElementById(SEC[type]) || (type === "payments" ? document.getElementById("sec-progress") : null);
        if (el) { if (window.innerWidth < 760) toggle(false); el.scrollIntoView({ behavior: "smooth", block: "start" }); el.classList.add("as-flash"); setTimeout(function () { el.classList.remove("as-flash"); }, 1800); if (type === "messages") { var ta = document.querySelector("#send textarea"); if (ta) setTimeout(function () { ta.focus({ preventScroll: true }); }, 500); } }
        return;
      }
      if (type === "pay_now") { if (p && p.billing) location.href = p.billing.payUrl; else act("payments"); return; }
      if (type === "review_project" && p) { reviewBox(p, "", p.title); return; }
      if (type === "rate_website" && p) { reviewBox(p, null, "Our website"); return; }
      if (LINKS[type]) window.open(LINKS[type], "_blank", "noopener");
    }
    function ctx(p) {
      var bl = p.billing, ups = p.updates || [], last = ups[ups.length - 1], fresh = (p.deliverables || []).filter(function (d) { return d.isNew; });
      return { bl: bl, last: last, fresh: fresh, stage: p.stages[p.stage] || "", due: bl && bl.next && !bl.next.claimed && /now|overdue|soon|delivery-due/.test(bl.next.state) };
    }
    /* first message: what's new and what's next, worked out from the account, no AI needed */
    function greet(p) {
      var x = ctx(p), first = (data.client.name || "").split(" ")[0], lines = [], actions = [];
      lines.push("Hi " + esc(first || "there") + "! Here's where <b>" + esc(p.title) + "</b> stands:");
      lines.push("• Stage: <b>" + esc(x.stage) + "</b>, " + p.progress + "% complete" + (p.eta ? " (expected " + esc(VX.date(p.eta)) + ")" : "") + ".");
      if (x.last) lines.push("• Latest update: " + esc(x.last.text.length > 140 ? x.last.text.slice(0, 140) + "…" : x.last.text));
      if (x.fresh.length) { lines.push("• New: " + esc(x.fresh.map(function (d) { return d.title; }).join(", ")) + "."); actions.push({ type: "deliveries", label: "See deliveries" }); }
      if (x.due) { lines.push("• Next payment: <b>" + VX.money(x.bl.next.amount, x.bl.currency) + "</b>" + (x.bl.next.due === "delivery" ? " on delivery" : x.bl.next.due === "now" ? ", due now" : ", due " + esc(VX.date(x.bl.next.due))) + "."); actions.push({ type: "pay_now", label: "Pay now" }); }
      else if (x.bl && x.bl.next && x.bl.next.claimed) lines.push("• We're confirming your bank transfer.");
      if (p.unreadClient) { lines.push("• You have " + p.unreadClient + " unread update" + (p.unreadClient > 1 ? "s" : "") + " from the team."); actions.push({ type: "updates", label: "Read updates" }); }
      lines.push("Ask me anything about your project, or tell me if something's wrong and I'll send it to the team.");
      if (actions.length < 3) actions.push({ type: "messages", label: "Message the team" });
      return { html: lines.join("<br>"), actions: actions.slice(0, 3), alert: !!(x.fresh.length || x.due || p.unreadClient) };
    }
    function quick(p) {
      var x = ctx(p), qs = ["What happens next?", "Show my payments", "Where are my files?", "I have a problem", "How can I get more leads?"];
      if (x.due) qs.splice(1, 1, "When is my next payment?");
      box.querySelector(".as-quick").innerHTML = qs.map(function (q) { return '<button type="button" data-q="' + esc(q) + '">' + esc(q) + "</button>"; }).join("");
    }
    /* backup answers when the AI is off or busy */
    function local(q, p) {
      var t = q.toLowerCase(), x = ctx(p);
      if (/pay|invoice|balance|owe|due|price paid|money/.test(t)) return { reply: x.bl ? "You've paid " + VX.money(x.bl.paid, x.bl.currency) + " of " + VX.money(x.bl.total, x.bl.currency) + "." + (x.bl.next ? " Next payment: " + VX.money(x.bl.next.amount, x.bl.currency) + (x.bl.next.due === "delivery" ? " on delivery." : x.bl.next.due === "now" ? ", due now." : ", due " + VX.date(x.bl.next.due) + ".") : " You're fully paid. Thank you!") : "Your payment details will show under Your payments.", actions: x.due ? [{ type: "pay_now", label: "Pay now" }, { type: "payments", label: "Go to payments" }] : [{ type: "payments", label: "Go to payments" }] };
      if (/file|deliver|download|link|website ready|live/.test(t)) return { reply: (p.deliverables || []).length ? "Your files and links are under Your deliveries." + ((p.deliverables || []).some(function (d) { return d.locked; }) ? " Finished work unlocks once you've paid in full." : "") : "Nothing has been delivered yet. Your files will appear under Your deliveries as soon as they're ready.", actions: [{ type: "deliveries", label: "See deliveries" }] };
      if (/next|status|progress|stage|when|update|eta/.test(t)) return { reply: "Your project is at the " + x.stage + " stage, " + p.progress + "% complete" + (p.eta ? ", expected " + VX.date(p.eta) : "") + "." + (x.last ? " Latest update: " + x.last.text : ""), actions: [{ type: "progress", label: "See progress" }, { type: "updates", label: "All updates" }] };
      if (/problem|issue|wrong|bug|broken|error|not working|change|complain|refund|help/.test(t)) return { reply: "Sorry about that. Please tell the team in Messages exactly what's happening and a real person will reply, usually within one business day. For anything urgent, use WhatsApp.", actions: [{ type: "messages", label: "Message the team" }, { type: "whatsapp", label: "WhatsApp us" }] };
      if (/lead|grow|more|upgrade|plan|follow|crm|gohighlevel|ghl|automation/.test(t)) return { reply: "Our monthly plans keep your system improving: Lead Response ($300/month) answers every new lead in seconds, Growth ($550/month) adds nurture, old lead revival, reviews and referrals, and Brokerage ($950/month) is for teams. Book a free call and we'll recommend the right fit.", actions: [{ type: "book_call", label: "Book a free call" }, { type: "pricing", label: "See plans" }] };
      if (/review|rate|feedback/.test(t)) return { reply: "Thank you! You can review the project or rate our website here.", actions: [{ type: "review_project", label: "Review this project" }, { type: "rate_website", label: "Rate our website" }] };
      return { reply: "I can help with your progress, deliveries, payments and messages. For anything else, the team will answer you in Messages.", actions: [{ type: "messages", label: "Message the team" }] };
    }
    function ask(q) {
      var p = cur(); if (!p || busy) return;
      add("me", esc(q)); history.push({ role: "user", content: q });
      var typing = add("bot", '<span class="as-typing"><i></i><i></i><i></i></span>');
      var done = function (r) {
        typing.remove(); busy = false; form.querySelector("button").disabled = false;
        var extra = r.escalated ? '<div class="as-note"><i class="ph-fill ph-paper-plane-tilt" aria-hidden="true"></i> Sent to the Vix Assist team. Their reply will appear in Messages.</div>' : "";
        add("bot", fmt(r.reply) + extra, r.actions); history.push({ role: "assistant", content: r.reply });
        history = history.slice(-12);
        if (r.escalated) load();
      };
      busy = true; form.querySelector("button").disabled = true;
      if (aiOff) return setTimeout(function () { done(local(q, p)); }, 350);
      api("assistant", { projectId: p.id, messages: history }).then(done).catch(function (e) {
        if (e.status === 503) aiOff = true;
        if (e.status === 401) { showLogin(); return; }
        done(local(q, p));
      });
    }
    return {
      refresh: function (p) {
        build(); quick(p);
        if (greetedFor === p.id) return; greetedFor = p.id; history = [];
        var g = greet(p); log.innerHTML = ""; add("bot", g.html, g.actions);
        var b = document.getElementById("as-btn"); if (g.alert && box.hidden) b.querySelector(".as-dot").hidden = false;
      },
    };
  })();

  load();
})();
