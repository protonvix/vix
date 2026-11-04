"""Builds the About and policy pages from one shared layout.

Run from the repo root:  python3 tools/make-pages.py
Edit the page text below, run the script, then commit and push.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
UPDATED = "4 November 2026"
EMAIL = "vixautomations@gmail.com"

PAGES = {}

PAGES["about"] = dict(
    title="About us",
    desc="Vix Automations, founded by Promise Felix, builds GoHighLevel automation, websites and TikTok growth for businesses in Nigeria, the UK and worldwide.",
    eyebrow="About Vix Automations",
    h1="We help businesses sell more, <em>on autopilot</em>",
    intro="Vix Automations was founded by Promise Felix to help businesses stop losing customers to slow replies, outdated websites and missed follow-ups. We work with clients in Nigeria, the UK and worldwide.",
    body=f"""
<h2>What we believe</h2>
<p>Most businesses don't have a lead problem. They have a follow-up problem. Customers enquire and nobody replies fast enough, websites look outdated so buyers don't trust them, and social media gets views that never turn into sales. We fix all three.</p>

<h2>What we do</h2>
<ul>
<li><b>GoHighLevel setup and automation:</b> CRM, pipelines, funnels, calendars, workflows, reviews and AI assistants, built and tested for you.</li>
<li><b>Website design and redesign:</b> modern, fast websites that win trust at first glance, including interactive 3D experiences.</li>
<li><b>TikTok marketing:</b> four quality videos a week, account management, and every lead sent to your CRM.</li>
<li><b>SaaS mode, migrations and support:</b> white-label launches for agencies, moves from other CRMs, and monthly help.</li>
</ul>

<h2>How we work</h2>
<ul>
<li><b>Fixed price first.</b> You know the full cost before any work starts.</li>
<li><b>You own everything.</b> Your GoHighLevel account, data, website and content belong to you.</li>
<li><b>Documented and recorded.</b> Every system comes with walkthrough videos and written instructions.</li>
<li><b>Direct access.</b> You talk to the people doing the work, on WhatsApp, email or video call.</li>
</ul>

<h2>Honest by design</h2>
<p>We're a young company, so we don't show fake reviews or borrowed client logos. Instead we offer founding clients a fixed price, fixes at no extra charge and a 20% discount, in return for an honest review once their system is live.</p>

<h2>Talk to us</h2>
<p>Email <a href="mailto:{EMAIL}">{EMAIL}</a>, or message us on WhatsApp (<a href="https://wa.me/447723149573">UK +44 7723 149573</a> or <a href="https://wa.me/message/WV3WLO4FC656K">Nigeria</a>).</p>
""",
)

PAGES["privacy"] = dict(
    title="Privacy policy",
    desc="How Vix Automations collects, uses and protects your personal information.",
    eyebrow="Policies",
    h1="Privacy policy",
    intro="This policy explains what personal information Vix Automations collects, why we collect it, and the choices you have. We keep it simple: we only collect what we need to reply to you and deliver your project.",
    body=f"""
<h2>What we collect</h2>
<ul>
<li><b>Enquiries and briefs:</b> your name, business name, email address, WhatsApp or phone number, and the answers you give about your project.</li>
<li><b>Messages:</b> anything you send us by WhatsApp, email or phone.</li>
<li><b>Project materials:</b> logos, photos, text and logins you share so we can build your website.</li>
<li><b>Payment records:</b> invoices and payment confirmations. We never see or store your card details.</li>
</ul>

<h2>How we use it</h2>
<ul>
<li>To reply to your enquiry and prepare your quote.</li>
<li>To set up, build, launch and support your GoHighLevel system, website or marketing.</li>
<li>To send invoices and keep financial records required by law.</li>
</ul>
<p>We don't sell or rent your information, and we don't add you to marketing lists without your permission.</p>

<h2>Services we use</h2>
<p>Briefs and messages sent through our website forms are stored securely in our client portal (hosted on Cloudflare) and emailed to our inbox through Resend, an email delivery service. We also use Gmail, WhatsApp, GoHighLevel, Cloudflare (website hosting) and payment providers such as Payoneer, Cleva and Wise. Each of these processes data under its own privacy policy.</p>

<h2>Cookies</h2>
<p>This website doesn't use advertising or tracking cookies. Our hosting provider may keep basic technical logs, such as IP addresses, to keep the site secure and working.</p>

<h2>How long we keep it</h2>
<p>We keep enquiries for up to 12 months if no project goes ahead. For clients, we keep project and payment records for as long as the law requires, usually up to 6 years. Logins you share with us are deleted once your project is handed over.</p>

<h2>Your rights</h2>
<p>You can ask us to show, correct or delete the personal information we hold about you, or to stop contacting you. Email <a href="mailto:{EMAIL}">{EMAIL}</a> and we'll respond within 7 days. We follow the Nigeria Data Protection Act 2023 and UK data protection law (UK GDPR).</p>

<h2>Security</h2>
<p>We keep your information in secure, password-protected accounts and only use it for your project. If you share logins with us, we recommend changing the passwords after handover.</p>

