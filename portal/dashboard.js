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
  }

  function view(p) {
    var t = VX.TYPE[p.type] || VX.TYPE.other, last = p.stage >= p.stages.length - 1;
    var C = 2 * Math.PI * 56, off = C * (1 - p.progress / 100);
    var html = '<div class="grid">';
    html += '<section class="card c8"><div class="overview"><div class="ring"><svg viewBox="0 0 132 132"><circle class="t" cx="66" cy="66" r="56"/><circle class="v" cx="66" cy="66" r="56" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" data-off="' + off + '"/></svg><b>' + p.progress + '%<small>complete</small></b></div>' +
      '<div><span class="badge' + (last ? " live" : "") + '"><i class="ph ' + t.icon + '" aria-hidden="true"></i>' + t.label + "</span>" +
      '<h2 class="ov-title">' + esc(p.title) + '</h2><p class="ov-status">' + esc(p.status) + "</p>" +
      '<div class="facts"><span><i class="ph ph-calendar-check" aria-hidden="true"></i>Started ' + VX.date(p.paidAt) + "</span>" +
      (p.eta ? '<span><i class="ph ph-flag-checkered" aria-hidden="true"></i>Expected ' + esc(p.eta) + "</span>" : "") +
      (p.amount ? '<span><i class="ph ph-receipt" aria-hidden="true"></i>Paid ' + VX.money(p.amount, p.currency) + "</span>" : "") + "</div></div></div>" +
      '<ol class="stages" style="margin-top:22px">' + p.stages.map(function (s, i) { return '<li class="' + (i < p.stage ? "done" : i === p.stage ? "now" : "") + '">' + esc(s) + "</li>"; }).join("") + "</ol></section>";

    // deliveries + links
    var items = "";
    if (p.liveUrl) items += lnk(p.liveUrl, "ph-globe", "Visit your live website", p.liveUrl, false, true);
    if (p.previewUrl) items += lnk(p.previewUrl, "ph-eye", "Preview your project", p.previewUrl, false, true);
    (p.deliverables || []).slice().reverse().forEach(function (d) {
      var href = d.fileId ? "/api/file/" + d.fileId : d.url;
      items += lnk(href, d.fileId ? "ph-download-simple" : "ph-link", d.title, d.fileId ? (d.name || "File") + " · " + VX.size(d.size) + " · " + VX.date(d.at) : VX.date(d.at), d.isNew, !d.fileId);
    });
    html += '<section class="card c4"><h2><i class="ph ph-package" aria-hidden="true"></i>Your deliveries</h2><div class="links">' + (items || '<div class="empty"><i class="ph ph-hourglass-medium" aria-hidden="true"></i>Your files and links will pop up here as soon as they\'re ready.</div>') + "</div></section>";

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
    html += '<section class="card c6"><h2><i class="ph ph-megaphone" aria-hidden="true"></i>Project updates</h2><ul class="feed">' + (p.updates || []).slice().reverse().map(function (u) { return "<li>" + esc(u.text) + "<time>" + VX.date(u.at, true) + "</time></li>"; }).join("") + "</ul></section>";

    // messages
    html += '<section class="card c6"><h2><i class="ph ph-chats-circle" aria-hidden="true"></i>Messages</h2><div class="chat" id="chat">' +
      ((p.messages || []).length ? p.messages.map(function (m) { return '<div class="msg ' + (m.from === "client" ? "mine" : "them") + '">' + esc(m.text) + "<time>" + (m.from === "client" ? "You" : "Vix Automations") + " · " + VX.date(m.at, true) + "</time></div>"; }).join("") : '<div class="empty"><i class="ph ph-chat-teardrop-text" aria-hidden="true"></i>Ask a question or request a change. We usually reply within one business day.</div>') +
      '</div><form class="send" id="send"><label class="sr" style="flex:1"><span hidden>Message</span><textarea name="text" rows="2" placeholder="Request a change or ask a question…" required></textarea></label><button class="btn btn-p" type="submit"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i>Send</button></form><p class="err" id="send-err"></p></section>';

    html += '<section class="card c12 help"><div><h2>Need anything?</h2><p class="muted">Message us here, on WhatsApp or by email. A real person replies.</p></div><div class="acts"><a class="btn btn-wa" href="https://wa.me/447723149573" target="_blank" rel="noopener"><i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i>WhatsApp UK</a><a class="btn btn-g" href="https://wa.me/message/WV3WLO4FC656K" target="_blank" rel="noopener">WhatsApp Nigeria</a><a class="btn btn-g" href="mailto:vixautomations@gmail.com">Email us</a></div></section>';
    return html + "</div>";
  }

  function lnk(href, icon, title, sub, isNew, ext) {
    return '<a class="lnk' + (isNew ? " new" : "") + '" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + '><span class="ic"><i class="ph ' + icon + '" aria-hidden="true"></i></span><div><b>' + esc(title) + (isNew ? '<span class="pill-new">New</span>' : "") + "</b><span>" + esc(sub) + '</span></div><i class="ph ' + (ext ? "ph-arrow-up-right" : "ph-download-simple") + '" aria-hidden="true"></i></a>';
  }

  function wire(p) {
    requestAnimationFrame(function () { var v = document.querySelector(".ring .v"); if (v) v.style.strokeDashoffset = v.dataset.off; });
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

  var announced = {};
  function announce(p) {
    if (announced[p.id]) return; announced[p.id] = true;
    var fresh = (p.deliverables || []).filter(function (d) { return d.isNew; });
    var title, sub;
    if (fresh.length) { title = fresh.length === 1 ? "🎉 " + fresh[0].title + " is ready!" : "🎉 " + fresh.length + " new deliveries are ready!"; sub = "Find them under Your deliveries."; }
    else if (p.unreadClient) { title = "You have " + p.unreadClient + " new update" + (p.unreadClient > 1 ? "s" : ""); sub = "Your project is moving forward."; }
    else return;
    $("#toast-t").textContent = title; $("#toast-s").textContent = sub;
    setTimeout(function () { $("#toast").classList.add("show"); }, 700);
    setTimeout(function () { $("#toast").classList.remove("show"); }, 9000);
    api("seen", { projectId: p.id }).catch(function () {});
  }

  load();
})();
