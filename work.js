/* Vix Assist: "Watch the work" animated demos + live weekly report */
(function () {
  "use strict";
  var stage = document.getElementById("wstage");
  if (!stage) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".wtabs [data-scene]"));
  var capEl = document.getElementById("wcap"), progEl = document.getElementById("wprog");
  var run = 0, visible = false, started = false, current = "workflow";

  function Cancel() {}
  function make(id) {
    var my = ++run;
    var ctl = {
      sleep: function (ms) {
        return new Promise(function (res, rej) {
          if (reduce) ms = Math.min(ms, 60);
          var t0 = performance.now();
          (function wait() {
            if (my !== run) return rej(new Cancel());
            if (!visible || document.hidden) { t0 += 100; return setTimeout(wait, 100); } // pause off screen
            if (performance.now() - t0 >= ms) return res();
            setTimeout(wait, Math.min(100, ms));
          })();
        });
      },
      cap: function (t) { capEl.textContent = t; },
      prog: function (p) { progEl.style.width = Math.round(p * 100) + "%"; },
      h: function (html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
    };
    return ctl;
  }

  /* ---------- fake cursor ---------- */
  var cur;
  function cursor() {
    cur = document.createElement("div");
    cur.className = "cursor";
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 9-6.5 1.6L9.8 19z" fill="#fff" stroke="#16161c" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    cur.style.transform = "translate(" + (stage.clientWidth - 60) + "px," + (stage.clientHeight - 40) + "px)";
    stage.appendChild(cur);
  }
  function moveTo(el, dx, dy) {
    var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    cur.style.transform = "translate(" + (r.left - s.left + (dx == null ? r.width / 2 : dx)) + "px," + (r.top - s.top + (dy == null ? r.height / 2 : dy)) + "px)";
  }
  function click() { cur.classList.remove("click"); void cur.offsetWidth; cur.classList.add("click"); }
  async function typeInto(ctl, el, text, speed) { for (var i = 1; i <= text.length; i++) { el.textContent = text.slice(0, i); await ctl.sleep(speed || 45); } }

  /* =============== SCENES =============== */
  var scenes = {};

  scenes.workflow = async function (c) {
    c.cap("Building a speed to lead workflow inside GoHighLevel");
    stage.innerHTML = '<div class="wf wfade"><div class="wf-pal"><small>Actions</small></div><div class="wf-can"><div class="wf-top"><span>New lead · Speed to lead</span><span class="pub" id="pub"><i class="ph ph-circle"></i>Draft</span></div><div class="wf-chain" id="chain"></div></div></div>';
    cursor();
    var pal = stage.querySelector(".wf-pal"), chain = stage.querySelector("#chain");
    var steps = [
      ["ph-file-text", "Trigger", "Form submitted · Website enquiry", "trig"],
      ["ph-chat-text", "Send SMS", "“Hi {{first_name}}, thanks for reaching out…”"],
      ["ph-envelope-simple", "Send email", "Welcome email with booking link"],
      ["ph-funnel-simple", "Create opportunity", "Pipeline: Sales · Stage: New lead"],
      ["ph-hourglass", "Wait", "Until reply or 10 minutes"],
      ["ph-git-branch", "If / else", "Replied? Book. No reply? Follow up"],
      ["ph-calendar-check", "Book appointment", "Team calendar · reminders on"]
    ];
    steps.forEach(function (s) { pal.appendChild(c.h('<div class="pal"><i class="ph ' + s[0] + '"></i>' + s[1] + "</div>")); });
    await c.sleep(600);
    var palItems = pal.querySelectorAll(".pal");
    for (var i = 0; i < steps.length; i++) {
      var p = palItems[i] || pal; moveTo(p); await c.sleep(650); p.classList && p.classList.add("hot"); click(); await c.sleep(250);
      if (i) chain.appendChild(c.h('<div class="link"></div>'));
      var n = c.h('<div class="node ' + (steps[i][3] || "") + '"><i class="ph ' + steps[i][0] + '"></i><span><b>' + steps[i][1] + "</b><span>" + steps[i][2] + "</span></span></div>");
      chain.appendChild(n); moveTo(n); p.classList && p.classList.remove("hot");
      c.prog((i + 1) / (steps.length + 3)); await c.sleep(450);
    }
    var pub = stage.querySelector("#pub");
    c.cap("Publishing and testing with a sample lead");
    moveTo(pub); await c.sleep(800); click(); await c.sleep(200);
    pub.classList.add("on"); pub.innerHTML = '<i class="ph-fill ph-check-circle"></i>Published';
    c.prog((steps.length + 1) / (steps.length + 3)); await c.sleep(600);
    var nodes = chain.querySelectorAll(".node");
    for (var k = 0; k < nodes.length; k++) { nodes[k].classList.add("lit"); await c.sleep(380); if (k < nodes.length - 1) nodes[k].classList.remove("lit"); }
    c.cap("Test passed: lead replied in 8 seconds and booked Tuesday 10:30");
    c.prog(1); await c.sleep(2200);
  };

  scenes.lead = async function (c) {
    c.cap("A new enquiry arrives on the website");
    stage.innerHTML = '<div class="sl wfade"><div class="sl-form"><b>Get a free quote</b><small>Bright Smile Dental · Leeds</small><div class="sl-in" data-ph="Full name" id="f1"></div><div class="sl-in" data-ph="Mobile" id="f2"></div><div class="sl-in" data-ph="What do you need?" id="f3"></div><div class="sl-btn" id="fb">Send enquiry</div></div><div class="phone"><div class="ph-top"><b>Bright Smile Dental</b><span>SMS · Sarah’s phone</span></div><div class="ph-msgs" id="msgs"></div></div></div><span class="timer" id="timer">0.0s</span>';
    cursor();
    var f1 = stage.querySelector("#f1"), f2 = stage.querySelector("#f2"), f3 = stage.querySelector("#f3"), fb = stage.querySelector("#fb"), msgs = stage.querySelector("#msgs"), timer = stage.querySelector("#timer");
    moveTo(f1, 20); await c.sleep(700); click(); await typeInto(c, f1, "Sarah Whitfield"); c.prog(.1);
    moveTo(f2, 20); await c.sleep(500); click(); await typeInto(c, f2, "07700 900 412", 40); c.prog(.2);
    moveTo(f3, 20); await c.sleep(500); click(); await typeInto(c, f3, "Teeth whitening price", 35); c.prog(.3);
    moveTo(fb); await c.sleep(600); click(); fb.classList.add("go"); fb.textContent = "Sent ✓";
    c.cap("GoHighLevel replies instantly, before any competitor"); timer.classList.add("on");
    var t = 0; while (t < 8) { t += 0.4; timer.textContent = t.toFixed(1) + "s"; await c.sleep(55); }
    function add(cls, html) { var b = c.h('<div class="bub ' + cls + '">' + html + "</div>"); msgs.appendChild(b); while (msgs.children.length > 6) msgs.removeChild(msgs.firstChild); return b; }
    add("out", "Hi Sarah, thanks for your enquiry about whitening. Can I ask a couple of quick questions?<small>Bright Smile · 8s after form</small>");
    c.prog(.5); await c.sleep(1400);
    add("in", "Yes sure, how much is it?"); await c.sleep(900);
    var ty = c.h('<div class="typing"><i></i><i></i><i></i></div>'); msgs.appendChild(ty); c.cap("Conversation AI answers and offers times"); await c.sleep(1200); ty.remove();
    add("ai", "Whitening starts from £249. I have Tue 10:30 or Thu 4:15 free. Which suits you?<small>AI assistant</small>"); c.prog(.7); await c.sleep(1500);
    add("in", "Tue 10:30 please"); await c.sleep(900);
    msgs.appendChild(c.h('<div class="calcard"><i class="ph-fill ph-calendar-check"></i><span><b>Booked: Tue 10:30</b><br>Reminders set for 24h and 1h before</span></div>'));
    c.cap("Booked automatically and added to the pipeline, no staff needed"); c.prog(1); await c.sleep(2600);
  };

  scenes.clean = async function (c) {
    c.cap("Auditing a messy pipeline: duplicates, no tags, wrong stages");
    stage.innerHTML = '<div class="cl wfade"><div class="cl-stat"><span id="s1">412 contacts</span><span id="s2">38 duplicates</span><span id="s3">0% tagged</span></div><div class="cl-cols" id="cols"><div class="cl-col"><h5>New lead</h5></div><div class="cl-col"><h5>Contacted</h5></div><div class="cl-col"><h5>Booked</h5></div><div class="cl-col"><h5>Won</h5></div></div></div>';
    var cl = stage.querySelector(".cl"), cols = stage.querySelectorAll(".cl-col");
    var people = [["Daniel Okoro", 0, "Facebook"], ["Priya Raman", 2, "Google"], ["Daniel Okoro", -1], ["Tom Gallagher", 1, "Referral"], ["Hannah Brooks", 3, "Website"], ["Priya Raman", -1], ["Marcus Bell", 0, "Instagram"], ["Ngozi Adeyemi", 2, "Website"]];
    var W = cl.clientWidth, H = cl.clientHeight, cards = [];
    people.forEach(function (p, i) {
      var el = c.h('<div class="ct' + (p[1] < 0 ? " dup" : "") + '"><b>' + p[0] + "</b>" + (p[1] < 0 ? "<br><span style=\"color:#ff8a8a\">duplicate</span>" : '<br><span class="tg">' + p[2] + "</span>") + "</div>");
      var x = 40 + Math.random() * (W - 220), y = 110 + Math.random() * (H - 180);
      el.style.transform = "translate(" + x + "px," + y + "px) rotate(" + (Math.random() * 16 - 8) + "deg)";
      cl.appendChild(el); cards.push({ el: el, p: p });
    });
    await c.sleep(1600); c.prog(.2);
    c.cap("Merging duplicates");
    cards.forEach(function (o) { if (o.p[1] < 0) { o.el.style.opacity = "0"; o.el.style.transform += " scale(.6)"; } });
    var s2 = stage.querySelector("#s2"); s2.textContent = "0 duplicates"; s2.classList.add("good");
    var s1 = stage.querySelector("#s1"); s1.textContent = "374 contacts";
    await c.sleep(1300); c.prog(.45);
    c.cap("Tagging every contact by source");
    var s3 = stage.querySelector("#s3");
    for (var pct = 0; pct <= 100; pct += 10) { s3.textContent = pct + "% tagged"; await c.sleep(70); }
    s3.classList.add("good");
    cards.forEach(function (o) { o.el.classList.add("tagged"); });
    await c.sleep(900); c.prog(.7);
    c.cap("Moving each lead to the right stage");
    var count = [0, 0, 0, 0], sRect = cl.getBoundingClientRect();
    cards.forEach(function (o) {
      if (o.p[1] < 0) return;
      var col = cols[o.p[1]], r = col.getBoundingClientRect();
      var x = r.left - sRect.left + (r.width - o.el.offsetWidth) / 2, y = r.top - sRect.top + 32 + count[o.p[1]]++ * 56;
      o.el.style.transform = "translate(" + x + "px," + y + "px) rotate(0deg)";
    });
    cols.forEach(function (cc) { cc.classList.add("ok"); });
    await c.sleep(1400);
    c.cap("Clean pipeline: every lead tagged, staged and ready for automation"); c.prog(1); await c.sleep(2600);
  };

  scenes.reviews = async function (c) {
    c.cap("A job is completed in GoHighLevel");
    stage.innerHTML = '<div class="rv-sc wfade"><div class="job"><b>Boiler service · James Carter</b><span style="color:var(--soft);font-size:12px">Opportunity · Northgate Heating</span><span class="st8" id="st8">In progress</span><div class="phone" style="width:100%;max-width:260px;height:200px;border-width:6px;border-radius:24px;justify-self:center"><div class="ph-msgs" id="rm"></div></div></div><div class="rate"><div class="meter"><span id="rt">4.2</span><small>Google rating</small></div><div class="stars" id="stars"><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i></div><div id="gslot" style="width:100%;display:grid;justify-items:center"></div></div></div>';
    cursor();
    var st8 = stage.querySelector("#st8"), rm = stage.querySelector("#rm");
    moveTo(st8); await c.sleep(800); click(); await c.sleep(200);
    st8.classList.add("done"); st8.textContent = "Job completed"; c.prog(.25);
    c.cap("Review request sent automatically 1 hour later"); await c.sleep(900);
    rm.appendChild(c.h('<div class="bub out">Thanks for choosing Northgate Heating, James. Could you leave us a quick review? It really helps.<small>Automated · 1h after job</small></div>'));
    await c.sleep(1500); rm.appendChild(c.h('<div class="bub in">Of course, great service</div>')); c.prog(.5);
    c.cap("The customer leaves 5 stars");
    var stars = stage.querySelectorAll("#stars i");
    for (var i = 0; i < 5; i++) { await c.sleep(260); stars[i].classList.add("on"); }
    await c.sleep(500);
    stage.querySelector("#gslot").appendChild(c.h('<div class="gcard"><b><span>James Carter</span><span class="gs">★★★★★</span></b><p style="margin:6px 0 0">Engineer arrived on time, explained everything and left the place spotless. Booking was easy too.</p></div>'));
    c.prog(.8); c.cap("Every completed job does this. The rating climbs on its own");
    var rt = stage.querySelector("#rt"), v = 4.2;
    while (v < 4.69) { v += 0.05; rt.textContent = v.toFixed(1); await c.sleep(160); }
    c.prog(1); await c.sleep(2400);
  };

  scenes.a2p = async function (c) {
    c.cap("Registering a US business for A2P 10DLC texting");
    var rows = [["ph-identification-card", "Brand registration", "Business details and EIN"], ["ph-megaphone", "Campaign submission", "Use case, sample messages, opt in"], ["ph-check-square", "Compliance review", "Privacy policy, opt out wording"], ["ph-broadcast", "Carrier approval", "T-Mobile, AT&T, Verizon"]];
    stage.innerHTML = '<div class="a2 wfade"><div class="a2-box"><b style="font-size:18px">A2P 10DLC registration</b><div class="a2-bar"><i id="a2b"></i></div>' + rows.map(function (r, i) { return '<div class="a2-row" id="a2r' + i + '"><i class="ph ' + r[0] + '"></i><span><b style="display:block;font-size:14px">' + r[1] + '</b><span style="font-size:12px">' + r[2] + '</span></span><small>Waiting</small></div>'; }).join("") + "</div></div>";
    var bar = stage.querySelector("#a2b");
    for (var i = 0; i < rows.length; i++) {
      var row = stage.querySelector("#a2r" + i), sm = row.querySelector("small");
      row.classList.add("doing"); sm.textContent = "In progress"; await c.sleep(1300);
      row.classList.remove("doing"); row.classList.add("done"); row.querySelector("i").className = "ph-fill ph-check-circle"; sm.textContent = "Done";
      bar.style.width = ((i + 1) / rows.length * 100) + "%"; c.prog((i + 1) / (rows.length + 1));
      if (i === 1) c.cap("Writing compliant sample messages so carriers approve first time");
      if (i === 2) c.cap("Waiting on carriers, answering any review questions");
    }
    stage.querySelector(".a2-box").appendChild(c.h('<div class="a2-ok"><i class="ph-fill ph-seal-check"></i>Approved · US texting is live</div>'));
    c.cap("Approved. Messages now reach customers instead of being filtered"); c.prog(1); await c.sleep(2600);
  };

  /* ---------- orchestration ---------- */
  var order = tabs.map(function (t) { return t.dataset.scene; });
  async function play(name, auto) {
    current = name;
    tabs.forEach(function (t) { t.setAttribute("aria-selected", t.dataset.scene === name); });
    var c = make(name);
    try {
      c.prog(0);
      await scenes[name](c);
      if (auto !== false) { var next = order[(order.indexOf(name) + 1) % order.length]; play(next, true); }
    } catch (e) { if (!(e instanceof Cancel)) console.error(e); }
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { started = true; play(t.dataset.scene, true); }); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !started) { started = true; play("workflow", true); }
    }, { threshold: 0.25 }).observe(stage);
  } else { visible = true; started = true; play("workflow", true); }

  /* ---------- live weekly report ---------- */
  var report = document.getElementById("report");
  if (report) {
    var rows = report.querySelectorAll(".rrow"), note = report.querySelector(".rnote");
    var total = 0, hours = [];
    rows.forEach(function (r) { var b = r.querySelector("b"); hours.push(parseFloat(b.textContent)); b.dataset.h = b.textContent; b.textContent = "0h"; });
    var bar = document.createElement("div"); bar.className = "hbar"; bar.innerHTML = "<i></i>"; note.parentNode.insertBefore(bar, note);
    var noteText = note.textContent; note.textContent = "Hours used this month: 0 of 20";
    var done = false;
    var rio = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting || done) return; done = true; rio.disconnect();
      rows.forEach(function (r, i) {
        setTimeout(function () {
          r.classList.add("in");
          var b = r.querySelector("b"), target = hours[i], v = 0;
          var iv = setInterval(function () { v = Math.min(target, v + 0.1); b.textContent = (Math.round(v * 10) / 10) + "h"; if (v >= target) clearInterval(iv); }, 40);
          total += target; bar.firstChild.style.width = (total / 20 * 100) + "%";
          note.textContent = "Hours used this month: " + (Math.round(total * 10) / 10) + " of 20";
          if (i === rows.length - 1) setTimeout(function () { note.textContent = noteText; }, 900);
        }, reduce ? 0 : 450 + i * 650);
      });
    }, { threshold: 0.35 });
    rio.observe(report);
  }
})();
