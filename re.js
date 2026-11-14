/* Vix Assist: revenue leak calculator and CRM health check (real estate) */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };

  /* ---------- revenue leak calculator ---------- */
  var calc = $("#leak-form");
  if (calc) {
    var el = function (n) { return calc.querySelector('[name="' + n + '"]'); };
    var out = { total: $("#leak-total"), deals: $("#leak-deals"), month: $("#leak-month"), bar: $("#leak-bar"), note: $("#leak-note") };
    var shown = 0, raf = 0;
    function animateTo(v) {
      cancelAnimationFrame(raf);
      var from = shown, t0 = performance.now();
      (function tick(t) {
        var k = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - k, 3);
        shown = from + (v - from) * e;
        out.total.textContent = money(shown);
        if (k < 1) raf = requestAnimationFrame(tick);
      })(t0);
    }
    function run() {
      var leads = Math.max(0, +el("leads").value || 0);
      var commission = Math.max(0, +el("commission").value || 0);
      var rate = Math.max(0, +el("rate").value || 0) / 100;
      var speed = +el("speed").value, follow = +el("follow").value, past = +el("past").value;
      // capture: how much of a lead list's potential your current process keeps (assumptions shown on the page)
      var capture = speed * follow;
      var potential = Math.min(rate / capture, rate * 2);
      var lostDeals = Math.max(0, leads * 12 * (potential - rate));
      var lostReferrals = Math.max(0, leads * 12 * rate * (1 - past) * 0.3);
      var deals = lostDeals + lostReferrals;
      var total = deals * commission;
      animateTo(total);
      out.deals.textContent = deals < 1 ? "less than one closing" : (Math.round(deals * 10) / 10) + " closings";
      out.month.textContent = money(total / 12);
      out.bar.style.width = Math.min(100, Math.round((1 - capture) * 100)) + "%";
      out.note.textContent = "Your current follow up keeps about " + Math.round(capture * 100) + "% of what your leads could become.";
    }
    calc.addEventListener("input", run);
    calc.addEventListener("change", run);
    run();
  }

  /* ---------- CRM health check ---------- */
  var quiz = $("#check-quiz");
  if (quiz) {
    var qs = quiz.querySelectorAll(".q"), res = $("#check-result"), score = $("#check-score"), title = $("#check-title"), text = $("#check-text"), list = $("#check-gaps");
    function grade() {
      var yes = 0, answered = 0, gaps = [];
      qs.forEach(function (q) {
        var v = q.querySelector("input:checked");
        if (!v) return; answered++;
        if (v.value === "yes") yes++; else gaps.push(q.dataset.gap);
      });
      if (answered < qs.length) { res.hidden = true; return; }
      res.hidden = false;
      var pct = Math.round(yes / qs.length * 100);
      score.textContent = pct + "%";
      score.parentNode.style.setProperty("--p", pct);
      if (pct >= 85) { title.textContent = "Your system is in good shape."; text.textContent = "A few refinements could still add closings. A free audit will show where."; }
      else if (pct >= 50) { title.textContent = "Your CRM is leaking clients."; text.textContent = "Some leads and past clients are slipping through. These are the gaps a competitor with a better system is using right now:"; }
      else { title.textContent = "Your current system is costing you deals."; text.textContent = "Most of the follow up that wins and keeps clients is missing. These gaps are where your commission is going:"; }
      list.innerHTML = gaps.map(function (g) { return "<li><i class=\"ph-fill ph-warning-circle\"></i>" + g + "</li>"; }).join("");
      res.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    quiz.addEventListener("change", grade);
  }
})();
