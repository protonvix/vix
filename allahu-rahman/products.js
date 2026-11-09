/* =========================================================================
   Allahu Rahman Online Store: product catalogue
   -------------------------------------------------------------------------
   HOW TO EDIT
   - price      : selling price in Naira (numbers only, no commas)
   - oldPrice   : optional, shows a crossed out price
   - badge      : optional label on the photo ("New", "Best seller", "Hot deal")
   - colors     : list of { name, hex, img } (img is optional; when set the
                  photo switches when the shopper picks that colour)
   - sizes      : list of sizes, or [] when sizes do not apply
   - images go in the images/ folder
   Prices marked "confirmed" came from the store's own posts; the rest are
   starting estimates. Please check every price before launch.
   ========================================================================= */

window.STORE = {
  name: "Allahu Rahman Online Store",
  short: "Allahu Rahman",
  // Two WhatsApp lines, international format, digits only.
  //   orders: checkout, "order now", bulk/wholesale, new arrival alerts
  //   care:   questions, size help, delivery updates, returns
  whatsapp: {
    orders: { number: "2348164274103", display: "0816 427 4103", label: "Orders & sales" },
    care:   { number: "2347033121920", display: "0703 312 1920", label: "Customer care" },
  },
  email: "",
  currency: "₦",
};

window.CATEGORIES = [
  { id: "clothing",   name: "Clothing",           img: "images/womens-lifestyle.jpg", blurb: "Dresses, shirts and everyday layers" },
  { id: "shoes",      name: "Shoes & sneakers",   img: "images/crystal-bow-heels.jpg", blurb: "Heels, sneakers and slip ons" },
  { id: "slippers",   name: "Slippers & sandals", img: "images/max-crystal-slides.jpg", blurb: "Slides, flip flops and strap sandals" },
  { id: "bags",       name: "Bags",               img: "images/quilted-chain-bag-black.jpg", blurb: "Shoulder bags, totes and top handles" },
  { id: "kids",       name: "Baby & kids",        img: "images/kids-lifestyle.jpg", blurb: "Soft rompers, sets and kids outfits" },
  { id: "accessories",name: "Accessories",        img: "images/crescent-necklace.jpg", blurb: "Jewellery, watches and scarves" },
  { id: "home",       name: "Home & kitchen",     img: "images/gold-cutlery-set.jpg", blurb: "Cutlery, utensils and appliances" },
];

