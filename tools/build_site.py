#!/usr/bin/env python3
"""Builds every inner page of the Vix Assist site from one shared shell,
so all pages share the same header, footer, fonts, colours and motion.

Run from the repo root:  python3 tools/build_site.py
Policy text is read from tools/content/*.html (the body of each policy).
Edit page content below, then re-run.
"""
import os, re, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "tools", "content")
SITE = "https://vixassist.com"
V = "9"  # bump to bust caches for assist.css / site.js
LINKEDIN = "https://www.linkedin.com/in/promise-felix-a491a7233/"
DESIGN = "https://design.vixassist.com"  # websites studio
WA = "447723149573"

def head(title, desc, path, extra_css=""):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#F6F5F1">
<meta name="color-scheme" content="light">
<link rel="canonical" href="{SITE}/{'' if path == 'index.html' else (path[:-5] if path.endswith('.html') else path)}">
<meta property="og:type" content="website">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{SITE}/brand/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="brand/favicon.svg" type="image/svg+xml">
<link rel="icon" href="brand/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="brand/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css">
<link rel="stylesheet" href="assist.css?v={V}">
<link rel="stylesheet" href="chat.css?v={V}">{extra_css}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
'''

def nav(cur=""):
    def c(name): return ' aria-current="page"' if cur == name else ""
    return f'''<header class="nav" id="nav">
  <a class="logo" href="/" aria-label="Vix Assist home"><img id="logo-anim" src="brand/vix-icon-animated.svg" alt="" width="30" height="30"><span>Vix <b>Assist</b></span></a>
  <a class="nav-acct" href="book.html?account=1"><i class="ph ph-user-plus" aria-hidden="true"></i>Create an account</a>
  <nav class="nav-links" aria-label="Main">
    <a href="/#leak">Revenue check</a>
    <a href="/#work">See the work</a>
    <a href="/#retention">Client retention</a>
    <a href="pricing.html"{c("pricing")}>Pricing</a>
    <a href="{DESIGN}/" target="_blank" rel="noopener">Websites <i class="ph ph-arrow-up-right" aria-hidden="true"></i></a>
  </nav>
  <a class="btn btn-p btn-sm nav-cta" href="book.html">Book a strategy call</a>
  <button class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mpanel"><span></span><span></span><span></span></button>
</header>
<div class="mpanel" id="mpanel" aria-hidden="true">
  <a href="/">Home</a>
  <a href="/#leak">Revenue check</a>
  <a href="/#work">See the work</a>
  <a href="/#retention">Client retention</a>
  <a href="pricing.html">Pricing</a>
  <a href="about.html">About</a>
  <a class="sub" href="{DESIGN}/" target="_blank" rel="noopener">Websites</a>
  <a class="sub" href="book.html?account=1">Create an account</a>
  <a class="sub" href="portal/">Client login</a>
  <a class="btn btn-p" href="book.html">Book a strategy call</a>
</div>
'''

def footer(cta_h="Stop losing clients <em>to faster agents.</em>", cta2=("Get a free revenue audit", "/#audit")):
    return f'''<footer>
  <div class="wrap">
    <div class="fcta"><h2>{cta_h}</h2><div class="talk-row"><a class="btn btn-p" href="book.html">Book a strategy call <i class="ph ph-arrow-right" aria-hidden="true"></i></a><a class="btn btn-g" href="{cta2[1]}">{cta2[0]}</a></div></div>
    <div class="fgrid">
      <div><a class="logo" href="/"><img src="brand/vix-icon.svg" alt="" width="30" height="30"><span>Vix <b>Assist</b></span></a><p style="margin-top:14px;max-width:320px">GoHighLevel growth systems for real estate brokers, agents and investors. More closings from the leads you already have, and clients who stay. Run by Promise Felix.</p></div>
      <div><h4>Real estate growth</h4><a href="/#leak">Revenue leak calculator</a><a href="/#check">CRM health check</a><a href="/#work">See the work</a><a href="/#retention">Client retention</a><a href="pricing.html">Pricing</a><a href="about.html">About</a></div>
      <div><h4>Websites</h4><a href="{DESIGN}/real-estate/" target="_blank" rel="noopener">Real estate websites</a><a href="{DESIGN}/ecommerce/" target="_blank" rel="noopener">E-commerce websites</a><a href="{DESIGN}/home-services/" target="_blank" rel="noopener">Home service websites</a></div>
      <div><h4>Support</h4><a href="book.html?account=1"><b style="color:#fff">Create an account</b></a><a href="portal/">Client login</a><a href="mailto:support@vixassist.com">Contact support</a><a href="book.html">Book a call</a><a href="{LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a><a href="https://wa.me/{WA}" target="_blank" rel="noopener">WhatsApp +44 7723 149573</a></div>
    </div>
    <div class="fbot"><span>© 2026 Vix Assist. GoHighLevel is a trademark of HighLevel Inc. Vix Assist is an independent service and is not affiliated with HighLevel.</span><span><a href="about.html">About</a> · <a href="privacy.html">Privacy</a> · <a href="payment.html">Payments</a> · <a href="delivery.html">Delivery</a> · <a href="refund.html">Refunds</a></span></div>
  </div>
</footer>
'''

def scripts(extra=""):
    return f'''<script src="site.js?v={V}"></script>{extra}
<script src="chatbot.js?v=8" defer></script>
<script src="/book-widget.js?v=3" defer></script>
</body>
</html>
'''

def page(path, title, desc, cur, main, extra_css="", extra_js="", foot=None):
    out = head(title, desc, path, extra_css) + nav(cur) + '\n<main id="main">\n' + main.strip() + "\n</main>\n\n" + (foot or footer()) + "\n" + scripts(extra_js)
    with open(os.path.join(ROOT, path), "w", encoding="utf-8") as f:
        f.write(out)
    print("built", path)

def hero(eyebrow, h1, lead, ctas="", meta=""):
    return f'''<section class="page-hero">
  <div class="wrap">
    <span class="eyebrow">{eyebrow}</span>
    <h1 class="page-h1">{h1}</h1>
    <p class="lead">{lead}</p>
    {f'<div class="cta">{ctas}</div>' if ctas else ""}
    {f'<p class="meta">{meta}</p>' if meta else ""}
  </div>
</section>'''

def sec(inner, sid="", style=""):
    a = f' id="{sid}"' if sid else ""
    st = f' style="{style}"' if style else ""
    return f'<section{a}{st}>\n  <div class="wrap">\n{inner}\n  </div>\n</section>'

def head2(eyebrow, h2, lead="", center=False):
    return f'<div class="head{" c" if center else ""}"><span class="eyebrow">{eyebrow}</span><h2 class="h2">{h2}</h2>{f"<p class=lead>{lead}</p>" if lead else ""}</div>'

def boxes(items, cols=3):
    cells = "".join(f'<article class="ec rv"><span class="ic"><i class="ph {i}" aria-hidden="true"></i></span><h3>{t}</h3><p>{p}</p></article>' for i, t, p in items)
    return f'<div class="eco">{cells}</div>'

def steps(items):
    return '<div class="steps">' + "".join(f'<div class="st rv"><span class="n">{n:02d}</span><h3>{t}</h3><p>{p}</p></div>' for n, (t, p) in enumerate(items, 1)) + "</div>"

def faq(items):
    return '<div class="faq">' + "".join(f'<details class="rv"><summary>{q}<i class="ph ph-plus" aria-hidden="true"></i></summary><p>{a}</p></details>' for q, a in items) + "</div>"

def quote_plans(plans, link="#enquire"):
    cards = []
    for name, sub, items, hot in plans:
        lis = "".join(f'<li><i class="ph-fill ph-check-circle"></i>{x}</li>' for x in items)
        cards.append(f'<div class="plan{" hot" if hot else ""} rv"><span class="tg">{name}</span><h3>{sub}</h3><div class="price" style="font-size:40px;line-height:44px">Custom quote</div><ul>{lis}</ul><a class="btn {"btn-p" if hot else "btn-g"}" href="{link}" data-pick="{html.escape(name)}">Ask for a quote</a></div>')
    return '<div class="plans">' + "".join(cards) + "</div>"

def brief_form(source, subject, options, heading, sub):
    opts = "".join(f"<option>{o}</option>" for o in options)
    return f'''<div class="audit rv" id="enquire">
  <div>
    <span class="eyebrow">Get a quote</span>
    <h2 class="h2">{heading}</h2>
    <p class="lead" style="margin-top:16px">{sub}</p>
    <div class="talk"><p>Rather talk it through live?</p><div class="talk-row"><a class="btn btn-g btn-sm" href="book.html"><i class="ph ph-video-camera" aria-hidden="true"></i>Book a call on Zoom or Google Meet</a><a class="btn btn-g btn-sm" href="https://wa.me/{WA}" target="_blank" rel="noopener"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i>WhatsApp</a></div></div>
  </div>
  <div>
    <form class="f" data-brief="{html.escape(source)}" data-subject="{html.escape(subject)}" novalidate>
      <div class="two"><label>Your name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label></div>
      <div class="two"><label>Business name<input name="business" autocomplete="organization"></label><label>WhatsApp (optional)<input name="whatsapp" type="tel" autocomplete="tel"></label></div>
      <label>What do you need?<select name="service">{opts}</select></label>
      <label>Tell me a little about it<textarea name="message" rows="4" required></textarea></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-p" type="submit">Send my request <i class="ph ph-arrow-right" aria-hidden="true"></i></button>
      <p class="err" role="alert"></p>
      <p class="note">I reply within one working day with a fixed quote. Your details are only used to answer you.</p>
    </form>
    <div class="done" role="status"><i class="ph-fill ph-check-circle" aria-hidden="true"></i><b>Request received.</b><p class="muted">I'll reply within one working day.</p></div>
  </div>
