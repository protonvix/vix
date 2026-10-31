/* =========================================================
   Famous Automobile — site script
   EDIT HERE: contact details, social links and the car list.
   ========================================================= */
const CONFIG = {
  // WhatsApp number in international format, digits only (234 + number without the first 0)
  whatsapp: "2348000000000",
  phoneDisplay: "+234 800 000 0000",
  email: "sales@famousautomobile.ng",
  socials: {
    instagram: "https://www.instagram.com/famousautomobile",
    facebook: "https://www.facebook.com/famousautomobile",
    tiktok: "https://www.tiktok.com/@famousautomobile",
    x: "https://x.com/famousautomobile",
    youtube: "https://www.youtube.com/@famousautomobile",
  },
};

/* Car list. category: luxury | sports | suv | sedan
   condition: "Brand new" or "Foreign used". Photos live in assets/cars/. */
const CARS = [
  { id: "challenger-hellcat", brand: "Dodge", model: "Challenger SRT Hellcat", year: 2021, category: "sports", condition: "Foreign used",
    img: "assets/cars/hero-challenger.jpg", engine: "6.2L supercharged V8", power: "717 hp", gearbox: "8 speed automatic", drive: "Rear wheel drive", fuel: "Petrol", seats: 5,
    desc: "The loudest way to arrive anywhere in Lagos. Supercharged HEMI power, wide body stance and launch control for when the road opens up." },
  { id: "nissan-gtr", brand: "Nissan", model: "GT-R Premium", year: 2020, category: "sports", condition: "Foreign used",
    img: "assets/cars/hero-gtr.jpg", engine: "3.8L twin turbo V6", power: "565 hp", gearbox: "6 speed dual clutch", drive: "All wheel drive", fuel: "Petrol", seats: 4,
    desc: "Godzilla. Hand built engine, all wheel drive grip and the kind of acceleration that rewrites what you think a car can do." },
  { id: "mercedes-gle", brand: "Mercedes Benz", model: "GLE 43 AMG Coupe", year: 2019, category: "suv", condition: "Foreign used",
    img: "assets/cars/hero-gle.jpg", engine: "3.0L biturbo V6", power: "385 hp", gearbox: "9 speed automatic", drive: "4MATIC all wheel drive", fuel: "Petrol", seats: 5,
    desc: "Coupe lines on an SUV body. AMG performance with the ride height and comfort Lagos roads ask for." },
  { id: "rolls-wraith", brand: "Rolls Royce", model: "Wraith", year: 2019, category: "luxury", condition: "Foreign used",
    img: "assets/cars/wraith.jpg", engine: "6.6L twin turbo V12", power: "624 hp", gearbox: "8 speed automatic", drive: "Rear wheel drive", fuel: "Petrol", seats: 4,
    desc: "Starlight headliner, coach doors and a V12 you barely hear. The statement car for people who never need to raise their voice." },
  { id: "bmw-m5", brand: "BMW", model: "M5 Competition", year: 2021, category: "luxury", condition: "Foreign used",
    img: "assets/cars/m5.jpg", engine: "4.4L twin turbo V8", power: "617 hp", gearbox: "8 speed automatic", drive: "xDrive all wheel drive", fuel: "Petrol", seats: 5,
    desc: "An executive saloon on the outside, a supercar underneath. Comfortable on the school run, savage on the expressway." },
  { id: "porsche-panamera", brand: "Porsche", model: "Panamera 4S", year: 2021, category: "luxury", condition: "Foreign used",
    img: "assets/cars/panamera.jpg", engine: "2.9L twin turbo V6", power: "443 hp", gearbox: "8 speed PDK", drive: "All wheel drive", fuel: "Petrol", seats: 4,
    desc: "Four doors, four seats and the handling of a 911. Luxury that still loves a corner." },
  { id: "bmw-m3", brand: "BMW", model: "M3 Competition", year: 2022, category: "sports", condition: "Brand new",
    img: "assets/cars/m3.jpg", engine: "3.0L twin turbo inline 6", power: "503 hp", gearbox: "8 speed automatic", drive: "Rear wheel drive", fuel: "Petrol", seats: 5,
    desc: "The bold grille, the sharp suit and 503 horsepower. A sports car you can still fit the family into." },
  { id: "amg-gtr", brand: "Mercedes Benz", model: "AMG GT R", year: 2020, category: "sports", condition: "Foreign used",
    img: "assets/cars/amg-gt.jpg", engine: "4.0L biturbo V8", power: "577 hp", gearbox: "7 speed dual clutch", drive: "Rear wheel drive", fuel: "Petrol", seats: 2,
    desc: "Born on the Nürburgring. Long bonnet, active aerodynamics and a V8 that sounds like thunder." },
  { id: "camaro-ss", brand: "Chevrolet", model: "Camaro SS", year: 2019, category: "sports", condition: "Foreign used",
    img: "assets/cars/camaro.jpg", engine: "6.2L V8", power: "455 hp", gearbox: "10 speed automatic", drive: "Rear wheel drive", fuel: "Petrol", seats: 4,
    desc: "American muscle with modern manners. Big V8 sound, sharp handling and a cabin built around the driver." },
  { id: "mustang-gt", brand: "Ford", model: "Mustang GT", year: 2020, category: "sports", condition: "Foreign used",
    img: "assets/cars/mustang.jpg", engine: "5.0L V8", power: "460 hp", gearbox: "10 speed automatic", drive: "Rear wheel drive", fuel: "Petrol", seats: 4,
    desc: "The original pony car. Coyote V8 power and a shape everybody recognises." },
  { id: "ford-expedition", brand: "Ford", model: "Expedition Limited", year: 2021, category: "suv", condition: "Foreign used",
    img: "assets/cars/expedition.jpg", engine: "3.5L EcoBoost V6", power: "375 hp", gearbox: "10 speed automatic", drive: "4x4", fuel: "Petrol", seats: 8,
    desc: "Eight seats, real towing power and space for the whole family plus luggage. Built for long trips out of Lagos." },
  { id: "toyota-rav4", brand: "Toyota", model: "RAV4 XLE", year: 2021, category: "suv", condition: "Foreign used",
    img: "assets/cars/rav4.jpg", engine: "2.5L 4 cylinder", power: "203 hp", gearbox: "8 speed automatic", drive: "All wheel drive", fuel: "Petrol", seats: 5,
    desc: "Toyota reliability in a smart, compact SUV. Easy on fuel, easy to maintain and holds its value." },
  { id: "honda-crv", brand: "Honda", model: "CR-V EX", year: 2019, category: "suv", condition: "Foreign used",
    img: "assets/cars/crv.jpg", engine: "1.5L turbo 4 cylinder", power: "190 hp", gearbox: "CVT automatic", drive: "All wheel drive", fuel: "Petrol", seats: 5,
    desc: "Roomy, practical and dependable. One of the most trusted family SUVs on Nigerian roads." },
  { id: "toyota-camry", brand: "Toyota", model: "Camry XSE", year: 2022, category: "sedan", condition: "Brand new",
    img: "assets/cars/camry.jpg", engine: "2.5L 4 cylinder", power: "206 hp", gearbox: "8 speed automatic", drive: "Front wheel drive", fuel: "Petrol", seats: 5,
    desc: "Lagos' favourite sedan with a sportier look. Two tone roof, sport suspension and Toyota peace of mind." },
  { id: "hyundai-accent", brand: "Hyundai", model: "Accent", year: 2021, category: "sedan", condition: "Brand new",
    img: "assets/cars/accent.jpg", engine: "1.6L 4 cylinder", power: "120 hp", gearbox: "IVT automatic", drive: "Front wheel drive", fuel: "Petrol", seats: 5,
    desc: "A smart first car or company car. Low running costs, modern safety and a comfortable ride." },
];

