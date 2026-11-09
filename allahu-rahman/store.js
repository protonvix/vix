/* Allahu Rahman Online Store: storefront logic */
(() => {
  "use strict";
  const S = window.STORE, P = window.PRODUCTS, C = window.CATEGORIES;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const naira = n => S.currency + Number(n).toLocaleString("en-NG");
  const catName = id => (C.find(c => c.id === id) || {}).name || "";
  const byId = id => P.find(p => p.id === id);
  const esc = s => String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  /* ---------- storage (safe) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("ar_" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("ar_" + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  let cart = store.get("cart", []).filter(l => byId(l.id));
  let wish = store.get("wish", []).filter(byId);

  /* ---------- WhatsApp ---------- */
  // line: "orders" (sales, checkout) or "care" (questions, delivery, returns)
  const wa = (text, line = "orders") => {
    const l = (S.whatsapp || {})[line] || {};
    const num = (l.number || "").replace(/\D/g, "");
    return (num ? `https://wa.me/${num}` : "https://wa.me/") + "?text=" + encodeURIComponent(text);
  };
  const greet = {
    orders: `Hello ${S.name}, I would like to place an order.`,
    care: `Hello ${S.name}, I have a question.`,
  };
  $$("[data-wa]").forEach(a => { a.href = wa(greet[a.dataset.wa] || greet.care, a.dataset.wa); });
  $$("[data-wa-num]").forEach(el => { const l = S.whatsapp[el.dataset.waNum]; if (l) el.textContent = l.display; });

  /* floating WhatsApp chooser */
  const waBtn = $("#waFloat"), waMenu = $("#waMenu");
  const setWa = open => { if (open) $("#toast").classList.remove("show"); waMenu.classList.toggle("open", open); waMenu.setAttribute("aria-hidden", !open); waBtn.setAttribute("aria-expanded", open); };
  waBtn.addEventListener("click", e => { e.stopPropagation(); setWa(!waMenu.classList.contains("open")); });
  document.addEventListener("click", e => { if (!e.target.closest("#waMenu")) setWa(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") setWa(false); });
  $("#year").textContent = new Date().getFullYear();
  const stat = $("#statProducts"); if (stat) stat.textContent = P.length;

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg, action) {
    const t = $("#toast");
    t.innerHTML = `<i class="ph-fill ph-check-circle"></i><span>${esc(msg)}</span>` + (action ? `<button type="button">${esc(action.label)}</button>` : "");
    if (action) t.querySelector("button").onclick = () => { action.fn(); t.classList.remove("show"); };
    t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 3200);
  }

  /* ---------- categories ---------- */
  $("#catGrid").innerHTML = C.map(c => {
    const n = P.filter(p => p.cat === c.id).length;
    return `<a class="cat-card reveal" href="#shop" data-filter="${c.id}">
      <img src="${c.img}" alt="" loading="lazy">
      <div class="cat-info"><div><h3>${esc(c.name)}</h3><p>${n} styles · ${esc(c.blurb)}</p></div><span class="arrow"><i class="ph ph-arrow-right"></i></span></div>
    </a>`;
  }).join("");

  /* ---------- product card ---------- */
  function card(p, i = 0) {
    const on = wish.includes(p.id);
    const dots = p.colors.slice(0, 4).map(c => `<span class="dot" style="background:${c.hex}" title="${esc(c.name)}"></span>`).join("")
      + (p.colors.length > 4 ? `<small>+${p.colors.length - 4}</small>` : "");
    const hot = /deal|hot/i.test(p.badge || "");
    return `<article class="card" style="animation-delay:${Math.min(i, 12) * 40}ms" data-id="${p.id}">
      <div class="card-media" data-open="${p.id}" role="button" tabindex="0" aria-label="Quick view ${esc(p.name)}">
        <img src="${p.img}" alt="${esc(p.name)}" loading="lazy">
        ${p.badge ? `<span class="badge ${hot ? "hot" : ""}">${esc(p.badge)}</span>` : ""}
        <div class="card-quick"><span class="btn">Quick view</span></div>
      </div>
      <button class="wish ${on ? "on" : ""}" data-wish="${p.id}" aria-pressed="${on}" aria-label="${on ? "Remove from" : "Save to"} wishlist"><i class="${on ? "ph-fill" : "ph"} ph-heart"></i></button>
      <div class="card-body">
        <span class="card-cat">${esc(catName(p.cat))}</span>
        <h3 class="card-name" data-open="${p.id}">${esc(p.name)}</h3>
        <div class="dots">${dots}</div>
        <div class="card-row">
          <span class="price">${naira(p.price)}${p.oldPrice ? `<s>${naira(p.oldPrice)}</s>` : ""}</span>
          <button class="add-mini" data-add="${p.id}" aria-label="Add ${esc(p.name)} to bag"><i class="ph ph-plus"></i></button>
        </div>
      </div>
    </article>`;
  }

  /* ---------- shop: filter, search, sort ---------- */
  const state = { cat: "all", q: "", sort: "featured" };
  const chips = [{ id: "all", name: "All" }, ...C];
  $("#chips").innerHTML = chips.map(c => {
    const n = c.id === "all" ? P.length : P.filter(p => p.cat === c.id).length;
    return `<button class="chip" role="tab" data-chip="${c.id}" aria-selected="${c.id === "all"}">${esc(c.name)} <small>${n}</small></button>`;
  }).join("");

  const matches = (p, q) => {
    if (!q) return true;
    const hay = `${p.name} ${catName(p.cat)} ${p.desc} ${p.colors.map(c => c.name).join(" ")} ${p.code || ""}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).every(w => hay.includes(w.replace(/s$/, "")));
  };

  function renderGrid() {
    let list = P.filter(p => (state.cat === "all" || p.cat === state.cat) && matches(p, state.q));
    if (state.sort === "low") list.sort((a, b) => a.price - b.price);
    if (state.sort === "high") list.sort((a, b) => b.price - a.price);
    if (state.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    $("#productGrid").innerHTML = list.map(card).join("");
    $("#emptyState").hidden = list.length > 0;
    $("#shopTitle").textContent = state.cat === "all" ? "All products" : catName(state.cat);
    $$(".chip").forEach(c => c.setAttribute("aria-selected", c.dataset.chip === state.cat));
    $$(".nav-links a").forEach(a => a.classList.toggle("active", !!a.dataset.filter && a.dataset.filter === state.cat));
  }

  // skeletons first, then real cards
  $("#productGrid").innerHTML = Array.from({ length: 8 }, () => `<div class="card skeleton"><div class="card-media"></div><div class="sk-line"></div><div class="sk-line short"></div></div>`).join("");
  requestAnimationFrame(() => setTimeout(renderGrid, 250));

  function setFilter(cat) {
    state.cat = cat; state.q = ""; $("#searchInput").value = "";
    renderGrid();
    const chip = $(`.chip[data-chip="${cat}"]`); if (chip) chip.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }

  $("#chips").addEventListener("click", e => { const b = e.target.closest("[data-chip]"); if (b) setFilter(b.dataset.chip); });
  let qT;
  $("#searchInput").addEventListener("input", e => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim(); renderGrid(); }, 150); });
  $("#sortSelect").addEventListener("change", e => { state.sort = e.target.value; renderGrid(); });
  $("#clearSearch").addEventListener("click", () => { state.q = ""; state.cat = "all"; $("#searchInput").value = ""; renderGrid(); });

  // any link with data-filter jumps to shop with that filter
  document.addEventListener("click", e => {
    const a = e.target.closest("a[data-filter], a[data-nav='shop']");
    if (!a) return;
    setFilter(a.dataset.filter || "all");
    closeMenu();
  });

  /* ---------- best sellers rail ---------- */
  const best = P.filter(p => /best|hot|big|comfort/i.test(p.badge || "")).concat(P.filter(p => p.badge === "New")).slice(0, 10);
  $("#bestRail").innerHTML = best.map(card).join("");
  $$("[data-rail]").forEach(b => b.addEventListener("click", () => {
    const r = $("#bestRail"); r.scrollBy({ left: Number(b.dataset.rail) * r.clientWidth * 0.8, behavior: "smooth" });
  }));

  /* ---------- wishlist ---------- */
  function toggleWish(id) {
    const i = wish.indexOf(id);
    if (i > -1) wish.splice(i, 1); else wish.push(id);
    store.set("wish", wish);
    $$(`[data-wish="${id}"]`).forEach(b => {
      const on = wish.includes(id);
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
      b.setAttribute("aria-label", (on ? "Remove from" : "Save to") + " wishlist");
      b.innerHTML = `<i class="${on ? "ph-fill" : "ph"} ph-heart"></i>`;
    });
    if (wish.includes(id)) toast("Saved to your wishlist", { label: "View", fn: () => openDrawer("wish") });
    renderWish();
  }
  function renderWish() {
    const c = $("#wishCount"); c.textContent = wish.length; c.hidden = !wish.length;
    $("#wishBody").innerHTML = wish.length ? wish.map(id => {
      const p = byId(id);
      return `<div class="line-item"><img src="${p.img}" alt=""><div>
        <div class="li-top"><p class="li-name">${esc(p.name)}</p><button class="li-remove" data-wish="${p.id}" aria-label="Remove from wishlist"><i class="ph ph-trash"></i></button></div>
        <p class="li-meta">${esc(catName(p.cat))}</p>
        <div class="li-bottom"><span class="li-price">${naira(p.price)}</span><button class="btn btn-primary" data-open="${p.id}" style="min-height:32px;padding:4px 12px;font-size:14px">Choose options</button></div>
      </div></div>`;
    }).join("") : `<div class="drawer-empty"><i class="ph ph-heart"></i><h4>Your wishlist is empty</h4><p>Tap the heart on any product to save it for later.</p><button class="btn btn-primary" data-goshop>Start browsing</button></div>`;
  }

  /* ---------- cart ---------- */
  const key = l => `${l.id}|${l.color || ""}|${l.size || ""}`;
  function addToCart(id, opts = {}) {
    const p = byId(id);
    const line = { id, color: opts.color ?? (p.colors[0] || {}).name ?? "", size: opts.size ?? "", qty: opts.qty || 1 };
    const found = cart.find(l => key(l) === key(line));
    if (found) found.qty += line.qty; else cart.push(line);
    saveCart();
    const c = $("#cartCount"); c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    toast(`${p.name} added to your bag`, { label: "View bag", fn: () => openDrawer("cart") });
  }
  function saveCart() { store.set("cart", cart); renderCart(); }
  function renderCart() {
    const count = cart.reduce((s, l) => s + l.qty, 0);
    const total = cart.reduce((s, l) => s + l.qty * byId(l.id).price, 0);
    const c = $("#cartCount"); c.textContent = count; c.hidden = !count;
    $("#cartItemsLabel").textContent = count ? `(${count})` : "";
    $("#cartSubtotal").textContent = naira(total);
    $("#cartFoot").hidden = !cart.length;
    $("#cartBody").innerHTML = cart.length ? cart.map((l, i) => {
      const p = byId(l.id);
      const img = (p.colors.find(c => c.name === l.color) || {}).img || p.img;
      const meta = [l.color, l.size && `Size ${l.size}`].filter(Boolean).join(" · ");
      return `<div class="line-item"><img src="${img}" alt=""><div>
        <div class="li-top"><p class="li-name">${esc(p.name)}</p><button class="li-remove" data-remove="${i}" aria-label="Remove ${esc(p.name)}"><i class="ph ph-trash"></i></button></div>
        <p class="li-meta">${esc(meta)}</p>
        <div class="li-bottom">
          <div class="qty"><button data-dec="${i}" aria-label="Decrease"><i class="ph ph-minus"></i></button><span>${l.qty}</span><button data-inc="${i}" aria-label="Increase"><i class="ph ph-plus"></i></button></div>
          <span class="li-price">${naira(p.price * l.qty)}</span>
        </div>
      </div></div>`;
    }).join("") : `<div class="drawer-empty"><i class="ph ph-handbag"></i><h4>Your bag is empty</h4><p>Browse new arrivals and add your favourites here.</p><button class="btn btn-primary" data-goshop>Start shopping</button></div>`;
    $("#checkoutBtn").href = wa(orderText());
  }
  function orderText() {
    const lines = cart.map((l, i) => {
      const p = byId(l.id);
      const opts = [l.color && `Colour: ${l.color}`, l.size && `Size: ${l.size}`].filter(Boolean).join(", ");
      return `${i + 1}. ${p.name}${p.code ? ` (${p.code})` : ""}\n   ${opts ? opts + "\n   " : ""}Qty: ${l.qty} × ${naira(p.price)} = ${naira(p.price * l.qty)}`;
    }).join("\n");
    const total = cart.reduce((s, l) => s + l.qty * byId(l.id).price, 0);
    const city = ($("#cartCity").value || "").trim();
    return `Hello ${S.name}, I would like to place this order:\n\n${lines}\n\nSubtotal: ${naira(total)}${city ? `\nDeliver to: ${city}` : ""}\n\nPlease confirm availability and the delivery fee. Thank you.`;
  }
  $("#cartCity").addEventListener("input", () => { $("#checkoutBtn").href = wa(orderText()); });
  $("#cartBody").addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.inc) { cart[t.dataset.inc].qty++; saveCart(); }
    if (t.dataset.dec) { const l = cart[t.dataset.dec]; l.qty > 1 ? l.qty-- : cart.splice(t.dataset.dec, 1); saveCart(); }
    if (t.dataset.remove) {
      const removed = cart.splice(t.dataset.remove, 1)[0]; saveCart();
      toast(`${byId(removed.id).name} removed`, { label: "Undo", fn: () => { cart.push(removed); saveCart(); } });
    }
  });

  /* ---------- drawers, overlay ---------- */
  const overlay = $("#overlay");
  let lastFocus;
  function openDrawer(which) {
    closeAll(false);
    lastFocus = document.activeElement;
    const d = $(which === "cart" ? "#cartDrawer" : "#wishDrawer");
    overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add("show"));
    d.classList.add("open"); d.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    setTimeout(() => d.querySelector("[data-close]").focus(), 50);
  }
  function closeAll(restore = true) {
    $$(".drawer.open, .modal.open, .search-pop.open").forEach(el => { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); });
    overlay.classList.remove("show"); setTimeout(() => { if (!overlay.classList.contains("show")) overlay.hidden = true; }, 400);
    document.body.classList.remove("lock");
    if (restore && lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $("#openCart").addEventListener("click", () => openDrawer("cart"));
  $("#openWish").addEventListener("click", () => openDrawer("wish"));
  overlay.addEventListener("click", () => closeAll());
  document.addEventListener("keydown", e => { if (e.key === "Escape") { closeAll(); closeMenu(); } });
  document.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) closeAll();
    if (e.target.closest("[data-goshop]")) { closeAll(false); setFilter("all"); $("#shop").scrollIntoView({ behavior: "smooth" }); }
  });

  /* ---------- quick view ---------- */
  const qv = { p: null, color: "", size: "", qty: 1 };
  function openQuick(id) {
    const p = byId(id); if (!p) return;
    closeAll(false);
    lastFocus = document.activeElement;
    Object.assign(qv, { p, color: (p.colors[0] || {}).name || "", size: p.sizes.length === 1 ? p.sizes[0] : "", qty: 1 });
    $("#qvImg").src = p.img; $("#qvImg").alt = p.name;
    $("#qvCat").textContent = catName(p.cat) + (p.code ? ` · Art ${p.code}` : "");
    $("#qvName").textContent = p.name;
    $("#qvPrice").textContent = naira(p.price);
    $("#qvOld").textContent = p.oldPrice ? naira(p.oldPrice) : "";
    $("#qvDesc").textContent = p.desc;
    $("#qvColorsWrap").hidden = !p.colors.length;
    $("#qvColors").setAttribute("role", "radiogroup");
    $("#qvColors").innerHTML = p.colors.map(c => `<button class="swatch" role="radio" data-color="${esc(c.name)}" aria-label="${esc(c.name)}" title="${esc(c.name)}"><span style="background:${c.hex}"></span></button>`).join("");
    $("#qvSizesWrap").hidden = !p.sizes.length;
    $("#qvSizesWrap .opt-label span").hidden = !(p.cat === "shoes" || p.cat === "slippers");
    $("#qvSizes").setAttribute("role", "radiogroup");
    $("#qvSizes").innerHTML = p.sizes.map(s => `<button class="size" role="radio" data-size="${esc(s)}">${esc(s)}</button>`).join("");
    $("#qvSizeErr").hidden = true;
    syncQuick();
    const m = $("#quickView"); m.classList.add("open"); m.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    setTimeout(() => m.querySelector("[data-close]").focus(), 50);
  }
  function syncQuick() {
    const p = qv.p;
    $("#qvColorName").textContent = qv.color;
    $$("#qvColors .swatch").forEach(b => b.setAttribute("aria-checked", b.dataset.color === qv.color));
    $$("#qvSizes .size").forEach(b => b.setAttribute("aria-checked", b.dataset.size === qv.size));
    const col = p.colors.find(c => c.name === qv.color);
    const img = (col && col.img) || p.img;
    if (!$("#qvImg").src.endsWith(img)) $("#qvImg").src = img;
    $("#qvQty").textContent = qv.qty;
    const opts = [qv.color && `Colour: ${qv.color}`, qv.size && `Size: ${qv.size}`].filter(Boolean).join(", ");
    $("#qvBuy").href = wa(`Hello ${S.name}, I would like to order:\n\n${p.name}${p.code ? ` (${p.code})` : ""}\n${opts ? opts + "\n" : ""}Qty: ${qv.qty} × ${naira(p.price)} = ${naira(p.price * qv.qty)}\n\nPlease confirm availability and the delivery fee. Thank you.`);
  }
  $("#qvColors").addEventListener("click", e => { const b = e.target.closest("[data-color]"); if (b) { qv.color = b.dataset.color; syncQuick(); } });
  $("#qvSizes").addEventListener("click", e => { const b = e.target.closest("[data-size]"); if (b) { qv.size = b.dataset.size; $("#qvSizeErr").hidden = true; syncQuick(); } });
  $("#qvMinus").addEventListener("click", () => { qv.qty = Math.max(1, qv.qty - 1); syncQuick(); });
  $("#qvPlus").addEventListener("click", () => { qv.qty = Math.min(99, qv.qty + 1); syncQuick(); });
  const needSize = () => {
    if (qv.p.sizes.length && !qv.size) {
      $("#qvSizeErr").hidden = false;
      const s = $("#qvSizes"); s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake");
      return true;
    }
    return false;
  };
  $("#qvAdd").addEventListener("click", () => {
    if (needSize()) return;
    addToCart(qv.p.id, { color: qv.color, size: qv.size, qty: qv.qty });
    closeAll();
  });
  $("#qvBuy").addEventListener("click", e => { if (needSize()) e.preventDefault(); });

  /* ---------- delegated product actions ---------- */
  document.addEventListener("click", e => {
    const w = e.target.closest("[data-wish]"); if (w) { e.preventDefault(); toggleWish(w.dataset.wish); return; }
    const a = e.target.closest("[data-add]");
    if (a) {
      const p = byId(a.dataset.add);
      // products with sizes or several colours need a choice first
      if (p.sizes.length > 1 || p.colors.length > 1) openQuick(p.id); else addToCart(p.id, { size: p.sizes[0] || "" });
      return;
    }
    const o = e.target.closest("[data-open]"); if (o) openQuick(o.dataset.open);
  });
  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches(".card-media[data-open]")) { e.preventDefault(); openQuick(e.target.dataset.open); }
  });

  /* ---------- search overlay ---------- */
  const pop = $("#searchPop"), popIn = $("#popSearch");
  function renderPop() {
    const q = popIn.value.trim();
    if (!q) {
      $("#popResults").innerHTML = `<p class="sr-hint">Popular searches</p><div class="sr-tags">${["slides", "heels", "bag", "baby", "dress", "cutlery", "freezer"].map(t => `<button class="chip" data-term="${t}">${t}</button>`).join("")}</div>`;
      return;
    }
    const res = P.filter(p => matches(p, q)).slice(0, 8);
    $("#popResults").innerHTML = res.length ? res.map(p => `<button class="sr-item" data-open="${p.id}"><img src="${p.img}" alt=""><span>${esc(p.name)}<small>${esc(catName(p.cat))}</small></span><strong>${naira(p.price)}</strong></button>`).join("")
      : `<p class="sr-hint">No match for "${esc(q)}". <a href="${wa(`Hello ${S.name}, do you have ${q}?`, "orders")}" target="_blank" rel="noopener" style="color:var(--emerald);font-weight:600;text-decoration:underline">Ask our sales line</a> and we will check if we can source it.</p>`;
  }
  $("#openSearch").addEventListener("click", () => {
    closeAll(false); lastFocus = document.activeElement;
    pop.classList.add("open"); pop.setAttribute("aria-hidden", "false"); document.body.classList.add("lock");
    renderPop(); setTimeout(() => popIn.focus(), 60);
  });
  popIn.addEventListener("input", renderPop);
  $("#popResults").addEventListener("click", e => { const t = e.target.closest("[data-term]"); if (t) { popIn.value = t.dataset.term; renderPop(); popIn.focus(); } });

  /* ---------- mobile menu ---------- */
  const toggle = $("#menuToggle"), menu = $("#mobileMenu");
  function closeMenu() {
    menu.classList.remove("open"); menu.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-label", "Open menu");
    if (!$(".drawer.open, .modal.open, .search-pop.open")) document.body.classList.remove("lock");
  }
  toggle.addEventListener("click", () => {
    const open = !menu.classList.contains("open");
    if (!open) return closeMenu();
    menu.classList.add("open"); menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true"); toggle.setAttribute("aria-label", "Close menu");
    document.body.classList.add("lock");
    const items = $$("li", menu), step = Math.min(60, 400 / items.length);
    items.forEach((li, i) => { li.style.transitionDelay = `${i * step}ms`; });
  });
  menu.addEventListener("click", e => { if (e.target.closest("a")) closeMenu(); });

  /* ---------- announcement marquee (mobile) ---------- */
  const track = $(".announce-track"); track.innerHTML += track.innerHTML;
  $$("span", track).forEach((s, i) => { if (i >= track.children.length / 2) s.setAttribute("aria-hidden", "true"); });
  const mq = matchMedia("(min-width: 901px)");
  const syncMarquee = () => $$("span", track).forEach((s, i) => { s.hidden = mq.matches && i >= track.children.length / 2; });
  syncMarquee(); mq.addEventListener("change", syncMarquee);

  /* ---------- join form ---------- */
  $("#joinForm").addEventListener("submit", e => {
    e.preventDefault();
    const name = $("#joinName").value.trim(), err = $("#joinError");
    if (name.length < 2) { err.textContent = "Enter your first name so we know who to add."; err.hidden = false; $("#joinName").focus(); return; }
    err.hidden = true;
    window.open(wa(`Hello ${S.name}, my name is ${name}. Please add me to your new arrivals updates.`, "orders"), "_blank", "noopener");
    toast(`Thanks ${name}, send the WhatsApp message to join`);
    e.target.reset();
  });

  /* ---------- scroll reveals ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  const observe = () => $$(".reveal:not(.in)").forEach(el => io.observe(el));
  observe();

  /* ---------- tagline word reveal ---------- */
  const tag = $("#taglineText");
  const goldWords = new Set(["quality", "prices", "real", "person"]);
  tag.innerHTML = tag.textContent.trim().split(/\s+/).map(w => `<span class="w${goldWords.has(w.toLowerCase().replace(/\W/g, "")) ? " gold" : ""}">${esc(w)}</span>`).join(" ");
  const words = $$(".w", tag);
  let ticking = false;
  function lightWords() {
    ticking = false;
    const line = innerHeight * 0.72;
    words.forEach(w => { if (w.getBoundingClientRect().top < line) w.classList.add("on"); });
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(lightWords); } }, { passive: true });
  lightWords();

  /* ---------- init ---------- */
  renderCart(); renderWish();
  // deep link: #shop-bags etc.
  const h = location.hash.match(/^#shop-(\w+)/);
  if (h && C.some(c => c.id === h[1])) { state.cat = h[1]; setTimeout(() => $("#shop").scrollIntoView(), 300); }
})();