</div>'''

def cta_band(h, sub="", btns=None):
    btns = btns or '<a class="btn btn-p" href="book.html">Book a strategy call <i class="ph ph-arrow-right" aria-hidden="true"></i></a>'
    return f'<div class="cta-band rv"><div><h2>{h}</h2>{f"<p style=margin-top:12px>{sub}</p>" if sub else ""}</div><div class="talk-row">{btns}</div></div>'

BOOK = '<a class="btn btn-p" href="book.html">Book a strategy call <i class="ph ph-arrow-right" aria-hidden="true"></i></a>'

# ---------------------------------------------------------------- VA services
page("va-services.html", "Virtual Assistant Services · Vix Assist",
 "One assistant for your GoHighLevel account and the work around it: inbox, calendar, support, data, research, admin, content and more, on the same monthly hours.",
 "va", "\n".join([
  hero("Virtual assistance", "One assistant for the system <em>and the work around it.</em>",
       "Your monthly hours are not limited to GoHighLevel. Hand over the admin, support and marketing tasks that eat your week, and keep one person accountable for all of it.",
       BOOK + '<a class="btn btn-g" href="pricing.html">See monthly plans</a>'),
  sec(boxes([
    ("ph-envelope-open", "Inbox management", "Sorting, labelling, drafting replies and chasing follow ups so nothing important waits."),
    ("ph-calendar", "Calendar and scheduling", "Booking meetings across time zones, sending reminders and handling reschedules."),
    ("ph-headset", "Customer support", "Answering live chat, DMs and enquiries in your tone, with your answers."),
    ("ph-table", "Data entry and CRM updates", "Spreadsheets, contact records and order details, kept clean and consistent."),
    ("ph-magnifying-glass", "Research and lead lists", "Prospects, suppliers or competitors, turned into a tidy list you can act on."),
    ("ph-files", "Admin and documents", "Proposals, invoices, reports and templates, formatted and ready to send."),
    ("ph-receipt", "Invoice follow ups", "Polite payment reminders and a clear record of who has paid."),
    ("ph-film-strip", "Content and video editing", "Short videos, captions and carousels for your social channels."),
    ("ph-browser", "Website updates", "Page edits, new sections and fixes on your existing website."),
  ]), style="padding-top:0;border-top:0"),
  sec(head2("How it works", "Same plan, same assistant, <em>no extra contracts.</em>") + steps([
    ("Tell me the tasks", "Share what takes your time each week. I suggest what to hand over first."),
    ("Pick your hours", "Choose 10, 20 or 35 hours a month. GoHighLevel and general tasks come from the same hours."),
    ("Track everything", "Every task and hour shows in your client dashboard, with a short report each Friday."),
  ])),
  sec(cta_band("Ready to hand something over?", "Book a free call and bring your task list.")),
 ]))

# ---------------------------------------------------------------- TikTok
page("tiktok.html", "TikTok Marketing · Vix Assist",
 "TikTok content, posting and account management that brings customers, not just views. Planned for your niche, with every lead sent into GoHighLevel.",
 "tiktok", "\n".join([
  hero("TikTok marketing", "TikTok content that brings <em>customers, not just views.</em>",
       "Four planned videos a week, posted and managed for you, with every enquiry routed into your GoHighLevel pipeline so views turn into bookings.",
       '<a class="btn btn-p" href="#enquire">Ask for a quote <i class="ph ph-arrow-right" aria-hidden="true"></i></a><a class="btn btn-g" href="book.html">Book a call</a>'),
  sec(boxes([
    ("ph-lightbulb", "Niche and trend research", "What your buyers watch, which hooks work in your market, and a calendar built from it."),
    ("ph-video-camera", "Scripts and editing", "Hooks, captions, B roll and sounds. You film, or I plan the shoot for you."),
    ("ph-upload-simple", "Four uploads a week", "Posted at the right times, with covers and captions that fit your brand."),
    ("ph-chats-circle", "Comments and DMs", "Daily replies so interested viewers become conversations."),
    ("ph-funnel", "Leads into GoHighLevel", "Enquiries land in your pipeline with an instant reply and a booking link."),
    ("ph-chart-line-up", "Monthly report", "Views, followers, enquiries and bookings, and what changes next month."),
  ]), style="padding-top:0;border-top:0"),
  sec(head2("Packages", "Pick the level of help <em>you need.</em>", "Every package is quoted to your niche and goals before anything starts.", True) + quote_plans([
    ("Editing only", "You film, I edit and polish", ["Up to 4 edited videos a week", "Captions, hooks and B roll", "Trending sounds and covers", "Fast turnaround"], False),
    ("Growth management", "Done for you TikTok growth", ["4 videos planned, edited and posted weekly", "Niche research and content calendar", "Daily comment and DM replies", "Profile and link in bio set up", "Monthly report"], True),
    ("Growth and ads", "Organic growth plus paid reach", ["Everything in Growth management", "Spark Ads campaigns", "Reels and Shorts repurposing", "Leads routed into GoHighLevel"], False),
  ]) + '<p class="guarantee rv"><i class="ph-fill ph-shield-check" aria-hidden="true"></i>No bots, no bought followers, no fake engagement. Real content for real buyers.</p>'),
  sec(head2("Questions", "Good to <em>know.</em>", center=True) + faq([
    ("Do I have to appear on camera?", "No. Many accounts grow with product shots, screen recordings or voiceovers. I plan the format around what you're comfortable with."),
    ("How soon will I see results?", "Most accounts need four to eight weeks of consistent posting before reach settles. The monthly report shows exactly what is working."),
    ("Can you post on Instagram and YouTube too?", "Yes. The same videos can be repurposed to Reels and Shorts on the Growth and ads package."),
    ("How do TikTok leads reach me?", "Enquiries go into your GoHighLevel pipeline with an instant reply, so no message sits unanswered."),
  ])),
  sec(brief_form("TikTok page", "TikTok marketing enquiry", ["Growth management", "Editing only", "Growth and ads", "Not sure yet"], "Tell me about <em>your account.</em>", "Share your niche and goals. I'll come back with a plan and a fixed monthly quote.")),
 ]), foot=footer("Turn your views into <em>booked customers.</em>", ("Ask for a quote", "#enquire")))

# ---------------------------------------------------------------- Web design
page("web-design.html", "Website Design · Vix Assist",
 "Fast, modern websites that make your business look established and turn visitors into enquiries. New sites, redesigns, fixes and GoHighLevel funnels.",
 "web", "\n".join([
  hero("Website design", "Websites that make your business <em>look established.</em>",
       "New websites, redesigns and fixes, built fast and mobile first, and connected to your GoHighLevel account so every enquiry gets an answer.",
       '<a class="btn btn-p" href="#enquire">Ask for a quote <i class="ph ph-arrow-right" aria-hidden="true"></i></a><a class="btn btn-g" href="free-design.html">Free design offer</a>'),
  sec(boxes([
    ("ph-paint-brush", "New website or redesign", "A custom design around your brand, with copy written to turn visitors into enquiries."),
    ("ph-wrench", "Fixes and speed", "Broken pages, forms and layouts fixed on custom code, WordPress, Shopify, Wix or Webflow."),
    ("ph-lightning", "GoHighLevel sites and funnels", "Landing pages and funnels built inside GoHighLevel and wired to your pipeline."),
  ]), style="padding-top:0;border-top:0"),
  sec(head2("Concept work", "The standard every site <em>is built to.</em>", "Concept designs created to show the quality and approach. The businesses shown are fictional.") +
      '<div class="work-grid">' + "".join(f'<figure class="work rv" style="margin:0"><div class="shot"><img src="portfolio/{img}" alt="{alt}" loading="lazy"></div><small>Concept</small><h3>{t}</h3><p>{p}</p></figure>' for img, alt, t, p in [
        ("concept-car.jpg", "Car dealer website concept", "Kestrel Motors", "Showroom with live stock, finance calculator and test drive booking."),
        ("concept-restaurant.jpg", "Restaurant website concept", "Ember and Salt", "Menu, reservations and private dining enquiries in one flow."),
      ]) + "</div>"),
  sec(head2("Packages", "Three packages, <em>each quoted to you.</em>", "Fixed price agreed in writing before work starts.", True) + quote_plans([
    ("Starter website", "For new brands getting online", ["Up to 5 pages", "Mobile first custom design", "Contact form and WhatsApp button", "Google and basic SEO set up", "1 round of revisions"], False),
    ("Business growth", "For brands ready to convert", ["Up to 12 pages", "Conversion copywriting", "Online booking and chatbot", "Forms into GoHighLevel", "Speed, SEO and analytics", "3 rounds of revisions"], True),
    ("Brand and ecommerce", "For established brands and stores", ["Unlimited pages", "Brand refresh and logo", "Online store and payments", "Multi currency and language", "Priority support after launch"], False),
  ])),
  sec(head2("Process", "From idea to live in <em>four steps.</em>") + '<div class="steps" style="grid-template-columns:repeat(4,1fr)">' + "".join(f'<div class="st rv"><span class="n">{n:02d}</span><h3>{t}</h3><p>{p}</p></div>' for n, (t, p) in enumerate([
    ("Discovery and quote", "A short call or form, then a fixed quote."), ("Design", "You review the homepage design before anything is built."),
    ("Build and test", "Built, tested on every screen size, and connected to your tools."), ("Launch and support", "Domain connected, live, and supported after launch.")], 1)) + "</div>"),
  sec(brief_form("Web design page", "Website enquiry", ["Starter website", "Business growth", "Brand and ecommerce", "Website redesign", "Website fix", "GoHighLevel funnel or site", "Not sure yet"], "Tell me about <em>your website.</em>", "Share what you need and a link to your current site if you have one. I'll reply with a fixed quote.")),
 ]), foot=footer("A website your brand is <em>proud of.</em>", ("Ask for a quote", "#enquire")))

# ---------------------------------------------------------------- Pricing
PKG = []
for key, name, sub, usd, items, hot in [
    ("quickstart", "Quick start", "For businesses new to GoHighLevel", 499, ["Sub account set up and branding", "1 pipeline and custom fields", "1 funnel or landing page", "5 core automations", "Calendar and phone set up", "Recorded training"], False),
    ("growth", "Growth system", "A complete lead to client system", 689, ["Everything in Quick start", "Customer journey mapping", "Up to 3 funnels or a website", "20+ automations and nurture", "Conversation AI", "Reputation and reporting", "30 days of support"], True),
    ("agency", "Agency and SaaS", "For agencies scaling with white label", 876, ["Agency account architecture", "SaaS mode and Stripe rebilling", "Custom niche snapshot", "Client onboarding automation", "Custom domain and app branding", "60 days of priority support"], False)]:
    lis = "".join(f'<li><i class="ph-fill ph-check-circle"></i>{x}</li>' for x in items)
    PKG.append(f'''<div class="plan{" hot" if hot else ""} rv"><span class="tg">{name}</span><h3>{sub}</h3>
