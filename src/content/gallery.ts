// Photos shown on the home and About pages. Edit captions here.
// Images live in /public/recognition and /public/gallery (enhanced copies of the originals).

export type Photo = { src: string; width: number; height: number; alt: string; caption: string; note?: string; /** Slug of the book the page comes from. */ book?: string };

export const MOMENTS: Photo[] = [
  {
    src: "/recognition/chief-minister-andhra-pradesh.jpg",
    width: 1212,
    height: 894,
    alt: "Gudiya Stories picture books, including Rainbows, being presented to the Chief Minister of Andhra Pradesh at a book table",
    caption: "Presenting our picture books to the Chief Minister of Andhra Pradesh.",
  },
  {
    src: "/recognition/aleap-exhibition.jpg",
    width: 1200,
    height: 902,
    alt: "A Focus colouring book being handed over at the Gudiya Stories table at an ALEAP exhibition",
    caption: "The Focus colouring books at the ALEAP exhibition.",
  },
];

export const READER_ART: Photo = {
  src: "/gallery/ostriches-coloured.jpg",
  width: 1738,
  height: 2044,
  alt: "Two ostriches drawn in intricate patterns, coloured by hand in pink, green, orange and blue sketch pen",
  caption: "Two ostriches, coloured by hand.",
  note: "Sketch pen on paper",
};

/**
 * "See it in use" on the book pages: short videos and photos from Gudiya
 * Stories' own posts. Videos are web-sized copies in /public/videos (720p, a
 * few MB each); the poster is the still shown before play. Ambient clips
 * (/public/readers/clips, ~2.5 s, no sound) loop by themselves while on screen.
 */
export type InUse =
  | { kind: "video"; src: string; poster: string; width: number; height: number; caption: string; ambient?: boolean }
  | { kind: "photo"; src: string; width: number; height: number; alt: string; caption: string };

const v = (name: string, width: number, height: number, caption: string): InUse => ({ kind: "video", src: `/videos/${name}.mp4`, poster: `/videos/${name}.webp`, width, height, caption });
const screenTime = v("reduce-screen-time", 720, 900, "Less screen time, more focus: the three Focus books.");
const storybooks = v("happy-reader", 720, 720, "Our storybooks with their young readers.");
const reviews = v("mandala-parent-review", 720, 1280, "What parents say about the storybooks and colouring books.");

/** A child holding the book: a short silent loop cut from the storybooks video. */
export const READER_CLIPS: Record<string, { src: string; poster: string; caption: string }> = Object.fromEntries(
  [
    ["rainbows-birthday-bash", "Rainbow's Birthday Bash, in a happy reader's hands."],
    ["pitfall-parade", "Pitfall Parade, held up with pride."],
    ["cheers-to-monday", "Cheers to Monday, out on the grass."],
    ["mystical-landscapes-of-donimalai", "Mystical Landscapes of Donimalai, ready for the next adventure."],
    ["winter-wonderland", "Winter Wonderland, with a reader who can't wait for Christmas."],
    ["spread-love", "Spread Love, on the reading table."],
  ].map(([slug, caption]) => [slug, { src: `/readers/clips/${slug}.mp4`, poster: `/readers/clips/${slug}.webp`, caption }]),
);
const clip = (slug: string): InUse => ({ kind: "video", ...READER_CLIPS[slug]!, width: 640, height: 640, ambient: true });

