# Vix Automations: GoHighLevel Expert Website

A fast, responsive one-page marketing site for a GoHighLevel (HighLevel) consultant or agency. It's plain HTML, CSS and JavaScript with no build step.

## Files
- `index.html`: home page content (hero, services, process, example builds, founding-client offer, about, pricing, FAQ, contact)
- `pricing.html`: pricing page with currency switcher and founding-client discount
- `pricing.js`: currency detection and conversion, discount, live exchange rates
- `styles.css`: all styling and responsive breakpoints
- `script.js`: mobile nav, scroll reveals, counters, contact form
- `brand/`: logo (SVG + PNG, light and dark), icon, favicons, LinkedIn profile picture and banner

## Preview locally
Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8000
```

## Customize before launch
1. **Brand**: replace "Vix Automations" throughout. The contact email is set to `peopleandenterpriseglobal@gmail.com`.
2. **About**: in the `#about` section, replace the "V" monogram with your photo (`<img>` inside `.about-photo`) and add your name and any certifications you genuinely hold.
3. **Founding-client offer**: make sure the reduced rates and the fix-it-free promise match what you'll honour.
4. **Reviews**: once real clients leave reviews, add them (and real results) in place of the founding-client section. Never publish invented reviews.
5. **Pricing**: package prices are the `data-usd` values in `pricing.html`. The discount percentage and the list of currencies are at the top of `pricing.js` (set `percent: 0` to turn the discount off).
6. **Contact form**: set `FORM_ENDPOINT` in `script.js` to a HighLevel inbound-webhook URL (or Formspree, etc.). If it's left empty, the form opens the visitor's email client. You can also replace the form with a HighLevel form or calendar embed.

## Deploy
Upload the three files to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages), or paste them into a HighLevel website page using custom code.