<div class="price-block" data-usd="{usd}"><span class="price-old" data-old></span><div class="price"><span class="price-now" data-now>${usd}</span></div><span class="price-save" data-save></span></div>
<ul>{lis}</ul><a class="btn {"btn-p" if hot else "btn-g"}" href="pay/?p={key}">Pay and start</a><a class="tlink" style="align-self:center;font-size:14px" href="book.html">or book a free call first</a></div>''')

MONTHLY = '''<div class="plans">
<div class="plan rv"><span class="tg">Lead Response</span><h3>For agents who want every lead answered</h3><div class="price">$300<small> / month</small></div><p class="hrs">Built, managed and improved every month</p><ul><li><i class="ph-fill ph-check-circle"></i>Instant replies on every lead source</li><li><i class="ph-fill ph-check-circle"></i>Showing booking and reminders</li><li><i class="ph-fill ph-check-circle"></i>A clean pipeline you can trust</li><li><i class="ph-fill ph-check-circle"></i>Monthly results report</li></ul><a class="btn btn-g" href="/#audit" data-plan="Lead Response">Start with a free audit</a></div>
<div class="plan hot rv"><span class="tg">Most chosen · Growth</span><h3>For teams that want more closings and repeat clients</h3><div class="price">$550<small> / month</small></div><p class="hrs">Everything in Lead Response, plus</p><ul><li><i class="ph-fill ph-check-circle"></i>Long term buyer and seller nurture</li><li><i class="ph-fill ph-check-circle"></i>Old lead and past client revival</li><li><i class="ph-fill ph-check-circle"></i>Review and referral engine</li><li><i class="ph-fill ph-check-circle"></i>AI lead qualifying and agent routing</li><li><i class="ph-fill ph-check-circle"></i>Weekly results report</li></ul><a class="btn btn-p" href="/#audit" data-plan="Growth">Start with a free audit</a></div>
<div class="plan rv"><span class="tg">Brokerage</span><h3>For brokerages, multi office teams and investors</h3><div class="price">$950<small> / month</small></div><p class="hrs">Everything in Growth, plus</p><ul><li><i class="ph-fill ph-check-circle"></i>Systems rolled out across every agent</li><li><i class="ph-fill ph-check-circle"></i>New agent onboarding and snapshots</li><li><i class="ph-fill ph-check-circle"></i>Investor seller pipelines and texting</li><li><i class="ph-fill ph-check-circle"></i>Lead source and agent reporting</li><li><i class="ph-fill ph-check-circle"></i>Priority same day support</li></ul><a class="btn btn-g" href="/#audit" data-plan="Brokerage">Start with a free audit</a></div>
</div>'''

page("pricing.html", "Pricing · Vix Assist",
 "Clear prices for real estate GoHighLevel growth systems: monthly plans, fixed price builds, and quotes for websites.",
 "pricing", "\n".join([
  hero("Pricing", "Clear prices. <em>No surprises.</em>",
       "Monthly growth systems for agents, teams and brokerages, fixed price builds, and quotes for websites. Every price is agreed before any work starts.",
       '<a class="btn btn-p" href="#monthly">Monthly plans</a><a class="btn btn-g" href="#builds">One off builds</a>'),
  sec(head2("Monthly", "Systems that win and keep clients, <em>run for you every month.</em>", "Every plan starts with a free revenue audit. Prices in USD. Cancel any month.") + MONTHLY +
      '<p class="guarantee rv"><i class="ph-fill ph-shield-check" aria-hidden="true"></i>No long contract. Everything built stays in your account.</p>', "monthly", "padding-top:0;border-top:0"),
  sec(head2("One off builds", "A full GoHighLevel build <em>at a fixed price.</em>", "Pay online and your project and client dashboard start straight away.") +
      '''<div class="pctl rv"><div class="discount-banner" data-discount-banner hidden><span class="discount-pill" data-discount-percent></span><span data-discount-label></span></div><label class="currency-picker">Show prices in<select id="currency-select" aria-describedby="currency-note"></select></label></div>''' +
      '<div class="plans">' + "".join(PKG) + '</div><p class="guarantee rv" id="currency-note" data-currency-note>Prices are set in US dollars (USD).</p><p class="guarantee rv"><i class="ph-fill ph-lock-key" aria-hidden="true"></i>Pay securely by card, bank transfer or USSD through Paystack, or by bank transfer in USD, GBP, EUR or NGN.</p>', "builds"),
  sec(head2("Websites", "A website that matches <em>the system behind it.</em>") + '<div class="extras">' +
      f'<a class="ex rv" href="{DESIGN}/real-estate/" target="_blank" rel="noopener"><span><b>Real estate websites</b><span>Listings, valuations and lead capture wired to GoHighLevel</span></span><span class="p">Quote <i class="ph ph-arrow-up-right" style="font-size:18px"></i></span></a>' +
      f'<a class="ex rv" href="{DESIGN}/" target="_blank" rel="noopener"><span><b>E-commerce and home service websites</b><span>30 templates to start from</span></span><span class="p">Quote <i class="ph ph-arrow-up-right" style="font-size:18px"></i></span></a></div>'),
  sec(head2("Questions", "Good to <em>know.</em>", center=True) + faq([
    ("Is the GoHighLevel subscription included?", "No. You pay HighLevel directly for your own account, so you always own it. My prices cover building, running and improving your system."),
    ("Which currency will I pay in?", "Prices are set in US dollars. Other currencies are shown as an estimate, and your invoice shows the exact amount before you pay."),
    ("How can I pay?", "By card, bank transfer or USSD through Paystack, or by bank transfer to accounts in the US, UK, Europe and Nigeria."),
    ("What does fixed price mean?", "The scope is agreed in writing before work starts, and that is the price. Anything extra is quoted first and only added with your approval."),
    ("Monthly plan or one off build?", "If your account needs building from scratch, start with a one off build. If you want the system run and improved every month, choose a monthly plan. The free revenue audit tells you which."),
  ])),
 ]), extra_js='\n<script src="pricing.js?v=2"></script>')

# ---------------------------------------------------------------- About
page("about.html", "About · Vix Assist",
 "Vix Assist is run by Promise Felix, who builds and runs GoHighLevel growth systems that help real estate brokers, teams and agents win and keep more clients.",
 "about", "\n".join([
  hero("About", "I'm Promise. I help real estate teams <em>keep the clients they already paid for.</em>",
       "Vix Assist builds and runs the GoHighLevel systems that answer every lead in seconds, follow up until they are ready, and keep past clients coming back with referrals.",
       BOOK + f'<a class="btn btn-g" href="{LINKEDIN}" target="_blank" rel="noopener"><i class="ph-fill ph-linkedin-logo" aria-hidden="true"></i>LinkedIn</a>'),
  sec('<div class="grid2"><div class="prose rv"><h2>Why this exists</h2><p>Most agents do not have a lead problem. They have a follow up problem. A buyer enquires at night and the first agent to reply wins them. A seller who is six months away gets forgotten. A happy client from two years ago uses someone else, simply because nobody stayed in touch.</p><p>GoHighLevel can fix all of that, but only when it is built properly and looked after every week. That is the job I do, so brokers and agents can focus on showings, negotiations and closings.</p></div>'
      '<div class="tlist rv"><div class="ti"><i class="ph-fill ph-seal-check" aria-hidden="true"></i><span><b>Fixed price first</b>You know the full cost before any work starts.</span></div><div class="ti"><i class="ph-fill ph-key" aria-hidden="true"></i><span><b>You own everything</b>Your account, data and campaigns stay yours.</span></div><div class="ti"><i class="ph-fill ph-video" aria-hidden="true"></i><span><b>Documented and recorded</b>Every system comes with walkthrough videos and written notes.</span></div><div class="ti"><i class="ph-fill ph-chat-circle-text" aria-hidden="true"></i><span><b>Direct access</b>You talk to the person building your system, on WhatsApp, email or video call.</span></div></div></div>', style="padding-top:0;border-top:0"),
  sec('<div class="prose rv"><h2>Honest by design</h2><p>Vix Assist is a young business, so you will not find fake reviews or borrowed client logos here. Instead, the work is shown openly on this website, every price is fixed up front, and you can follow every task in your own client dashboard.</p><p>I work with brokers, teams, agents and investors in the US, Canada, the UK and Australia. Email <a href="mailto:support@vixassist.com">support@vixassist.com</a>, message me on <a href="https://wa.me/447723149573" target="_blank" rel="noopener">WhatsApp</a>, or <a href="book.html">book a call</a>.</p></div>'),
 ]))

# ---------------------------------------------------------------- Policies
POL = [
 ("privacy", "Privacy policy", "What personal information Vix Assist collects, why, and the choices you have."),
 ("payment", "Payment policy", "How quotes, invoices, payment plans and payment methods work."),
 ("delivery", "Delivery policy", "How and when work is delivered, and what happens at handover."),
 ("refund", "Refund policy", "When refunds apply, how to ask for one, and how long it takes."),
]
tabs = lambda cur: '<div class="talk-row rv" style="margin-bottom:48px">' + "".join(f'<a class="btn {"btn-p" if k == cur else "btn-g"} btn-sm" href="{k}.html">{t.replace(" policy", "")}</a>' for k, t, _ in POL) + "</div>"
for key, title, desc in POL:
    body = open(os.path.join(CONTENT, key + ".html"), encoding="utf-8").read()
    page(f"{key}.html", f"{title} · Vix Assist", desc, key, "\n".join([
      hero("Policies", title, desc, meta="Last updated 4 November 2026"),
      sec(tabs(key) + f'<div class="prose rv">{body}</div>', style="padding-top:0;border-top:0"),
    ]), foot=footer("Questions before <em>you start?</em>", ("Email me", "mailto:support@vixassist.com")))

# ---------------------------------------------------------------- Free design offer
CHIPS = "".join(f'<button type="button" class="chip" aria-pressed="{"true" if n == "Home" else "false"}">{n}</button>' for n in ["Home", "About", "Services", "Products / Listings", "Gallery", "Booking", "Contact", "Blog"])
page("free-design.html", "Free Website Design Offer · Vix Assist",
 "For a limited time, get a professional homepage and key page design for your business at no cost. Ends 4 December 2026.",
 "free", "\n".join([
  f'''<section class="page-hero">
  <div class="wrap">
    <p class="o-tag"><span class="o-live"><i></i>Limited time offer</span><span id="o-ends">Ends 4 December 2026</span></p>
    <h1 class="page-h1 o-h1">Your new website, <em>designed free.</em></h1>
    <p class="lead o-sub">Pick a style you love, tell me about your business, and get a professional design for your homepage and key pages in 5 to 7 business days. No card, no commitment.</p>
    <div class="count" id="count" role="timer" aria-live="off" aria-label="Time left in the offer"><div><b data-u="d">30</b><span>Days</span></div><div><b data-u="h">00</b><span>Hours</span></div><div><b data-u="m">00</b><span>Minutes</span></div><div><b data-u="s">00</b><span>Seconds</span></div></div>
    <div class="cta" data-live><a class="btn btn-p" href="#claim">Claim my free design <i class="ph ph-arrow-right" aria-hidden="true"></i></a><a class="btn btn-g" href="#styles">See the styles</a></div>
  </div>
