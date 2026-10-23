# Vix Automations: GoHighLevel Expert Website

A fast, responsive one-page marketing site for a GoHighLevel (HighLevel) consultant or agency. It's plain HTML, CSS and JavaScript with no build step.

## Files
- `index.html`: page content (hero, services, process, results, testimonials, pricing, FAQ, contact)
- `styles.css`: all styling and responsive breakpoints
- `script.js`: mobile nav, scroll reveals, counters, testimonial slider, contact form

## Preview locally
Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8000
```

## Customize before launch
1. **Brand**: replace "Vix Automations" and `hello@vixautomations.com` throughout.
2. **Proof**: the case studies, testimonials and headline stats are **sample placeholders**. Swap in real client results.
3. **Pricing**: adjust packages in the `#pricing` section.
4. **Contact form**: set `FORM_ENDPOINT` in `script.js` to a HighLevel inbound-webhook URL (or Formspree, etc.). If it's left empty, the form opens the visitor's email client. You can also replace the form with a HighLevel form or calendar embed.

## Deploy
Upload the three files to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages), or paste them into a HighLevel website page using custom code.
