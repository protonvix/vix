(function () {
  "use strict";

  var WHATSAPP_NUMBER = "447868242781";
  var EMAIL = "peopleandenterpriseglobal@gmail.com";

  var form = document.getElementById("quote-form");
  if (!form) return;
  var status = form.querySelector(".form-status");
  var packageSelect = form.querySelector("select[name=package]");
  var sendVia = "whatsapp";

  function setStatus(msg, type) {
    status.textContent = msg;
    status.className = "form-status" + (type ? " " + type : "");
  }

  // "Get My Custom Quote" buttons pre-select their package.
  document.querySelectorAll("[data-package]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      packageSelect.value = btn.dataset.package;
      packageSelect.classList.remove("invalid");
    });
  });

  form.querySelectorAll("button[data-send]").forEach(function (btn) {
    btn.addEventListener("click", function () { sendVia = btn.dataset.send; });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var valid = true;
    form.querySelectorAll("[required]").forEach(function (field) {
      var ok = field.value.trim() !== "" && (field.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));
      field.classList.toggle("invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      setStatus("Please choose a package and enter your name and a valid email.", "err");
      return;
    }

    var data = new FormData(form);
    var features = data.getAll("features");
    var lines = [
      "Hi Vix Automations! I'd like a custom website quote.",
      "",
      "Package: " + data.get("package"),
      "Brand: " + data.get("brand"),
      "Current platform: " + data.get("platform"),
      "Features: " + (features.length ? features.join(", ") : "None selected"),
      "Budget: " + data.get("budget"),
      "Timeline: " + data.get("timeline"),
      "Name: " + data.get("name"),
      "Email: " + data.get("email")
    ];
    var details = (data.get("details") || "").trim();
    if (details) lines.push("Details: " + details);
    var message = lines.join("\n");

    if (sendVia === "email") {
      window.location.href = "mailto:" + EMAIL +
        "?subject=" + encodeURIComponent("Website quote request: " + data.get("package")) +
        "&body=" + encodeURIComponent(message);
      setStatus("Opening your email app. Hit send and we'll reply with your quote.", "ok");
    } else {
      window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message), "_blank", "noopener");
      setStatus("Opening WhatsApp. Hit send and we'll reply with your quote.", "ok");
    }
  });

  form.addEventListener("input", function (e) {
    if (e.target.classList.contains("invalid") && e.target.value.trim()) e.target.classList.remove("invalid");
  });
})();