</section>
<section id="ended" hidden><div class="wrap">{cta_band("This offer has ended.", "You can still get a website designed with a fixed quote.", '<a class="btn btn-p" href="web-design.html">Website design</a>')}</div></section>''',
  '<div data-live>',
  sec(boxes([
    ("ph-devices", "Homepage and up to 3 pages", "Designed for desktop and mobile, around your business and customers."),
    ("ph-palette", "Your colours, fonts and logo", "Matched to your brand, or a fresh look if you don't have one yet."),
    ("ph-pencil-simple-line", "Words that sell", "Headlines and page text written to turn visitors into enquiries."),
    ("ph-arrows-clockwise", "One round of changes", "Tell me what to adjust and I refine it until it feels right."),
    ("ph-link", "A live preview link", "Click through your design on your own phone and share it."),
    ("ph-hand-coins", "Launch only if you love it", "Building and launching is a separate fixed quote. If you don't go ahead, you owe nothing."),
  ]), style="padding-top:0;border-top:0"),
  sec(head2("Claim your free design", "Pick a style <em>you love.</em>", "Tap a style to choose it, or skip this and describe what you want. Any style can be adapted to your brand.") +
      '<span id="styles"></span><div class="picker rv" id="picker" role="radiogroup" aria-label="Website styles"></div>' +
      f'''<form class="f claim rv" id="claim-form" novalidate>
  <div class="claim-head"><div><h3>Tell me about your brand</h3><p class="muted">I'll email your free design. Your details stay private.</p></div><div class="chosen" id="chosen"><span>Style</span><b>Not chosen yet</b></div></div>
  <div class="two"><label>Your name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label></div>
  <div class="two"><label>Business or brand name<input name="business" autocomplete="organization" required></label><label>WhatsApp number<input name="whatsapp" type="tel" autocomplete="tel" placeholder="+234 or +44"></label></div>
  <div class="two"><label>Industry<select name="industry" required><option value="">Choose one…</option><option>Car dealer or car rental</option><option>Real estate</option><option>Restaurant, café or food</option><option>Hotel or shortlet</option><option>Beauty, salon or spa</option><option>Health, clinic or dental</option><option>Fashion or retail</option><option>Events or weddings</option><option>Education or church</option><option>Professional services</option><option>Tech or startup</option><option>Other</option></select></label><label>Current website (if any)<input name="current" type="url" placeholder="https://"></label></div>
  <fieldset class="chips-f"><legend>Pages you'd like designed (up to 4)</legend><div class="chips-row" data-max="4" data-name="pages">{CHIPS}</div></fieldset>
  <label>Brand colours (optional)<input name="colours" placeholder="e.g. Black and gold, or use my logo colours"></label>
  <label>What should the website do?<textarea name="notes" rows="4" placeholder="e.g. We sell used cars in Lekki. Buyers should see our cars with prices and contact us on WhatsApp."></textarea></label>
  <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
  <label class="agree"><input type="checkbox" name="agree" required> I understand the design is free, and building and launching the website is a separate, optional paid service.</label>
  <button class="btn btn-p" type="submit">Claim my free design <i class="ph ph-arrow-right" aria-hidden="true"></i></button>
  <p class="form-status" role="status" aria-live="polite"></p>
