(function () {
  "use strict";

  // ===== Settings you can change =====
  var WHATSAPP_NUMBER = "447868242781"; // international format, digits only
  var WHATSAPP_GREETING = "Hi Vix Automations! I found you on your website and I'd like to ask about ";
  var EMAIL = "vixautomations@gmail.com";

  // Keep these in sync with pricing.html / pricing.js.
  var PRICES = { quick: 499, growth: 689, agency: 876, retainer: 299, discount: 20 };

  // Pages live side by side, so links work from both index.html and pricing.html.
  var HOME = /(pricing|tiktok|web-design)(\.html)?$/.test(location.pathname) ? "index.html" : "";

  function waLink(text) {
    return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text || WHATSAPP_GREETING + "your GoHighLevel services.");
  }
  function usd(n) { return "$" + n.toLocaleString("en-US"); }
  function off(n) { return usd(Math.round(n * (100 - PRICES.discount) / 100)); }

  var WA_ICON = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.4 3 4 8.36 4 14.96c0 2.3.66 4.46 1.8 6.29L4 29l7.98-1.76a12.1 12.1 0 0 0 4.06.7C22.68 27.94 28 22.58 28 15.98 28 9.38 22.68 3 16.04 3zm0 22.74c-1.27 0-2.5-.24-3.65-.7l-.26-.1-4.73 1.04 1.06-4.55-.17-.27a9.8 9.8 0 0 1-1.6-5.2c0-5.4 4.42-9.8 9.35-9.8 5.4 0 9.6 4.4 9.6 9.82 0 5.42-4.2 9.76-9.6 9.76zm5.36-7.3c-.3-.15-1.74-.86-2-.95-.27-.1-.47-.15-.67.15-.2.3-.77.95-.94 1.15-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.45.13-.6.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.48-.5-.67-.5h-.57c-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.74-.71 1.99-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35z"/></svg>';

  // ===== Knowledge base =====
  // Each topic: keywords that trigger it, and the reply (trusted HTML).
  var TOPICS = [
    { id: "greeting", keys: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "howdy"],
      reply: "Hi there! 👋 We can answer questions about our GoHighLevel services, pricing, payment and timelines. What would you like to know?" },
    { id: "pricing", keys: ["price", "pricing", "cost", "how much", "package", "packages", "plan", "plans", "quote", "fee", "fees", "rate", "rates", "charge", "budget", "expensive", "cheap"],
      reply: "We have three fixed-price packages:<br>• <b>Quick Start</b>: " + usd(PRICES.quick) + "<br>• <b>Growth System</b>: " + usd(PRICES.growth) + " (most popular)<br>• <b>Agency / SaaS</b>: " + usd(PRICES.agency) +
        "<br>Founding clients currently get <b>" + PRICES.discount + "% off</b>, so from " + off(PRICES.quick) + ". <a href=\"pricing.html\">See full pricing in your currency</a>." },
    { id: "discount", keys: ["discount", "promo", "coupon", "offer", "deal", "founding", "sale", "cheaper"],
      reply: "Founding clients get <b>" + PRICES.discount + "% off every package</b>. In return, we ask for an honest review and permission to share your results once your system is live. <a href=\"pricing.html\">See discounted prices</a>." },
    { id: "retainer", keys: ["retainer", "monthly", "monthly plan", "monthly support", "ongoing", "maintenance", "support plan", "per month", "subscription"],
      reply: "Ongoing support retainers start at <b>" + usd(PRICES.retainer) + "/month</b>. They cover new builds, fixes, optimisation, reporting and priority help. The packages themselves are one-off fixed prices." },
    { id: "payment", keys: ["pay", "payment", "payoneer", "cleva", "wise", "bank", "transfer", "invoice", "card", "paypal", "deposit"],
      reply: "You can pay by <b>Payoneer</b>, <b>Cleva</b>, <b>Wise</b>, or <b>bank transfer</b> to accounts in Nigeria, the UK and the USA. Payment details are included on your invoice." },
    { id: "currency", keys: ["currency", "naira", "ngn", "pounds", "gbp", "euro", "eur", "dollar", "usd", "cedi", "rand", "exchange"],
      reply: "Prices are set in US dollars. The <a href=\"pricing.html\">pricing page</a> shows them in your local currency as an estimate, and your invoice shows the exact amount before you pay." },
    { id: "tiktok", keys: ["tiktok", "tik tok", "tt", "video", "videos", "editing", "edit", "followers", "views", "viral", "reels", "shorts", "content creation", "social media", "engagement", "posting", "upload"],
      reply: "Yes! Our <b>TikTok Marketing</b> service includes:<br>• Quality video creation & editing<br>• <b>4 videos posted every week</b> for your niche<br>• Account & engagement management (comments and DMs)<br>• Growth in views, followers and engagement, organically<br>• Optional TikTok Ads, TikTok Shop and Reels/Shorts repurposing<br>TikTok packages are monthly and quoted for your niche. <a href=\"tiktok.html\">See TikTok packages</a> or ask for a free TikTok audit." },
    { id: "tiktok_guarantee", keys: ["guarantee followers", "guarantee views", "buy followers", "fake followers", "bots", "how many followers"],
      reply: "We don't buy followers or use bots, which breaks TikTok's rules and doesn't bring customers. No one can honestly guarantee TikTok numbers, but we guarantee the work: 4 quality videos every week, daily engagement and a monthly growth report." },
    { id: "webdesign", boost: 3, keys: ["website", "web design", "web designer", "redesign", "landing page", "wordpress", "shopify", "wix", "squarespace", "webflow", "site", "web page", "webpage", "online store", "ecommerce", "e-commerce"],
      reply: "Yes! Our <b>Web Design</b> service covers:<br>• New websites for new and existing brands<br>• Fixing website errors on coded sites and no-code builders (WordPress, Shopify, Wix, Squarespace, Webflow)<br>• GoHighLevel websites & funnels<br>Packages: <b>Starter</b>, <b>Business Growth</b> and <b>Premium Brand & E-commerce</b>, each with a custom quote. <a href=\"web-design.html#quote\">Get a custom website quote</a>." },
    { id: "webfix", boost: 6, keys: ["fix", "fixing", "repair", "broken", "error", "errors", "not loading", "not working", "bug", "hacked", "slow website", "fix my website", "fix my site", "404"],
      reply: "We fix website errors on any platform: broken layouts, forms not sending, slow pages, 404s, SSL warnings, plugin conflicts and hacked sites. <a href=\"web-design.html#quote\">Request a website fix quote</a> and tell us what's wrong." },
    { id: "services", keys: ["service", "services", "what do you do", "help with", "do you do"],
      reply: "We set up and automate GoHighLevel for you:<br>• CRM & pipeline setup<br>• Funnels & websites<br>• Workflow automation<br>• Reputation & review requests<br>• SaaS mode & white label<br>• Integrations & API<br>• Conversation AI & Voice AI bots<br>• Snapshots & migrations<br>• Website design & error fixes<br>• TikTok marketing (4 videos/week)<br>• Ongoing support<br><a href=\"" + HOME + "#services\">See all services</a>." },
    { id: "ghl", keys: ["gohighlevel", "highlevel", "ghl", "what is", "crm"],
      reply: "GoHighLevel is an all-in-one platform for CRM, funnels, websites, email & SMS marketing, calendars, reviews and automation. We set it up so leads are captured, followed up and booked automatically." },
    { id: "automation", keys: ["automation", "automate", "workflow", "workflows", "follow up", "follow-up", "nurture", "missed call", "text back", "reminder", "no show"],
      reply: "Popular automations we build: instant lead follow-up by SMS & email, missed-call text-back, appointment reminders, no-show recovery, nurture sequences and reactivation campaigns for old leads." },
    { id: "ai", keys: ["ai", "bot", "chatbot", "conversation ai", "voice ai", "artificial"],
      reply: "We set up GoHighLevel's Conversation AI and Voice AI to answer FAQs, qualify leads and book appointments 24/7 across SMS, web chat, Facebook, Instagram and phone." },
    { id: "saas", keys: ["saas", "white label", "whitelabel", "agency", "rebilling", "resell", "snapshot"],
      reply: "Our <b>Agency / SaaS</b> package (" + usd(PRICES.agency) + ") covers SaaS mode, Stripe rebilling, a custom niche snapshot, client onboarding automation and your own branding and domain." },
    { id: "timeline", keys: ["how long", "how long will", "how long does", "timeline", "time", "days", "weeks", "fast", "quick", "deadline", "turnaround", "when"],
      reply: "Typical delivery: <b>Quick Start</b> about 7 days, <b>Growth System</b> 2–3 weeks, and <b>Agency / SaaS</b> 3–5 weeks, depending on scope." },
    { id: "migration", keys: ["migrate", "migration", "move", "switch", "hubspot", "clickfunnels", "kajabi", "keap", "activecampaign", "import"],
      reply: "Yes, we migrate contacts, pipelines, tags and automations from HubSpot, ClickFunnels, Kajabi, Keap, ActiveCampaign and others, with a test import first so nothing gets lost." },
    { id: "account", keys: ["own", "ownership", "my account", "subscription included", "need an account", "highlevel account", "license"],
      reply: "You keep your own GoHighLevel account and pay HighLevel directly, so you always own your account, data and snapshot. If you don't have one yet, we'll help you pick the right plan." },
    { id: "training", keys: ["train", "training", "learn", "teach", "sop", "loom", "tutorial", "team"],
      reply: "Every project includes recorded walkthroughs and written SOPs, so your team understands everything after hand-over. Live training sessions are available too." },
    { id: "trust", keys: ["trust", "review", "reviews", "testimonial", "portfolio", "experience", "legit", "scam", "proof", "case study"],
      reply: "We're new to taking clients, so we don't have reviews yet. To keep it low-risk, the scope and price are fixed in writing before work starts, and anything in scope that doesn't work is fixed at no extra charge. You can also <a href=\"https://www.linkedin.com/in/promise-felix-a491a7233/\" target=\"_blank\" rel=\"noopener\">connect on LinkedIn</a>." },
    { id: "guarantee", keys: ["guarantee", "refund", "money back", "not working", "broken", "fix", "warranty"],
      reply: "Our promise: we agree the scope in writing first. If anything in that scope doesn't work as described, we fix it at no extra charge." },
    { id: "location", keys: ["where", "location", "country", "based", "worldwide", "international", "nigeria", "uk", "usa", "remote"],
      reply: "We work remotely with clients worldwide, and accept payment via Payoneer, Cleva, Wise or bank transfer in Nigeria, the UK and the USA." },
    { id: "book", keys: ["book", "call", "meeting", "consult", "consultation", "strategy", "appointment", "schedule", "audit", "start", "get started", "hire"],
      reply: "Great! You can <a href=\"" + HOME + "#contact\">book a free 30-minute strategy call</a>, or message us on WhatsApp and we'll set a time that suits you." },
    { id: "human", keys: ["human", "person", "real", "agent", "talk", "speak", "whatsapp", "contact", "email", "phone", "number", "reach"],
      reply: "Of course! Message us on <a href=\"" + waLink() + "\" target=\"_blank\" rel=\"noopener\">WhatsApp</a> or email <a href=\"mailto:" + EMAIL + "\">" + EMAIL + "</a>. We usually reply within 1 business day." },
    { id: "thanks", keys: ["thanks", "thank you", "thx", "cheers", "great", "awesome", "ok", "okay", "cool"],
      reply: "You're welcome! Anything else we can help with?" },
    { id: "bye", keys: ["bye", "goodbye", "see you", "later"],
      reply: "Thanks for stopping by! If you think of anything else, we're one WhatsApp message away. 👋" }
  ];

  var QUICK = [
    ["Pricing", "How much does it cost?"],
    ["Services", "What services do you offer?"],
    ["TikTok", "Tell me about TikTok marketing"],
    ["Websites", "Do you design websites?"],
    ["How to pay", "How can I pay?"],
    ["Timeline", "How long does it take?"],
    ["Book a call", "I want to book a call"],
    ["Talk to a person", "I want to talk to a person"]
  ];

  // Score topics by keyword matches; whole-word match for short keywords.
  function findTopic(text) {
    var t = " " + text.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ") + " ";
    var best = null, bestScore = 0;
    TOPICS.forEach(function (topic) {
      var score = 0;
      topic.keys.forEach(function (k) {
        if (t.indexOf(" " + k + " ") !== -1) score += k.split(" ").length * 2;
        else if (k.length > 4 && t.indexOf(k) !== -1) score += 1;
      });
      // Specialised topics win over general ones when they match at all.
      if (score && topic.boost) score += topic.boost;
      // Any mention of TikTok should get a TikTok answer.
      if (score && /^tiktok/.test(topic.id) && /\btik ?tok\b/.test(t)) score += 6;
      // Small talk shouldn't win over a real question in the same message.
      if (/^(greeting|thanks|bye)$/.test(topic.id)) score *= 0.5;
      if (score > bestScore) { best = topic; bestScore = score; }
    });
    return best;
  }

  function fallback(question) {
    return "We're not sure about that one, but a real person on our team can help. " +
      "<a class=\"vx-wa-inline\" href=\"" + waLink(WHATSAPP_GREETING + "this: " + question) + "\" target=\"_blank\" rel=\"noopener\">Ask on WhatsApp</a> " +
      "or email <a href=\"mailto:" + EMAIL + "\">" + EMAIL + "</a>.";
  }

  // ===== Build the widget =====
  var root = document.createElement("div");
  root.className = "vx-fabs";
  root.innerHTML =
    '<div class="vx-panel" id="vx-panel" role="dialog" aria-modal="false" aria-labelledby="vx-title" hidden>' +
      '<div class="vx-head">' +
        '<img src="brand/vix-icon.svg" alt="" width="36" height="36">' +
        '<div><b id="vx-title">Vix Assistant</b><span>Automated assistant · replies instantly</span></div>' +
        '<button type="button" class="vx-close" aria-label="Close chat">&times;</button>' +
      '</div>' +
      '<div class="vx-log" aria-live="polite"></div>' +
      '<div class="vx-quick"></div>' +
      '<form class="vx-form">' +
        '<label class="vx-sr" for="vx-input">Type your message</label>' +
        '<input id="vx-input" type="text" autocomplete="off" maxlength="300" placeholder="Type your question…">' +
        '<button type="submit" aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l16-8-6 16-2-7z"/></svg></button>' +
      '</form>' +
      '<a class="vx-wa-bar" href="' + waLink() + '" target="_blank" rel="noopener">' + WA_ICON + ' Prefer a person? Chat on WhatsApp</a>' +
    '</div>' +
    '<button type="button" class="vx-fab vx-chat-btn" aria-controls="vx-panel" aria-expanded="false" aria-label="Open chat assistant">' +
      '<svg class="vx-open-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>' +
      '<svg class="vx-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
    '</button>' +
    '<a class="vx-fab vx-wa-btn" href="' + waLink() + '" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">' + WA_ICON + '<span class="vx-tip">Chat on WhatsApp</span></a>';
  document.body.appendChild(root);

  var panel = root.querySelector(".vx-panel");
  var log = root.querySelector(".vx-log");
  var quick = root.querySelector(".vx-quick");
  var form = root.querySelector(".vx-form");
  var input = root.querySelector("#vx-input");
  var chatBtn = root.querySelector(".vx-chat-btn");
  var started = false;

  function addMessage(who, content, isHtml) {
    var msg = document.createElement("div");
    msg.className = "vx-msg vx-" + who;
    if (isHtml) msg.innerHTML = content; else msg.textContent = content;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return msg;
  }

  function botReply(html) {
    var typing = addMessage("bot", "", false);
    typing.classList.add("vx-typing");
    typing.innerHTML = "<i></i><i></i><i></i>";
    setTimeout(function () {
      typing.classList.remove("vx-typing");
      typing.innerHTML = html;
      log.scrollTop = log.scrollHeight;
    }, 550);
  }

  function ask(text) {
    text = text.trim();
    if (!text) return;
    addMessage("user", text, false);
    var topic = findTopic(text);
    botReply(topic ? topic.reply : fallback(text));
  }

  QUICK.forEach(function (q) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = q[0];
    b.addEventListener("click", function () { ask(q[1]); });
    quick.appendChild(b);
  });

  function setOpen(open) {
    panel.hidden = !open;
    root.classList.toggle("vx-is-open", open);
    chatBtn.setAttribute("aria-expanded", String(open));
    chatBtn.setAttribute("aria-label", open ? "Close chat assistant" : "Open chat assistant");
    if (open) {
      if (!started) {
        started = true;
        addMessage("bot", "Hi! 👋 Welcome to Vix Automations. Ask us anything about our services, pricing, payment or timelines, or tap a topic below.", true);
      }
      setTimeout(function () { input.focus(); }, 50);
    }
  }

  chatBtn.addEventListener("click", function () { setOpen(panel.hidden); });
  root.querySelector(".vx-close").addEventListener("click", function () { setOpen(false); chatBtn.focus(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) { setOpen(false); chatBtn.focus(); }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(input.value);
    input.value = "";
  });

  // Lift the buttons above the sticky mobile "Book a call" bar when it shows.
  var mobileCta = document.querySelector(".mobile-cta");
  if (mobileCta && "MutationObserver" in window) {
    var sync = function () { root.classList.toggle("vx-raised", mobileCta.classList.contains("show")); };
    new MutationObserver(sync).observe(mobileCta, { attributes: true, attributeFilter: ["class"] });
    sync();
  }
})();