const CATEGORY_LABEL = { luxury: "Luxury", sports: "Sports and muscle", suv: "SUV", sedan: "Sedan" };
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const waLink = (text) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
const carName = (c) => `${c.year} ${c.brand} ${c.model}`;

/* ---------- Intro ---------- */
window.addEventListener("load", () => {
  setTimeout(() => document.body.classList.remove("is-loading"), reduceMotion ? 0 : 1500);
});
// Safety net in case an image stalls the load event
setTimeout(() => document.body.classList.remove("is-loading"), 4000);

/* ---------- Contact + socials ---------- */
$$("[data-social]").forEach((a) => {
  const key = a.dataset.social;
  a.href = key === "whatsapp" ? waLink("Hello Famous Automobile, I would like to ask about a car.") : CONFIG.socials[key];
});
$("[data-wa-float]").href = waLink("Hello Famous Automobile, I would like to ask about a car.");
$("[data-phone-link]").href = `tel:+${CONFIG.whatsapp}`;
$("[data-phone-text]").textContent = CONFIG.phoneDisplay;
$("[data-email-link]").href = `mailto:${CONFIG.email}`;
$("[data-email-text]").textContent = CONFIG.email;
$("[data-year]").textContent = new Date().getFullYear();

/* ---------- Navigation ---------- */
const nav = $("[data-nav]");
const toggle = $(".nav__toggle");
const menu = $("#mobile-menu");
let lastY = 0, ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    nav.classList.toggle("is-hidden", y > lastY && y > 600 && !menu.classList.contains("is-open"));
    lastY = y;
    ticking = false;
  });
}, { passive: true });

