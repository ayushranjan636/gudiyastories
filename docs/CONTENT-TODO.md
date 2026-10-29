# Content to confirm or supply

Everything here is either marked CONFIRM in the brief, missing from what we were given, or conflicts between the brief and the files received. Nothing on this list has been invented on the site. Where real content is missing, the site shows a clearly marked tag such as `[CONTENT NEEDED]`, `[REVIEW NEEDED]` or `[REVIEW BY OWNER]`.

## Catalogue (CONFIRM items from brief section 5)

- [ ] **Spread Love SKU**: seeded as `SL006`. Please confirm.
- [ ] **Focus: Nature Mandala Colouring Book (MCB007) ages**: seeded as 5+. Please confirm.
- [ ] **Focus: Fruits and Vegetables Mandala Colouring Book (FCB0010) ages**: seeded as 5+. Please confirm.
- [ ] **Fruits and Vegetables SKU `FCB0010`**: this has four digits where the other SKUs have three (`FCBP008`, `MCB007`). Is `FCB0010` correct, or should it be `FCB009` / `FCB010`?
- [ ] **Bundle prices (corrected)**. In the original sheet every set cost more than buying the books separately. Seeded with these suggested prices:

  | SKU | Set | Seeded price | Sum of singles | You save | MRP |
  | --- | --- | --- | --- | --- | --- |
  | SET-ADV3 | Adventure set of 3 | ₹399 | ₹450 | ₹51 | ₹597 |
  | SET-KIND3 | Kindness set of 3 | ₹399 | ₹440 | ₹41 | ₹568 |
  | SET-ALL6 | Complete story collection | ₹799 | ₹890 | ₹91 | ₹1,165 |
  | SET-FOCUS3 | Focus colouring set | ₹1,099 | ₹1,190 | ₹91 | ₹1,280 |

## Conflicts between the brief and the cover files

The covers print an age group that does not always match the brief. The site uses the brief's ages (from the product record) everywhere. Please tell us which is right; if the covers are right, we update the product records.

- [ ] **Mystical Landscapes of Donimalai**: brief says 8–13, cover says "10 years and up".
- [ ] **Cheers to Monday**: brief says 6–8, cover says "8 years & up".
- [ ] **Winter Wonderland**: brief says 7–10, cover says "8 years and up".
- [ ] **Pitfall Parade**: brief says 8–12, cover says "10 years and up".
- [ ] **Rainbow's Birthday Bash**: brief says 6–8, cover says "6 years and up" (close, but the brief has an upper limit).
- [ ] **Focus: Nature Mandala paper**: the brief says 220gsm for all colouring books; this cover says "Printed on 170gsm paper with perforation". Which is it? The home-page copy says 220gsm.
- [ ] **Spread Love cover** is landscape (wider than tall). The others are portrait. Is the book itself landscape? This affects the 3D book and the look-inside viewer.

## Images and brand files

- [ ] **High-resolution covers**. The covers we have are 370px wide, which looks soft on large screens and retina phones. Please send covers at least 1600px wide (PNG or JPG).
- [ ] **Bundle images** (or we compose them from the covers).
- [ ] **Look-inside spreads**: 3–4 real spreads per book.
- [ ] **Framed colouring pages**: photos of finished pages in frames, for the colouring section.
- [ ] **Logo source file** (SVG, AI, PDF or layered PSD). The current logo files on the site are cut from the PNG, with the green frame and stars removed (`scripts/derive-brand.mjs`). Nothing has been redrawn. We need the source for:
  - [ ] the wordmark on its own (it cannot be cut cleanly from the PNG because the letters arch around the doll),
  - [ ] the layered doll outline, book and butterflies for the logo line-draw animation (the site uses the PNG fallback reveal until then),
  - [ ] the left butterfly on its own.
- [ ] **Bharathi's signature** as a scan or SVG (for the author section).
- [ ] **Author photo**: we have a 600 × 800 black-and-white photo. A larger version would help.

## Content still to write

- [ ] **After the story cards**: one PDF per book, 3–5 questions each. Each book currently points at a placeholder PDF and the resource is unpublished.
- [ ] **Notes**: three draft posts are seeded with `[DRAFT – REPLACE]` titles.
- [ ] **"Good for" situations** per book (for example "first week of school").
- [ ] **Long descriptions** per book ("What it's about").
- [ ] **Reviews**: none yet. The site only shows real, approved reviews from verified purchases.
- [ ] **Amazon and Flipkart links** and marketplace SKUs, if listed there.

## Store details and settings

- [ ] Full postal address, contact email, phone and WhatsApp number (E.164, +91…).
- [ ] Opening stock count for every book. The seed does not create stock unless `SEED_DEMO_STOCK=true`, which adds labelled demo stock for development only.
- [ ] Shipping: flat rate, free-delivery threshold, whether COD is offered, and any COD fee.
- [ ] Shipping time and returns window for the trust strip and policy pages.
- [ ] Bulk price tiers for schools and CSR (25+, 100+, 500+ copies): the discount for each tier.
- [ ] Book weights and dimensions (for shipping) and cost prices (for margin reports).
- [ ] Social links: Instagram, Facebook, YouTube.
- [ ] Invoice/tax: confirm "Bill of Supply" and HSN 4901/4903 with your CA. `[CONFIRM WITH CA]`
- [ ] Policy pages (shipping, returns and refunds, privacy, terms) will be drafted and marked `[REVIEW BY OWNER]`.

## Added while building the site (October 2026)

- [ ] **Delivery charges**: the site uses ₹60 per order, free from ₹499 (after discount). Change in Admin → Settings → Delivery and payment.
- [ ] **Cash on delivery**: off by default. Turn on (and set any fee) in Admin → Settings.
- [ ] **Example "After the story" card** on the home and resources pages uses three questions we drafted for *Cheers to Monday*, labelled "Example". Replace with Bharathi's own card (`src/components/site/after-the-story-card.tsx`).
- [ ] **Policy pages** (`src/content/help.ts`): dispatch time, delivery time, damaged-book window and change-of-mind returns are marked `[CONFIRM]`. Razorpay needs these live before approving the account.
- [ ] **Postal address and GSTIN** for bills: Admin → Settings → Store details and Bills.
- [ ] **Bulk discount percentages** for 25+, 100+ and 500+ copies: Admin → Settings → Bulk price tiers. The For schools page currently says every bulk order is quoted individually.
- [ ] **Author-visit regions**: the For schools page says in-person sessions in Andhra Pradesh and Karnataka, online elsewhere. Please confirm.
- [ ] **Awards list** on the home and About pages is taken from the old site. The "Best Early Childhood Educator" award has no year; please add it if known.
- [ ] **Logo source file** is still needed for a fully layered animation. For now the hero rebuilds the arched "GUDIYA STORIES" lettering as live triple-line text and uses the PNG for the doll.
