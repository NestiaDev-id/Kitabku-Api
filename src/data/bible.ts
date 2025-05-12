import type { Book, Verse } from "../types/bible.js";

export const books: Book[] = [
  {
    name: "Genesis",
    chapters: 50,
    testament: "old",
  },
  {
    name: "Exodus",
    chapters: 40,
    testament: "old",
  },
  {
    name: "Matthew",
    chapters: 28,
    testament: "new",
  },
  {
    name: "John",
    chapters: 21,
    testament: "new",
  },
];

export const verses: Verse[] = [
  {
    book: "Genesis",
    chapter: 1,
    verse: 1,
    text: "In the beginning God created the heavens and the earth.",
  },
  {
    book: "John",
    chapter: 3,
    verse: 16,
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
  },
];
