// Landing pages for what parents search for ("books about kindness for kids",
// "return gifts for a birthday"). Each lives at /books/<slug> next to the book
// pages, so a book must never be given one of these slugs.

import type { CatalogueProduct } from "@/features/catalogue/types";

export type Collection = {
  slug: string;
  /** Shown in the browser tab and search results; the site adds " · Gudiya Stories". */
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string[];
  /** Which books and sets to show, in order. */
  pick: (p: CatalogueProduct) => boolean;
  sort?: (a: CatalogueProduct, b: CatalogueProduct) => number;
  /** Extra sections of helpful text below the books. */
  sections: { h: string; body: string[] }[];
  faqs: { q: string; a: string }[];
};

const overlaps = (p: CatalogueProduct, lo: number, hi: number) => p.ageMin != null && p.ageMin <= hi && (p.ageMax == null || p.ageMax >= lo);
const setsLast = (a: CatalogueProduct, b: CatalogueProduct) => Number(a.type === "BUNDLE") - Number(b.type === "BUNDLE");
const cheapestFirst = (a: CatalogueProduct, b: CatalogueProduct) => a.pricePaise - b.pricePaise;

export const COLLECTIONS: Collection[] = [
  {
    slug: "kindness",
    title: "Books About Kindness for Kids",
    description:
      "Picture books about kindness, friendship and respect for children aged 6 to 8, by an early-years teacher in India. Short, gentle reads with questions to talk about.",
    eyebrow: "Books about kindness",
    h1: "Books about kindness for kids",
    intro: [
      "Kindness is easier to learn from a story than from a rule. When a child watches a character notice that a friend is sad, help without being asked, or make up after a quarrel, they get a picture of what kindness looks like, and words for it they can use the next day.",
      "These Gudiya Stories picture books are written by S.V. Bharathi, an early-years teacher in Tirupati, for children aged about 6 to 8. Each one is short enough for one sitting and ends in a natural place to stop and talk: how did she feel, what would you have done, who helped?",
    ],
    pick: (p) => p.values.includes("kindness"),
    sort: setsLast,
    sections: [
      {
        h: "How to read a kindness book with your child",
        body: [
          "Read it once just for the story. On the second read, pause at the moment someone is kind and ask your child what they noticed. Children often spot more than we expect.",
          "Connect it to their day. \"Did anyone help you at school today?\" or \"Who could you help tomorrow?\" turns the story into something they do, not just something they heard.",
          "Keep it light. Kindness books work best when nobody is being told off. Save them for a calm moment, not straight after a fight.",
        ],
      },
    ],
    faqs: [
      { q: "What age are these kindness books for?", a: "Ages 6 to 8. Younger children enjoy them read aloud; older children can read them on their own." },
      { q: "Which kindness book should I start with?", a: "Cheers to Monday if your child is nervous about school; Spread Love for siblings or friends who are often compared; Rainbow's Birthday Bash around a birthday. The Kindness set of 3 has all three." },
      { q: "Are the books written in Indian English?", a: "Yes. They're written and printed in India, with Indian names, school uniforms and settings children here recognise." },
    ],
  },
  {
    slug: "courage",
    title: "Books About Courage for Children",
    description:
      "Adventure story books about courage, bravery and never giving up, for children aged 8 to 13. Written by an early-years teacher and printed in India.",
    eyebrow: "Books about courage",
    h1: "Books about courage for children",
    intro: [
      "Courage in a children's book doesn't have to mean dragons. It can be three siblings on a bicycle with no brakes, or a group of friends who decide to clean up a forest that everyone else walks past. Children recognise that kind of bravery, because it's the kind they're asked for every day: trying the hard thing, and trying again.",
      "These Gudiya Stories books are written for confident readers aged about 8 to 13. They're adventures first, with real excitement, and they leave you with an easy question to ask afterwards: was that brave, or just risky? What would you have done?",
    ],
    pick: (p) => p.values.includes("courage"),
    sort: setsLast,
    sections: [
      {
        h: "Talking about courage after the story",
        body: [
          "Ask what the brave moment was. Children often pick something different from the obvious one, like asking for help or saying sorry.",
          "Talk about good risks and silly risks. Adventure stories are a safe place to ask where the line is.",
          "Share a time you were scared and did it anyway. Children remember those stories for years.",
        ],
      },
    ],
    faqs: [
      { q: "What age are these courage books for?", a: "Ages 8 to 13. Pitfall Parade suits 8 to 12; Mystical Landscapes of Donimalai suits 8 to 13." },
      { q: "Are they scary?", a: "They're exciting rather than frightening, and both end with the children looking after each other." },
      { q: "Is there a set?", a: "Yes. The Adventure set of 3 has both courage books plus Winter Wonderland, at a lower price than buying them separately." },
    ],
  },
  {
    slug: "age-6-8",
    title: "Picture Books for 6 to 8 Year Olds",
    description:
      "Picture books and colouring books for 6, 7 and 8 year olds: stories about kindness, family and school, written by an early-years teacher in India.",
    eyebrow: "Ages 6 to 8",
    h1: "Picture books for 6 to 8 year olds",
    intro: [
      "Six to eight is when children move from being read to, to reading on their own. The best books for this age have big pictures and short pages, but stories with a real feeling in them: being nervous on a Monday, a sibling who thinks differently, a birthday that doesn't go to plan.",
      "Every Gudiya Stories picture book for this age is 12 to 16 pages on thick, matte paper that survives a school bag. They're written by S.V. Bharathi, who has taught early-years classrooms for more than fifteen years and reads every draft aloud to children before it's printed.",
    ],
    pick: (p) => overlaps(p, 6, 8),
    sort: setsLast,
    sections: [
      {
        h: "Choosing a book for a 6, 7 or 8 year old",
        body: [
          "For a child starting a new school or class: Cheers to Monday.",
          "For siblings, twins or best friends: Spread Love.",
          "For a birthday, or as a return gift: Rainbow's Birthday Bash.",
          "For quiet time without a screen: one of the Focus colouring books.",
        ],
      },
    ],
    faqs: [
      { q: "Can a 6 year old read these alone?", a: "Many can, with a little help on new words. Reading together first, then letting them read it back to you, works well." },
      { q: "Are these good for a 5 year old?", a: "Read aloud, yes. The colouring books start at age 5." },
      { q: "How thick are the pages?", a: "The picture books are printed on 300gsm art paper with a matte laminated cover, so they last." },
    ],
  },
  {
    slug: "age-8-12",
    title: "Story Books for 8 to 12 Year Olds",
    description:
      "Adventure and nature story books for children aged 8 to 12: courage, teamwork and looking after the forest. Written by an early-years teacher in India.",
    eyebrow: "Ages 8 to 12",
    h1: "Story books for 8 to 12 year olds",
    intro: [
      "Children aged 8 to 12 want stories where something is actually at stake: a hill with no brakes at the bottom, a valley that needs saving. They also like characters their own age making real decisions.",
      "These Gudiya Stories books are short enough to finish in an evening, which makes them a good bridge for children who aren't yet reading long chapter books, and they work well for class reading in grades 3 to 7.",
    ],
    pick: (p) => overlaps(p, 8, 12),
    sort: setsLast,
    sections: [
      {
        h: "For teachers and school libraries",
        body: [
          "Mystical Landscapes of Donimalai fits Environment Day and Wildlife Week. Pitfall Parade opens a good class talk about risk and safety. We offer bulk prices, bookplates with your school's name, and reading sessions with the author on the For schools page.",
        ],
      },
    ],
    faqs: [
      { q: "Are these chapter books?", a: "No. They're illustrated story books of about 16 pages, quick to read on their own and good for reluctant readers." },
      { q: "Is Winter Wonderland for this age?", a: "Yes, for 7 to 10 year olds. It's the light, funny one: Santa's adventure at the North Pole." },
      { q: "Can schools order in bulk?", a: "Yes. See the For schools page or message us on WhatsApp." },
    ],
  },
  {
    slug: "return-gifts",
    title: "Book Return Gifts for Kids' Birthday Parties",
    description:
      "Children's books as birthday return gifts: illustrated story books from ₹130, printed in India. Bulk orders for parties and classes, delivered across India.",
    eyebrow: "Birthday return gifts",
    h1: "Books as birthday return gifts",
    intro: [
      "A book is a return gift that doesn't end up in the bin by Monday. It's flat to pack, easy to post, suits boys and girls alike, and it gets read again at bedtime long after the balloons are gone.",
      "Gudiya Stories picture books start at ₹130, are 12 to 16 pages long, and are printed on thick paper with a matte cover, so they feel like a proper gift. Rainbow's Birthday Bash is a birthday story itself, which makes it a natural pick.",
    ],
    pick: (p) => p.type !== "BUNDLE",
    sort: cheapestFirst,
    sections: [
      {
        h: "Ordering for a party",
        body: [
          "For a handful of books, add them to your bag here; delivery is across India.",
          "For a whole class or a large party, message us on WhatsApp with the number of children and the date. We can mix titles by age and tell you what's in stock.",
          "Want a name inside each book? Ask about bookplates when you message us.",
        ],
      },
    ],
    faqs: [
      { q: "Which book is best as a return gift?", a: "Rainbow's Birthday Bash for ages 6 to 8: it's a birthday story. For older children, Pitfall Parade or Winter Wonderland." },
      { q: "Do you give a discount for bulk orders?", a: "Yes, bulk pricing starts at 25 copies. Message us on WhatsApp, or see the For schools page, with the number of books you need." },
      { q: "How long does delivery take?", a: "It depends on your PIN code. Message us with your party date and we'll tell you before you order." },
    ],
  },
  {
    slug: "gifts-for-kids",
    title: "Gifts for Children: Books & Colouring Sets",
    description:
      "Thoughtful, screen-free gifts for children aged 5 to 13: picture book sets and mandala colouring sets, written and designed by an early-years teacher in India.",
    eyebrow: "Gifts for children",
    h1: "Gifts for children that aren't another screen",
    intro: [
      "The gifts children keep are the ones they come back to: a story they ask for again, a colouring page they're proud enough to put on the wall. Books and colouring sets are also easy to choose by age, and you can't buy a duplicate of something they already have on a tablet.",
      "Our sets bring together books on a theme at a lower price than buying them one by one. Every title is written and designed by S.V. Bharathi and printed in India.",
    ],
    pick: () => true,
    sort: (a, b) => Number(b.type === "BUNDLE") - Number(a.type === "BUNDLE") || b.pricePaise - a.pricePaise,
    sections: [
      {
        h: "Gift ideas by age",
        body: [
          "Age 5 and up: the Focus colouring set, with three mandala colouring books.",
          "Ages 6 to 8: the Kindness set of 3, about school, siblings and birthdays.",
          "Ages 7 to 13: the Adventure set of 3, with Donimalai, Pitfall Parade and Winter Wonderland.",
          "For a family or a school library: the Complete story collection of all six picture books.",
        ],
      },
    ],
    faqs: [
      { q: "What's a good gift for a 6 year old?", a: "The Kindness set of 3, or a single picture book with a Focus colouring book." },
      { q: "What's a good gift for a 10 year old?", a: "The Adventure set of 3 or the Focus colouring set; older children enjoy the detailed mandala pages." },
      { q: "Can you send it straight to the child?", a: "Yes. Enter their address at checkout." },
    ],
  },
  {
    slug: "mandala-colouring-books",
    title: "Mandala Colouring Books for Kids",
    description:
      "Mandala colouring books for children aged 5 and up: nature, fruits and vegetables, and patterns. Perforated pages, printed in India. Calm, screen-free focus.",
    eyebrow: "Mandala colouring books",
    h1: "Mandala colouring books for kids",
    intro: [
      "A mandala is a picture built from repeating shapes. Colouring one asks a child to slow down and fill one small shape at a time, which is exactly why it works: it builds concentration, fine motor control and an eye for colour, and it's twenty quiet minutes without a screen.",
      "The Focus colouring books turn things children know (animals, birds, leaves, fruit and vegetables) into mandalas, from simple outlines to detailed pages. Every page is perforated, so a finished picture tears out cleanly for the wall. You can see pages our readers have coloured in the readers' gallery.",
    ],
    pick: (p) => p.type === "COLOURING" || (p.type === "BUNDLE" && p.values.includes("focus")),
    sort: setsLast,
    sections: [
      {
        h: "Getting started with mandala colouring",
        body: [
          "Start with the simpler pages at the front of the book and work towards the detailed ones.",
          "Sketch pens give the brightest colours; colour pencils are easier to control for younger children.",
          "There's no wrong way to colour a mandala. Let them pick the colours.",
        ],
      },
    ],
    faqs: [
      { q: "What age are mandala colouring books for?", a: "Ages 5 and up. Patterns and Designs Level 1 is for 5 to 8; the Nature and Fruits and Vegetables books suit 5 and up, including adults." },
      { q: "Do mandalas really help children focus?", a: "Colouring small, repeating shapes takes sustained attention and steady hands, so it's good practice for both. Children also tend to find it calming." },
      { q: "Can the pages be framed?", a: "Yes. Every page is perforated and tears out cleanly." },
    ],
  },
  {
    slug: "screen-free-activities",
    title: "Screen-Free Activities for Kids at Home",
    description:
      "Screen-free activities for children: mandala colouring books and picture books for ages 5 to 13, by an early-years teacher. Ideas for after school and holidays.",
    eyebrow: "Screen-free time",
    h1: "Screen-free activities for kids",
    intro: [
      "Taking away a screen only works if there's something good to put in its place. The best replacements are activities a child can start on their own, get absorbed in, and finish with something to show: a coloured page, a story they can tell you about.",
      "Our books are built for exactly that. The Focus colouring books give twenty quiet minutes at a time, and the picture books are short enough to finish in one sitting. As we like to say, a book doesn't need charging.",
    ],
    pick: (p) => p.type === "COLOURING" || p.type === "STORY",
    sort: (a, b) => Number(b.type === "COLOURING") - Number(a.type === "COLOURING"),
    sections: [
      {
        h: "Ideas for a screen-free afternoon",
        body: [
          "Colour one mandala page together, then frame the best one.",
          "Read a story, then ask your child to draw what happened next.",
          "Take Mystical Landscapes of Donimalai on a walk and look for the birds and flowers from the book.",
          "Swap the bedtime show for a bedtime story. Ten minutes is enough.",
        ],
      },
    ],
    faqs: [
      { q: "What's the easiest screen-free activity to start with?", a: "Colouring. It needs no set-up, children can do it alone, and they finish with something to keep." },
      { q: "What age are these for?", a: "The colouring books start at age 5; the picture books cover ages 6 to 13." },
      { q: "Do you have something for long journeys?", a: "A colouring book and a pack of sketch pens travel well. The perforated pages keep finished work tidy." },
    ],
  },
];

export const COLLECTION_BY_SLUG = new Map(COLLECTIONS.map((c) => [c.slug, c]));
