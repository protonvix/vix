// Luxe Dental Clinic: website concept by Vix Automations.
// Shared header, footer and contact actions for every page.

// CONFIRM with the clinic before launch.
const CLINIC = {
  phone: "+2349044374007",
  phoneLabel: "+234 904 437 4007",
  whatsapp: "2349044374007", // CONFIRM: assumed to be the same as the phone line
  email: "info@luxedental.com.ng", // CONFIRM: their current site shows info@luxedental.com
  instagram: "luxedental.ng",
  area: "Ikeja GRA, Lagos", // CONFIRM: add the full street address
};

const WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';

const PAGES = [
  ["index.html", "Home"],
  ["services.html", "Treatments"],
  ["dentists.html", "Our Dentists"],
  ["contact.html", "Contact"],
];

function waLink(text) {
  return "https://wa.me/" + CLINIC.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");
}

function renderHeader() {
  const here = location.pathname.split("/").pop() || "index.html";
  const links = PAGES.map(([href, label]) =>
    `<a href="${href}"${href === here ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  document.getElementById("site-header").innerHTML = `
    <div class="concept-bar"><strong>Website concept</strong> prepared for Luxe Dental Clinic by Vix Automations. Preview only, not the clinic's official site.</div>
    <div class="container nav">
      <a href="index.html" class="brand" aria-label="Luxe Dental Clinic home">
        <span class="brand-mark" aria-hidden="true">L</span>
        <span class="brand-text"><strong>Luxe Dental</strong><span>Clinic · Ikeja GRA</span></span>
      </a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Open menu"><span></span><span></span><span></span></button>
      <nav id="nav-menu" class="nav-menu" aria-label="Primary">
        ${links}
        <a href="contact.html#book" class="btn btn-primary">Book a visit</a>
      </nav>
    </div>`;
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("nav-menu");
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
}

function renderFooter() {
  const year = new Date().getFullYear();
  document.getElementById("site-footer").innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="brand-text"><strong>Luxe Dental Clinic</strong><span>Caring for Lagos smiles since 2019</span></div>
          <p style="margin-top:14px">${CLINIC.area}</p>
        </div>
        <div>
          <h4>Visit</h4>
          <ul>${PAGES.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("")}</ul>
        </div>
        <div>
          <h4>Talk to us</h4>
          <ul>
            <li><a href="tel:${CLINIC.phone}">${CLINIC.phoneLabel}</a></li>
            <li><a href="${waLink()}" target="_blank" rel="noopener">WhatsApp</a></li>
            <li><a href="mailto:${CLINIC.email}">${CLINIC.email}</a></li>
            <li><a href="https://instagram.com/${CLINIC.instagram}" target="_blank" rel="noopener">@${CLINIC.instagram}</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${year} Luxe Dental Clinic</span>
        <span>Design concept by Vix Automations · <a href="mailto:vixautomations@gmail.com">vixautomations@gmail.com</a></span>
      </div>
    </div>`;
}

function renderContactActions() {
  const wa = document.createElement("a");
  wa.className = "wa-float";
  wa.href = waLink("Hello Luxe Dental, I'd like to book an appointment.");
  wa.target = "_blank";
  wa.rel = "noopener";
  wa.setAttribute("aria-label", "Chat with Luxe Dental on WhatsApp");
  wa.innerHTML = WA_ICON;

  const bar = document.createElement("div");
  bar.className = "mobile-bar";
  bar.innerHTML = `<a href="tel:${CLINIC.phone}">Call the clinic</a><a href="${waLink("Hello Luxe Dental, I'd like to book an appointment.")}" target="_blank" rel="noopener">WhatsApp us</a>`;

  document.body.append(wa, bar);
  document.querySelectorAll("[data-wa]").forEach((el) => { el.href = waLink(el.dataset.wa); });
  document.querySelectorAll("[data-tel]").forEach((el) => { el.href = "tel:" + CLINIC.phone; el.textContent ||= CLINIC.phoneLabel; });
}

// Booking form: preview only, it does not send anything yet.
function setupBooking() {
  const form = document.querySelector("form.booking");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    form.querySelector(".form-done").style.display = "block";
  });
}

renderHeader();
renderFooter();
renderContactActions();
setupBooking();
