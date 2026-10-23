(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Footer year
  document.getElementById("year").textContent = new Date().getFullYear();

  // Header shadow + mobile sticky CTA on scroll
  var header = document.querySelector(".site-header");
  var mobileCta = document.querySelector(".mobile-cta");
  var contact = document.getElementById("contact");
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle("scrolled", y > 10);
    var contactTop = contact.getBoundingClientRect().top;
    mobileCta.classList.toggle("show", y > 600 && contactTop > window.innerHeight);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Mobile navigation
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  function setMenu(open) {
    menu.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  // Animated counters
  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || "";
    if (reduceMotion) {
      el.textContent = target.toLocaleString() + suffix;
      return;
    }
    var start = null;
    var duration = 1600;
    function frame(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Reveal on scroll
  var revealEls = document.querySelectorAll(".reveal");
  var countEls = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { revealObs.observe(el); });

    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    countEls.forEach(function (el) { countObs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
    countEls.forEach(animateCount);
  }

  // Testimonial slider
  var slider = document.querySelector("[data-slider]");
  if (slider) {
    var slides = slider.querySelectorAll(".testimonial");
    var dotsWrap = slider.querySelector(".slider-dots");
    var current = 0;
    var timer;
    var dots = Array.prototype.map.call(slides, function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-label", "Show testimonial " + (i + 1));
      b.addEventListener("click", function () { go(i); restart(); });
      dotsWrap.appendChild(b);
      return b;
    });
    function go(i) {
      slides[current].classList.remove("is-active");
      dots[current].setAttribute("aria-selected", "false");
      current = i;
      slides[current].classList.add("is-active");
      dots[current].setAttribute("aria-selected", "true");
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { go((current + 1) % slides.length); }, 6000);
    }
    dots.forEach(function (d) { d.setAttribute("aria-selected", "false"); });
    go(0);
    restart();
    slider.addEventListener("mouseenter", function () { clearInterval(timer); });
    slider.addEventListener("mouseleave", restart);
  }

  // Contact form
  // Set FORM_ENDPOINT to a HighLevel inbound webhook, Formspree, or your own API.
  // Leave it empty to fall back to opening the visitor's email client.
  var FORM_ENDPOINT = "";
  var CONTACT_EMAIL = "hello@vixautomations.com";

  var form = document.getElementById("contact-form");
  var status = form.querySelector(".form-status");

  function setStatus(msg, type) {
    status.textContent = msg;
    status.className = "form-status" + (type ? " " + type : "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var valid = true;
    form.querySelectorAll("[required]").forEach(function (field) {
      var ok = field.value.trim() !== "" && (field.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));
      field.classList.toggle("invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      setStatus("Please fill in your name, a valid email and the service you need.", "err");
      return;
    }

    var data = Object.fromEntries(new FormData(form).entries());
    var button = form.querySelector("button[type=submit]");

    if (!FORM_ENDPOINT) {
      var body = Object.keys(data).map(function (k) { return k + ": " + data[k]; }).join("\n");
      window.location.href = "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent("Strategy call request from " + data.name) +
        "&body=" + encodeURIComponent(body);
      setStatus("Opening your email app. Hit send and I'll be in touch within 1 business day.", "ok");
      return;
    }

    button.disabled = true;
    setStatus("Sending…");
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        setStatus("Thanks! Your request is in. Expect a reply within 1 business day.", "ok");
      })
      .catch(function () {
        setStatus("Something went wrong. Please email " + CONTACT_EMAIL + " directly.", "err");
      })
      .finally(function () { button.disabled = false; });
  });

  form.addEventListener("input", function (e) {
    if (e.target.classList.contains("invalid") && e.target.value.trim()) e.target.classList.remove("invalid");
  });
})();
