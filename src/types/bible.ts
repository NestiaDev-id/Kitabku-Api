import { z } from "zod";

export const VerseSchema = z.object({
  book: z.string().describe("Name of the book"),
  chapter: z.number().describe("Chapter number"),
  verse: z.number().describe("Verse number"),
  text: z.string().describe("Verse text content"),
});

export const BookSchema = z.object({
  name: z.string().describe("Name of the book"),
  chapters: z.number().describe("Number of chapters in the book"),
  testament: z.enum(["old", "new"]).describe("Testament (old/new)"),
});

export type Verse = z.infer<typeof VerseSchema>;
export type Book = z.infer<typeof BookSchema>;