function setMenu(open) {
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.style.overflow = open ? "hidden" : "";
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
  } else {
    menu.classList.remove("is-open");
    setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 500);
  }
}
toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
$$("a", menu).forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false); });

// Current section highlight
const navLinks = $$(".nav__links a");
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
["top", "categories", "showroom", "why", "visit"].forEach((id) => { const el = document.getElementById(id); if (el) sectionObserver.observe(el); });

/* ---------- Hero slideshow ---------- */
const slides = $$(".hero__slide");
const dots = $$(".hero__dots button");
const caption = $("[data-hero-caption]");
const captions = ["Dodge Challenger SRT Hellcat", "Nissan GT-R Premium", "Mercedes Benz GLE 43 AMG Coupe"];
let current = 0, slideTimer;
function showSlide(i) {
  slides[current].classList.remove("is-active");
  dots[current].classList.remove("is-active");
  dots[current].setAttribute("aria-selected", "false");
  current = i;
  // restart the Ken Burns animation
  const s = slides[current];
  s.style.animation = "none"; void s.offsetWidth; s.style.animation = "";
  s.classList.add("is-active");
  dots[current].classList.add("is-active");
  dots[current].setAttribute("aria-selected", "true");
  const dotSpan = $("span", dots[current]);
  dotSpan.style.display = "none"; void dotSpan.offsetWidth; dotSpan.style.display = "";
  caption.classList.add("is-swapping");
  setTimeout(() => { caption.textContent = captions[current]; caption.classList.remove("is-swapping"); }, 400);
}
function startSlides() {
  clearInterval(slideTimer);
  if (!reduceMotion) slideTimer = setInterval(() => showSlide((current + 1) % slides.length), 7000);
}
dots.forEach((d, i) => d.addEventListener("click", () => { if (i !== current) showSlide(i); startSlides(); }));
startSlides();

/* ---------- Scroll reveals ---------- */
const revealObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-in");
    obs.unobserve(entry.target);
  });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
function observeReveals(root = document) {
  $$(".reveal:not(.is-in)", root).forEach((el, i) => {
    // stagger siblings in the same grid
    const siblings = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [];
    const idx = siblings.indexOf(el);
    if (idx > 0) el.style.transitionDelay = `${Math.min(idx * 80, 400)}ms`;
    revealObserver.observe(el);
  });
}
observeReveals();