window.PRODUCTS = [
  /* ---------------- Shoes & sneakers ---------------- */
  {
    id: "crystal-bow-heels", name: "Crystal bow Mary Jane heels", cat: "shoes", price: 19500, badge: "New",
    img: "images/crystal-bow-heels.jpg",
    colors: [{ name: "Black patent", hex: "#111111" }, { name: "Silver", hex: "#C9CBD0" }, { name: "Champagne gold", hex: "#D9BF8C" }],
    sizes: ["37", "38", "39", "40", "41"],
    desc: "Rounded toe pumps with a crystal studded bow, ankle strap with buckle and a sculpted mid heel. Made for weddings, owambe and evenings out.",
  },
  {
    id: "rosette-bow-mules", name: "Rosette bow kitten heel mules", cat: "shoes", price: 15000, badge: "Best seller", code: "335-3",
    img: "images/rosette-bow-mules.jpg",
    colors: [{ name: "Gold", hex: "#CFAE5B" }, { name: "Silver", hex: "#C9CBD0" }, { name: "Black", hex: "#111111" }],
    sizes: ["37", "38", "39", "40", "41"],
    desc: "Square toe mules with a shimmer finish, a twisted rosette bow trimmed in stones, and a comfortable flared heel you can wear all day.",
  },
  {
    id: "cross-strap-block-heels", name: "Cross strap block heel sandals", cat: "shoes", price: 13500, code: "HW-00649",
    img: "images/cross-strap-block-heels.jpg",
    colors: [{ name: "Gold", hex: "#D6C08E" }, { name: "Black", hex: "#111111" }, { name: "White", hex: "#F3F1EC" }, { name: "Silver", hex: "#C9CBD0" }, { name: "Royal blue", hex: "#1E3FA8" }],
    sizes: ["37", "38", "39", "40", "41"],
    desc: "Slim crossover straps, an adjustable ankle buckle and a low block heel. Five colours that go from office to dinner.",
  },
  {
    id: "airflex-knit-slip-ons", name: "AirFlex knit slip on sneakers", cat: "shoes", price: 16000, badge: "Comfort pick", code: "HR01",
    img: "images/airflex-knit-slip-ons.jpg",
    colors: [{ name: "Wine", hex: "#7A1B2E" }, { name: "Mocha", hex: "#8B6A55" }, { name: "Black", hex: "#111111" }],
    sizes: ["37", "38", "39", "40", "41"],
    desc: "Breathable knit upper with a cross strap, air cushion heel and a light white sole. Slip on and walk all day.",
  },
  {
    id: "knit-platform-sneakers", name: "Cloud knit platform sneakers", cat: "shoes", price: 18500, badge: "New",
    img: "images/knit-platform-sneakers.jpg",
    colors: [{ name: "Black", hex: "#111111" }, { name: "Sand", hex: "#C4AE8E" }],
    sizes: ["40", "41", "42", "43", "44", "45"],
    desc: "Sock fit knit upper on a chunky ridged sole. Lightweight, easy to clean and built for long days on your feet.",
  },

  /* ---------------- Slippers & sandals ---------------- */
  {
    id: "max-crystal-slides", name: "Crystal cross strap flat slides", cat: "slippers", price: 7500, badge: "Hot deal", code: "M6874", confirmed: true,
    img: "images/max-crystal-slides.jpg",
    colors: [{ name: "Gold", hex: "#D8B865" }, { name: "Blue", hex: "#1E3FA8" }, { name: "Pewter", hex: "#9B9083" }, { name: "Black", hex: "#111111" }, { name: "White", hex: "#F3F1EC" }, { name: "Red", hex: "#C0202A" }, { name: "Tan", hex: "#A7663A" }],
    sizes: ["36", "37", "38", "39", "40", "41"],
    desc: "Woven crossover straps lined with sparkling stones on a cushioned flat sole. Seven colours to match every outfit.",
  },
  {
    id: "sparkle-heel-slides", name: "Sparkle wave low heel slides", cat: "slippers", price: 9000, badge: "Best seller", code: "5531", confirmed: true,
    img: "images/sparkle-heel-slides.jpg",
    colors: [{ name: "Black", hex: "#111111" }, { name: "Gold", hex: "#D8B865" }, { name: "Silver", hex: "#C9CBD0" }],
    sizes: ["38", "39", "40", "41", "42"],
    desc: "Scalloped upper covered in a wave pattern of stones, on a small sculpted gold heel. Dressy and easy to walk in.",
  },
  {
    id: "crystal-v-slides", name: "Crystal V emblem slides", cat: "slippers", price: 12000,
    img: "images/crystal-v-slides.jpg",
    colors: [{ name: "Black", hex: "#111111" }],
    sizes: ["37", "38", "39", "40", "41"],
    desc: "Black slide fully dusted with tiny crystals and finished with a polished gold V emblem. Padded footbed.",
  },
  {
    id: "buckle-comfort-slides", name: "Gold buckle comfort slides", cat: "slippers", price: 10500, badge: "New",
    img: "images/buckle-comfort-slides.jpg",
    colors: [{ name: "Black", hex: "#111111" }, { name: "Caramel", hex: "#B97A4A" }],
    sizes: ["37", "38", "39", "40", "41"],
    desc: "Soft cushioned platform with a wide textured strap and an antique gold square buckle. Light, quiet and easy to wear.",
  },
  {
    id: "mens-strap-sandals", name: "Men's sport strap sandals", cat: "slippers", price: 14000,
    img: "images/mens-strap-sandals.jpg",
    colors: [{ name: "Black", hex: "#111111" }],
    sizes: ["40", "41", "42", "43", "44", "45"],
    desc: "Adjustable hook and loop straps, a grippy lug sole and a back strap that keeps the sandal secure on the move.",
  },
  {
    id: "glossy-flip-flops", name: "Glossy jelly flip flops", cat: "slippers", price: 4500, code: "S415R-3", confirmed: true,
    img: "images/glossy-flip-flops.jpg",
    colors: [{ name: "Black", hex: "#111111" }, { name: "White", hex: "#F3F1EC" }, { name: "Cream", hex: "#DCD6C4" }, { name: "Lilac", hex: "#D9C1DB" }, { name: "Navy blue", hex: "#1E2E8F" }],
    sizes: ["37", "38", "39", "40", "41", "42"],
    desc: "High shine thong flip flops with a slim strap. Waterproof, easy to wipe clean and perfect for home, pool or quick errands.",
  },

  /* ---------------- Bags ---------------- */
  {
    id: "quilted-chain-bag", name: "Quilted chain shoulder bag", cat: "bags", price: 22000, badge: "Best seller",
    img: "images/quilted-chain-bag-black.jpg",
    colors: [{ name: "Black", hex: "#111111", img: "images/quilted-chain-bag-black.jpg" }, { name: "Ivory", hex: "#F1ECE2", img: "images/quilted-chain-bag-white.jpg" }],
    sizes: [],
    desc: "Soft quilted flap bag with a gold turn lock, leather woven chain strap and room for your phone, wallet and keys.",
  },
  {
    id: "signature-mini-totes", name: "Signature print mini tote", cat: "bags", price: 18000, badge: "New",
    img: "images/signature-mini-totes.jpg",
    colors: [{ name: "Brown", hex: "#7A604C" }, { name: "Sky blue", hex: "#9EB7CF" }, { name: "Pink", hex: "#E58AA6" }, { name: "Coffee", hex: "#3E2E26" }, { name: "Blush", hex: "#E9CFC4" }, { name: "Black", hex: "#1E1E1E" }],
    sizes: [],
    desc: "Structured mini tote in a signature print, with a top handle and a detachable long strap for crossbody wear. Six colours.",
  },
  {
    id: "woven-top-handle-bag", name: "Woven top handle bag", cat: "bags", price: 24500,
    img: "images/woven-top-handle-bag.jpg",
    colors: [{ name: "Tan", hex: "#C97A3D" }],
    sizes: [],
    desc: "Wicker body with smooth tan trims and a gold clasp. A standout piece for brunch, holidays and weekend outings.",
  },

  /* ---------------- Clothing ---------------- */
  {
    id: "burgundy-midi-dress", name: "Burgundy button midi dress", cat: "clothing", price: 21000, badge: "New",
    img: "images/burgundy-midi-dress.jpg",
    colors: [{ name: "Burgundy", hex: "#6E1A2B" }],
    sizes: ["S", "M", "L", "XL", "XXL"],
    desc: "Soft corduroy midi with a button front, gathered waist and full skirt. Modest, elegant and easy to style.",
  },
  {
    id: "floral-wrap-dress", name: "Floral wrap summer dress", cat: "clothing", price: 17500,
    img: "images/floral-wrap-dress.jpg",
    colors: [{ name: "White floral", hex: "#EDE6DC" }],
    sizes: ["S", "M", "L", "XL"],
    desc: "Light flowing wrap dress with a red floral print and flutter sleeves. Breathable for hot days.",
  },
  {
    id: "classic-white-shirt", name: "Classic white shirt", cat: "clothing", price: 12500,
    img: "images/classic-white-shirt.jpg",
    colors: [{ name: "White", hex: "#F7F7F5" }, { name: "Sky", hex: "#CFE0EE" }],
    sizes: ["S", "M", "L", "XL", "XXL"],
    desc: "Crisp long sleeve shirt with a clean collar. A wardrobe staple for work, church, mosque and events.",
  },
  {
    id: "mens-shirt-trio", name: "Men's long sleeve shirt", cat: "clothing", price: 13500, badge: "Bundle deal",
    img: "images/mens-shirt-trio.jpg",
    colors: [{ name: "White", hex: "#F3F3F1" }, { name: "Navy", hex: "#2B3446" }, { name: "Wine", hex: "#5B1F33" }],
    sizes: ["M", "L", "XL", "XXL"],
    desc: "Smart cotton blend shirts in three versatile colours. Ask about our price for any three together.",
  },
  {
    id: "essential-tee-white", name: "Essential crew neck tee", cat: "clothing", price: 6500,
    img: "images/essential-tee-white.jpg",
    colors: [{ name: "White", hex: "#F7F7F5", img: "images/essential-tee-white.jpg" }, { name: "Black", hex: "#111111", img: "images/essential-tee-black.jpg" }],
    sizes: ["S", "M", "L", "XL", "XXL"],
    desc: "Heavyweight cotton tee with a neat crew neck. Holds its shape wash after wash.",
  },
  {
    id: "leather-biker-jacket", name: "Leather look biker jacket", cat: "clothing", price: 32000,
    img: "images/leather-biker-jacket.jpg",
    colors: [{ name: "Black", hex: "#111111" }],
    sizes: ["M", "L", "XL"],
    desc: "Classic asymmetric zip jacket with silver hardware. Instant edge over any outfit.",
  },
  {
    id: "denim-jacket", name: "Corduroy collar denim jacket", cat: "clothing", price: 26500,
    img: "images/denim-jacket.jpg",
    colors: [{ name: "Indigo", hex: "#2E3C5A" }],
    sizes: ["M", "L", "XL", "XXL"],
    desc: "Dark wash denim jacket with a brown corduroy collar and button chest pockets.",
  },
  {
    id: "bomber-jacket", name: "Lightweight bomber jacket", cat: "clothing", price: 23500,
    img: "images/bomber-jacket.jpg",
    colors: [{ name: "Rust", hex: "#B5643C" }],
    sizes: ["M", "L", "XL"],
    desc: "Smooth bomber with ribbed cuffs and hem. Light enough for harmattan mornings and air conditioned offices.",
  },
  {
    id: "cozy-sweatshirt", name: "Cozy fleece sweatshirt", cat: "clothing", price: 14500,
    img: "images/cozy-sweatshirt.jpg",
    colors: [{ name: "White", hex: "#F7F7F5" }],
    sizes: ["S", "M", "L", "XL"],
    desc: "Brushed fleece inside, relaxed fit, dropped shoulders. Pairs with jeans or joggers.",
  },
  {
    id: "blush-cargo-trousers", name: "Blush tie waist trousers", cat: "clothing", price: 15500,
    img: "images/blush-cargo-trousers.jpg",
    colors: [{ name: "Blush", hex: "#D9A99B" }],
    sizes: ["S", "M", "L", "XL"],
    desc: "High waist trousers with a tie belt, utility pockets and cuffed ankles.",
  },
  {
    id: "knit-poncho", name: "Crochet fringe poncho", cat: "clothing", price: 11000,
    img: "images/knit-poncho.jpg",
    colors: [{ name: "Cream", hex: "#EDE3D0" }],
    sizes: ["Free size"],
    desc: "Open knit cover up with a fringe hem. Throw it over a dress or camisole.",
  },

  /* ---------------- Baby & kids ---------------- */
  {
    id: "baby-bear-romper", name: "Teddy ear hooded baby romper", cat: "kids", price: 9500, badge: "New",
    img: "images/baby-bear-romper.jpg",
    colors: [{ name: "Cocoa", hex: "#6B5A4E" }],
    sizes: ["0 to 3m", "3 to 6m", "6 to 12m", "12 to 18m"],
    desc: "Plush hooded romper with teddy ears and easy snap buttons for quick changes. Warm, soft and gentle on baby skin.",
  },
  {
    id: "baby-tee-gift-set", name: "Newborn gift set", cat: "kids", price: 16500, badge: "Gift idea",
    img: "images/baby-tee-gift-set.jpg",
    colors: [{ name: "White and sage", hex: "#E7EBDD" }],
    sizes: ["0 to 3m", "3 to 6m", "6 to 12m"],
    desc: "Cotton tee, knit bobble hat and a soft teddy, packed ready to gift for naming ceremonies and baby showers.",
  },
  {
    id: "boys-smart-outfit", name: "Boys smart cardigan set", cat: "kids", price: 14000,
    img: "images/boys-smart-outfit.jpg",
    colors: [{ name: "Navy and blue", hex: "#24345C" }],
    sizes: ["2 to 3y", "4 to 5y", "6 to 7y", "8 to 9y"],
    desc: "Cardigan, shirt, bow tie and shorts. Ready for birthdays, Sallah and family photos.",
  },
  {
    id: "kids-tracksuit", name: "Kids colour block tracksuit", cat: "kids", price: 12000,
    img: "images/kids-tracksuit.jpg",
    colors: [{ name: "Green and navy", hex: "#2F7A5B" }],
    sizes: ["4 to 5y", "6 to 7y", "8 to 9y", "10 to 11y"],
    desc: "Zip up jacket and joggers in a sporty colour block. Built for play.",
  },

  /* ---------------- Accessories ---------------- */
  {
    id: "crescent-necklace", name: "Crescent moon layered necklace", cat: "accessories", price: 8500,
    img: "images/crescent-necklace.jpg",
    colors: [{ name: "Gold", hex: "#C9A24E" }],
    sizes: [],
    desc: "Two layer gold tone chain with a teal stone pendant and a crescent charm.",
  },
  {
    id: "rose-gold-bracelet", name: "Rose gold crystal bracelet", cat: "accessories", price: 7000,
    img: "images/rose-gold-bracelet.jpg",
    colors: [{ name: "Rose gold", hex: "#D49B7D" }],
    sizes: [],
    desc: "Delicate linked bracelet set with clear crystals. A thoughtful gift that arrives in a pouch.",
  },
  {
    id: "classic-watch", name: "Rose gold leather strap watch", cat: "accessories", price: 19000,
    img: "images/classic-watch.jpg",
    colors: [{ name: "Rose gold", hex: "#D49B7D" }],
    sizes: [],
    desc: "Clean dial with slim hands, a rose gold case and a soft leather strap.",
  },
  {
    id: "silk-scarf", name: "Printed satin scarf", cat: "accessories", price: 5500,
    img: "images/silk-scarf.jpg",
    colors: [{ name: "Multicolour", hex: "#3E8E5E" }],
    sizes: [],
    desc: "Smooth satin scarf in a bold print. Wear it as a head wrap, neck scarf or bag accent.",
  },

  /* ---------------- Home & kitchen ---------------- */
  {
    id: "chest-freezer-158l", name: "158 litre chest freezer", cat: "home", price: 250000, badge: "Big deal", confirmed: true,
    img: "images/chest-freezer-158l.jpg",
    colors: [{ name: "Silver grey", hex: "#7A7C80" }],
    sizes: [],
    desc: "Energy saving chest freezer with a 158 litre capacity, removable wire basket and adjustable thermostat. Brand new and boxed.",
  },
  {
    id: "gold-cutlery-set", name: "24 piece gold cutlery set with stand", cat: "home", price: 15000, badge: "Best seller",
    img: "images/gold-cutlery-set.jpg",
    colors: [{ name: "Gold", hex: "#D4AF37" }],
    sizes: [],
    desc: "Six each of knives, forks, spoons and teaspoons in a mirror gold finish, with a matching hanging rack. Arrives gift boxed.",
  },
  {
    id: "kitchen-utensil-set", name: "Stainless steel kitchen utensil set", cat: "home", price: 9500,
    img: "images/kitchen-utensil-set.jpg",
    colors: [{ name: "Steel and wood", hex: "#B8A07A" }],
    sizes: [],
    desc: "Soup ladle, skimmer, serving spoons and knife with comfortable wood effect handles. Everything you need for stew and jollof day.",
  },
  {
    id: "rotating-scrub-brush", name: "2 in 1 rotating floor scrub brush", cat: "home", price: 6500,
    img: "images/rotating-scrub-brush.jpg",
    colors: [{ name: "Yellow and green", hex: "#E3A72F" }],
    sizes: [],
    desc: "Stiff bristle brush and rubber squeegee in one head that rotates 120 degrees, with a long steel handle for tiles, bathrooms and corners.",
  },
];
