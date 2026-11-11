// Where else the books are sold. Found on the marketplaces on 11 Nov 2026.
// A Flipkart or Amazon link typed into Admin → Products wins over the one here.

export const MYSTORE_SELLER_URL = "https://www.mystore.in/en/seller/gudiya-stories_a0rwe716_k9im2kmt";

const MYSTORE = "https://www.mystore.in/en/product/";
const FLIPKART = "https://www.flipkart.com/";

export const MARKETPLACES: Record<string, { mystore?: string; flipkart?: string }> = {
  "mystical-landscapes-of-donimalai": {
    mystore: `${MYSTORE}bedtime-story-book-on-wildlife-protection-and-environment-or-8-years-to-13-years-old-or-read-aloud-to-children-or-kids-story-telling-book`,
  },
  "cheers-to-monday": {
    mystore: `${MYSTORE}books-for-children-on-friendship-and-kindness-or-story-books-for-kids-or-bedtime-children-story-book-or-learning-book-for-6-years-to-12-years-kids`,
  },
  "winter-wonderland": {
    mystore: `${MYSTORE}bedtime-children-story-book-7-years-to-10-years-old-children-read-aloud-for-infants-or-short-english-stories-book`,
  },
  "pitfall-parade": {
    mystore: `${MYSTORE}bedtime-children-story-book-on-risk-taking-or-sibling-love-or-educational-learning-book-or-for-8-to-12-years-kids`,
    flipkart: `${FLIPKART}pitfall-parade-kids-story-book-risk-taking-educational-8-years/p/itmfcf9cbe818ded`,
  },
  "rainbows-birthday-bash": {
    mystore: `${MYSTORE}bedtime-kid-story-book-based-on-family-or-contentment-and-humbleness-or-children-story-book-for-6-to-10-years`,
  },
  "spread-love": {
    mystore: `${MYSTORE}children-story-book-on-love-or-promoting-peace-or-for-6-to-10-years-or-uplifting-eachother-or-english-educational-learning-book-or`,
    flipkart: `${FLIPKART}children-story-book-love-promoting-peace-6-10-years-uplifting-eachother-english-educational-learning/p/itmad0cded64e1d3`,
  },
  "focus-nature-mandala-colouring-book": {
    mystore: `${MYSTORE}nature-coloring-mandala-book-or-educational-book-for-kids-or-coloring-and-painting-book-or-interactive-fun-activities-and-exercise`,
    flipkart: `${FLIPKART}nature-coloring-mandala-book-kids-fun-activities-exercise/p/itmbb9a4b2b6f639`,
  },
  "focus-patterns-and-designs-level-1": {
    mystore: `${MYSTORE}pattern-and-design-book-for-kids-or-enhance-the-child-mind-with-cognitive-excellence-with-interactive-activity-books-or-for-5-to-8-years`,
  },
  "focus-fruits-and-vegetables-mandala-colouring-book": {
    mystore: `${MYSTORE}fruits-and-vegitables-colouring-mandala-book-for-kids-by-s-v-bharathi-fun-learning-and-colouring-book-for-kids-educational-copy-colouring-book-for-toddlers-creative-colouring-books`,
    flipkart: `${FLIPKART}fruits-vegitables-colouring-mandala-book-kids-creative-books/p/itma318f7f1f647f`,
  },
  "adventure-set-of-3": {
    mystore: `${MYSTORE}story-book-for-childeren-set-of-3-books-for-age-7-12-bedtime-story-books-short-english-stories-with-colourful-pictures-vocabulary-and-fonts-to-enhance-reading-skills`,
  },
  "kindness-set-of-3": {
    mystore: `${MYSTORE}story-books-for-kids-set-of-3-books-for-age-4-7-short-english-stories-phonic-stories-read-aloud-to-infants-toddlers`,
  },
  "complete-story-collection": {
    mystore: `${MYSTORE}story-book-for-kids-set-of-6-books-age-4-years-reading-book-bedtime-book-for-kids-informative-and-educational-story-book-for-kids-story-telling-book`,
  },
  "focus-colouring-set": {
    mystore: `${MYSTORE}creative-colouring-mandala-for-kids-set-of-3-books-for-age-5-years-colouring-activity-book-for-kids-educational-colouring-book-enhance-child-mind`,
  },
};

export type StoreLink = { name: "Amazon" | "Flipkart" | "Mystore"; url: string };

/** Other shops selling this book or set, in a fixed order. */
export function storeLinks(p: { slug: string; amazonUrl?: string | null; flipkartUrl?: string | null }): StoreLink[] {
  const m = MARKETPLACES[p.slug] ?? {};
  const links: (StoreLink | null)[] = [
    p.amazonUrl ? { name: "Amazon", url: p.amazonUrl } : null,
    p.flipkartUrl || m.flipkart ? { name: "Flipkart", url: (p.flipkartUrl || m.flipkart)! } : null,
    m.mystore ? { name: "Mystore", url: m.mystore } : null,
  ];
  return links.filter((l): l is StoreLink => l !== null);
}