/* ---------- Tagline word reveal ---------- */
const tagline = $("[data-words]");
if (tagline) {
  const gold = new Set(["checked,", "cleared", "honestly.", "yours."]);
  tagline.innerHTML = tagline.textContent.trim().split(/\s+/)
    .map((w) => `<span class="w${gold.has(w) ? " is-gold" : ""}">${w}</span>`).join(" ");
  const words = $$(".w", tagline);
  let raf = 0;
  const update = () => {
    raf = 0;
    const trigger = window.innerHeight * 0.72;
    words.forEach((w) => {
      const r = w.getBoundingClientRect();
      w.classList.toggle("is-on", r.top < trigger);
    });
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) window.addEventListener("scroll", onScroll, { passive: true });
    else window.removeEventListener("scroll", onScroll);
    update();
  });
  io.observe(tagline);
}

/* ---------- Counters ---------- */
const counterObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseFloat(el.dataset.counter);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const dur = reduceMotion ? 1 : 1800;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    obs.unobserve(el);
  });
}, { threshold: 0.6 });
$$("[data-counter]").forEach((el) => counterObserver.observe(el));

/* ---------- Parallax for spotlight + final ---------- */
if (!reduceMotion) {
  const layers = $$(".spotlight__media img, .final__media img");
  let praf = 0;
  const parallax = () => {
    praf = 0;
    layers.forEach((img) => {
      const r = img.parentElement.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
      img.style.transform = `translate3d(0, ${p * -60}px, 0) scale(1.12)`;
    });
  };
  window.addEventListener("scroll", () => { if (!praf) praf = requestAnimationFrame(parallax); }, { passive: true });
  parallax();
}

/* ---------- Showroom ---------- */
const grid = $("[data-grid]");
const empty = $("[data-empty]");
const chips = $$("[data-filter]");
const search = $("[data-search]");
let activeFilter = "all";

function cardHTML(c) {
  return `
  <article class="card is-entering">
    <div class="card__media">
      <img src="${c.img}" alt="${c.year} ${c.brand} ${c.model}" loading="lazy" width="1200" height="800">
      <span class="card__badge${c.condition === "Brand new" ? " card__badge--new" : ""}">${c.condition}</span>
    </div>
    <div class="card__body">
      <div>
        <p class="card__brand">${c.brand} · ${CATEGORY_LABEL[c.category]}</p>
        <h3 class="card__title">${c.model}</h3>
      </div>
      <div class="card__specs">
        <div><span>Year</span><strong>${c.year}</strong></div>
        <div><span>Power</span><strong>${c.power}</strong></div>
        <div><span>Seats</span><strong>${c.seats}</strong></div>
      </div>
      <div class="card__foot">
        <p class="card__price">Price<strong>Ask for price</strong></p>
        <button class="card__btn" type="button" data-open-car="${c.id}">View details <i class="ph ph-arrow-right"></i></button>
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  const q = (search.value || "").trim().toLowerCase();
  const list = CARS.filter((c) =>
    (activeFilter === "all" || c.category === activeFilter) &&
    (!q || `${c.brand} ${c.model} ${c.year} ${c.category} ${CATEGORY_LABEL[c.category]} ${c.engine} ${c.condition}`.toLowerCase().includes(q))
  );
  grid.innerHTML = list.map(cardHTML).join("");
  empty.hidden = list.length > 0;
  grid.hidden = list.length === 0;
  $$(".card", grid).forEach((card, i) => {
    setTimeout(() => card.classList.remove("is-entering"), reduceMotion ? 0 : 40 + Math.min(i * 60, 400));
  });
}

function setFilter(f) {
  activeFilter = f;
  chips.forEach((c) => {
    const on = c.dataset.filter === f;
    c.classList.toggle("is-active", on);
    c.setAttribute("aria-selected", String(on));
  });
  renderGrid();
}
chips.forEach((c) => c.addEventListener("click", () => setFilter(c.dataset.filter)));
$$("[data-filter-link]").forEach((a) => a.addEventListener("click", () => setFilter(a.dataset.filterLink)));
let searchTimer;
search.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderGrid, 150); });

// category counts
Object.keys(CATEGORY_LABEL).forEach((cat) => {
  const n = CARS.filter((c) => c.category === cat).length;
  $$(`[data-count-for="${cat}"]`).forEach((el) => (el.textContent = `${n} ${n === 1 ? "car" : "cars"} in stock`));
});

renderGrid();

/* ---------- Car modal ---------- */
const modal = $("[data-modal]");
function openCar(id) {
  const c = CARS.find((x) => x.id === id);
  if (!c) return;
  $("[data-modal-img]", modal).src = c.img;
  $("[data-modal-img]", modal).alt = carName(c);
  $("[data-modal-brand]", modal).textContent = `${c.brand} · ${CATEGORY_LABEL[c.category]}`;
  $("[data-modal-title]", modal).textContent = `${c.model}`;
  $("[data-modal-tags]", modal).innerHTML = [c.year, c.condition, c.fuel].map((t) => `<span>${t}</span>`).join("");
  $("[data-modal-desc]", modal).textContent = c.desc;
  $("[data-modal-specs]", modal).innerHTML = [
    ["Engine", c.engine], ["Power", c.power], ["Gearbox", c.gearbox], ["Drive", c.drive], ["Seats", c.seats], ["Fuel", c.fuel],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  $("[data-modal-wa]", modal).href = waLink(`Hello Famous Automobile, what is today's price for the ${carName(c)}?`);
  $("[data-modal-book]", modal).onclick = () => { carSelect.value = c.id; modal.close(); };
  modal.showModal();
}
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open-car]");
  if (btn) openCar(btn.dataset.openCar);
});
$("[data-modal-close]").addEventListener("click", () => modal.close());
modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

