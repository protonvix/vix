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
V = "7"  # bump to bust caches for assist.css / site.js
LINKEDIN = "https://www.linkedin.com/in/promise-felix-a491a7233/"
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
<link rel="canonical" href="{SITE}/{path[:-5] if path.endswith('.html') else path}">
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
    <a href="/#work">See the work</a>
    <a href="/#ecosystem">GoHighLevel</a>
    <a href="pricing.html"{c("pricing")}>Pricing</a>
    <div class="dd" id="dd">
      <button type="button" aria-expanded="false" aria-controls="dd-menu">More services <i class="ph ph-caret-down" aria-hidden="true"></i></button>
      <div class="dd-menu" id="dd-menu">
        <a href="va-services.html"{c("va")}><i class="ph ph-user-gear" aria-hidden="true"></i><span>Virtual assistance<small>Inbox, calendar, admin, support</small></span></a>
        <a href="tiktok.html"{c("tiktok")}><i class="ph ph-tiktok-logo" aria-hidden="true"></i><span>TikTok marketing<small>Content, posting, growth</small></span></a>
        <a href="web-design.html"{c("web")}><i class="ph ph-browser" aria-hidden="true"></i><span>Website design<small>Fast sites outside GoHighLevel</small></span></a>
        <a href="free-design.html"{c("free")}><i class="ph ph-gift" aria-hidden="true"></i><span>Free website design<small>Offer ends 4 December</small></span></a>
      </div>
    </div>
    <a href="about.html"{c("about")}>About</a>
  </nav>
  <a class="btn btn-p btn-sm nav-cta" href="book.html">Book a strategy call</a>
  <button class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mpanel"><span></span><span></span><span></span></button>
</header>
<div class="mpanel" id="mpanel" aria-hidden="true">
  <a href="/">Home</a>
  <a href="/#work">See the work</a>
  <a href="/#ecosystem">GoHighLevel</a>
  <a href="pricing.html">Pricing</a>
  <a href="about.html">About</a>
  <a class="sub" href="va-services.html">Virtual assistance</a>
  <a class="sub" href="tiktok.html">TikTok marketing</a>
  <a class="sub" href="web-design.html">Website design</a>
  <a class="sub" href="book.html?account=1">Create an account</a>
  <a class="sub" href="portal/">Client login</a>
  <a class="btn btn-p" href="book.html">Book a strategy call</a>
</div>
'''

def footer(cta_h="Let's make your GoHighLevel account <em>earn its keep.</em>", cta2=("Get a free audit", "/#audit")):
    return f'''<footer>
  <div class="wrap">
    <div class="fcta"><h2>{cta_h}</h2><div class="talk-row"><a class="btn btn-p" href="book.html">Book a strategy call <i class="ph ph-arrow-right" aria-hidden="true"></i></a><a class="btn btn-g" href="{cta2[1]}">{cta2[0]}</a></div></div>
    <div class="fgrid">
      <div><a class="logo" href="/"><img src="brand/vix-icon.svg" alt="" width="30" height="30"><span>Vix <b>Assist</b></span></a><p style="margin-top:14px;max-width:320px">A dedicated GoHighLevel virtual assistant for business owners and agencies. Run by Promise Felix.</p></div>
      <div><h4>GoHighLevel</h4><a href="/#ecosystem">What I manage</a><a href="/#how">How it works</a><a href="pricing.html">Pricing</a><a href="/#audit">Free audit</a></div>
      <div><h4>More services</h4><a href="va-services.html">Virtual assistance</a><a href="tiktok.html">TikTok marketing</a><a href="web-design.html">Website design</a><a href="portal/">Client login</a></div>
      <div><h4>Support</h4><a href="book.html?account=1"><b style="color:#fff">Create an account</b></a><a href="portal/">Client login</a><a href="mailto:support@vixassist.com">Contact support</a><a href="book.html">Book a call</a><a href="{LINKEDIN}" target="_blank" rel="noopener">LinkedIn</a><a href="https://wa.me/{WA}" target="_blank" rel="noopener">WhatsApp +44 7723 149573</a></div>
    </div>
    <div class="fbot"><span>© 2026 Vix Assist. GoHighLevel is a trademark of HighLevel Inc. Vix Assist is an independent service and is not affiliated with HighLevel.</span><span><a href="about.html">About</a> · <a href="privacy.html">Privacy</a> · <a href="payment.html">Payments</a> · <a href="delivery.html">Delivery</a> · <a href="refund.html">Refunds</a></span></div>
  </div>