<h2>Website previews</h2>
<p>We sometimes design a free preview of a new website for a business we'd like to work with. Previews use only public business information, such as the business name and contact number, are clearly labelled as previews and are hidden from search engines. To have a preview removed, message us and we'll take it down within 2 business days.</p>

<h2>Your GoHighLevel account</h2>
<p>When we work inside your GoHighLevel account, we only access what we need for your project. Your contacts and data stay in your account and belong to you. We recommend removing our access once the project is handed over.</p>
""",
)

PAGES["payment"] = dict(
    title="Payment policy",
    desc="How quotes, deposits, invoices and payments work at Vix Automations.",
    eyebrow="Policies",
    h1="Payment policy",
    intro="We keep payments simple and transparent for every service: GoHighLevel builds, websites, TikTok marketing and support. You get a fixed quote before any work starts, and you never pay for anything you didn't agree to.",
    body=f"""
<h2>Quotes</h2>
<p>After you send your brief, we send a written fixed quote that lists exactly what's included: pages, features, revisions and timeline. Quotes are valid for 30 days. Work that isn't in the quote is only added after you approve a separate price.</p>

<h2>Free previews and consultations</h2>
<p>Strategy calls, account audits and website previews are free, with no obligation to buy.</p>

<h2>Payment options</h2>
<p>When you pay online, you choose how to pay:</p>
<ul>
<li><b>In full:</b> pay the whole amount today.</li>
<li><b>Half now, half on delivery:</b> pay 50% to start. The remaining 50% is due when we deliver your finished project.</li>
<li><b>Instalments:</b> 2 to 4 smaller payments (weekly, every 2 or 3 weeks, or monthly), all completed within <b>45 days</b> of your first payment.</li>
</ul>
<p>Your project starts after your first payment. Your client dashboard shows your payment schedule and reminds you when a payment is due. <b>Finished files, downloads and your live website are released once you've paid in full.</b> If a payment is overdue, work may pause until it's paid.</p>
<p>For larger projects we can agree payments in stages (milestones), written into your quote. Monthly services, such as TikTok marketing and support retainers, are paid at the start of each month.</p>

<h2>How to pay</h2>
<p>We accept bank transfer to accounts in Nigeria, the UK and the USA, and payment through Payoneer, Cleva and Wise. The payment details are on your invoice. Prices are shown in your currency on our pricing page. Nigerian clients can be invoiced in naira (₦); other clients in pounds (£) or US dollars ($). Please confirm payment details with us directly before sending money, and never pay into an account that isn't on your official invoice.</p>

<h2>Invoices</h2>
<p>Invoices are due within 7 days. If a payment is late, we pause work until it arrives, and the delivery date moves by the same amount of time.</p>

<h2>Third-party costs</h2>
<p>Your GoHighLevel subscription is paid directly to HighLevel, so you always own the account. Your domain name, hosting, phone numbers, SMS and email credits, ad spend, premium plugins and other third-party services are also paid separately or listed in your quote. They're registered in your name wherever possible, so you own them. Most renew every year, and we remind you before renewal.</p>

<h2>Ownership</h2>
<p>Once the final payment is made, everything we build (automations, snapshots, websites, designs and files) belongs to you.</p>

<h2>Questions</h2>
<p>Email <a href="mailto:{EMAIL}">{EMAIL}</a> or message us on WhatsApp.</p>
""",
)

PAGES["delivery"] = dict(
    title="Delivery policy",
    desc="How and when Vix Automations delivers GoHighLevel builds, websites and TikTok marketing.",
    eyebrow="Policies",
    h1="Delivery policy",
    intro="All of our work is delivered digitally. Nothing is shipped. This page explains timelines, what we need from you, and what happens at launch.",
    body=f"""
<h2>Timelines</h2>
<ul>
<li><b>GoHighLevel Quick Start:</b> about 7 days.</li>
<li><b>Growth systems:</b> 2 to 3 weeks.</li>
<li><b>Agency and SaaS launches:</b> 3 to 5 weeks, depending on scope.</li>
<li><b>Websites:</b> homepage design within 5 to 7 business days, full site usually 2 to 4 weeks after the design is approved.</li>
<li><b>TikTok marketing:</b> your first videos go live within 7 days of onboarding, then 4 videos every week.</li>
</ul>
<p>Your exact delivery date is written in your quote.</p>

<h2>What we need from you</h2>
<p>Access to your GoHighLevel account (or help setting one up), your logo, photos, offers, prices and any logins we need. Timelines start once we have these. If something arrives late, the delivery date moves by the same amount of time.</p>

<h2>Testing and approval</h2>
<p>Every automation is tested end to end with real test leads before launch. Websites are shared on a private preview link first. Nothing goes live until you approve it.</p>

<h2>Revisions</h2>
<p>Website quotes include 2 rounds of design changes and 1 round on the finished site. GoHighLevel builds include adjustments within the agreed scope. Extra changes are quoted separately.</p>

<h2>Launch and handover</h2>
<p>We go live with you, then hand over recorded video walkthroughs and written instructions for every system, so your team knows exactly how it works.</p>

