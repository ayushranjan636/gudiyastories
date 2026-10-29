// Catalogue seed data, from docs/brief.md section 5.
// Prices here are in rupees for readability. The seed converts them to paise.
// Anything marked confirm: true is also listed in docs/CONTENT-TODO.md.

export type ValueSlug = "kindness" | "courage" | "family" | "nature" | "joy" | "focus";

export const VALUES: { slug: ValueSlug; name: string; description: string }[] = [
  { slug: "kindness", name: "Kindness", description: "For learning to notice how other people feel." },
  { slug: "courage", name: "Courage", description: "For trying the hard thing, and trying again." },
  { slug: "family", name: "Family", description: "For grandparents, siblings and the people at home." },
  { slug: "nature", name: "Nature", description: "For children who should know where the forest ends." },
  { slug: "joy", name: "Joy", description: "For laughing out loud at bedtime." },
  { slug: "focus", name: "Focus", description: "For slowing down with a pencil and twenty quiet minutes." },
];

const STORY_PAPER = "300gsm art paper, matte lamination";
const COLOURING_PAPER = "220gsm drawing paper, perforated, paperback";

export type SeedBook = {
  sku: string;
  slug: string;
  title: string;
  type: "STORY" | "COLOURING";
  ageMin: number;
  ageMax: number | null; // null = "ageMin+"
  values: ValueSlug[];
  pages: number;
  paper: string;
  isbn: string;
  priceRupees: number;
  mrpRupees: number;
  publishedOn: string; // YYYY-MM-DD
  shortDescription: string;
  cover: { src: string; width: number; height: number; alt: string };
  /** Pages shown in "Look inside", after the cover (sample pages, then the back cover). */
  inside?: { src: string; width: number; height: number; alt: string }[];
  spineColor: string;
  confirm?: string[];
};

