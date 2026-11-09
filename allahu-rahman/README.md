# Allahu Rahman Online Store

A fast storefront in plain HTML, CSS and JavaScript (no build step). Shoppers browse, pick colour, size and quantity, add to their bag, and send the full order to the store on WhatsApp in one tap.

## Files
- `index.html`: the store (hero, departments, product grid with filters/search/sort, best sellers, how to order, FAQ)
- `products.js`: **the only file you need for day to day edits**: store settings, categories and every product
- `store.js`: bag, wishlist, quick view, search, WhatsApp checkout
- `store.css`: all styling
- `privacy.html`, `terms.html` (includes returns policy), `404.html`
- `images/`: product photos

## Before launch
1. **WhatsApp number**: in `products.js`, set `whatsapp: "234XXXXXXXXXX"` (digits only, international format). Until it is set, WhatsApp asks the shopper to pick a contact.
2. **Prices**: only these came from your posts: chest freezer ₦250,000, crystal flat slides (M6874) ₦7,500, sparkle heel slides (5531) ₦9,000, jelly flip flops (S415R-3) ₦4,500. Every other price is an estimate. Check them all.
3. **Extra products**: clothing, baby wear and accessories use licensed stock photos (Unsplash) so the store looks full. Swap them for photos of your real stock, or delete products you don't carry.
4. **Policies**: read `terms.html` and make sure the delivery and returns rules match how you work.

## Adding a product
Copy any block in `products.js`, give it a new `id`, put the photo in `images/`, and set `cat` to one of: `clothing`, `shoes`, `slippers`, `bags`, `kids`, `accessories`, `home`.

## Preview
From the repo root: `python3 -m http.server 8000`, then open http://localhost:8000/allahu-rahman/