</form>
<div class="claimed box" id="claimed" hidden><div class="burst" aria-hidden="true"></div><i class="ph-fill ph-check-circle" aria-hidden="true" style="font-size:40px;color:var(--brand)"></i><h3 style="margin-top:12px">You're in.</h3><p id="claimed-text">Your request is in. I'll email you within one business day to confirm, and your free design will be ready in 5 to 7 business days.</p><a class="btn btn-g" href="/" style="margin-top:16px">Back to the website</a></div>''', "claim"),
  sec(head2("Questions", "Offer <em>questions.</em>", center=True) + faq([
    ("Is the design really free?", "Yes. Your homepage and up to 3 key pages, for desktop and mobile, at no cost. No card and no commitment."),
    ("What do I pay for?", "Only if you decide to go live. Building the working website, connecting your domain and hosting is a separate fixed quote you approve first."),
    ("When does the offer end?", 'On <span data-enddate>4 December 2026</span>. Requests sent before then are all honoured.'),
    ("Who owns the design?", 'You can keep and share your preview. Full rights transfer when you launch the website with me. See the <a href="payment.html">payment</a> and <a href="refund.html">refund</a> policies.'),
  ])),
  '</div>',
 ]), extra_js='\n<script src="offer.js?v=2" defer></script>', foot=footer("Don't miss your <em>free design.</em>", ("Claim it", "#claim")))

# ---------------------------------------------------------------- Real estate
RE_CONSOLE = '''<div class="c3d"><div class="console" id="console" aria-label="Example real estate GoHighLevel pipeline being managed" role="img">
  <div class="c-top"><span class="dots"><i></i><i></i><i></i></span><span class="url">app.yourcrm.com / buyer and seller pipeline</span><span class="live">Live demo</span></div>
  <div class="c-body">
    <div class="c-side" aria-hidden="true"><span><i class="ph ph-squares-four"></i>Dashboard</span><span><i class="ph ph-chats-circle"></i>Conversations</span><span><i class="ph ph-calendar-check"></i>Showings</span><span><i class="ph ph-address-book"></i>Contacts</span><span class="on"><i class="ph ph-funnel-simple"></i>Pipeline</span><span><i class="ph ph-tree-structure"></i>Automation</span><span><i class="ph ph-house-line"></i>Listings</span><span><i class="ph ph-star"></i>Reviews</span><span><i class="ph ph-chart-line-up"></i>Lead sources</span></div>
    <div class="c-main" aria-hidden="true">
      <div class="c-kpis"><div class="kp"><small>Speed to lead</small><b id="k-reply">0:09</b></div><div class="kp"><small>Showings booked</small><b><span id="k-booked">17</span><em>+3</em></b></div><div class="kp"><small>Leads followed up</small><b>100%</b></div></div>
      <div class="board" id="board"><div class="col" data-col="0"><h4>New lead <span>3</span></h4></div><div class="col" data-col="1"><h4>Contacted <span>2</span></h4></div><div class="col" data-col="2"><h4>Showing <span>2</span></h4></div><div class="col" data-col="3"><h4>Under contract <span>1</span></h4></div></div>
      <div class="feed" id="feed"></div>
    </div>
  </div>
  <div class="toast" id="toast" aria-hidden="true"><i class="ph-fill ph-check-circle"></i><span><b id="toast-t">Lead revival campaign live</b><small id="toast-s">1,240 old leads re-engaged</small></span></div>
</div></div>'''

RE_DATA = '''
<script>
window.VX_CONSOLE = {
  people: ["Jessica Moreno", "David Chen", "Amanda Brooks", "Kevin Walsh", "Maria Santos", "Tyler Reed", "Rachel Kim", "Brandon Lee", "Olivia Grant", "Marcus Hall", "Emily Turner", "Jordan Price"],
  sources: ["Zillow lead", "Realtor.com", "Open house", "Sign call", "Facebook ad", "Seller valuation"],
  replied: "Texted in 9s · pre approved",
  booked: "Showing Sat 11:00 · confirmed",
  won: "Offer accepted · review asked",
  evs: [["ph-paper-plane-tilt", "Instant text sent to", "in 9s"], ["ph-house-line", "Showing booked for", "now"], ["ph-bell-ringing", "Showing reminder sent to", "1h before"], ["ph-chats-circle", "AI asked budget and timeline from", "2m"], ["ph-star", "Review and referral request to", "after closing"]],
  toasts: [["Lead revival campaign live", "1,240 old leads re-engaged"], ["Open house sign ins synced", "48 contacts tagged and nurtured"], ["A2P 10DLC approved", "US texting is live"], ["Agent round robin on", "Leads shared across 6 agents"], ["Just listed campaign sent", "Past clients and sphere notified"]]
};
</script>
<script src="assist.js?v=7"></script>'''

JOURNEY = [
  ("0:00", "ph-lightning", "A Zillow lead comes in at 9:47pm", "The lead lands in GoHighLevel, tagged by source and assigned to the right agent."),
  ("0:09", "ph-chat-text", "They get a text in nine seconds", "A friendly, personal text goes out before they call the next agent on the list."),
  ("2:00", "ph-robot", "The AI qualifies them", "Budget, area, timeline and pre approval, asked politely and saved to the contact."),
  ("4:00", "ph-calendar-check", "A showing is booked", "Straight into the agent's calendar, with the address and notes attached."),
  ("Day before", "ph-bell-ringing", "Reminders cut no shows", "A text 24 hours and 1 hour before, with a one tap reschedule link."),
  ("Months later", "ph-arrows-clockwise", "Nobody goes cold", "Buyers who are not ready yet get a long nurture, so they come back to you, not a stranger."),
  ("After closing", "ph-star", "Reviews and referrals", "A review request and a referral ask go out at the right moment, every time."),
]

page("real-estate.html", "GoHighLevel for Real Estate Teams, Brokerages and Investors · Vix Assist",
 "A dedicated GoHighLevel virtual assistant for real estate: every buyer and seller lead answered in seconds, showings booked, old leads revived and reviews collected after closing.",
 "re", "\n".join([
  f'''<section class="hero" aria-labelledby="h1">
  <div class="wrap hero-grid">
    <div>
      <span class="presence"><span class="av"><img src="brand/vix-icon-animated.svg" alt=""></span><span><b>Promise</b> · GoHighLevel for real estate</span></span>
      <h1 id="h1">Every buyer and seller lead answered in seconds. <em>Booked for a showing.</em></h1>
      <p class="sub">I build and run the GoHighLevel system behind your team: instant replies to Zillow and portal leads, booked showings, follow up that never stops, and reviews after every closing. You and your agents just show up and sell.</p>
      <div class="cta"><a class="btn btn-p" href="book.html?service=real-estate">Book a free strategy call <i class="ph ph-arrow-right" aria-hidden="true"></i></a><a class="btn btn-g" href="#journey">See a lead's journey</a></div>
      <div class="proofline"><span><i class="ph-fill ph-lock-key" aria-hidden="true"></i>Team access, never your password</span><span><i class="ph-fill ph-file-lock" aria-hidden="true"></i>NDA on request</span><span><i class="ph-fill ph-clock" aria-hidden="true"></i>US, Canada and Australia hours</span></div>
    </div>
    {RE_CONSOLE}
  </div>
</section>''',
  sec(head2("Where deals are lost", "Most deals are not lost to other agents. <em>They are lost to slow follow up.</em>", "The first agent to reply usually wins the client, and most buyers are months away from buying when they first enquire.") + '''<div class="pain">