/** Pages from the Focus books, coloured in by readers (stills from Gudiya Stories' own posts). */
export const COLOURED: Photo[] = [
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/koala-mother-and-baby.webp", width: 1000, height: 1000, alt: "A mother and baby koala mandala page, coloured in pastel sketch pen and cut out", caption: "Koala and baby" },
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/horse.webp", width: 1000, height: 815, alt: "A horse mandala page with a mane coloured in every shade of the rainbow", caption: "Rainbow horse" },
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/bear.webp", width: 1000, height: 1000, alt: "A bear mandala page coloured in bright stripes of red, pink, green and blue", caption: "Striped bear" },
  { book: "focus-patterns-and-designs-level-1", src: "/readers/coloured/parrot-framed.webp", width: 630, height: 1000, alt: "A parrot and flowers mandala page, coloured and framed on a wall", caption: "Framed parrot" },
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/ostriches.webp", width: 1000, height: 1000, alt: "Two ostrich mandala pages, coloured and cut out", caption: "Ostrich pair" },
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/koala-pair.webp", width: 1000, height: 1000, alt: "Two koalas mandala page coloured in warm reds, greens and blues", caption: "Koala hug" },
  { book: "focus-fruits-and-vegetables-mandala-colouring-book", src: "/readers/coloured/grapes.webp", width: 868, height: 1000, alt: "A bunch of grapes mandala page, every grape coloured in a different pattern of purple, blue, orange and green", caption: "Patterned grapes" },
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/seahorse.webp", width: 617, height: 1000, alt: "A seahorse mandala page coloured in coral pink, lime green, orange and turquoise", caption: "Coral seahorse" },
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/heron.webp", width: 701, height: 1000, alt: "A heron mandala page with pink and yellow feathers and a scalloped blue and green neck", caption: "Pink heron" },
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/elephant.webp", width: 913, height: 1000, alt: "A front-facing elephant mandala page with ears and trunk coloured in rainbow stripes", caption: "Rainbow elephant" },
  { book: "focus-nature-mandala-colouring-book", src: "/readers/coloured/squirrel.webp", width: 970, height: 1000, alt: "A squirrel mandala page coloured in pink, orange and lime with a patterned tail", caption: "Squirrel and acorn" },
];

/** The six shown on the home page; all of them are on /gallery. */
export const HOME_COLOURED: Photo[] = [9, 0, 7, 10, 1, 6].map((i) => COLOURED[i]!);
const coloured = (i: number): InUse => ({ kind: "photo", ...COLOURED[i]!, caption: `Coloured by a reader: ${COLOURED[i]!.caption.toLowerCase()}.` });

export const IN_USE: Record<string, InUse[]> = {
  // Storybooks: the reader clip, the storybooks video, and parents' reviews.
  ...Object.fromEntries(Object.keys(READER_CLIPS).map((slug) => [slug, [clip(slug), storybooks, reviews]])),
  "focus-nature-mandala-colouring-book": [
    v("focus-development-activity", 720, 720, "Why mandala colouring helps children focus."),
    reviews,
    { kind: "photo", src: "/readers/focus-nature-mandala-colouring-book.webp", width: 1400, height: 933, alt: "A girl sitting on a bench holding the Focus Nature Mandala Colouring Book", caption: "Ready to colour." },
    coloured(0),
    coloured(9),
    coloured(10),
    coloured(7),
    coloured(8),
    coloured(4),
  ],
  "focus-patterns-and-designs-level-1": [
    screenTime,
    { kind: "photo", src: "/readers/focus-patterns-and-designs-level-1.webp", width: 1400, height: 933, alt: "The Focus Patterns and Designs Level 1 book on a wooden table with a cup of tea", caption: "Twenty quiet minutes." },
    coloured(3),
  ],
  "focus-fruits-and-vegetables-mandala-colouring-book": [
    v("improves-focus", 478, 850, "Mandala pages that improve focus."),
    { kind: "photo", src: "/readers/focus-fruits-and-vegetables-mandala-colouring-book.webp", width: 935, height: 1400, alt: "A smiling woman holding the green Focus Fruits and Vegetables Mandala Colouring Book", caption: "The Fruits and Vegetables book." },
    coloured(6),
    screenTime,
  ],
};

/** Sets: the clips of the books inside, then the storybooks video. */
export function inUseForSet(partSlugs: string[]): InUse[] {
  const clips = partSlugs.filter((s) => READER_CLIPS[s]).map(clip);
  return clips.length ? [...clips, storybooks] : [];
}

/** Longer videos for the home page, in the order they are shown. */
export const HOME_VIDEOS: InUse[] = [storybooks, v("focus-development-activity", 720, 720, "Inside the Focus colouring books."), reviews, screenTime];