</footer>
'''

def scripts(extra=""):
    return f'''<script src="site.js?v={V}"></script>{extra}
<script src="chatbot.js?v=7" defer></script>
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
    return f'<div class="eco" style="grid-template-columns:repeat({cols},1fr)">{cells}</div>'

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
<div class="plan rv"><span class="tg">Starter VA</span><h3>For one location getting set up properly</h3><div class="price">$300<small> / month</small></div><p class="hrs">10 hours of GoHighLevel work each month</p><ul><li><i class="ph-fill ph-check-circle"></i>Workflow fixes and small builds</li><li><i class="ph-fill ph-check-circle"></i>Pipeline and calendar upkeep</li><li><i class="ph-fill ph-check-circle"></i>Weekly report</li><li><i class="ph-fill ph-check-circle"></i>Replies within one working day</li></ul><a class="btn btn-g" href="/#audit">Start with a free audit</a></div>
<div class="plan hot rv"><span class="tg">Most chosen</span><h3>Growth VA for busy businesses</h3><div class="price">$550<small> / month</small></div><p class="hrs">20 hours of GoHighLevel work each month</p><ul><li><i class="ph-fill ph-check-circle"></i>Everything in Starter</li><li><i class="ph-fill ph-check-circle"></i>New automations and funnels each month</li><li><i class="ph-fill ph-check-circle"></i>Conversation AI set up and tuning</li><li><i class="ph-fill ph-check-circle"></i>Replies within two working hours</li></ul><a class="btn btn-p" href="/#audit">Start with a free audit</a></div>
<div class="plan rv"><span class="tg">Dedicated VA</span><h3>For agencies and multi location teams</h3><div class="price">$950<small> / month</small></div><p class="hrs">35 hours of GoHighLevel work each month</p><ul><li><i class="ph-fill ph-check-circle"></i>Everything in Growth</li><li><i class="ph-fill ph-check-circle"></i>White label sub account support</li><li><i class="ph-fill ph-check-circle"></i>Snapshots and client onboarding</li><li><i class="ph-fill ph-check-circle"></i>Priority same day replies</li></ul><a class="btn btn-g" href="/#audit">Start with a free audit</a></div>
</div>'''

page("pricing.html", "Pricing · Vix Assist",
 "Clear prices for GoHighLevel support: monthly virtual assistant plans, one off builds with a fixed price, and quotes for websites and TikTok.",
 "pricing", "\n".join([
  hero("Pricing", "Clear prices. <em>No surprises.</em>",
       "Monthly GoHighLevel support, fixed price builds, and quotes for everything else. Every price is agreed before any work starts.",
       '<a class="btn btn-p" href="#monthly">Monthly plans</a><a class="btn btn-g" href="#builds">One off builds</a>'),
  sec(head2("Monthly", "A dedicated GoHighLevel assistant, <em>every month.</em>", "Every plan starts with a free audit. Prices in USD. Cancel any month.") + MONTHLY +
      '<p class="guarantee rv"><i class="ph-fill ph-shield-check" aria-hidden="true"></i>No long contract. Unused hours roll over one month.</p>', "monthly", "padding-top:0;border-top:0"),
  sec(head2("One off builds", "A full GoHighLevel build <em>at a fixed price.</em>", "Pay online and your project and client dashboard start straight away.") +
      '''<div class="pctl rv"><div class="discount-banner" data-discount-banner hidden><span class="discount-pill" data-discount-percent></span><span data-discount-label></span></div><label class="currency-picker">Show prices in<select id="currency-select" aria-describedby="currency-note"></select></label></div>''' +
      '<div class="plans">' + "".join(PKG) + '</div><p class="guarantee rv" id="currency-note" data-currency-note>Prices are set in US dollars (USD).</p><p class="guarantee rv"><i class="ph-fill ph-lock-key" aria-hidden="true"></i>Pay securely by card, bank transfer or USSD through Paystack, or by bank transfer in USD, GBP, EUR or NGN.</p>', "builds"),
  sec(head2("Other services", "Websites and TikTok, <em>quoted to you.</em>") + '<div class="extras">' +
      '<a class="ex rv" href="web-design.html"><span><b>Website design</b><span>New sites, redesigns, fixes and funnels</span></span><span class="p">Quote <i class="ph ph-arrow-right" style="font-size:18px"></i></span></a>' +
      '<a class="ex rv" href="tiktok.html"><span><b>TikTok marketing</b><span>Content, posting, management and ads</span></span><span class="p">Quote <i class="ph ph-arrow-right" style="font-size:18px"></i></span></a></div>'),
  sec(head2("Questions", "Good to <em>know.</em>", center=True) + faq([
    ("Is the GoHighLevel subscription included?", "No. You pay HighLevel directly for your own account, so you always own it. My prices cover the setup, the work and the support."),
    ("Which currency will I pay in?", "Prices are set in US dollars. Other currencies are shown as an estimate, and your invoice shows the exact amount before you pay."),
    ("How can I pay?", "By card, bank transfer or USSD through Paystack, or by bank transfer to accounts in the US, UK, Europe and Nigeria."),
    ("What does fixed price mean?", "The scope is agreed in writing before work starts, and that is the price. Anything extra is quoted first and only added with your approval."),
    ("Monthly plan or one off build?", "If your account needs building, start with a one off build. If it is set up but needs ongoing work, a monthly plan fits better. The free audit tells you which."),
  ])),
 ]), extra_js='\n<script src="pricing.js?v=2"></script>')

# ---------------------------------------------------------------- About
page("about.html", "About · Vix Assist",
 "Vix Assist is run by Promise Felix, a GoHighLevel virtual assistant helping business owners and agencies in the UK, the US, Australia and Nigeria.",
 "about", "\n".join([
  hero("About", "I'm Promise. I run GoHighLevel accounts <em>so owners don't have to.</em>",
       "Vix Assist is my GoHighLevel virtual assistant service. I set up, fix and manage accounts for business owners and agencies, so leads get answered and the software earns what it costs.",
       BOOK + f'<a class="btn btn-g" href="{LINKEDIN}" target="_blank" rel="noopener"><i class="ph-fill ph-linkedin-logo" aria-hidden="true"></i>LinkedIn</a>'),
  sec('<div class="grid2"><div class="prose rv"><h2>Why this exists</h2><p>Most businesses don\'t have a lead problem. They have a follow up problem. Someone enquires and nobody replies fast enough, the calendar fills with no shows, and the platform that was meant to fix it sits half set up.</p><p>GoHighLevel can solve all of that, but only when someone builds it properly and looks after it every week. That is the job I do.</p></div>'
      '<div class="tlist rv"><div class="ti"><i class="ph-fill ph-seal-check" aria-hidden="true"></i><span><b>Fixed price first</b>You know the full cost before any work starts.</span></div><div class="ti"><i class="ph-fill ph-key" aria-hidden="true"></i><span><b>You own everything</b>Your account, data, website and content stay yours.</span></div><div class="ti"><i class="ph-fill ph-video" aria-hidden="true"></i><span><b>Documented and recorded</b>Every system comes with walkthrough videos and written notes.</span></div><div class="ti"><i class="ph-fill ph-chat-circle-text" aria-hidden="true"></i><span><b>Direct access</b>You talk to the person doing the work, on WhatsApp, email or video call.</span></div></div></div>', style="padding-top:0;border-top:0"),
  sec('<div class="prose rv"><h2>Honest by design</h2><p>Vix Assist is a young business, so you won\'t find fake reviews or borrowed client logos here. Instead, the work is shown openly on the homepage, every price is fixed up front, and you can see every task in your own client dashboard.</p><p>I work with clients in the UK, the US, Australia and Nigeria. Email <a href="mailto:support@vixassist.com">support@vixassist.com</a>, message me on <a href="https://wa.me/447723149573" target="_blank" rel="noopener">WhatsApp</a>, or <a href="book.html">book a call</a>.</p></div>'),
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