/* ---------- Booking form ---------- */
const form = $("[data-form]");
const carSelect = $("[data-car-select]");
carSelect.insertAdjacentHTML("beforeend",
  CARS.map((c) => `<option value="${c.id}">${carName(c)}</option>`).join("") +
  `<option value="other">Something else, please source it for me</option>`);
const dateInput = $("#f-date");
dateInput.min = new Date().toISOString().split("T")[0];

function setError(input, msg) {
  const field = input.closest(".field");
  field.classList.toggle("has-error", !!msg);
  $(".field__error", field).textContent = msg || "";
  input.setAttribute("aria-invalid", msg ? "true" : "false");
}
function validate() {
  let ok = true;
  const name = form.name.value.trim();
  const phone = form.phone.value.replace(/[\s()]/g, "");
  const email = form.email.value.trim();
  if (name.length < 2) { setError(form.name, "Please enter your full name."); ok = false; } else setError(form.name);
  if (!/^\+?\d{10,14}$/.test(phone)) { setError(form.phone, "Enter a valid phone number, for example 0803 123 4567."); ok = false; } else setError(form.phone);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { setError(form.email, "That email address does not look right."); ok = false; } else setError(form.email);
  if (!form.car.value) { setError(form.car, "Choose the car you want to see."); ok = false; } else setError(form.car);
  if (!form.date.value) { setError(form.date, "Pick a day for your visit."); ok = false; } else setError(form.date);
  return ok;
}
["input", "change"].forEach((ev) => form.addEventListener(ev, (e) => {
  if (e.target.closest(".field.has-error")) validate();
}));
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const status = $("[data-form-status]");
  if (!validate()) {
    status.textContent = "Please fix the highlighted fields.";
    $(".field.has-error input, .field.has-error select", form)?.focus();
    return;
  }
  const car = CARS.find((c) => c.id === form.car.value);
  const carText = car ? carName(car) : "a car you can source for me";
  const day = new Date(form.date.value + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const lines = [
    "Hello Famous Automobile, I would like to book a viewing.",
    `Name: ${form.name.value.trim()}`,
    `Phone: ${form.phone.value.trim()}`,
    form.email.value.trim() && `Email: ${form.email.value.trim()}`,
    `Car: ${carText}`,
    `Preferred day: ${day}`,
    form.message.value.trim() && `Note: ${form.message.value.trim()}`,
  ].filter(Boolean);
  status.textContent = `Opening WhatsApp with your booking for the ${carText}.`;
  window.open(waLink(lines.join("\n")), "_blank", "noopener");
});
