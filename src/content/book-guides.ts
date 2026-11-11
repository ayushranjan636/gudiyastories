// Search titles and the longer "about this book" text for each book page.
// Facts come from the back covers and the catalogue. A title or description typed
// into Admin → Products → SEO wins over the one here.
//
// Titles: the site adds " · Gudiya Stories" itself, so keep these under ~45 characters.

export type BookGuide = {
  seoTitle: string;
  seoDescription: string;
  /** Paragraphs shown under "What it's about", after the short description. */
  about: string[];
  /** Moments this book suits, shown as a short list. */
  readItWhen: string[];
  faqs: { q: string; a: string }[];
};

export const BOOK_GUIDES: Record<string, BookGuide> = {
  "cheers-to-monday": {
    seoTitle: "Cheers to Monday – Picture Book About School Worries, Ages 6–8",
    seoDescription:
      "A picture book for children who find Mondays and school mornings hard. Gudiya's school friends help her, and she learns it's fine to ask for help. Ages 6–8.",
    about: [
      "Gudiya isn't sure about the new school week. At school her friends notice, help her and are kind to her, and she learns that it's all right to ask for help when you need it. The book's line is the old one: a friend in need is a friend indeed.",
      "It's a short, gentle read with big pictures, written by an early-years teacher who has stood at a lot of school gates. Children who feel the Sunday-night wobble see themselves in Gudiya, and the story gives you an easy way to talk about saying goodbye in the morning and about who they can turn to in class.",
    ],
    readItWhen: ["The night before school starts again", "The first week at a new school", "When a child says they don't want to go on Monday"],
    faqs: [
      { q: "Is Cheers to Monday right for a 5-year-old?", a: "It's written for ages 6 to 8, but most 5-year-olds enjoy it read aloud, especially before starting school. Older readers can read it alone." },
      { q: "What will my child take from it?", a: "That feeling nervous about school is normal, that friends help, and that asking for help is a good thing to do, not a weak one." },
      { q: "How long is it?", a: "12 pages on thick 300gsm art paper with a matte laminated cover. A read takes about ten minutes, with time to talk." },
    ],
  },
  "spread-love": {
    seoTitle: "Spread Love – Picture Book About Kindness, Ages 6–8",
    seoDescription:
      "Lolly and Polly are twin birds who look alike but think differently. A picture book about kindness, respect and lifting each other up, for ages 6 to 8.",
    about: [
      "Lolly and Polly are twin birds. They look exactly alike and are completely different in their nature. The story follows the two of them as they learn to respect those differences, be kind to each other and spread love instead of squabbling.",
      "It's a good book for siblings, cousins and best friends who are always being compared, and for any child learning that someone can see things differently and still be on their side.",
    ],
    readItWhen: ["After a sibling fight", "When a child is being compared to a brother, sister or friend", "For a class talk on respect and kindness"],
    faqs: [
      { q: "What age is Spread Love for?", a: "Ages 6 to 8. Younger children enjoy the pictures read aloud; older ones can read it on their own." },
      { q: "Is it good for twins or siblings?", a: "Yes. The two main characters are twins who look the same and think differently, which makes it an easy way into talking about being your own person in a family." },
      { q: "How long is it?", a: "16 pages, landscape format, on thick 300gsm art paper with a matte laminated cover." },
    ],
  },
  "rainbows-birthday-bash": {
    seoTitle: "Rainbow's Birthday Bash – Birthday Picture Book, Ages 6–8",
    seoDescription:
      "A fun birthday picture book: Rainbow the unicorn celebrates with grandparents, friends and too many balloons. About family, contentment and staying humble. Ages 6–8.",
    about: [
      "It's Rainbow the unicorn's birthday, and the party has everything: grandparents, friends, cake and far too many balloons. It turns into a birthday nobody forgets.",
      "Under the fun, the story is about family and about being happy with what you have. It's a gentle way to talk about gifts, thank-yous and staying humble, which makes it a popular birthday present and return gift in its own right.",
    ],
    readItWhen: ["The week before a birthday", "As a return gift at a birthday party", "After a party, to talk about saying thank you"],
    faqs: [
      { q: "Is it a good birthday gift?", a: "Yes. It's a birthday story, it's 12 pages so it's read in one sitting, and it's light enough to post or hand out as a return gift. For a bigger gift, the Kindness set of 3 includes it." },
      { q: "What age is it for?", a: "Ages 6 to 8. Four- and five-year-olds who love unicorns enjoy it read aloud." },
      { q: "What value does it teach?", a: "Family and joy: celebrating with the people you love, being content with what you have, and staying humble." },
    ],
  },
  "pitfall-parade": {
    seoTitle: "Pitfall Parade – Story Book About Courage, Ages 8–12",
    seoDescription:
      "Three siblings, one bicycle with no brakes. An adventure story about bravery, taking risks and never giving up, for children aged 8 to 12.",
    about: [
      "Three siblings set off on a bike ride and find out halfway down the hill that the bicycle has no brakes. What follows is an adventure about their bravery, taking risks and a never-give-up attitude, and about getting each other home.",
      "It suits confident readers who like a bit of danger in a story. It also opens a useful conversation about which risks are worth taking and how brothers and sisters look out for each other.",
    ],
    readItWhen: ["For a child who loves adventure stories", "Before a family cycling trip", "When talking about courage and safety"],
    faqs: [
      { q: "What age is Pitfall Parade for?", a: "Ages 8 to 12. Most children this age read it on their own." },
      { q: "Is it scary?", a: "It's exciting rather than scary. The siblings are in a tight spot, and the story is about how they keep going and look after each other." },
      { q: "How long is it?", a: "16 pages on thick 300gsm art paper with a matte laminated cover." },
    ],
  },
  "mystical-landscapes-of-donimalai": {
    seoTitle: "Mystical Landscapes of Donimalai – Nature Adventure Book, Ages 8–13",
    seoDescription:
      "Rani and her friends hike through the Donimalai valley. A nature adventure about courage, protecting wildlife and keeping forests clean, for ages 8 to 13.",
    about: [
      "Rani is a girl who likes adventures. This book follows Rani and her friends on a hike through the mystical valley of Donimalai. It shows the courage of the young hikers and their commitment to protecting wildlife and keeping the forest clean.",
      "Donimalai is a real valley in Karnataka, where the author grew up, and the forest in the book is drawn from it. It's a good first story about the environment for children who are old enough to go on hikes and nature camps themselves.",
    ],
    readItWhen: ["Before a school trip, trek or nature camp", "On Environment Day or Wildlife Week", "For a child who loves animals and the outdoors"],
    faqs: [
      { q: "What age is it for?", a: "Ages 8 to 13. It works well for class reading in grades 3 to 7." },
      { q: "Is Donimalai a real place?", a: "Yes. Donimalai is a valley in Karnataka. S.V. Bharathi grew up there, and the book's forest is drawn from it." },
      { q: "What will children learn?", a: "Courage, working as a team, and looking after wildlife: leaving a forest cleaner than you found it." },
    ],
  },
  "winter-wonderland": {
    seoTitle: "Winter Wonderland – Christmas Picture Book, Ages 7–10",
    seoDescription:
      "Santa, Sparkle and Jingle's funny adventure at the North Pole on Christmas Eve. A light, festive picture book full of snow and silly jokes, for ages 7 to 10.",
    about: [
      "This is the story of Santa, Sparkle and Jingle's funny adventure at the North Pole on the eve of Christmas, with plenty of snow and silly jokes along the way.",
      "It's the lightest book on the shelf: a read for laughing together in the festive season, for Christmas parties at school and for December bedtimes.",
    ],
    readItWhen: ["In December, in the run-up to Christmas", "At a school Christmas party", "As a Secret Santa gift for a child"],
    faqs: [
      { q: "What age is Winter Wonderland for?", a: "Ages 7 to 10. Younger children enjoy it read aloud." },
      { q: "Is it a Christmas book?", a: "Yes. It takes place at the North Pole on Christmas Eve, with Santa and his friends Sparkle and Jingle." },
      { q: "How long is it?", a: "16 pages on thick 300gsm art paper with a matte laminated cover." },
    ],
  },
  "focus-nature-mandala-colouring-book": {
    seoTitle: "Nature Mandala Colouring Book for Kids – 36 Tear-Out Pages",
    seoDescription:
      "36 perforated mandala colouring pages of animals, birds, leaves and flowers, from simple to detailed. A calm, screen-free activity for children aged 5 and up.",
    about: [
      "Animals, birds, leaves and flowers drawn as mandalas, from simple shapes for beginners to detailed pages for patient hands. Every page is perforated, so a finished picture can be torn out cleanly and framed or stuck on the wall.",
      "Mandala colouring asks a child to slow down and fill one small shape at a time. That builds concentration, fine motor control and colour sense, and it's a calm, screen-free twenty minutes. Readers colour these pages with sketch pens, pencils and crayons; you can see some in the readers' gallery.",
    ],
    readItWhen: ["For quiet time after school", "For long journeys and holidays", "Instead of a screen before bed"],
    faqs: [
      { q: "What age is the Nature Mandala colouring book for?", a: "Ages 5 and up. The early pages are simple; the later ones are detailed enough for older children and adults." },
      { q: "Can the pages be torn out?", a: "Yes. All 36 pages are perforated, so finished pictures come out cleanly for framing." },
      { q: "Which colours work best?", a: "Sketch pens, colour pencils and crayons all work. Most of the pages in our readers' gallery were done in sketch pen." },
    ],
  },
  "focus-patterns-and-designs-level-1": {
    seoTitle: "Patterns and Designs Colouring Book – Mindful Colouring, Level 1",
    seoDescription:
      "A colouring book of repeating patterns and shapes for ages 5 to 8. Early maths thinking (patterns, sizes, sorting) disguised as calm, screen-free colouring.",
    about: [
      "Repeating shapes, sorting by size and pattern-building, disguised as colouring. Birds, feathers and simple motifs are drawn in patterns a young child can follow and continue.",
      "Spotting and continuing a pattern is one of the first steps in maths thinking. Level 1 is pitched at children aged 5 to 8, who can work through it on their own, page by page.",
    ],
    readItWhen: ["For early-maths practice that doesn't feel like homework", "For quiet time after school", "For summer holidays"],
    faqs: [
      { q: "What age is Patterns and Designs Level 1 for?", a: "Ages 5 to 8." },
      { q: "Is it a maths book?", a: "It's a colouring book, but the pages are built around patterns, shapes and sizes, which are early maths skills." },
      { q: "How many pages are there?", a: "36 perforated pages." },
    ],
  },
  "focus-fruits-and-vegetables-mandala-colouring-book": {
    seoTitle: "Fruits and Vegetables Mandala Colouring Book for Kids",
    seoDescription:
      "Everyday fruits and vegetables drawn as mandalas: 36 perforated colouring pages for ages 5 and up. Practise colour, shape and fine motor control, screen-free.",
    about: [
      "Everyday fruits and vegetables, the kind already in your kitchen, turned into mandalas. It's a calm way to practise colour, shape and fine motor control.",
      "Because the subjects are familiar, younger children can talk about the real fruit while they colour: its name, its colour and where it grows. The 36 pages are perforated, so finished pictures can go straight on the fridge.",
    ],
    readItWhen: ["For quiet time after school", "Alongside learning fruit and vegetable names", "For long journeys and holidays"],
    faqs: [
      { q: "What age is it for?", a: "Ages 5 and up." },
      { q: "Can the pages be torn out?", a: "Yes. All 36 pages are perforated." },
      { q: "Is there a set of all three colouring books?", a: "Yes. The Focus colouring set has the Nature Mandala, Patterns and Designs Level 1, and Fruits and Vegetables books together at a lower price." },
    ],
  },
};
