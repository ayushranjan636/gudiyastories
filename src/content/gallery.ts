// Photos shown on the home and About pages. Edit captions here.
// Images live in /public/recognition and /public/gallery (enhanced copies of the originals).

export type Photo = { src: string; width: number; height: number; alt: string; caption: string; note?: string };

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
 * "See it in use" on the colouring book pages: short videos and photos from
 * Gudiya Stories' own posts. Videos are web-sized copies in /public/videos
 * (720p, a few MB each); the poster is the still shown before play.
 */
export type InUse =
  | { kind: "video"; src: string; poster: string; width: number; height: number; caption: string }
  | { kind: "photo"; src: string; width: number; height: number; alt: string; caption: string };

const v = (name: string, width: number, height: number, caption: string): InUse => ({ kind: "video", src: `/videos/${name}.mp4`, poster: `/videos/${name}.jpg`, width, height, caption });
const screenTime = v("reduce-screen-time", 720, 900, "Less screen time, more focus: the three Focus books.");

export const IN_USE: Record<string, InUse[]> = {
  "focus-nature-mandala-colouring-book": [
    v("mandala-parent-review", 720, 1280, "A parent on the Nature Mandala book."),
    v("focus-development-activity", 720, 720, "Why mandala colouring helps children focus."),
    { kind: "photo", src: "/readers/focus-nature-mandala-colouring-book.webp", width: 1400, height: 933, alt: "A girl sitting on a bench holding the Focus Nature Mandala Colouring Book", caption: "Ready to colour." },
  ],
  "focus-patterns-and-designs-level-1": [
    v("happy-reader", 720, 720, "A happy reader with her Patterns and Designs book."),
    { kind: "photo", src: "/readers/focus-patterns-and-designs-level-1.webp", width: 1400, height: 933, alt: "The Focus Patterns and Designs Level 1 book on a wooden table with a cup of tea", caption: "Twenty quiet minutes." },
    screenTime,
  ],
  "focus-fruits-and-vegetables-mandala-colouring-book": [
    v("improves-focus", 478, 850, "Mandala pages that improve focus."),
    { kind: "photo", src: "/readers/focus-fruits-and-vegetables-mandala-colouring-book.webp", width: 935, height: 1400, alt: "A smiling woman holding the green Focus Fruits and Vegetables Mandala Colouring Book", caption: "The Fruits and Vegetables book." },
    screenTime,
  ],
};