export const BOOKS: SeedBook[] = [
  {
    sku: "MLD001",
    slug: "mystical-landscapes-of-donimalai",
    title: "Mystical Landscapes of Donimalai",
    type: "STORY",
    ageMin: 8,
    ageMax: 13,
    values: ["nature", "courage"],
    pages: 16,
    paper: STORY_PAPER,
    isbn: "978-93-340-2851-5",
    priceRupees: 150,
    mrpRupees: 199,
    publishedOn: "2024-03-26",
    shortDescription:
      "Rani and her friends hike into the Donimalai valley and find it needs looking after. A story about courage, working as a team, and leaving a forest cleaner than you found it.",
    cover: {
      src: "/books/mystical-landscapes-of-donimalai.webp",
      width: 800,
      height: 1132,
      alt: "Cover of Mystical Landscapes of Donimalai: green hills with a sunflower, birds, butterflies and pink flowers.",
    },
    inside: [
      { src: "/books/inside/mystical-landscapes-of-donimalai-back.webp", width: 800, height: 1132, alt: "Back cover of Mystical Landscapes of Donimalai" },
    ],
    spineColor: "#6E9F45",
  },
  {
    sku: "CTM002",
    slug: "cheers-to-monday",
    title: "Cheers to Monday",
    type: "STORY",
    ageMin: 6,
    ageMax: 8,
    values: ["kindness", "family"],
    pages: 12,
    paper: STORY_PAPER,
    isbn: "978-93-340-3675-6",
    priceRupees: 130,
    mrpRupees: 179,
    publishedOn: "2024-03-26",
    shortDescription:
      "A girl and her mother get ready for a new school week. A gentle story for children who find Mondays hard, and an easy way into talking about saying goodbye at the school gate.",
    cover: {
      src: "/books/cheers-to-monday.webp",
      width: 800,
      height: 1132,
      alt: "Cover of Cheers to Monday: a mother in a pink sari walks her daughter in school uniform under a flowering tree.",
    },
    inside: [
      { src: "/books/inside/cheers-to-monday-back.webp", width: 800, height: 1132, alt: "Back cover of Cheers to Monday" },
    ],
    spineColor: "#F2B91E",
  },
  {
    sku: "WW003",
    slug: "winter-wonderland",
    title: "Winter Wonderland",
    type: "STORY",
    ageMin: 7,
    ageMax: 10,
    values: ["joy"],
    pages: 16,
    paper: STORY_PAPER,
    isbn: "978-93-340-3216-1",
    priceRupees: 150,
    mrpRupees: 199,
    publishedOn: "2024-03-26",
    shortDescription:
      "Santa takes the children to the North Pole for a winter of snow and silly jokes. A light, funny read for the festive season.",
    cover: {
      src: "/books/winter-wonderland.webp",
      width: 800,
      height: 1100,
      alt: "Cover of Winter Wonderland: Santa winks beside a North Pole signpost in a snowy forest.",
    },
    inside: [
      { src: "/books/inside/winter-wonderland-back.webp", width: 800, height: 1100, alt: "Back cover of Winter Wonderland" },
    ],
    spineColor: "#C9A23A",
  },
  {
    sku: "PP004",
    slug: "pitfall-parade",
    title: "Pitfall Parade",
    type: "STORY",
    ageMin: 8,
    ageMax: 12,
    values: ["courage", "family"],
    pages: 16,
    paper: STORY_PAPER,
    isbn: "978-93-340-4463-8",
    priceRupees: 150,
    mrpRupees: 199,
    publishedOn: "2024-03-26",
    shortDescription:
      "Three siblings set out on a bike ride and discover halfway down the hill that the brakes don't work. About taking risks, not giving up, and getting each other home.",
    cover: {
      src: "/books/pitfall-parade.webp",
      width: 800,
      height: 1128,
      alt: "Cover of Pitfall Parade: two muddy schoolgirls laugh under a tree with parrots, next to a pink bicycle.",
    },
    inside: [
      { src: "/books/inside/pitfall-parade-back.webp", width: 800, height: 1128, alt: "Back cover of Pitfall Parade" },
    ],
    spineColor: "#7FAFD8",
  },
  {
    sku: "RBB005",
    slug: "rainbows-birthday-bash",
    title: "Rainbow's Birthday Bash",
    type: "STORY",
    ageMin: 6,
    ageMax: 8,
    values: ["family", "joy"],
    pages: 12,
    paper: STORY_PAPER,
    isbn: "978-93-340-4105-7",
    priceRupees: 130,
    mrpRupees: 179,
    publishedOn: "2024-03-26",
    shortDescription:
      "It's Rainbow the unicorn's birthday, with grandparents, friends and far too many balloons. A story about family, being happy with what you have, and staying humble.",
    cover: {
      src: "/books/rainbows-birthday-bash.webp",
      width: 800,
      height: 1132,
      alt: "Cover of Rainbow's Birthday Bash: a pink unicorn in a party hat holds two heart-shaped balloons.",
    },
    inside: [
      { src: "/books/inside/rainbows-birthday-bash-back.webp", width: 800, height: 1132, alt: "Back cover of Rainbow's Birthday Bash" },
    ],
    spineColor: "#E0569E",
  },
  {
    sku: "SL006",
    slug: "spread-love",
    title: "Spread Love",
    type: "STORY",
    ageMin: 6,
    ageMax: 8,
    values: ["kindness"],
    pages: 16,
    paper: STORY_PAPER,
    isbn: "978-93-340-4516-1",
    priceRupees: 180,
    mrpRupees: 210,
    publishedOn: "2024-03-26",
    shortDescription:
      "Lolly and Polly are twin birds who look exactly alike and think nothing alike. A story about respecting differences and lifting each other up.",
    cover: {
      src: "/books/spread-love.webp",
      width: 1100,
      height: 777,
      alt: "Cover of Spread Love: two red and green parrots sit on a branch against a sky of yellow and blue.",
    },
    inside: [
      { src: "/books/inside/spread-love-back.webp", width: 1100, height: 777, alt: "Back cover of Spread Love" },
    ],
    spineColor: "#E3C53C",
    confirm: ["SKU SL006"],
  },
  {
    sku: "MCB007",
    slug: "focus-nature-mandala-colouring-book",
    title: "Focus: Nature Mandala Colouring Book",
    type: "COLOURING",
    ageMin: 5,
    ageMax: null,
    values: ["focus", "nature"],
    pages: 36,
    paper: COLOURING_PAPER,
    isbn: "978-93-341-9159-2",
    priceRupees: 350,
    mrpRupees: 380,
    publishedOn: "2024-12-26",
    shortDescription:
      "Leaves, birds and flowers drawn as mandalas, from simple to detailed. Thirty-six perforated pages to colour, tear out and frame.",
    cover: {
      src: "/books/focus-nature-mandala-colouring-book.webp",
      width: 800,
      height: 1011,
      alt: "Cover of Focus: Nature Mandala Colouring Book: line drawings of a koala with its baby and two ostriches below a blue heart.",
    },
    inside: [
      { src: "/books/inside/focus-nature-mandala-colouring-book-back.webp", width: 800, height: 1011, alt: "Back cover of Focus: Nature Mandala Colouring Book" },
    ],
    spineColor: "#8DB6E6",
    confirm: ["Ages 5+", "Paper weight: the cover says 170gsm, the brief says 220gsm"],
  },
  {
    sku: "FCBP008",
    slug: "focus-patterns-and-designs-level-1",
    title: "Focus: Patterns and Designs, Level 1",
    type: "COLOURING",
    ageMin: 5,
    ageMax: 8,
    values: ["focus"],
    pages: 36,
    paper: COLOURING_PAPER,
    isbn: "978-93-341-9605-4",
    priceRupees: 420,
    mrpRupees: 450,
    publishedOn: "2024-12-26",
    shortDescription:
      "Repeating shapes, sorting by size and pattern-building, disguised as colouring. Early maths thinking for ages 5 to 8.",
    cover: {
      src: "/books/focus-patterns-and-designs-level-1.webp",
      width: 800,
      height: 1011,
      alt: "Cover of Focus: Patterns and Designs, Level 1: a row of patterned feather line drawings below a pink heart.",
    },
    inside: [
      { src: "/books/inside/focus-patterns-and-designs-level-1-1.webp", width: 800, height: 1011, alt: "Inside Focus: Patterns and Designs, Level 1: Cupcakes in rows, ready to colour" },
      { src: "/books/inside/focus-patterns-and-designs-level-1-2.webp", width: 800, height: 1011, alt: "Inside Focus: Patterns and Designs, Level 1: Flowers, leaves and a butterfly in a repeating pattern" },
      { src: "/books/inside/focus-patterns-and-designs-level-1-3.webp", width: 800, height: 1011, alt: "Inside Focus: Patterns and Designs, Level 1: Koalas climbing bamboo" },
      { src: "/books/inside/focus-patterns-and-designs-level-1-4.webp", width: 800, height: 1011, alt: "Inside Focus: Patterns and Designs, Level 1: Cactus shapes to colour and compare" },
      { src: "/books/inside/focus-patterns-and-designs-level-1-back.webp", width: 800, height: 1011, alt: "Back cover of Focus: Patterns and Designs, Level 1" },
    ],
    spineColor: "#D7B4DD",
  },
  {
    sku: "FCB0010",
    slug: "focus-fruits-and-vegetables-mandala-colouring-book",
    title: "Focus: Fruits and Vegetables Mandala Colouring Book",
    type: "COLOURING",
    ageMin: 5,
    ageMax: null,
    values: ["focus", "nature"],
    pages: 36,
    paper: COLOURING_PAPER,
    isbn: "978-93-342-5137-1",
    priceRupees: 420,
    mrpRupees: 450,
    publishedOn: "2024-12-26",
    shortDescription:
      "Everyday fruits and vegetables turned into mandalas. A calm way to practise colour, shape and fine motor control.",
    cover: {
      src: "/books/focus-fruits-and-vegetables-mandala-colouring-book.webp",
      width: 800,
      height: 1011,
      alt: "Cover of Focus: Fruits and Vegetables Mandala Colouring Book: line drawings of a turtle, a bird and vegetables on a green background.",
    },
    inside: [
      { src: "/books/inside/focus-fruits-and-vegetables-mandala-colouring-book-1.webp", width: 800, height: 1011, alt: "Inside Focus: Fruits and Vegetables Mandala Colouring Book: An avocado drawn as a mandala" },
      { src: "/books/inside/focus-fruits-and-vegetables-mandala-colouring-book-2.webp", width: 800, height: 1011, alt: "Inside Focus: Fruits and Vegetables Mandala Colouring Book: A bell pepper drawn as a mandala" },
      { src: "/books/inside/focus-fruits-and-vegetables-mandala-colouring-book-3.webp", width: 800, height: 1011, alt: "Inside Focus: Fruits and Vegetables Mandala Colouring Book: A strawberry drawn as a mandala" },
      { src: "/books/inside/focus-fruits-and-vegetables-mandala-colouring-book-back.webp", width: 800, height: 1011, alt: "Back cover of Focus: Fruits and Vegetables Mandala Colouring Book" },
    ],
    spineColor: "#A9C95A",
    confirm: ["Ages 5+"],
  },
];

