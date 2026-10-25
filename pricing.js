(function () {
  "use strict";

  // ===== Settings you can change =====
  // Founding-client discount applied to every package (not the retainer).
  // Set percent to 0 to turn the discount off.
  var DISCOUNT = { percent: 20, label: "Founding Client discount on every package" };

  // Live exchange rates (free, no key). If the request fails, FALLBACK_RATES are used.
  var RATES_URL = "https://open.er-api.com/v6/latest/USD";
  var RATES_TTL_MS = 12 * 60 * 60 * 1000;

  // Approximate USD exchange rates, used only when live rates can't be loaded.
  var FALLBACK_RATES = {
    USD: 1, EUR: 0.92, GBP: 0.78, CAD: 1.37, AUD: 1.52, NGN: 1550,
    GHS: 15, KES: 129, ZAR: 18.2, INR: 84, AED: 3.67
  };

  var CURRENCIES = [
    ["USD", "US Dollar"], ["EUR", "Euro"], ["GBP", "British Pound"], ["CAD", "Canadian Dollar"],
    ["AUD", "Australian Dollar"], ["NGN", "Nigerian Naira"], ["GHS", "Ghanaian Cedi"],
    ["KES", "Kenyan Shilling"], ["ZAR", "South African Rand"], ["INR", "Indian Rupee"],
    ["AED", "UAE Dirham"]
  ];

  // Country (ISO code) -> currency, for countries with a supported currency.
  var EURO = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");
  var COUNTRY_CURRENCY = {
    US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NG: "NGN", GH: "GHS",
    KE: "KES", ZA: "ZAR", IN: "INR", AE: "AED"
  };
  EURO.forEach(function (c) { COUNTRY_CURRENCY[c] = "EUR"; });

  // Time zone -> country, a privacy-friendly location hint that needs no lookup service.
  var TZ_COUNTRY = {
    "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Nairobi": "KE", "Africa/Johannesburg": "ZA",
    "Europe/London": "GB", "Europe/Dublin": "IE", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
    "Asia/Dubai": "AE", "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
    "America/Winnipeg": "CA", "America/Halifax": "CA", "America/St_Johns": "CA", "America/Regina": "CA"
  };
  var EURO_TZ = /^Europe\/(Amsterdam|Athens|Berlin|Bratislava|Brussels|Helsinki|Lisbon|Ljubljana|Luxembourg|Madrid|Malta|Nicosia|Paris|Riga|Rome|Tallinn|Vienna|Vilnius|Zagreb)$/;

  var STORE_KEY = "vix-currency";
  var RATES_KEY = "vix-rates";

  var select = document.getElementById("currency-select");
  var note = document.querySelector("[data-currency-note]");
  if (!select) return;

  var rates = FALLBACK_RATES;
  var liveRates = false;

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }
  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function detectCurrency() {
    var saved = load(STORE_KEY);
    if (saved && FALLBACK_RATES[saved]) return saved;

    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* ignore */ }
    if (TZ_COUNTRY[tz]) return COUNTRY_CURRENCY[TZ_COUNTRY[tz]];
    if (EURO_TZ.test(tz)) return "EUR";
    if (/^Australia\//.test(tz)) return "AUD";

    var langs = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) {
      var region = (langs[i].split("-")[1] || "").toUpperCase();
      if (COUNTRY_CURRENCY[region]) return COUNTRY_CURRENCY[region];
    }
    return "USD";
  }

  // Round converted prices to tidy numbers for the currency's scale.
  function tidy(amount) {
    if (amount >= 100000) return Math.round(amount / 1000) * 1000;
    if (amount >= 10000) return Math.round(amount / 100) * 100;
    if (amount >= 1000) return Math.round(amount / 10) * 10;
    return Math.round(amount);
  }

  function format(amount, code) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code, maximumFractionDigits: 0 }).format(amount);
    } catch (e) {
      return code + " " + Math.round(amount).toLocaleString();
    }
  }

  function convert(usd, code) {
    return code === "USD" ? usd : tidy(usd * (rates[code] || FALLBACK_RATES[code]));
  }

  function render(code) {
    var pct = DISCOUNT.percent > 0 ? DISCOUNT.percent : 0;

    document.querySelectorAll(".price-block[data-usd]").forEach(function (block) {
      var usd = parseFloat(block.dataset.usd);
      var full = convert(usd, code);
      var now = pct ? convert(Math.round(usd * (100 - pct) / 100), code) : full;
      block.querySelector("[data-now]").textContent = format(now, code);
      var old = block.querySelector("[data-old]");
      var save = block.querySelector("[data-save]");
      if (pct) {
        old.textContent = format(full, code);
        save.textContent = "You save " + format(full - now, code);
      } else {
        old.textContent = "";
        save.textContent = "";
      }
    });

    document.querySelectorAll(".inline-price[data-usd]").forEach(function (el) {
      el.textContent = format(convert(parseFloat(el.dataset.usd), code), code) + (el.dataset.suffix || "");
    });

    if (note) {
      note.textContent = code === "USD"
        ? "Prices are set in US dollars (USD)."
        : "Prices are set in US dollars. " + code + " amounts are estimates using " +
          (liveRates ? "today's" : "an approximate") + " exchange rate; your invoice shows the exact amount.";
    }
  }

  // Build the currency menu
  CURRENCIES.forEach(function (c) {
    var opt = document.createElement("option");
    opt.value = c[0];
    opt.textContent = c[0] + " – " + c[1];
    select.appendChild(opt);
  });

  var current = detectCurrency();
  select.value = current;
  select.addEventListener("change", function () {
    current = select.value;
    store(STORE_KEY, current);
    render(current);
  });

  // Discount banner
  var banner = document.querySelector("[data-discount-banner]");
  if (banner && DISCOUNT.percent > 0) {
    banner.querySelector("[data-discount-percent]").textContent = DISCOUNT.percent + "% OFF";
    banner.querySelector("[data-discount-label]").textContent = DISCOUNT.label;
    banner.hidden = false;
  }

  render(current);

  // Load live exchange rates (cached for RATES_TTL_MS)
  function useRates(r) {
    rates = r;
    liveRates = true;
    render(current);
  }

  var cached = null;
  try { cached = JSON.parse(load(RATES_KEY) || "null"); } catch (e) { cached = null; }
  if (cached && cached.rates && Date.now() - cached.time < RATES_TTL_MS) {
    useRates(cached.rates);
  } else if (window.fetch) {
    fetch(RATES_URL)
      .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
      .then(function (data) {
        if (data && data.result === "success" && data.rates) {
          store(RATES_KEY, JSON.stringify({ time: Date.now(), rates: data.rates }));
          useRates(data.rates);
        }
      })
      .catch(function () { /* keep fallback rates */ });
  }
})();
