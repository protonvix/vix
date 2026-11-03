/* Admin: create paid clients, update projects, deliver files, post growth numbers. */
(function () {
  "use strict";
  var api = VX.api, esc = VX.esc, $ = function (s, r) { return (r || document).querySelector(s); };
  var clients = [], sel = null;
  var LABEL = { website: "Website design", ghl: "GoHighLevel setup & automation", tiktok: "TikTok marketing", other: "Project" };

  function boot() {
    api("admin/session").then(function () { $("#login-view").hidden = true; $("#app").hidden = false; refresh(); })
      .catch(function () { $("#login-view").hidden = false; });
  }
  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault(); $("#login-err").textContent = "";
    api("admin/login", { password: e.target.password.value }).then(boot).catch(function (x) { $("#login-err").textContent = x.message; });
  });
  $("#logout").addEventListener("click", function () { api("logout", {}).finally(function () { location.reload(); }); });
  $("#new-btn").addEventListener("click", function () { sel = null; drawList(); newForm(); });

  function refresh(keep) {
    return api("admin/clients").then(function (d) {
      clients = d.clients; drawList();
      if (keep && sel) showClient(sel); else if (!sel) newForm();
    });
  }
  function drawList() {
    $("#clist").innerHTML = clients.length ? clients.map(function (c) {
      var unread = c.projects.reduce(function (n, p) { return n + (p.unreadAdmin || 0); }, 0);
      return '<button type="button" class="citem" data-id="' + c.id + '" aria-current="' + (c.id === sel) + '"><b>' + esc(c.name) + (unread ? '<span class="dot-r">' + unread + "</span>" : "") + "</b><span>" + esc(c.business || c.email) + " · " + c.projects.map(function (p) { return (VX.TYPE[p.type] || VX.TYPE.other).label; }).join(", ") + (c.activated ? "" : " · not activated") + "</span></button>";
    }).join("") : '<p class="note">No clients yet. Click "New paid client" when your first payment arrives.</p>';
    $("#clist").onclick = function (e) { var b = e.target.closest("[data-id]"); if (b) { sel = b.dataset.id; drawList(); showClient(sel); } };
  }

  /* ---------- new client ---------- */
  function newForm() {
    $("#main").innerHTML = ""; $("#main").appendChild($("#new-tpl").content.cloneNode(true));
    $("#new-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, services = [];
      ["website", "ghl", "tiktok", "other"].forEach(function (t) {
        if (f[t].checked) services.push({ type: t, amount: f[t + "_amount"].value, eta: f[t + "_eta"] ? f[t + "_eta"].value : "", title: t === "other" ? f.other_title.value : "" });
      });
      if (!f.name.value.trim() || !f.email.value.trim()) { $("#new-err").textContent = "Name and email are required."; return; }
      if (!services.length) { $("#new-err").textContent = "Tick at least one service."; return; }
      var btn = f.querySelector("button[type=submit]"); btn.disabled = true;
      api("admin/clients", { name: f.name.value, email: f.email.value, business: f.business.value, whatsapp: f.whatsapp.value, currency: f.currency.value, services: services })
        .then(function (d) {
          sel = d.client.id;
          var total = services.reduce(function (n, s) { return n + (+s.amount || 0); }, 0);
          kickoff(d.client, services, total, d.invite, d.loginUrl);
          refresh();
        }).catch(function (x) { $("#new-err").textContent = x.message; btn.disabled = false; });
    });
  }

  function kickoff(c, services, total, invite, loginUrl) {
    var first = c.name.split(" ")[0];
    var names = services.map(function (s) { return s.type === "other" && s.title ? s.title : LABEL[s.type]; });
    var list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
    var subject = "Your " + list + " project has started 🚀 | Vix Automations";
    var body = "Hi " + first + ",\n\n" +
      "Thank you" + (total ? " for your payment of " + VX.money(total, c.currency) : "") + ". Your " + list + " project has officially started!\n\n" +
      (invite ? "Create your private client dashboard here:\n" + invite + "\n\n(This link works once and lasts 14 days.)\n\n" : "Log in to your client dashboard here:\n" + loginUrl + "\n\n") +
      "On your dashboard you can:\n• See exactly where your project is, step by step\n• Read every update from our team\n• Download your website and files the moment they're ready\n• Track your growth numbers\n• Send us questions or change requests\n\n" +
      "We'll be in touch shortly with your next steps. If you need anything, just reply to this email or message us on WhatsApp: +44 7723 149573.\n\n" +
      "Welcome aboard,\nPromise Felix\nVix Automations\nhttps://vixautomations.pages.dev";
    var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(c.email) + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    var waNum = (c.whatsapp || "").replace(/[^\d]/g, "").replace(/^0/, "234");
    var waText = "Hi " + first + ", thank you for your payment! Your " + list + " project has officially started 🚀\n\n" + (invite ? "Create your client dashboard here to track progress and receive your deliveries:\n" + invite : "Track your progress here:\n" + loginUrl) + "\n\nWe've also sent this to your email.\n– Promise, Vix Automations";
    $("#main").innerHTML = '<div class="card result"><h2 class="ok"><i class="ph-fill ph-check-circle" aria-hidden="true"></i>' + esc(c.name) + "'s project has started</h2>" +
      "<p class=\"muted\" style=\"margin:0\">Now send the kickoff message. The email opens in Gmail, ready to send from your own inbox.</p>" +
      '<label>Subject<input readonly value="' + esc(subject) + '"></label><label>Email<textarea readonly>' + esc(body) + "</textarea></label>" +
      '<div class="acts"><a class="btn btn-p" target="_blank" rel="noopener" href="' + esc(gmail) + '"><i class="ph ph-envelope-simple" aria-hidden="true"></i>Open in Gmail</a>' +
      (waNum ? '<a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/' + waNum + "?text=" + encodeURIComponent(waText) + '"><i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i>Send on WhatsApp</a>' : "") +
      '<button class="btn btn-g" type="button" id="copy"><i class="ph ph-copy" aria-hidden="true"></i>Copy email</button>' +
      '<button class="btn btn-g" type="button" id="open-c">Open client</button></div></div>';
    $("#copy").onclick = function () { navigator.clipboard.writeText(body).then(function () { $("#copy").textContent = "Copied ✓"; }); };
    $("#open-c").onclick = function () { showClient(c.id); };
  }

  /* ---------- client detail ---------- */
  function showClient(id) {
    var c = clients.find(function (x) { return x.id === id; }); if (!c) return;
    var html = '<div class="card"><div class="help"><div><h2 style="margin:0">' + esc(c.name) + "</h2><p class=\"muted\">" + esc([c.business, c.email, c.whatsapp].filter(Boolean).join(" · ")) + " · " + (c.activated ? '<span class="ok">Dashboard active</span>' : "Dashboard not created yet") + "</p></div>" +
      '<div class="acts"><button class="btn btn-g btn-sm" type="button" id="reinvite"><i class="ph ph-link" aria-hidden="true"></i>' + (c.activated ? "Password reset link" : "New dashboard link") + "</button></div></div><p id=\"inv-out\" class=\"note\" style=\"word-break:break-all\"></p></div>";
    c.projects.forEach(function (p) { html += projectCard(p); });
    $("#main").innerHTML = html;
    $("#reinvite").onclick = function () {
      api("admin/invite", { clientId: c.id }).then(function (d) { $("#inv-out").innerHTML = 'Send this link to the client (works once, lasts 14 days): <a class="ok" href="' + esc(d.invite) + '" target="_blank" rel="noopener">' + esc(d.invite) + "</a>"; });
    };
    c.projects.forEach(function (p) { wireProject(p); });
  }

  function projectCard(p) {
    var t = VX.TYPE[p.type] || VX.TYPE.other, id = p.id;
    var h = '<div class="card proj" style="margin-top:16px" id="p-' + id + '"><div class="help"><div><span class="badge"><i class="ph ' + t.icon + '" aria-hidden="true"></i>' + t.label + '</span><h2 style="margin:8px 0 0">' + esc(p.title) + '</h2><p class="muted">Paid ' + VX.money(p.amount, p.currency) + " on " + VX.date(p.paidAt) + "</p></div></div>";
    // status
    h += '<details class="box" open><summary>Progress &amp; links</summary><div><form data-f="project">' +
      '<div class="row"><label>Stage<select name="stage">' + p.stages.map(function (s, i) { return '<option value="' + i + '"' + (i === p.stage ? " selected" : "") + ">" + (i + 1) + ". " + esc(s) + "</option>"; }).join("") + '</select></label>' +
      '<label>Progress: <output>' + p.progress + '</output>%<input type="range" name="progress" min="0" max="100" step="5" value="' + p.progress + '"></label></div>' +
      '<div class="row" style="margin-top:12px"><label>Status line (client sees this)<input name="status" value="' + esc(p.status) + '"></label><label>Expected finish<input name="eta" value="' + esc(p.eta) + '"></label></div>' +
      '<div class="row" style="margin-top:12px"><label>Preview link<input name="previewUrl" type="url" value="' + esc(p.previewUrl) + '" placeholder="https://…"></label><label>Live website link<input name="liveUrl" type="url" value="' + esc(p.liveUrl) + '" placeholder="https://…"></label></div>' +
      '<div class="acts" style="margin-top:12px"><button class="btn btn-p btn-sm" type="submit">Save progress</button><span class="note" data-msg></span></div></form></div></details>';
    // update
    h += '<details class="box"><summary>Post an update</summary><div><form data-f="update"><textarea name="text" rows="3" placeholder="e.g. Your homepage design is ready for review." required></textarea><div class="acts" style="margin-top:10px"><button class="btn btn-p btn-sm" type="submit">Post update</button><span class="note" data-msg></span></div></form></div></details>';
    // deliverables
    h += '<details class="box"><summary>Deliver files &amp; links (' + (p.deliverables || []).length + ")</summary><div>" +
      (p.deliverables || []).map(function (d) { return '<div class="dl-row"><span>' + esc(d.title) + ' <span class="note">· ' + (d.fileId ? VX.size(d.size) : "link") + " · " + VX.date(d.at) + (d.isNew ? " · not seen yet" : " · seen") + '</span></span><button class="btn btn-g btn-sm" type="button" data-rm="' + d.id + '">Remove</button></div>'; }).join("") +
      '<form data-f="deliver"><div class="row"><label>Title<input name="title" placeholder="e.g. Your finished website (ZIP)" required></label><label>Link (or choose a file below)<input name="url" type="url" placeholder="https://drive.google.com/…"></label></div>' +
      '<label style="margin-top:12px">File (up to 20 MB)<input name="file" type="file"></label><div class="acts" style="margin-top:10px"><button class="btn btn-p btn-sm" type="submit"><i class="ph ph-upload-simple" aria-hidden="true"></i>Deliver to client</button><span class="note" data-msg></span></div></form></div></details>';
    // metrics
    if (p.metricKeys.length) {
      var lastM = (p.metrics || []).slice(-1)[0] || {};
      h += '<details class="box"><summary>Growth numbers (' + (p.metrics || []).length + ' entries)</summary><div><form data-f="metric"><div class="row3"><label>Date<input name="date" type="date" value="' + new Date().toISOString().slice(0, 10) + '"></label>' +
        p.metricKeys.map(function (k) { return '<label style="text-transform:capitalize">' + k + '<input name="' + k + '" type="number" min="0" placeholder="' + (lastM[k] != null ? "last: " + lastM[k] : "") + '"></label>'; }).join("") +
        '</div><div class="acts" style="margin-top:10px"><button class="btn btn-p btn-sm" type="submit">Save numbers</button><span class="note" data-msg>Totals for the period (e.g. this week). Same date replaces the entry.</span></div></form></div></details>';
    }
    // messages
    h += '<details class="box"' + (p.unreadAdmin ? " open" : "") + '><summary>Messages' + (p.unreadAdmin ? ' <span class="dot-r">' + p.unreadAdmin + "</span>" : "") + '</summary><div><div class="chat">' +
      ((p.messages || []).map(function (m) { return '<div class="msg ' + (m.from === "vix" ? "mine" : "them") + '">' + esc(m.text) + "<time>" + (m.from === "vix" ? "You" : "Client") + " · " + VX.date(m.at, true) + "</time></div>"; }).join("") || '<p class="note">No messages yet.</p>') +
      '</div><form data-f="message" class="send"><textarea name="text" rows="2" placeholder="Reply to the client…" required></textarea><button class="btn btn-p" type="submit">Send</button></form></div></details>';
    return h + "</div>";
  }

  function wireProject(p) {
    var box = $("#p-" + p.id);
    var range = box.querySelector("input[type=range]");
    range.addEventListener("input", function () { range.previousElementSibling.value = range.value; box.querySelector("output").textContent = range.value; });
    box.querySelectorAll("form").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var kind = f.dataset.f, msg = f.querySelector("[data-msg]"), btn = f.querySelector("button[type=submit]"), req;
        if (kind === "project") req = api("admin/project", { id: p.id, stage: f.stage.value, progress: f.progress.value, status: f.status.value, eta: f.eta.value, previewUrl: f.previewUrl.value, liveUrl: f.liveUrl.value });
        if (kind === "update") req = api("admin/post", { projectId: p.id, text: f.text.value, kind: "update" });
        if (kind === "message") req = api("admin/post", { projectId: p.id, text: f.text.value, kind: "message" });
        if (kind === "metric") { var v = {}; p.metricKeys.forEach(function (k) { v[k] = f[k].value; }); req = api("admin/metric", { projectId: p.id, date: f.date.value, values: v }); }
        if (kind === "deliver") {
          var fd = new FormData(); fd.append("projectId", p.id); fd.append("title", f.title.value); fd.append("url", f.url.value);
          if (f.file.files[0]) fd.append("file", f.file.files[0]);
          req = api("admin/deliverable", fd);
        }
        btn.disabled = true; if (msg) msg.textContent = "Saving…";
        req.then(function () { if (msg) msg.innerHTML = '<span class="ok">Saved ✓</span>'; return refresh(true); })
          .catch(function (x) { if (msg) msg.innerHTML = '<span class="err">' + esc(x.message) + "</span>"; btn.disabled = false; });
      });
    });
    box.querySelectorAll("[data-rm]").forEach(function (b) {
      b.addEventListener("click", function () { if (confirm("Remove this delivery from the client's dashboard?")) api("admin/deliverable/remove", { projectId: p.id, deliverableId: b.dataset.rm }).then(function () { refresh(true); }); });
    });
    if (p.unreadAdmin) box.querySelector("details.box:last-of-type").addEventListener("toggle", function () { api("admin/read", { projectId: p.id }).catch(function () {}); }, { once: true });
  }

  boot();
})();