<h2>Support after launch</h2>
<p>For 14 days after launch, we fix any problems in our work for free. After that, we offer monthly support retainers or one-off help when you need it.</p>

<h2>Delays</h2>
<p>If we can't meet the agreed date, we'll tell you as early as possible and agree a new one. See our <a href="refund.html">refund policy</a> for what happens if we can't deliver.</p>
""",
)

PAGES["refund"] = dict(
    title="Refund policy",
    desc="When and how Vix Automations refunds payments.",
    eyebrow="Policies",
    h1="Refund policy",
    intro="We want you to be confident paying us. That's why you approve the plan and design before we build, and why our refund terms are clear from the start.",
    body=f"""
<h2>Before work starts</h2>
<p>If you cancel before we start work, we refund your deposit in full.</p>

<h2>After work has started</h2>
<p>Once we've started building, the deposit is not refundable, because it covers time already spent. If you cancel at this stage, you don't owe the remaining balance, and you keep anything already delivered to you.</p>

<h2>After you approve the finished work</h2>
<p>Once you've approved the finished system or website and paid the balance, payments are not refundable. If something isn't working as agreed, we'll fix it. Bug fixes are free for 14 days after launch.</p>

<h2>If we can't deliver</h2>
<p>If we can't deliver what's in your quote, and we haven't fixed it within 14 days of you telling us, we refund everything you've paid for the work that wasn't delivered. If the delay is caused by missing content, late payments or approvals on your side, this doesn't apply.</p>

<h2>Third-party costs</h2>
<p>Your GoHighLevel subscription, domain names, hosting, SMS credits, ad spend and other services bought from other companies can't be refunded by us, but they stay in your name and remain yours to use.</p>

<h2>Monthly services</h2>
<p>You can cancel monthly services at any time, and they stop at the end of the month you've paid for. Months already paid are not refunded.</p>

<h2>How to ask for a refund</h2>
<p>Email <a href="mailto:{EMAIL}">{EMAIL}</a> with your name, your invoice number and the reason. We reply within 2 business days. Approved refunds are paid within 7 business days, to the same account or method you paid with.</p>
""",
)

ORDER = [("about", "About us"), ("privacy", "Privacy"), ("payment", "Payment"), ("delivery", "Delivery"), ("refund", "Refunds")]

SHELL = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Vix Automations</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://vixautomations.pages.dev/{slug}.html">
<meta property="og:title" content="{title} · Vix Automations">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://vixautomations.pages.dev/brand/og-image.jpg">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#03040a">
<link rel="icon" href="brand/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="brand/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
<link rel="stylesheet" href="home.css">
<link rel="stylesheet" href="chat.css?v=20261104c">
</head>
<body class="doc-page">
<div class="aurora soft" aria-hidden="true"><i></i><i></i><i></i></div>
<header class="hdr solid">
  <a class="logo" href="./"><img src="brand/vix-icon.svg" alt="" width="34" height="34"><span>Vix<b>Automations</b></span></a>
  <div class="hdr-right"><a class="btn btn-glass sm hide-sm" href="./"><i class="ph ph-arrow-left" aria-hidden="true"></i>Home</a><a class="btn btn-glow sm" href="https://wa.me/447723149573" target="_blank" rel="noopener">WhatsApp us</a></div>
</header>
<main class="doc" id="main">
  <div class="wrap doc-wrap">
    <nav class="doc-tabs" aria-label="Pages">{tabs}</nav>
    <p class="eyebrow">{eyebrow}</p>
    <h1 class="doc-h1">{h1}</h1>
    <p class="doc-intro">{intro}</p>
    {updated}
    <div class="doc-body">{body}</div>
    <div class="doc-cta glass">
      <div><h2>Questions?</h2><p>We're happy to explain anything before you start.</p></div>
      <div class="cta-row"><a class="btn btn-wa" href="https://wa.me/447723149573" target="_blank" rel="noopener"><i class="ph ph-whatsapp-logo" aria-hidden="true"></i>WhatsApp UK</a><a class="btn btn-glass" href="https://wa.me/message/WV3WLO4FC656K" target="_blank" rel="noopener">WhatsApp Nigeria</a></div>
    </div>
  </div>
</main>
<footer class="foot">
  <div class="wrap foot-bottom" style="margin-top:0;border-top:0;padding-top:0">
    <p>© 2026 Vix Automations · {links}</p>
    <p>GoHighLevel and HighLevel are trademarks of HighLevel, Inc. This site is independent and not affiliated with HighLevel, Inc.</p>
  </div>
</footer>
<script src="chatbot.js?v=20261104c"></script>
</body>
</html>
"""

for slug, page in PAGES.items():
    current = ' aria-current="page"'
    tabs = "".join(f'<a href="{s}.html"{current if s == slug else ""}>{label}</a>' for s, label in ORDER)
    links = " · ".join(f'<a href="{s}.html">{label}</a>' for s, label in ORDER)
    updated = "" if slug == "about" else f'<p class="doc-date">Last updated {UPDATED}</p>'
    html = SHELL.format(slug=slug, tabs=tabs, links=links, updated=updated, **page)
    (ROOT / f"{slug}.html").write_text(html)
    print(f"{slug}.html")
