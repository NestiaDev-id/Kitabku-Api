import type { Verse } from "../types/bible.js";
import { books } from "../data/bible.js"; // pastikan path-nya benar

interface BibleJSON {
  Book: Array<{
    Chapter: Array<{
      Verse: Array<{
        Verseid: string;
        Verse: string;
      }>;
    }>;
  }>;
}

export type Language = "en" | "id";

export function convertToVerseArray(
  bibleData: BibleJSON,
  language: Language
): Verse[] {
  const verses: Verse[] = [];

  bibleData.Book.forEach((bookData, bookIndex) => {
    const bookName = books[bookIndex]?.name || `Book ${bookIndex + 1}`;

    bookData.Chapter.forEach((chapterData, chapterIndex) => {
      const chapterNumber = chapterIndex + 1;

      chapterData.Verse.forEach((verseData, verseIndex) => {
        verses.push({
          book: bookName,
          chapter: chapterNumber,
          verse: verseIndex + 1,
          text: verseData.Verse.trim(),
          language: language,
        });
      });
    });
  });

  return verses;
}
