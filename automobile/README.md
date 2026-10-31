# Famous Automobile website

Cinematic one-page site for Famous Automobile, Ojodu, Lagos. Plain HTML, CSS and JavaScript, no build step.

## Files
- `index.html`: the page (hero, brands, categories, showroom, spotlight, why us, how it works, booking, map, FAQ, footer)
- `styles.css`: all styling (colours are tokens at the top)
- `app.js`: **edit `CONFIG` (WhatsApp number, phone, email, social links) and `CARS` (the car list) at the top**
- `legal.html`: privacy policy and terms of sale
- `404.html`: page not found
- `assets/`: logo, favicons, share image and car photos (`assets/cars/`)

## Before showing it live
1. Put the real WhatsApp number, phone and email in `CONFIG` in `app.js`.
2. Put the real Instagram, Facebook, TikTok, X and YouTube links in `CONFIG.socials`.
3. Replace the stock photos in `assets/cars/` with photos of their real cars (keep the same file names, or update `img` in `CARS`).
4. Update `CARS` to match what is really in stock.
5. Confirm opening hours and the services listed in "Why Famous Automobile" (inspection, payment plans, trade in, delivery).

## Preview
```bash
cd automobile && python3 -m http.server 8000
```
Then open http://localhost:8000.