<div class="pc rv"><p class="was">Portal leads wait hours for a call back.</p><p class="now">Every lead answered in seconds</p><p>Zillow, Realtor.com, Facebook and website leads get a personal text and email instantly, day or night.</p></div>
<div class="pc rv"><p class="was">Buyers who are not ready yet get forgotten.</p><p class="now">Follow up that never stops</p><p>Long nurture for buyers and sellers who are 3, 6 or 12 months out, so they come back to you.</p></div>
<div class="pc rv"><p class="was">Thousands of old leads sit untouched in the CRM.</p><p class="now">Your database turned into deals</p><p>Revival campaigns that start conversations with old leads, past clients and your sphere.</p></div>
</div>''', style="border-top:0"),
  sec(head2("A lead's journey", "From portal lead to showing, <em>without anyone lifting a finger.</em>", "This is the system I build inside your GoHighLevel. You see every step in your account.", True) +
      '<ol class="journey">' + "".join(f'<li class="rv"><span class="jt">{t}</span><span class="ji"><i class="ph {ic}" aria-hidden="true"></i></span><div><h3>{h}</h3><p>{p}</p></div></li>' for t, ic, h, p in JOURNEY) + '</ol>', "journey"),
  sec(head2("What I build and run", "Everything a real estate team needs <em>inside GoHighLevel.</em>") + boxes([
    ("ph-lightning", "Speed to lead", "Instant text, email and missed call text back for every portal, ad and website lead."),
    ("ph-robot", "Lead qualifying AI", "Conversation AI that asks budget, area, timeline and pre approval, then books the showing."),
    ("ph-calendar-check", "Showings and appointments", "Booking links, agent calendars, confirmations and reminders that cut no shows."),
    ("ph-users-three", "Agent routing", "Round robin, territory or lead source routing, with alerts so no lead sits unclaimed."),
    ("ph-arrows-clockwise", "Buyer and seller nurture", "Long term follow up for leads who are not ready yet, written to sound like you."),
    ("ph-database", "Database revival", "Campaigns that re engage old leads, past clients and your sphere of influence."),
    ("ph-sign-in", "Open house sign ins", "Sign in forms that drop visitors into the CRM with follow up already running."),
    ("ph-megaphone", "Just listed and just sold", "Campaigns to past clients and the neighbourhood every time you list or close."),
    ("ph-star", "Reviews and referrals", "Automatic review requests and referral asks after every closing."),
    ("ph-funnel-simple", "Clean pipelines", "Buyer, seller and investor pipelines with stages your agents actually use."),
    ("ph-shield-check", "A2P 10DLC and compliance", "US texting registration, opt out handling and quiet hours on every campaign."),
    ("ph-chart-line-up", "Lead source reporting", "See which source brings showings and closings, so you spend where it works."),
  ])),
  sec('<div class="grid2"><div>' + head2("Investors and wholesalers", "Built for <em>seller leads</em> too.", "If you buy property, your pipeline runs on follow up. I set up and manage the system that keeps motivated sellers talking to you.") + '</div><ul class="checks rv" style="margin-top:0">' + "".join(f'<li><i class="ph-fill ph-check-circle"></i><span>{x}</span></li>' for x in [
      "Seller lead pipelines from first contact to closing", "Texting campaigns with A2P registration and opt out handling", "Instant follow up on PPC, PPL and direct mail responses",
      "Offer follow up sequences that run for months", "Missed call text back and voicemail drops", "Dispositions lists for your buyers"]) + "</ul></div>"),
  sec(head2("Who I work with", "Real estate teams of <em>every size.</em>") + '<div class="va">' + "".join(f'<div class="vi rv"><i class="ph {ic}" aria-hidden="true"></i><span><b>{t}</b><span>{d}</span></span></div>' for ic, t, d in [
      ("ph-user", "Solo agents", "One system that never forgets a lead"), ("ph-users-three", "Teams", "Routing, accountability and reporting"),
      ("ph-buildings", "Brokerages", "Snapshots and support across agents"), ("ph-house-line", "Investors and wholesalers", "Seller pipelines and texting"),
      ("ph-bank", "Mortgage brokers", "Long nurture and rate watch follow up"), ("ph-key", "Property managers", "Tenant enquiries, reminders and reviews"),
      ("ph-bed", "Short let hosts", "Guest messages, reminders and reviews"), ("ph-handshake", "New construction sales", "Site visit bookings and nurture")]) + "</div>"),
  sec('<div class="trust"><div>' + head2("Working with a brokerage", "Your clients, your data, <em>your brand.</em>") + '''<div class="tlist">
<div class="ti rv"><i class="ph-fill ph-lock-key" aria-hidden="true"></i><span><b>Team user access only</b>You add me as a staff user with the permissions you choose, and remove me in one click.</span></div>
<div class="ti rv"><i class="ph-fill ph-file-lock" aria-hidden="true"></i><span><b>NDA before I start</b>For brokerages and teams, I sign your NDA before touching any client data.</span></div>
<div class="ti rv"><i class="ph-fill ph-user-circle-check" aria-hidden="true"></i><span><b>I never contact your clients on my own</b>Every campaign and message is approved by you before it goes live, in your brand and your voice.</span></div>
<div class="ti rv"><i class="ph-fill ph-database" aria-hidden="true"></i><span><b>Everything stays in your account</b>Workflows, contacts and data live in your GoHighLevel. If we stop working together, you keep all of it.</span></div>
<div class="ti rv"><i class="ph-fill ph-chart-bar" aria-hidden="true"></i><span><b>Weekly report and live dashboard</b>Every task and hour in your client dashboard, with a short report every Friday.</span></div>
</div></div>''' + '''<div class="report static rv" aria-label="Example weekly report for a real estate team"><header><span><b>Weekly report</b><small>Example for a 6 agent team</small></span><span class="pill">On track</span></header>
<div class="rrow"><i class="ph ph-lightning" aria-hidden="true"></i><span>Connected Zillow and Realtor.com leads to instant text and email</span><b>2h</b></div>
<div class="rrow"><i class="ph ph-users-three" aria-hidden="true"></i><span>Set up round robin across 6 agents with claim alerts</span><b>1.5h</b></div>
<div class="rrow"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i><span>Launched old lead revival to 1,240 contacts</span><b>2h</b></div>
<div class="rrow"><i class="ph ph-calendar-check" aria-hidden="true"></i><span>Added showing reminders 24h and 1h before</span><b>0.5h</b></div>
<div class="rrow"><i class="ph ph-star" aria-hidden="true"></i><span>Review and referral request after closing</span><b>1h</b></div>
<p class="rnote">Example report. Hours used this month: 7 of 20 · Next week: open house sign in flow and just listed campaign.</p></div></div>'''),
  sec(head2("Pricing", "Plans for agents, teams <em>and brokerages.</em>", "Every plan starts with a free account audit. Prices in USD. Cancel any month.", True) + MONTHLY.replace(">For one location getting set up properly<", ">For solo agents getting set up properly<").replace(">Growth VA for busy businesses<", ">For busy teams with steady lead flow<").replace(">For agencies and multi location teams<", ">For brokerages, investors and multi office teams<").replace('href="/#audit"', 'href="#enquire"') +
      '<p class="guarantee rv"><i class="ph-fill ph-shield-check" aria-hidden="true"></i>One off full builds from $499. See <a class="tlink" href="pricing.html#builds">fixed price builds</a>.</p>'),
  sec(head2("Questions", "Real estate <em>questions.</em>", center=True) + faq([
    ("I use Follow Up Boss, kvCORE or another CRM. Can you still help?", "Yes. I can move your leads and follow up into GoHighLevel, or connect your lead sources so GoHighLevel handles the speed to lead and nurture while your agents keep the tools they know. The free audit maps the best option."),
    ("Can you connect Zillow, Realtor.com and my Facebook ads?", "Yes. Portal and ad leads are routed into GoHighLevel, tagged by source and answered instantly. Exact steps depend on how each portal sends leads, which I check during the audit."),
    ("Is texting my leads in the US compliant?", "I register your A2P 10DLC brand and campaign, add opt out handling and quiet hours to every campaign, and only text people who have enquired or opted in. Your compliance rules always come first."),
    ("Will you talk to my clients?", "Only if you want me to. By default I build and manage the system and every message goes out in your name, approved by you. I never contact your clients on my own."),
    ("Do you make cold calls?", "No. I focus on the systems that make sure no lead you already paid for is wasted: instant replies, follow up, booked showings and revival."),
    ("How fast can this be live?", "Speed to lead and showing reminders are usually live within the first week. Nurture, revival and reporting follow in the first month."),
  ])),
  sec(brief_form("Real estate page", "Real estate GoHighLevel audit request", ["Solo agent", "Real estate team", "Brokerage", "Investor or wholesaler", "Mortgage broker", "Property manager", "Other"], "Get a free real estate <em>account audit.</em>", "Tell me about your team and lead sources. I'll review your GoHighLevel and send a written plan with the first fixes that will bring in more showings.")),
 ]), extra_js=RE_DATA, foot=footer("Never lose another lead <em>to a faster agent.</em>", ("Get a free audit", "#enquire")))

# ---------------------------------------------------------------- Homepage (real estate growth)
WORK = open(os.path.join(ROOT, "tools", "content", "work_section.html"), encoding="utf-8").read()
SEL = lambda name, opts: f'<select name="{name}">' + "".join(f'<option value="{v}"{" selected" if sel else ""}>{t}</option>' for v, t, sel in opts) + "</select>"
LEAK = f'''<div class="leak rv" id="leak-box">
  <form class="leak-in" id="leak-form" onsubmit="return false">
    <div class="two"><label>New leads per month<input name="leads" type="number" min="0" value="60" inputmode="numeric"></label><label>Your commission per closing ($)<input name="commission" type="number" min="0" step="500" value="9000" inputmode="numeric"></label></div>
    <label>How many of your leads become closings today (%)<input name="rate" type="number" min="0" max="100" step="0.1" value="1.5" inputmode="decimal"></label>
    <label>How fast does a new lead get a reply?{SEL("speed", [("1", "Under 5 minutes, day and night", False), ("0.75", "Within an hour", True), ("0.55", "Same day", False), ("0.4", "Next day or later", False)])}</label>
    <label>How long do you follow up with leads who are not ready?{SEL("follow", [("1", "12 months or more, automatically", False), ("0.75", "A few weeks", True), ("0.55", "Once or twice, then they go cold", False)])}</label>
    <label>How often do past clients hear from you?{SEL("past", [("1", "Regularly, with referral asks", False), ("0.6", "Now and then", True), ("0.2", "Rarely after closing", False)])}</label>
  </form>
  <div class="leak-out" aria-live="polite">
    <span class="eyebrow" style="color:rgba(255,255,255,.6)">Estimated commission you may be missing</span>
    <b class="leak-total" id="leak-total">$0</b>
    <p class="leak-sub">per year · about <b id="leak-month">$0</b> a month · <b id="leak-deals">0 closings</b></p>
    <div class="leak-meter"><i id="leak-bar"></i></div>
    <p class="leak-note" id="leak-note"></p>
    <a class="btn btn-p" href="#audit">Show me where it's leaking <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
    <p class="leak-fine">An estimate, not a promise. It assumes faster replies and longer follow up let you keep more of each lead list's potential (up to double your current closing rate), and that well nurtured past clients send repeat and referral business. Change the numbers to match your business.</p>
  </div>