export type SeedBundle = {
  sku: string;
  slug: string;
  title: string;
  componentSkus: string[];
  priceRupees: number; // corrected price, CONFIRM
  mrpRupees: number;
  shortDescription: string;
  /** Offer picture used when the set's link is shared (WhatsApp, Instagram, Facebook). */
  shareImage?: { src: string; width: number; height: number; alt: string };
};

// Corrected prices (CONFIRM). The client's sheet priced every set above the sum of singles.
export const BUNDLES: SeedBundle[] = [
  {
    sku: "SET-ADV3",
    slug: "adventure-set-of-3",
    shareImage: { src: "/sets/adventure-set-of-3.jpg", width: 800, height: 1000, alt: "Special offer: set of 3 story books, Pitfall Parade, Winter Wonderland and Mystical Landscapes of Donimalai" },
    title: "Adventure set of 3",
    componentSkus: ["MLD001", "WW003", "PP004"],
    priceRupees: 399,
    mrpRupees: 597,
    shortDescription: "Mystical Landscapes of Donimalai, Winter Wonderland and Pitfall Parade in one set.",
  },
  {
    sku: "SET-KIND3",
    slug: "kindness-set-of-3",
    shareImage: { src: "/sets/kindness-set-of-3.jpg", width: 800, height: 1000, alt: "Special offer: set of 3 story books, Spread Love, Cheers to Monday and Rainbow's Birthday Bash" },
    title: "Kindness set of 3",
    componentSkus: ["CTM002", "RBB005", "SL006"],
    priceRupees: 399,
    mrpRupees: 568,
    shortDescription: "Cheers to Monday, Rainbow's Birthday Bash and Spread Love in one set.",
  },
  {
    sku: "SET-ALL6",
    slug: "complete-story-collection",
    shareImage: { src: "/sets/complete-story-collection.jpg", width: 800, height: 1000, alt: "Special offer: set of all 6 Gudiya Stories picture books" },
    title: "Complete story collection",
    componentSkus: ["MLD001", "CTM002", "WW003", "PP004", "RBB005", "SL006"],
    priceRupees: 799,
    mrpRupees: 1165,
    shortDescription: "All six Gudiya Stories picture books in one set.",
  },
  {
    sku: "SET-FOCUS3",
    slug: "focus-colouring-set",
    title: "Focus colouring set",
    componentSkus: ["MCB007", "FCBP008", "FCB0010"],
    priceRupees: 1099,
    mrpRupees: 1280,
    shortDescription: "All three Focus colouring books: Nature Mandala, Patterns and Designs Level 1, and Fruits and Vegetables Mandala.",
  },
];
