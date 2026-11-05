/* Admin: create paid clients, update projects, deliver files, post growth numbers. */
(function () {
  "use strict";
  var api = VX.api, esc = VX.esc, $ = function (s, r) { return (r || document).querySelector(s); };
  var clients = [], sel = null;
  var LABEL = { website: "Website design", ghl: "GoHighLevel setup & automation", tiktok: "TikTok marketing", other: "Project" };

  function boot() {
    api("admin/session").then(function () { $("#login-view").hidden = true; $("#app").hidden = false; refresh().then(function () { sel = null; drawList(); bell(); }); countInbox().catch(function () {}); })
      .catch(function () { $("#login-view").hidden = false; });
  }
  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault(); $("#login-err").textContent = "";
    api("admin/login", { password: e.target.password.value }).then(boot).catch(function (x) { $("#login-err").textContent = x.message; });
  });
  $("#logout").addEventListener("click", function () { api("logout", {}).finally(function () { location.reload(); }); });
  $("#new-btn").addEventListener("click", function () { sel = null; drawList(); newForm(); });
  $("#inbox-btn").addEventListener("click", function () { sel = null; drawList(); inbox(); });
  $("#chat-btn").addEventListener("click", function () { sel = null; drawList(); chats(); });
  $("#pay-btn").addEventListener("click", function () { sel = null; drawList(); payments(); });
  $("#bell-btn").addEventListener("click", function () { sel = null; drawList(); bell(); });
  $("#set-btn").addEventListener("click", function () { onBell = false; sel = null; drawList(); settings(); });

  /* ---------- settings: bank accounts shown for transfer payments ---------- */
  function settings() {
    $("#main").innerHTML = '<div class="card"><p class="note">Loading…</p></div>';
    api("pay/banks").then(function (d) {
      var banks = d.banks.length ? d.banks : [{ currency: "USD", label: "USD account (US)" }, { currency: "GBP", label: "GBP account (UK)" }, { currency: "EUR", label: "EUR account (Europe)" }, { currency: "NGN", label: "Naira account (Nigeria)" }];
      var row = function (b, i) {
        return '<div class="card" style="margin-top:12px" data-row="' + i + '"><div class="row3"><label>Show as<input name="label" value="' + esc(b.label || "") + '" placeholder="e.g. Cleva USD account"></label>' +
          '<label>Currency<select name="currency">' + ["USD", "GBP", "EUR", "NGN"].map(function (c) { return "<option" + (b.currency === c ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></label>" +
          '<label>Bank name<input name="bank" value="' + esc(b.bank || "") + '" placeholder="e.g. Lead Bank (via Cleva)"></label></div>' +
          '<div class="row" style="margin-top:12px"><label>Account name<input name="accountName" value="' + esc(b.accountName || "") + '"></label><label>Account number<input name="accountNumber" value="' + esc(b.accountNumber || "") + '"></label></div>' +
          '<label style="margin-top:12px">Other details (routing number, sort code, SWIFT, IBAN, account type, bank address)<textarea name="extra" rows="3" placeholder="e.g. ACH routing: 123456789 · Account type: Checking">' + esc(b.extra || "") + "</textarea></label>" +
          '<input type="hidden" name="id" value="' + esc(b.id || "") + '"><div class="acts" style="margin-top:10px"><button class="btn btn-g btn-sm" type="button" data-del-row>Remove</button></div></div>';
      };
      $("#main").innerHTML = '<div class="card" id="ce-card"><h2><i class="ph ph-envelope-simple" aria-hidden="true"></i>Emails to clients</h2><p class="note" id="ce-state">Checking…</p>' +
        '<div class="send" style="margin-top:12px"><input id="ce-to" type="email" placeholder="Send a test to (your other email)"><button class="btn btn-p" type="button" id="ce-test">Send test email</button></div><p class="note" id="ce-msg"></p></div>' +
        '<div class="card" style="margin-top:16px"><h2><i class="ph ph-globe-hemisphere-west" aria-hidden="true"></i>Card payments</h2><label class="agree-row" style="display:flex;gap:10px;align-items:flex-start;color:var(--mute)"><input type="checkbox" id="intl-on"' + (d.intl ? " checked" : "") + '> <span>Paystack has approved <b>international payments</b> on my account. Show "Cards from any country accepted" on payment pages.</span></label><p class="note" id="intl-msg">Turn this on only after Paystack confirms it (Paystack → Settings → Preferences → Accept international payments). Otherwise foreign cards will be declined.</p></div>' +
        '<div class="card" style="margin-top:16px"><h2><i class="ph ph-bank" aria-hidden="true"></i>Bank accounts for transfer payments</h2>' +
        '<p class="note">Clients see these on the payment page when they choose "Pay by bank transfer". They are stored privately in your portal, not in the website code. Leave an account number empty to hide that account. Copy the details exactly from your Cleva or bank app.</p></div>' +
        '<div id="rows">' + banks.map(row).join("") + "</div>" +
        '<div class="acts" style="margin-top:12px"><button class="btn btn-g" type="button" id="add-row"><i class="ph ph-plus" aria-hidden="true"></i>Add another account</button><button class="btn btn-p" type="button" id="save-banks"><i class="ph ph-floppy-disk" aria-hidden="true"></i>Save accounts</button><span class="note" id="save-msg"></span></div>';
      api("admin/client-email").then(function (x) {
        $("#ce-state").innerHTML = x.ready === "resend" ? '<span class="ok">On ✓ Payment confirmations are emailed from your own domain.</span>'
          : x.ready === "emailjs" ? '<span class="ok">On ✓ Payment confirmations are emailed from your Gmail (via EmailJS).</span>'
          : '<span style="color:var(--warn)">Off. Clients see their dashboard link on screen after paying, but don\'t get an email yet. Add the EmailJS settings in Cloudflare to switch it on.</span>';
      });
      $("#ce-test").onclick = function () {
        var b = this; b.disabled = true; $("#ce-msg").textContent = "Sending…";
        api("admin/client-email/test", { to: $("#ce-to").value }).then(function (x) { $("#ce-msg").innerHTML = '<span class="ok">Test sent ✓ via ' + esc(x.via) + ". Check that inbox (and Spam).</span>"; })
          .catch(function (x) { $("#ce-msg").innerHTML = '<span class="err">' + esc(x.message) + "</span>"; }).finally(function () { b.disabled = false; });
      };
      $("#intl-on").onchange = function () { var on = this.checked; api("admin/paysettings", { intl: on }).then(function () { $("#intl-msg").innerHTML = '<span class="ok">Saved ✓ ' + (on ? "Payment pages now say cards from any country are accepted." : "International card message hidden.") + "</span>"; }); };
      var n = banks.length;
      $("#add-row").onclick = function () { $("#rows").insertAdjacentHTML("beforeend", row({ currency: "USD" }, n++)); };
      $("#rows").addEventListener("click", function (e) { if (e.target.closest("[data-del-row]")) e.target.closest("[data-row]").remove(); });
      $("#save-banks").onclick = function () {
        var list = Array.prototype.map.call(document.querySelectorAll("[data-row]"), function (r) {
          var o = {}; ["id", "label", "currency", "bank", "accountName", "accountNumber", "extra"].forEach(function (k) { o[k] = r.querySelector("[name=" + k + "]").value; }); return o;
        });
        $("#save-msg").textContent = "Saving…";
        api("admin/banks", { banks: list }).then(function (d) { $("#save-msg").innerHTML = '<span class="ok">Saved ✓ ' + d.banks.length + " account(s) now show on your payment pages.</span>"; })
          .catch(function (x) { $("#save-msg").innerHTML = '<span class="err">' + esc(x.message) + "</span>"; });
      };
    });
  }

  /* ---------- notifications: everything new, in bold, live ---------- */
  var ICON = { payment: "ph-currency-circle-dollar", transfer: "ph-bank", brief: "ph-file-text", offer: "ph-gift", founding: "ph-star", overdue: "ph-warning-circle", message: "ph-chat-circle-dots" };
  var NLABEL = { payment: "Payment", transfer: "Bank transfer to confirm", brief: "Brief / enquiry", offer: "Free design request", founding: "Founding client application", overdue: "Payment overdue", message: "Client message" };
  var lastUnread = null, onBell = false, known = {};
  function chime() {
    try {
      var A = window.AudioContext || window.webkitAudioContext, ctx = new A();
      [880, 1320].forEach(function (f, i) { var o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = "sine"; g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.15); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.15 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.15 + 0.4); o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + i * 0.15); o.stop(ctx.currentTime + i * 0.15 + 0.45); });
    } catch (e) {}
  }

  /* ---------- phone push notifications ---------- */
  var IOS = /iphone|ipad|ipod/i.test(navigator.userAgent), STANDALONE = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
  var PUSH_OK = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  function phoneBox() {
    var inner;
    if (IOS && !STANDALONE) inner = '<p class="muted" style="margin:6px 0 0">On iPhone: tap the <b>Share</b> button in Safari, choose <b>Add to Home Screen</b>, then open <b>Vix Admin</b> from your home screen and come back here to turn alerts on. (Needs iOS 16.4 or newer.)</p>';
    else if (!PUSH_OK) inner = '<p class="muted" style="margin:6px 0 0">This browser can\'t show phone notifications. On Android use Chrome; on iPhone use Safari and add this page to your Home Screen.</p>';
    else inner = '<div class="acts" style="margin-top:10px"><button class="btn btn-p btn-sm" type="button" id="push-on"><i class="ph ph-device-mobile" aria-hidden="true"></i>Turn on phone notifications</button><button class="btn btn-g btn-sm" type="button" id="push-test" hidden>Send a test notification</button></div><p class="note" id="push-msg" style="margin:8px 0 0"></p>';
    return '<div class="card" style="margin-top:16px;padding:16px 18px"><b><i class="ph ph-bell-ringing" aria-hidden="true"></i> Phone notifications</b><p class="muted" style="margin:4px 0 0">Get a pop-up on this phone for every new quote, payment and client message, even when this page is closed.</p>' + inner + "</div>";
  }
  function keyBytes(k) { var s = atob(k.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((k.length + 3) % 4)); var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function wirePhone() {
    var on = $("#push-on"), test = $("#push-test"), msg = $("#push-msg"); if (!on) return;
    navigator.serviceWorker.register("/portal/admin/sw.js", { scope: "/portal/admin/" }).then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (s) {
      if (s && Notification.permission === "granted") { on.innerHTML = '<i class="ph ph-check" aria-hidden="true"></i>Phone notifications on'; test.hidden = false; }
    }).catch(function () {});
    on.onclick = function () {
      on.disabled = true; msg.textContent = "Setting up…";
      Notification.requestPermission().then(function (p) {
        if (p !== "granted") throw new Error("Notifications are blocked. Allow them for this site in your phone's browser settings, then try again.");
        return Promise.all([navigator.serviceWorker.register("/portal/admin/sw.js", { scope: "/portal/admin/" }).then(function () { return navigator.serviceWorker.ready; }), api("admin/push/key")]);
      }).then(function (r) {
        var reg = r[0], key = r[1].key;
        return reg.pushManager.getSubscription().then(function (old) { return old || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }); });
      }).then(function (sub) {
        return api("admin/push/subscribe", { subscription: sub.toJSON(), device: (IOS ? "iPhone" : /android/i.test(navigator.userAgent) ? "Android" : "Computer") });
      }).then(function () {
        on.innerHTML = '<i class="ph ph-check" aria-hidden="true"></i>Phone notifications on'; test.hidden = false;
        msg.textContent = "Done! Sending you a test notification now…";
        return api("admin/push/test", {});
      }).then(function (d) { msg.textContent = d && d.sent ? "Test sent ✓ You should see it on this phone in a few seconds." : "Saved, but the test didn't send. Try 'Send a test notification'."; on.disabled = false; })
        .catch(function (e) { msg.textContent = e.message; on.disabled = false; });
    };
    test.onclick = function () { msg.textContent = "Sending…"; api("admin/push/test", {}).then(function (d) { msg.textContent = d.sent ? "Test sent to " + d.sent + " device" + (d.sent > 1 ? "s" : "") + " ✓" : "No device received it. Tap 'Turn on phone notifications' again."; }); };
  }
  function poll() {
    return api("admin/feed").then(function (d) {
      $("#bell-n").hidden = !d.unread; $("#bell-n").textContent = d.unread;
      document.title = (d.unread ? "(" + d.unread + ") " : "") + "Admin · Vix Automations";
      var fresh = d.items.filter(function (i) { return i.unread && !known[i.kind + i.id]; });
      if (lastUnread !== null && fresh.length) {
        chime();
        if (window.Notification && Notification.permission === "granted") fresh.slice(0, 3).forEach(function (i) { try { new Notification(NLABEL[i.kind] + ": " + i.title, { body: i.sub, icon: "/brand/favicon.svg", tag: i.kind + i.id }); } catch (e) {} });
      }
      d.items.forEach(function (i) { known[i.kind + i.id] = true; });
      lastUnread = d.unread;
      if (onBell) drawBell(d, fresh);
      return d;
    }).catch(function () {});
  }
  function bell() {
    onBell = true;
    $("#main").innerHTML = '<div class="card"><p class="note">Loading notifications…</p></div>';
    poll();
  }
  function drawBell(d, fresh) {
    if (!onBell) return;
    var freshIds = {}; (fresh || []).forEach(function (i) { freshIds[i.kind + i.id] = 1; });
    var count = function (k) { return d.items.filter(function (i) { return i.kind === k && i.unread; }).length; };
    var perm = window.Notification ? Notification.permission : "unsupported";
    $("#main").innerHTML = '<div class="card"><div class="help"><div><h2 style="margin:0"><i class="ph ph-bell-ringing" aria-hidden="true"></i> Notifications</h2><p class="muted">New payments, briefs and messages, newest first. Updates every 30 seconds.</p></div>' +
      '<div class="acts">' + (perm === "default" ? '<button class="btn btn-p btn-sm" type="button" id="alerts-on"><i class="ph ph-bell-simple-ringing" aria-hidden="true"></i>Turn on pop-up alerts</button>' : perm === "granted" ? '<span class="note ok">Pop-up alerts on ✓</span>' : "") +
      '<button class="btn btn-g btn-sm" type="button" id="all-read">Mark all as read</button></div></div>' + phoneBox() +
      '<div class="kpi-row" style="margin-top:16px"><div><span>Payments</span><b>' + (count("payment") + count("transfer") + count("overdue")) + '</b></div><div><span>Briefs &amp; founding</span><b>' + (count("brief") + count("founding")) + '</b></div><div><span>Free design requests</span><b>' + count("offer") + '</b></div><div><span>Client messages</span><b>' + count("message") + "</b></div></div>" +
      '<div class="feed-list">' + (d.items.map(function (i) {
        return '<button type="button" class="nf k-' + i.kind + (i.unread ? " unread" : "") + (freshIds[i.kind + i.id] ? " fresh" : "") + '" data-kind="' + i.kind + '" data-id="' + esc(i.id) + '" data-client="' + esc(i.clientId || "") + '"><span class="ic"><i class="ph-fill ' + ICON[i.kind] + '" aria-hidden="true"></i></span><div><b>' + esc(i.title) + "</b><span>" + esc(NLABEL[i.kind] + " · " + i.sub) + "</span></div><time>" + VX.date(i.at, true) + "</time></button>";
      }).join("") || '<div class="empty"><i class="ph ph-bell-simple" aria-hidden="true"></i>Nothing yet. New payments, briefs and messages will appear here in bold.</div>') + "</div></div>";
    var on = $("#alerts-on"); if (on) on.onclick = function () { Notification.requestPermission().then(function () { poll(); }); };
    $("#all-read").onclick = function () { api("admin/feed/seen", { all: true }).then(poll); };
    wirePhone();
    $("#main").querySelectorAll(".nf").forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.kind, id = b.dataset.id, cid = b.dataset.client;
        var go = function () { onBell = false; if (k === "transfer" || k === "overdue") { payments(); } else if (k === "brief" || k === "offer" || k === "founding") { inbox(); } else if (k === "message" && cid) { sel = null; refresh().then(function () { drawList(); chats(cid); }); } else if (cid) { sel = cid; refresh(true).then(function () { drawList(); showClient(cid); }); } };
        if (k === "message") go(); else api("admin/feed/seen", { kind: k, id: id }).then(go, go);
      };
    });
  }
  ["#new-btn", "#inbox-btn", "#pay-btn", "#set-btn", "#chat-btn"].forEach(function (s) { $(s).addEventListener("click", function () { onBell = false; }); });
  ["#new-btn", "#inbox-btn", "#pay-btn", "#set-btn", "#bell-btn"].forEach(function (s) { $(s).addEventListener("click", function () { onChats = false; }); });
  $("#clist").addEventListener("click", function () { onChats = false; });
  $("#clist").addEventListener("click", function () { onBell = false; });
  setInterval(function () { if (!$("#app").hidden) poll(); }, 30000);

  /* ---------- payments: Paystack links ---------- */
  function payments() {
    $("#main").innerHTML = ""; $("#main").appendChild($("#pay-tpl").content.cloneNode(true));
    var list = document.createElement("div"); list.className = "card"; list.style.marginTop = "16px"; list.innerHTML = '<p class="note">Loading payment links…</p>'; $("#main").appendChild(list);
    function load() {
      api("admin/payreqs").then(function (d) {
        list.innerHTML = '<h2><i class="ph ph-receipt" aria-hidden="true"></i>Payment links</h2>' + (d.ready ? "" : '<p class="note" style="color:var(--warn)">Paystack is not connected yet (PAYSTACK_SECRET_KEY missing). You can create links, but clients can\'t pay until it\'s set.</p>') +
          '<div style="display:grid;gap:8px">' + (d.requests.map(function (q) {
            var link = location.origin + "/pay/?r=" + q.id;
            var claimed = q.status !== "cancelled" && q.transfer;
            var items = q.plan ? q.plan.items : null, paidAmt = items ? items.filter(function (x) { return x.status === "paid"; }).reduce(function (n, x) { return n + x.amount; }, 0) : (q.status === "paid" ? q.total : 0);
            var part = q.status === "paid" && items && paidAmt < q.total, nxt = items ? items.filter(function (x) { return x.status !== "paid"; })[0] : null;
            var overdue = part && nxt && /^\d{4}-/.test(nxt.due) && new Date(nxt.due + "T23:59:59").getTime() < Date.now();
            var stTxt = claimed ? "transfer sent · check your bank" : part ? (overdue ? "overdue" : "part-paid") : q.status;
            var planTxt = q.plan && q.plan.type !== "full" ? (q.plan.type === "half" ? "Half now, half on delivery" : q.plan.count + " instalments every " + q.plan.interval + " days") : "";
            return '<div class="pr-row"' + (claimed || overdue ? ' style="border-color:rgba(255,209,102,.5)"' : "") + '><div><b>' + esc(q.business || q.name) + " · " + VX.money(q.total, q.currency) + ' <span class="st ' + (claimed || part ? "pending" : q.status) + '">' + stTxt + "</span></b>" +
              (planTxt ? '<span style="display:block">' + esc(planTxt + " · paid " + VX.money(paidAmt, q.currency) + " of " + VX.money(q.total, q.currency) + (nxt ? " · next " + VX.money(nxt.amount, q.currency) + (nxt.due === "delivery" ? " on delivery" : nxt.due === "now" ? " now" : " due " + nxt.due) : " · paid in full ✓")) + "</span>" : "") + "<span>" + esc(q.email) + " · created " + VX.date(q.createdAt) + (q.paidAt ? " · paid " + VX.date(q.paidAt, true) + (q.channel ? " by " + esc(q.channel) : "") + (q.clientEmailed ? " · confirmation emailed ✓" : q.clientEmailError ? " · confirmation not emailed" : "") : "") + "</span></div>" +
              (claimed ? '<span style="display:block;color:var(--warn)">' + esc("Sent to the " + (q.transfer.currency || "?") + " account" + (q.transfer.payer ? " by " + q.transfer.payer : "") + " · ref VIX-" + q.id.slice(0, 6).toUpperCase() + " · " + VX.date(q.transfer.at, true)) + "</span>" : "") +
              '<div class="acts">' + (q.status === "pending" || claimed || part ? '<button class="btn btn-p btn-sm" type="button" data-confirm="' + q.id + '">Confirm received' + (part && nxt ? " (" + VX.money(nxt.amount, q.currency) + ")" : "") + '</button><button class="btn btn-g btn-sm" type="button" data-copy="' + esc(link) + '">Copy ' + (part ? "pay link" : "link") + "</button>" : "") + (q.status === "pending" ? '<button class="btn btn-g btn-sm" type="button" data-cancel="' + q.id + '">Cancel</button>' : "") + (q.clientId ? '<button class="btn btn-g btn-sm" type="button" data-client="' + q.clientId + '">Open client</button>' : "") + "</div></div>";
          }).join("") || '<p class="note">No payment links yet.</p>') + "</div>";
        list.querySelectorAll("[data-copy]").forEach(function (b) { b.onclick = function () { navigator.clipboard.writeText(b.dataset.copy).then(function () { b.textContent = "Copied ✓"; }); }; });
        list.querySelectorAll("[data-confirm]").forEach(function (b) {
          b.onclick = function () {
            if (!confirm("Only confirm once you can SEE the money in your bank or Cleva account. Start this client's project now?")) return;
            b.disabled = true;
            api("admin/payreqs/confirm", { id: b.dataset.confirm }).then(function (d) {
              if (d.instalment) { alert("Payment of " + VX.money(d.amount, d.currency) + " confirmed." + (d.fullyPaid ? " The client has now paid in full and their files are unlocked." : " The client's dashboard is updated.")); load(); return; }
              sel = d.client.id; refresh();
              kickoff(d.client, d.services.map(function (s) { return { type: s.type, title: s.title, amount: s.amount }; }), d.total, d.invite, d.loginUrl, d);
            }).catch(function (x) { alert(x.message); b.disabled = false; });
          };
        });
        list.querySelectorAll("[data-cancel]").forEach(function (b) { b.onclick = function () { if (confirm("Cancel this payment link? The client won't be able to pay with it.")) api("admin/payreqs/cancel", { id: b.dataset.cancel }).then(load); }; });
        list.querySelectorAll("[data-client]").forEach(function (b) { b.onclick = function () { sel = b.dataset.client; refresh(true).then(function () { drawList(); showClient(sel); }); }; });
      }).catch(function (x) { list.innerHTML = '<p class="err">' + esc(x.message) + "</p>"; });
    }
    load();
    $("#pay-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, services = [];
      ["website", "ghl", "tiktok", "other"].forEach(function (t) {
        if (f[t].checked) services.push({ type: t, amount: f[t + "_amount"].value, eta: f[t + "_eta"] ? f[t + "_eta"].value : "", title: t === "other" ? f.other_title.value : "" });
      });
      if (!f.name.value.trim() || !f.email.value.trim()) { $("#pay-err").textContent = "Name and email are required."; return; }
      if (!services.length || services.some(function (s) { return !(+s.amount > 0); })) { $("#pay-err").textContent = "Tick at least one service and give each ticked service an amount."; return; }
      var btn = f.querySelector("button[type=submit]"); btn.disabled = true; $("#pay-err").textContent = "";
      api("admin/payreqs", { name: f.name.value, email: f.email.value, business: f.business.value, whatsapp: f.whatsapp.value, currency: f.currency.value, note: f.note.value, services: services })
        .then(function (d) {
          var q = d.request, first = q.name.split(" ")[0], amount = VX.money(q.total, q.currency);
          var msg = "Hi " + first + ", thank you for choosing Vix Automations! 🙏\n\nHere is your secure payment link for " + amount + ":\n" + d.link + "\n\nYou can pay by card, bank transfer or USSD through Paystack. As soon as payment is confirmed, your project starts and you'll get access to your client dashboard.\n\n– Promise, Vix Automations";
          var wa = (q.whatsapp || "").replace(/[^\d]/g, "").replace(/^0/, "234");
          var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(q.email) + "&su=" + encodeURIComponent("Your payment link: " + (q.business || "your project") + " | Vix Automations") + "&body=" + encodeURIComponent(msg);
          var box = document.createElement("div"); box.className = "card result"; box.style.marginTop = "16px";
          box.innerHTML = '<h2 class="ok"><i class="ph-fill ph-check-circle" aria-hidden="true"></i>Payment link ready: ' + esc(amount) + '</h2><label>Link<input readonly value="' + esc(d.link) + '"></label><label>Message<textarea readonly style="min-height:150px">' + esc(msg) + "</textarea></label>" +
            '<div class="acts">' + (wa ? '<a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/' + wa + "?text=" + encodeURIComponent(msg) + '"><i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i>Send on WhatsApp</a>' : "") +
            '<a class="btn btn-p" target="_blank" rel="noopener" href="' + esc(gmail) + '"><i class="ph ph-envelope-simple" aria-hidden="true"></i>Send by Gmail</a><button class="btn btn-g" type="button" id="pl-copy">Copy link</button><a class="btn btn-g" target="_blank" rel="noopener" href="' + esc(d.link) + '">Preview</a></div>';
          f.after(box); f.reset(); btn.disabled = false; load();
          box.querySelector("#pl-copy").onclick = function () { navigator.clipboard.writeText(d.link).then(function () { box.querySelector("#pl-copy").textContent = "Copied ✓"; }); };
          box.scrollIntoView({ behavior: "smooth", block: "center" });
        }).catch(function (x) { $("#pay-err").textContent = x.message; btn.disabled = false; });
    });
  }

  /* ---------- inbox: briefs & enquiries from the websites ---------- */
  function countInbox() {
    return api("admin/briefs").then(function (d) {
      var n = d.briefs.filter(function (b) { return !b.read; }).length;
      $("#inbox-n").hidden = !n; $("#inbox-n").textContent = n; return d;
    });
  }
  function inbox() {
    $("#main").innerHTML = '<div class="card"><p class="note">Loading…</p></div>';
    countInbox().then(function (d) {
      var head = '<div class="card"><div class="help"><div><h2 style="margin:0"><i class="ph ph-tray" aria-hidden="true"></i> Inbox</h2><p class="muted">Every brief and enquiry from both websites, newest first.</p></div>' +
        '<div class="acts"><button class="btn btn-g btn-sm" type="button" id="test-mail"><i class="ph ph-envelope-simple" aria-hidden="true"></i>Send a test email</button></div></div>' +
        (d.emailReady ? '<p class="note ok" id="mail-state">Email delivery is on: new briefs are also emailed to vixautomations@gmail.com.</p>' : '<p class="note" id="mail-state" style="color:var(--warn)">Email delivery is not set up yet (RESEND_API_KEY missing). Briefs are saved here, but not emailed.</p>') + "</div>";
      var list = d.briefs.map(function (b) {
        var wa = (b.whatsapp || "").replace(/[^\d]/g, "").replace(/^0/, "234");
        return '<div class="card" style="margin-top:12px' + (b.read ? ";opacity:.75" : "") + '"><div class="help"><div><h2 style="margin:0">' + (b.read ? "" : '<span class="pill-new" style="margin:0 8px 0 0">New</span>') + esc(b.subject) + '</h2><p class="muted">' + esc([b.name, b.business, b.email, b.whatsapp].filter(Boolean).join(" · ")) + " · " + VX.date(b.at, true) + " · via " + esc(b.source) + (b.emailed ? " · emailed ✓" : " · not emailed") + "</p></div></div>" +
          '<details class="box" style="margin-top:12px"' + (b.read ? "" : " open") + '><summary>Full message</summary><div><pre style="white-space:pre-wrap;margin:0;font:inherit;font-size:14px;color:#c4cbe0">' + esc(b.text) + "</pre></div></details>" +
          ((b.replies || []).length ? '<div class="chat" style="margin-top:12px;max-height:none">' + b.replies.map(function (r) { return '<div class="msg mine">' + esc(r.text) + "<time>You · " + VX.date(r.at, true) + (r.emailed ? " · emailed ✓" : " · not emailed") + (r.chat ? " · in their dashboard ✓" : "") + "</time></div>"; }).join("") + "</div>" : "") +
          (b.email ? '<form class="reply-box" data-rf="' + b.id + '" hidden style="margin-top:12px"><label>Reply to ' + esc(b.name) + " (" + esc(b.email) + ')<textarea name="text" rows="6" required placeholder="Write your reply…">Hi ' + esc((b.name || "").split(" ")[0]) + ',\n\nThank you for your message.\n\n</textarea></label><div class="acts" style="margin-top:10px"><button class="btn btn-p btn-sm" type="submit"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i>Send email</button><button class="btn btn-g btn-sm" type="button" data-cx>Cancel</button></div><p class="note" data-rmsg style="margin:8px 0 0"></p></form>' : "") +
          '<div class="acts" style="margin-top:12px">' +
          (b.email ? '<button class="btn btn-p btn-sm" type="button" data-reply="' + b.id + '"><i class="ph ph-envelope-simple" aria-hidden="true"></i>Reply by email</button>' : "") +
          (wa ? '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + wa + '"><i class="ph-fill ph-whatsapp-logo" aria-hidden="true"></i>WhatsApp</a>' : "") +
          '<button class="btn btn-g btn-sm" type="button" data-read="' + b.id + '" data-v="' + (!b.read) + '">' + (b.read ? "Mark unread" : "Mark as read") + "</button>" +
          '<button class="btn btn-g btn-sm" type="button" data-del="' + b.id + '">Delete</button></div></div>';
      }).join("");
      $("#main").innerHTML = head + (list || '<div class="card" style="margin-top:12px"><div class="empty"><i class="ph ph-tray" aria-hidden="true"></i>No briefs yet. They\'ll appear here as soon as someone sends one.</div></div>');
      $("#test-mail").onclick = function () {
        var b = this; b.disabled = true;
        api("admin/test-email", {}).then(function () { $("#mail-state").innerHTML = '<span class="ok">Test email sent ✓ Check vixautomations@gmail.com (and the Spam folder).</span>'; })
          .catch(function (x) { $("#mail-state").innerHTML = '<span class="err">' + esc(x.message) + "</span>"; }).finally(function () { b.disabled = false; });
      };
      $("#main").querySelectorAll("[data-read]").forEach(function (b) { b.onclick = function () { api("admin/briefs", { id: b.dataset.read, read: b.dataset.v === "true" }).then(inbox); }; });
      $("#main").querySelectorAll("[data-reply]").forEach(function (b) {
        b.onclick = function () { var f = $("#main").querySelector('[data-rf="' + b.dataset.reply + '"]'); f.hidden = false; var t = f.text; t.focus(); t.setSelectionRange(t.value.length, t.value.length); };
      });
      $("#main").querySelectorAll("[data-rf]").forEach(function (f) {
        f.querySelector("[data-cx]").onclick = function () { f.hidden = true; };
        f.addEventListener("submit", function (e) {
          e.preventDefault();
          var btn = f.querySelector("button[type=submit]"), out = f.querySelector("[data-rmsg]"), brief = d.briefs.find(function (x) { return x.id === f.dataset.rf; });
          btn.disabled = true; out.textContent = "Sending…";
          api("admin/briefs/reply", { id: f.dataset.rf, text: f.text.value }).then(function (r) {
            if (r.emailed) { out.innerHTML = '<span class="ok">Sent to ' + esc(brief.email) + " ✓" + (r.chat ? " Also added to their dashboard chat." : "") + "</span>"; setTimeout(inbox, 1800); return; }
            var gm = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(brief.email) + "&su=" + encodeURIComponent("Re: " + brief.subject) + "&body=" + encodeURIComponent(f.text.value + "\n\nBest regards,\nPromise Felix\nVix Automations");
            out.innerHTML = (r.chat ? '<span class="ok">Added to their dashboard chat ✓</span> ' : "") + '<span style="color:var(--warn)">Automatic email isn\'t set up yet (' + esc(r.emailError || "client emails off") + ').</span> <a class="btn btn-p btn-sm" target="_blank" rel="noopener" href="' + esc(gm) + '">Send it from Gmail (1 tap)</a>';
            btn.disabled = false;
          }).catch(function (x) { out.innerHTML = '<span class="err">' + esc(x.message) + "</span>"; btn.disabled = false; });
        });
      });
      $("#main").querySelectorAll("[data-del]").forEach(function (b) { b.onclick = function () { if (confirm("Delete this message?")) api("admin/briefs", { id: b.dataset.del, delete: true }).then(inbox); }; });
    }).catch(function (x) { $("#main").innerHTML = '<div class="card"><p class="err">' + esc(x.message) + "</p></div>"; });
  }


  /* ---------- chats ---------- */
  var onChats = false, chatSel = null, chatTimer = null;
  function convos() {
    var list = [];
    clients.forEach(function (c) { c.projects.forEach(function (p) { var ms = p.messages || [], last = ms[ms.length - 1]; list.push({ c: c, p: p, last: last, at: last ? last.at : p.paidAt || c.createdAt }); }); });
    return list.sort(function (a, b) { return (b.p.unreadAdmin || 0) - (a.p.unreadAdmin || 0) || String(b.at).localeCompare(String(a.at)); });
  }
  function chats(clientId) {
    onChats = true; onBell = false;
    if (clientId) { var f = convos().find(function (x) { return x.c.id === clientId; }); if (f) chatSel = f.p.id; }
    drawChats(true);
    clearInterval(chatTimer);
    chatTimer = setInterval(function () { if (!onChats || $("#app").hidden) { clearInterval(chatTimer); return; } refresh().then(function () { if (onChats) drawChats(false); }); }, 15000);
  }
  function drawChats(scroll) {
    var all = convos();
    if (!all.length) { $("#main").innerHTML = '<div class="card"><h2 style="margin:0"><i class="ph ph-chats-circle" aria-hidden="true"></i> Chats</h2><div class="empty"><i class="ph ph-chat-teardrop-text" aria-hidden="true"></i>No clients yet. Once you add a client, you can chat with them here and they\'ll see it on their dashboard.</div></div>'; return; }
    if (!chatSel || !all.some(function (x) { return x.p.id === chatSel; })) chatSel = all[0].p.id;
    var cur = all.find(function (x) { return x.p.id === chatSel; });
    var draft = $("#chat-text") ? $("#chat-text").value : "";
    var listH = all.map(function (x) {
      return '<button type="button" class="citem" data-cv="' + x.p.id + '" aria-current="' + (x.p.id === chatSel) + '"><b>' + esc(x.c.name) + (x.p.unreadAdmin && x.p.id !== chatSel ? '<span class="dot-r">' + x.p.unreadAdmin + "</span>" : "") + "</b><span>" + esc((x.c.business ? x.c.business + " · " : "") + x.p.title) + "</span><span>" + (x.last ? esc((x.last.from === "vix" ? "You: " : "") + x.last.text.slice(0, 60)) : "No messages yet") + "</span></button>";
    }).join("");
    var ms = cur.p.messages || [];
    var thread = ms.length ? ms.map(function (m) { return '<div class="msg ' + (m.from === "vix" ? "mine" : "them") + '">' + esc(m.text) + "<time>" + (m.from === "vix" ? "You" : esc(cur.c.name.split(" ")[0])) + " · " + VX.date(m.at, true) + "</time></div>"; }).join("") : '<div class="empty"><i class="ph ph-chat-teardrop-text" aria-hidden="true"></i>Say hello 👋 Your message appears on ' + esc(cur.c.name.split(" ")[0]) + "'s dashboard straight away" + (cur.c.activated ? "" : " (they haven't created their dashboard yet, so it's also emailed when email is set up)") + ".</div>";
    $("#main").innerHTML = '<div class="card"><div class="help"><div><h2 style="margin:0"><i class="ph ph-chats-circle" aria-hidden="true"></i> Chats</h2><p class="muted">Messages you send here appear instantly on the client\'s dashboard. New replies show up here automatically.</p></div></div>' +
      '<div class="chats"><div class="clist chat-list">' + listH + '</div><div class="chat-pane"><div class="chat-head"><b>' + esc(cur.c.name) + "</b><span>" + esc([cur.c.business, cur.p.title, cur.c.email].filter(Boolean).join(" · ")) + '</span></div><div class="chat" id="chat-thread">' + thread + '</div><form class="send" id="chat-form"><textarea id="chat-text" name="text" rows="2" placeholder="Message ' + esc(cur.c.name.split(" ")[0]) + '…" required></textarea><button class="btn btn-p" type="submit"><i class="ph ph-paper-plane-tilt" aria-hidden="true"></i>Send</button></form><p class="note" id="chat-msg" style="margin:6px 0 0"></p></div></div></div>';
    $("#chat-text").value = draft;
    var th = $("#chat-thread"); th.scrollTop = th.scrollHeight;
    $("#main").querySelector(".chat-list").onclick = function (e) { var b = e.target.closest("[data-cv]"); if (b) { chatSel = b.dataset.cv; $("#chat-text").value = ""; drawChats(true); } };
    if (cur.p.unreadAdmin) api("admin/read", { projectId: cur.p.id }).then(function () { cur.p.unreadAdmin = 0; drawList(); }).catch(function () {});
    $("#chat-text").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 760) { e.preventDefault(); $("#chat-form").requestSubmit(); } });
    $("#chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var t = $("#chat-text"), btn = e.target.querySelector("button"); if (!t.value.trim()) return;
      btn.disabled = true;
      api("admin/post", { projectId: cur.p.id, text: t.value, kind: "message" }).then(function (d) {
        t.value = "";
        return refresh().then(function () { drawChats(true); $("#chat-msg").innerHTML = d.emailed ? '<span class="ok">Sent ✓ Also emailed to ' + esc(cur.c.email) + "</span>" : '<span class="ok">Sent to their dashboard ✓</span>' + (d.emailError ? ' <span class="muted">(email copy not sent: ' + esc(d.emailError) + ")</span>" : ""); });
      }).catch(function (x) { $("#chat-msg").innerHTML = '<span class="err">' + esc(x.message) + "</span>"; btn.disabled = false; });
    });
  }
  function refresh(keep) {
    return api("admin/clients").then(function (d) {
      clients = d.clients; drawList();
      if (keep && sel) showClient(sel); else if (!sel) newForm();
    });
  }
  function drawList() {
    var tot = clients.reduce(function (n, c) { return n + c.projects.reduce(function (m, p) { return m + (p.unreadAdmin || 0); }, 0); }, 0);
    $("#chat-n").hidden = !tot; $("#chat-n").textContent = tot;
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
          kickoff(d.client, services, total, d.invite, d.loginUrl, d);
          refresh();
        }).catch(function (x) { $("#new-err").textContent = x.message; btn.disabled = false; });
    });
  }

  function kickoff(c, services, total, invite, loginUrl, res) {
    res = res || {};
    var first = c.name.split(" ")[0];
    var names = services.map(function (s) { return s.title || LABEL[s.type]; });
    var list = names.length > 1 ? names.slice(0, -1).join(", ") + " and " + names[names.length - 1] : names[0];
    var subject = "Your " + list + " project has started 🚀 | Vix Automations";
    var body = "Hi " + first + ",\n\n" +
      (total ? "Thank you for your payment of " + VX.money(total, c.currency) + ". Your " + list + " project has officially started!" : "Your free " + list + " project has officially started! We'll share your first design preview on your dashboard for you to review.") + "\n\n" +
      (invite ? "Create your private client dashboard here:\n" + invite + "\n\n(This link works once and lasts 14 days.)\n\n" : "Log in to your client dashboard here:\n" + loginUrl + "\n\n") +
      "On your dashboard you can:\n• See exactly where your project is, step by step\n• Read every update from our team\n• Download your website and files the moment they're ready\n• Track your growth numbers\n• Send us questions or change requests\n\n" +
      "We'll be in touch shortly with your next steps. If you need anything, just reply to this email or message us on WhatsApp: +44 7723 149573.\n\n" +
      "Welcome aboard,\nPromise Felix\nVix Automations\nhttps://vixautomations.pages.dev";
    var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(c.email) + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    var waNum = (c.whatsapp || "").replace(/[^\d]/g, "").replace(/^0/, "234");
    var waText = "Hi " + first + ", " + (total ? "thank you for your payment! " : "great news! ") + "Your " + list + " project has officially started 🚀\n\n" + (invite ? "Create your client dashboard here to track progress and receive your deliveries:\n" + invite : "Track your progress here:\n" + loginUrl) + "\n\nWe've also sent this to your email.\n– Promise, Vix Automations";
    $("#main").innerHTML = '<div class="card result"><h2 class="ok"><i class="ph-fill ph-check-circle" aria-hidden="true"></i>' + esc(c.name) + "'s project has started</h2>" +
      (res.clientEmailed ? '<p class="ok" style="margin:0"><i class="ph-fill ph-envelope-simple-open" aria-hidden="true"></i> Payment confirmation and dashboard link emailed to ' + esc(c.email) + ' automatically. You can also send it on WhatsApp below.</p>'
        : '<p class="muted" style="margin:0">Send the kickoff message: the email opens in Gmail, ready to send from your own inbox.' + (res.clientEmailError ? ' <span style="color:var(--warn)">(Automatic email not sent: ' + esc(res.clientEmailError) + ")</span>" : "") + "</p>") +
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
    var h = '<div class="card proj" style="margin-top:16px" id="p-' + id + '"><div class="help"><div><span class="badge"><i class="ph ' + t.icon + '" aria-hidden="true"></i>' + t.label + '</span><h2 style="margin:8px 0 0">' + esc(p.title) + '</h2><p class="muted">' + (p.billing && p.billing.type !== "full" ? esc(p.billing.label) + " · paid " + VX.money(p.billing.paid, p.billing.currency) + " of " + VX.money(p.billing.total, p.billing.currency) + (p.billing.fullyPaid ? " ✓" : " · 🔒 deliveries locked until paid in full") : "Paid " + VX.money(p.amount, p.currency) + " on " + VX.date(p.paidAt)) + (p.deliveredAt ? " · delivered " + VX.date(p.deliveredAt) : "") + "</p>" +
      (p.billing && !p.billing.fullyPaid ? '<p class="note">Moving this project to its final stage marks it as delivered. For "half on delivery" plans, that makes the balance due and emails the client.</p>' : "") + "</div></div>";
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
        req.then(function (d) { if (msg) msg.innerHTML = '<span class="ok">Saved ✓</span>'; if (kind === "message") alert(d && d.emailed ? "Sent ✓ It's on their dashboard and emailed to them." : "Sent to their dashboard ✓" + (d && d.emailError ? "\n\n(Email not sent: " + d.emailError + ")" : "")); return refresh(true); })
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