</div>'''

CHECK_QS = [
  ("Does every new lead get a personal reply within 5 minutes, even at night and on weekends?", "Leads wait for a reply and call the next agent"),
  ("Do leads who are not ready yet get follow up for 6 to 12 months without anyone remembering to do it?", "Buyers and sellers who are months away are forgotten"),
  ("Can you see, right now, which lead source brought your last 10 closings?", "You cannot see which lead sources actually make money"),
  ("Do showings get automatic confirmations and reminders?", "Missed showings and no shows waste agents' time"),
  ("Do your old leads get a regular campaign that restarts conversations?", "Thousands of old leads sit untouched in the CRM"),
  ("Do past clients hear from you on home anniversaries and market updates?", "Past clients forget you and use another agent next time"),
  ("Is every closed client asked for a review and a referral, automatically?", "Reviews and referrals depend on someone remembering"),
  ("Is every new lead assigned to an agent instantly, with an alert if nobody claims it?", "Leads sit unclaimed while agents assume someone else has it"),
]
CHECK = '<div class="check rv"><form id="check-quiz" class="check-q" onsubmit="return false">' + "".join(
  f'<div class="q" data-gap="{gap}"><p><span>{i:02d}</span>{q}</p><div class="yn"><label><input type="radio" name="q{i}" value="yes"><span>Yes</span></label><label><input type="radio" name="q{i}" value="no"><span>No</span></label></div></div>'
  for i, (q, gap) in enumerate(CHECK_QS, 1)) + '''</form>
<div class="check-res" id="check-result" hidden><div class="ring"><b id="check-score">0%</b></div><div><h3 id="check-title"></h3><p id="check-text"></p><ul class="gaps" id="check-gaps"></ul><div class="talk-row" style="margin-top:20px"><a class="btn btn-p" href="#audit">Fix these gaps <i class="ph ph-arrow-right" aria-hidden="true"></i></a><a class="btn btn-g" href="book.html?service=real-estate">Talk it through</a></div></div></div></div>'''

RETAIN = [
  ("ph-house-line", "Home anniversaries", "A personal note on the day they got their keys, every year."),
  ("ph-chart-line-up", "Market updates", "What their home is worth now, so they think of you when it is time to move."),
  ("ph-gift", "Referral asks at the right moment", "After closing, after a great review, and when friends are likely to move."),
  ("ph-star", "Reviews on autopilot", "Every closing becomes social proof that wins the next client."),
  ("ph-calendar-heart", "Seasonal check ins", "Holiday, tax season and new year messages that keep you remembered."),
  ("ph-arrows-clockwise", "Next move reminders", "Renters, growing families and empty nesters nudged when the timing fits."),
]

HOME_AUDIT = '''<div class="audit rv" id="contact">
  <div>
    <span class="eyebrow">Free revenue audit</span>
    <h2 class="h2" id="h-audit">Find out where your commission is <em>leaking.</em></h2>
    <ul class="alist">
      <li><i class="ph-fill ph-check-circle" aria-hidden="true"></i>A written review of how your leads are answered, followed up and kept</li>
      <li><i class="ph-fill ph-check-circle" aria-hidden="true"></i>The three fixes that will add closings fastest</li>
      <li><i class="ph-fill ph-check-circle" aria-hidden="true"></i>A clear plan and price, with no obligation</li>
    </ul>
    <div class="talk"><p>Rather talk it through live?</p><div class="talk-row"><a class="btn btn-g btn-sm" href="book.html?service=real-estate"><i class="ph ph-video-camera" aria-hidden="true"></i>Book a call on Zoom or Google Meet</a><a class="btn btn-g btn-sm" href="''' + LINKEDIN + '''" target="_blank" rel="noopener"><i class="ph-fill ph-linkedin-logo" aria-hidden="true"></i>Message me on LinkedIn</a></div></div>
  </div>
  <div>
    <form class="f" id="audit-form" novalidate>
      <div class="two"><label>Your name<input name="name" autocomplete="name" required></label><label>Work email<input name="email" type="email" autocomplete="email" required></label></div>
      <div class="two"><label>Brokerage or team<input name="business" autocomplete="organization"></label><label>WhatsApp (optional)<input name="whatsapp" type="tel" autocomplete="tel"></label></div>
      <div class="two">
        <label>You are<select name="setup"><option>A solo agent</option><option>A team lead</option><option>A broker or brokerage owner</option><option>An investor or wholesaler</option><option>A mortgage broker</option><option>Other</option></select></label>
        <label>Plan you are considering<select name="plan"><option>Not sure yet</option><option>Lead Response</option><option>Growth</option><option>Brokerage</option><option>One off build or rescue</option></select></label>
      </div>
      <label>What should I look at first?<textarea name="message" rows="4" placeholder="For example: Zillow leads wait hours for a reply, old leads are never contacted, no reviews after closing" required></textarea></label>
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <button class="btn btn-p" type="submit">Get my free revenue audit <i class="ph ph-arrow-right" aria-hidden="true"></i></button>
      <p class="err" id="audit-err" role="alert"></p>
      <p class="note">I reply within one working day. Your details are only used to answer your request.</p>
    </form>
    <div class="done" id="audit-done" role="status"><i class="ph-fill ph-check-circle" aria-hidden="true"></i><b>Request received.</b><p class="muted">I'll email you within one working day with how to give me team access for the audit.</p></div>
  </div>
</div>'''

MODULES = ["Zillow leads", "Realtor.com", "Open houses", "Sign calls", "Facebook ads", "Showings", "Round robin", "Buyer nurture", "Seller nurture", "Database revival", "Home anniversaries", "Reviews", "Referrals", "A2P 10DLC", "Lead source reporting", "Investor pipelines"]
mq = "".join(f"<span><i class=\"ph ph-check-circle\"></i>{m}</span>" for m in MODULES)

page("index.html", "Vix Assist · GoHighLevel Growth Systems for Real Estate Brokers and Agents",
 "More closings from the leads you already pay for, and clients who come back and refer. GoHighLevel systems built and run for real estate brokers, teams, agents and investors.",
 "home", "\n".join([
  f'''<section class="hero" aria-labelledby="h1">
  <div class="wrap hero-grid">
    <div>
      <span class="presence"><span class="av"><img src="brand/vix-icon-animated.svg" alt=""></span><span><b>Promise</b> · GoHighLevel growth for real estate</span></span>
      <h1 id="h1">Your next closing is already in your CRM. <em>Stop letting competitors take it.</em></h1>
      <p class="sub">I build and run the GoHighLevel system that answers every lead in seconds, follows up until they are ready, and keeps past clients coming back with referrals. More commission from the leads you already pay for.</p>
      <div class="cta"><a class="btn btn-p" href="#leak">Find my revenue leak <i class="ph ph-arrow-right" aria-hidden="true"></i></a><button class="btn btn-g" type="button" data-tour><i class="ph-fill ph-play-circle" aria-hidden="true"></i>Watch the 2 minute tour</button></div>
      <div class="proofline"><span><i class="ph-fill ph-lock-key" aria-hidden="true"></i>Team access, never your password</span><span><i class="ph-fill ph-file-lock" aria-hidden="true"></i>NDA on request</span><span><i class="ph-fill ph-arrows-clockwise" aria-hidden="true"></i>Cancel any month</span></div>
    </div>
    {RE_CONSOLE}
  </div>
</section>
<div class="modules" aria-label="What the system handles"><div class="mq">{mq}{mq.replace("<span>", '<span aria-hidden="true">')}</div></div>''',
  sec(head2("Where your commission disappears", "You don't lose deals to better agents. <em>You lose them to faster ones.</em>", "The first agent to reply usually wins the client. Most buyers are months away when they first enquire. And past clients forget you within a year.") + '''<div class="pain">
