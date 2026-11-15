/* Vix Assist reviews: public list, write-a-review form and comments.
   Every review and comment is held for approval before it appears. */
(function () {
  "use strict";
  var list = document.getElementById("rvw-list"), sum = document.getElementById("rvw-sum");
  var home = document.querySelector("[data-reviews-home]");
  if (!list && !home) return;

  function api(path, body) {
    var init = { method: body ? "POST" : "GET", credentials: "same-origin", headers: { "x-vix": "1" } };
    if (body) { init.body = JSON.stringify(body); init.headers["content-type"] = "application/json"; }
    return fetch("/api/" + path, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || "Something went wrong. Please try again."); return d; });
    });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function day(iso) { try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function stars(n, big) {
    var out = ""; for (var i = 1; i <= 5; i++) out += '<i class="' + (i <= Math.round(n) ? "ph-fill" : "ph") + ' ph-star" aria-hidden="true"></i>';
    return '<span class="rvw-stars' + (big ? " big" : "") + '" role="img" aria-label="' + n + ' out of 5 stars">' + out + "</span>";
  }
  function initials(n) { return String(n || "?").trim().split(/\s+/).slice(0, 2).map(function (p) { return p[0]; }).join("").toUpperCase(); }

  function card(r, withComments) {
    var who = esc(r.name) + (r.business ? '<span class="rvw-biz">' + esc(r.business) + "</span>" : "");
    var h = '<article class="rvw-card" id="review-' + esc(r.id) + '">' +
      '<header><span class="rvw-av" aria-hidden="true">' + esc(initials(r.name)) + '</span><div class="rvw-who"><b>' + who + "</b>" +
      '<span class="rvw-meta">' + (r.verified ? '<span class="rvw-ver"><i class="ph-fill ph-seal-check" aria-hidden="true"></i>Verified client</span>' : "") + esc(r.experienceLabel) + (r.about ? ": " + esc(r.about) : "") + " · " + day(r.at) + "</span></div>" + stars(r.rating) + "</header>" +
      (r.title ? "<h3>" + esc(r.title) + "</h3>" : "") + '<p class="rvw-text">' + esc(r.text) + "</p>";
    if (r.reply) h += '<div class="rvw-reply"><b><img src="brand/vix-icon.svg" alt="" width="18" height="18">Reply from Vix Assist</b><p>' + esc(r.reply.text) + "</p></div>";
    if (withComments) {
      h += '<div class="rvw-comments">' + r.comments.map(function (c) {
        return '<div class="rvw-c' + (c.owner ? " own" : "") + '"><b>' + esc(c.name) + (c.owner ? ' <span class="rvw-tag">Vix Assist</span>' : c.verified ? ' <span class="rvw-tag ok">Verified client</span>' : "") + '<span class="rvw-cd">' + day(c.at) + "</span></b><p>" + esc(c.text) + "</p></div>";
      }).join("") +
        '<button class="rvw-cbtn" type="button" data-cmt="' + esc(r.id) + '"><i class="ph ph-chat-circle" aria-hidden="true"></i>' + (r.comments.length ? "Add a comment" : "Comment") + (r.comments.length ? " (" + r.comments.length + ")" : "") + "</button>" +
        '<form class="f rvw-cform" data-for="' + esc(r.id) + '" hidden novalidate><div class="two"><label>Your name<input name="name" autocomplete="name" required maxlength="80"></label><span></span></div><label>Comment<textarea name="text" rows="3" required maxlength="1500"></textarea></label><input class="hp" name="vx_trap" tabindex="-1" autocomplete="off" data-lpignore="true" data-1p-ignore aria-hidden="true"><div class="rvw-row"><button class="btn btn-p btn-sm" type="submit">Post comment</button><button class="btn btn-g btn-sm" type="button" data-cancel>Cancel</button></div><p class="err" role="alert"></p><p class="note">Comments appear once approved, usually within a day.</p></form></div>';
    }
    return h + "</article>";
  }

  var filter = "all", data = null;
  function draw() {
    var items = data.reviews.filter(function (r) { return filter === "all" || r.experience === filter; });
    list.innerHTML = items.length ? items.map(function (r) { return card(r, true); }).join("") :
      '<div class="rvw-empty"><i class="ph ph-star" aria-hidden="true"></i><b>' + (data.count ? "No reviews for this experience yet." : "No reviews yet.") + '</b><p>Vix Assist is a young business, so every review here comes from a real client and is never edited. Worked with me? <a href="#write">Be the first to share your experience.</a></p></div>';
  }
  function load() {
    return api("reviews").then(function (d) {
      data = d;
      if (sum) {
        var counts = {}; d.reviews.forEach(function (r) { counts[r.rating] = (counts[r.rating] || 0) + 1; });
        sum.innerHTML = d.count ? '<div class="rvw-avg"><b>' + d.average.toFixed(1) + "</b>" + stars(d.average, true) + "<span>" + d.count + " review" + (d.count === 1 ? "" : "s") + "</span></div>" +
          '<div class="rvw-bars">' + [5, 4, 3, 2, 1].map(function (s) { var n = counts[s] || 0; return '<div><span>' + s + ' <i class="ph-fill ph-star" aria-hidden="true"></i></span><i class="bar"><i style="width:' + (d.count ? n / d.count * 100 : 0) + '%"></i></i><span>' + n + "</span></div>"; }).join("") + "</div>" :
          '<div class="rvw-avg"><b>New</b><span>Reviews open</span></div><p class="rvw-sumtxt">Reviews are written by real clients after a call or a project, approved before they appear, and never edited.</p>';
        var chips = document.getElementById("rvw-filter");
        if (chips) {
          var used = {}; d.reviews.forEach(function (r) { used[r.experience] = 1; });
          chips.innerHTML = '<button type="button" data-f="all" aria-pressed="true">All</button>' + Object.keys(d.experiences).filter(function (k) { return used[k]; }).map(function (k) { return '<button type="button" data-f="' + k + '" aria-pressed="false">' + esc(d.experiences[k]) + "</button>"; }).join("");
          chips.hidden = Object.keys(used).length < 2;
          chips.onclick = function (e) { var b = e.target.closest("[data-f]"); if (!b) return; filter = b.dataset.f; chips.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); draw(); };
        }
      }
      if (list) draw();
      if (home) {
        if (!d.count) return;
        home.hidden = false;
        var avg = home.querySelector("[data-avg]"); if (avg) avg.innerHTML = stars(d.average) + " <b>" + d.average.toFixed(1) + "</b> from " + d.count + " review" + (d.count === 1 ? "" : "s");
        home.querySelector("[data-cards]").innerHTML = d.reviews.slice().sort(function (a, b) { return b.rating - a.rating || b.at.localeCompare(a.at); }).slice(0, 3).map(function (r) { return card(r, false); }).join("");
      }
    }).catch(function () {
      if (list) list.innerHTML = '<div class="rvw-empty"><b>Reviews could not load right now.</b><p>Please refresh the page in a moment.</p></div>';
    });
  }
  load();

  if (list) {
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cmt]");
      if (b) { var f = list.querySelector('form[data-for="' + b.dataset.cmt + '"]'); f.hidden = false; b.hidden = true; if (me && me.name) f.name.value = me.name; f.text.focus(); return; }
      var c = e.target.closest("[data-cancel]");
      if (c) { var fm = c.closest("form"); fm.hidden = true; list.querySelector('[data-cmt="' + fm.dataset.for + '"]').hidden = false; }
    });
    list.addEventListener("submit", function (e) {
      var f = e.target.closest(".rvw-cform"); if (!f) return;
      e.preventDefault();
      var err = f.querySelector(".err"), btn = f.querySelector("[type=submit]");
      err.textContent = ""; btn.disabled = true;
      api("reviews/comment", { reviewId: f.dataset.for, name: f.elements.name.value, text: f.elements.text.value, vx_trap: f.elements.vx_trap.value })
        .then(function () { f.outerHTML = '<p class="rvw-thanks"><i class="ph-fill ph-check-circle" aria-hidden="true"></i>Thanks! Your comment will appear once it is approved.</p>'; })
        .catch(function (x) { err.textContent = x.message; btn.disabled = false; });
    });
  }

  /* write a review */
  var form = document.getElementById("rvw-form"), me = null;
  if (form) {
    var pick = form.querySelector(".rvw-pick"), rating = 0;
    var paint = function (n) { pick.querySelectorAll("button").forEach(function (b, i) { b.classList.toggle("on", i < n); b.setAttribute("aria-checked", i + 1 === rating); }); };
    pick.innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="false" aria-label="' + n + " star" + (n > 1 ? "s" : "") + '" data-s="' + n + '"><i class="ph-fill ph-star" aria-hidden="true"></i></button>'; }).join("");
    pick.addEventListener("click", function (e) { var b = e.target.closest("[data-s]"); if (b) { rating = +b.dataset.s; paint(rating); form.querySelector(".err").textContent = ""; form.querySelector(".rvw-rlabel").textContent = ["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]; } });
    pick.addEventListener("mouseover", function (e) { var b = e.target.closest("[data-s]"); if (b) paint(+b.dataset.s); });
    pick.addEventListener("mouseleave", function () { paint(rating); });
    var q = new URLSearchParams(location.search), exp = q.get("experience");
    var sel = form.elements.experience, ta = form.elements.text, tip = ta.placeholder;
    var siteMode = function () { ta.placeholder = sel.value === "site" ? "What was easy on this website, and what was confusing, slow or hard to find?" : tip; };
    sel.addEventListener("change", siteMode);
    if (exp && sel.querySelector('option[value="' + exp + '"]')) sel.value = exp;
    siteMode();
    document.querySelectorAll("[data-rate-site]").forEach(function (b) { b.addEventListener("click", function () { sel.value = "site"; siteMode(); document.getElementById("write").scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(function () { var f = pick.querySelector("button"); if (f) f.focus({ preventScroll: true }); }, 500); }); });
    // Logged-in clients get the verified badge and do not need to type their email.
    fetch("/api/me", { credentials: "same-origin", headers: { "x-vix": "1" } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.client) return;
      me = d.client;
      form.elements.name.value = form.elements.name.value || me.name || "";
      form.elements.business.value = form.elements.business.value || me.business || "";
      var em = form.querySelector(".rvw-email"); if (em) em.hidden = true;
      var v = form.querySelector(".rvw-vnote"); if (v) { v.hidden = false; v.innerHTML = '<i class="ph-fill ph-seal-check" aria-hidden="true"></i>You are logged in as a client, so your review will show a <b>Verified client</b> badge.'; }
    }).catch(function () {});
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = form.querySelector(".err"), btn = form.querySelector("[type=submit]"), el = form.elements;
      err.textContent = "";
      if (!rating) { err.textContent = "Please choose a star rating."; return; }
      btn.disabled = true;
      api("reviews", { rating: rating, experience: el.experience.value, title: el.title.value, text: el.text.value, name: el.name.value, business: el.business.value, email: me ? "" : el.email.value, vx_trap: el.vx_trap.value })
        .then(function () { form.hidden = true; document.getElementById("rvw-done").hidden = false; document.getElementById("rvw-done").scrollIntoView({ behavior: "smooth", block: "center" }); })
        .catch(function (x) { err.textContent = x.message; btn.disabled = false; });
    });
  }
})();