<div class="pc rv"><p class="was">Portal leads wait hours for a call back.</p><p class="now">Every lead answered in seconds</p><p>Zillow, Realtor.com, ads and website leads get a personal text and email instantly, day or night, before another agent calls.</p></div>
<div class="pc rv"><p class="was">Buyers who are not ready yet get forgotten.</p><p class="now">Follow up until they are ready</p><p>Months of helpful, personal follow up, so when they are ready to buy or sell, they come back to you.</p></div>
<div class="pc rv"><p class="was">Past clients drift to another agent next time.</p><p class="now">Clients who stay and refer</p><p>Anniversaries, market updates and referral asks that keep you their agent for life.</p></div>
</div>''', style="border-top:0"),
  sec(head2("Revenue leak calculator", "How much is slow follow up <em>costing you?</em>", "Enter your numbers. See what your current process may be leaving on the table every year.", True) + LEAK, "leak"),
  WORK,
  sec(head2("A lead's journey", "From portal lead to signed client, <em>without anyone lifting a finger.</em>", "This is the system I build inside your GoHighLevel. You see every step in your account.", True) +
      '<ol class="journey">' + "".join(f'<li class="rv"><span class="jt">{t}</span><span class="ji"><i class="ph {ic}" aria-hidden="true"></i></span><div><h3>{h}</h3><p>{p}</p></div></li>' for t, ic, h, p in JOURNEY) + '</ol>', "journey"),
  sec(head2("Client retention", "A new lead costs money. <em>A past client is free revenue.</em>", "Your past clients and sphere already trust you. The system keeps you top of mind, so their next move and their friends' moves come to you, not a competitor.") +
      '<div class="eco">' + "".join(f'<article class="ec rv"><span class="ic"><i class="ph {i}" aria-hidden="true"></i></span><h3>{t}</h3><p>{d}</p></article>' for i, t, d in RETAIN) + "</div>", "retention"),
  '<section class="reveal-sec" aria-label="The promise"><div class="wrap"><p class="tagline" id="tagline">Every lead answered. Every client remembered. Every referral asked for. That is how you grow without buying more leads.</p></div></section>',
  sec(head2("CRM health check", "Is your current CRM <em>quietly losing you clients?</em>", "Eight honest questions. Answer them about your system as it is today.", True) + CHECK, "check"),
  sec(head2("What I build and run", "Everything that wins and keeps clients, <em>inside GoHighLevel.</em>") + boxes([
    ("ph-lightning", "Speed to lead", "Instant text, email and missed call text back for every portal, ad and website lead."),
    ("ph-robot", "Lead qualifying AI", "Asks budget, area, timeline and pre approval, then books the showing."),
    ("ph-calendar-check", "Showings and reminders", "Booking links, agent calendars, confirmations and reminders that cut no shows."),
    ("ph-users-three", "Agent routing", "Round robin or territory routing, with alerts so no lead sits unclaimed."),
    ("ph-arrows-clockwise", "Buyer and seller nurture", "Long term follow up for leads who are not ready yet, in your voice."),
    ("ph-database", "Database revival", "Campaigns that restart conversations with old leads and your sphere."),
    ("ph-sign-in", "Open house sign ins", "Visitors land in the CRM with follow up already running."),
    ("ph-megaphone", "Just listed and just sold", "Campaigns to past clients and neighbourhoods every time you list or close."),
    ("ph-star", "Reviews and referrals", "Automatic review and referral requests after every closing."),
    ("ph-funnel-simple", "Clean pipelines", "Buyer, seller and investor pipelines your agents actually use."),
    ("ph-shield-check", "A2P 10DLC and compliance", "US texting registration, opt out handling and quiet hours."),
    ("ph-chart-line-up", "Lead source reporting", "See which sources bring closings, so you spend where it works."),
  ]), "ecosystem"),
  sec(head2("How we start", "Live in days. <em>Growing every month after.</em>") + steps([
    ("Free revenue audit", "You give me team access. I review how leads are answered, followed up and kept, then send a written plan with clear priorities."),
    ("Speed to lead in week one", "Instant replies, showing booking and reminders go live first, because that is where deals are won or lost."),
    ("Grow every month", "Nurture, database revival, reviews and referrals are added and improved, with a report on what changed."),
  ]), "how"),
  sec('<div class="trust"><div>' + head2("Working with a brokerage", "Your clients, your data, <em>your brand.</em>") + '''<div class="tlist">
<div class="ti rv"><i class="ph-fill ph-lock-key" aria-hidden="true"></i><span><b>Team user access only</b>You add me as a staff user with the permissions you choose, and remove me in one click.</span></div>
<div class="ti rv"><i class="ph-fill ph-file-lock" aria-hidden="true"></i><span><b>NDA before I start</b>For brokerages and teams, I sign your NDA before touching any client data.</span></div>
<div class="ti rv"><i class="ph-fill ph-user-circle-check" aria-hidden="true"></i><span><b>I never contact your clients on my own</b>Every campaign is approved by you before it goes live, in your brand and your voice.</span></div>
<div class="ti rv"><i class="ph-fill ph-database" aria-hidden="true"></i><span><b>Everything stays in your account</b>If we stop working together, you keep every workflow, contact and campaign.</span></div>
<div class="ti rv"><i class="ph-fill ph-squares-four" aria-hidden="true"></i><span><b>Your own client dashboard</b>Every task, update and file in one place, with a direct line to me.</span></div>
</div></div>''' + '''<div class="report static rv" aria-label="Example weekly report for a real estate team"><header><span><b>Weekly report</b><small>Example for a 6 agent team</small></span><span class="pill">On track</span></header>
<div class="rrow"><i class="ph ph-lightning" aria-hidden="true"></i><span>Zillow and Realtor.com leads now answered in under 10 seconds</span><b>Live</b></div>
<div class="rrow"><i class="ph ph-users-three" aria-hidden="true"></i><span>Round robin across 6 agents with claim alerts</span><b>Live</b></div>
<div class="rrow"><i class="ph ph-arrows-clockwise" aria-hidden="true"></i><span>Revival campaign started with 1,240 old leads</span><b>Live</b></div>
<div class="rrow"><i class="ph ph-house-line" aria-hidden="true"></i><span>Home anniversary messages set for 312 past clients</span><b>Live</b></div>
<div class="rrow"><i class="ph ph-star" aria-hidden="true"></i><span>Review and referral request after every closing</span><b>Live</b></div>
<p class="rnote">Example report · Next week: open house sign in flow and just listed campaign.</p></div></div>'''),
  sec(head2("Pricing", "Less than the commission on <em>one extra closing a year.</em>", "Every plan starts with a free revenue audit. Prices in USD. No long contracts.", True) + MONTHLY +
      '<div class="extras"><div class="ex rv"><span><b>One off build or rescue</b><span>A full GoHighLevel build or repair, fixed price</span></span><span class="p">from $499</span></div><div class="ex rv"><span><b>Revenue audit</b><span>Written review and action plan</span></span><span class="p">Free</span></div></div>' +
      '<p class="guarantee rv"><i class="ph-fill ph-shield-check" aria-hidden="true"></i>No long contract. Cancel any month. Everything built stays in your account.</p>', "pricing"),
  sec(head2("Investors and wholesalers", "Seller leads need follow up <em>even more.</em>", "If you buy property, your pipeline runs on follow up. I build and run the system that keeps motivated sellers talking to you, not the next investor.") +
      '<ul class="checks rv" style="columns:2;column-gap:40px">' + "".join(f'<li><i class="ph-fill ph-check-circle"></i><span>{x}</span></li>' for x in ["Seller pipelines from first contact to closing", "Texting with A2P registration and opt out handling", "Instant follow up on PPC, PPL and direct mail", "Offer follow up that runs for months", "Missed call text back and voicemail drops", "Buyer lists for dispositions"]) + "</ul>"),
  sec(head2("Questions", "Before you <em>decide.</em>", center=True) + faq([
    ("I use Follow Up Boss, kvCORE or another CRM. Is this for me?", "Yes. I can move your leads and follow up into GoHighLevel, or connect your lead sources so GoHighLevel handles speed to lead, nurture and retention while your agents keep the tools they know. The free audit shows which makes more sense."),
    ("How quickly will I see a difference?", "Instant replies and showing reminders are usually live in the first week, so you see faster conversations straight away. Nurture, revival and referral campaigns build results over the following months."),
    ("Is texting my leads in the US compliant?", "I register your A2P 10DLC brand and campaign, add opt out handling and quiet hours, and only message people who enquired or opted in. Your compliance rules always come first."),
    ("Will you talk to my clients?", "Only if you want me to. Every message goes out in your name and is approved by you. I never contact your clients on my own."),
    ("Do I need my GoHighLevel password to give you access?", "No. You add me as a team user with the permissions you choose, and remove access any time in one click."),
    ("What does it cost to try?", "The revenue audit is free and you get a written plan either way. Monthly plans have no long contract, and everything built stays in your account."),
  ]), "faq"),
  sec(HOME_AUDIT, "audit"),
 ]), extra_js=RE_DATA.replace('<script src="assist.js?v=7"></script>', '<script src="assist.js?v=8"></script>\n<script src="work.js?v=2" defer></script>\n<script src="re.js?v=2" defer></script>\n<script src="tour.js?v=2" defer></script>'),
 foot=footer())
