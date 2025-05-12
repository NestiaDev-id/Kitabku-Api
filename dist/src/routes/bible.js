import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { books, versesEn, versesId, bibleMetadata } from "../data/bible.js";
import { BookSchema, VerseSchema } from "../types/bible.js";
const router = new OpenAPIHono();
// Get all books
router.openapi({
    method: "get",
    path: "/books",
    tags: ["Books"],
    summary: "Get all Bible books",
    description: `
Returns a list of all books in the Bible, including both Old and New Testament.
Each book contains information about:
- Name of the book
- Number of chapters
- Testament (old/new)
    `,
    responses: {
        200: {
            description: "List of books successfully retrieved",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                chapters: { type: "number" },
                                testament: { type: "string", enum: ["old", "new"] },
                            },
                        },
                        example: [
                            {
                                name: "Genesis",
                                chapters: 50,
                                testament: "old",
                            },
                            {
                                name: "John",
                                chapters: 21,
                                testament: "new",
                            },
                        ],
                    },
                },
            },
        },
    },
}, (c) => {
    return c.json(books);
});
// Get book by name
router.openapi({
    method: "get",
    path: "/books/{name}",
    tags: ["Books"],
    summary: "Get book details by name",
    description: `
Retrieve detailed information about a specific Bible book by its name.
The search is case-insensitive, so "genesis", "Genesis", and "GENESIS" will all work.
    `,
    parameters: [
        {
            name: "name",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Name of the book (e.g., Genesis, John)",
            example: "Genesis",
        },
    ],
    responses: {
        200: {
            description: "Book details successfully retrieved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            chapters: { type: "number" },
                            testament: { type: "string", enum: ["old", "new"] },
                        },
                        example: {
                            name: "Genesis",
                            chapters: 50,
                            testament: "old",
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request - Book name is required",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                        },
                        example: {
                            error: "Book name is required",
                        },
                    },
                },
            },
        },
        404: {
            description: "Book not found",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            error: { type: "string" },
                        },
                        example: {
                            error: "Book not found",
                        },
                    },
                },
            },
        },
    },
}, (c) => {
    const name = c.req.param("name");
    if (!name) {
        return c.json({ error: "Book name is required" }, 400);
    }
    const book = books.find((book) => {
        return book.name.toLowerCase() === name.toLowerCase();
    });
    if (!book) {
        return c.json({ error: "Book not found" }, 404);
    }
    return c.json(book);
});
// Get verses with filters
router.openapi({
    method: "get",
    path: "/verses",
    tags: ["Verses"],
    summary: "Get Bible verses",
    description: `
Search and filter Bible verses by book and/or chapter.
Features:
- Filter by book name (case-insensitive)
- Filter by chapter number
- Select language (en/id)
- Get all verses if no filters are provided
    `,
    parameters: [
        {
            name: "book",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter verses by book name (e.g., Genesis, John)",
            example: "John",
        },
        {
            name: "chapter",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filter verses by chapter number",
            example: "3",
        },
        {
            name: "language",
            in: "query",
            required: false,
            schema: {
                type: "string",
                enum: ["en", "id"],
            },
            description: "Select language (en = English, id = Indonesian)",
            example: "en",
        },
    ],
    responses: {
        200: {
            description: "Verses successfully retrieved",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                book: { type: "string" },
                                chapter: { type: "number" },
                                verse: { type: "number" },
                                text: { type: "string" },
                                language: { type: "string", enum: ["en", "id"] },
                            },
                        },
                        example: [
                            {
                                book: "John",
                                chapter: 3,
                                verse: 16,
                                text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
                                language: "en",
                            },
                        ],
                    },
                },
            },
        },
    },
}, (c) => {
    const book = c.req.query("book");
    const chapter = c.req.query("chapter");
    const language = (c.req.query("language") || "en");
    // Select verses based on language
    let verses = language === "en" ? versesEn : versesId;
    if (book) {
        verses = verses.filter((verse) => {
            return verse.book.toLowerCase() === book.toLowerCase();
        });
    }
    if (chapter) {
        const chapterNum = Number.parseInt(chapter);
        if (!Number.isNaN(chapterNum)) {
            verses = verses.filter((verse) => {
                return verse.chapter === chapterNum;
            });
        }
    }
    return c.json(verses);
});
// Add new endpoint to get available languages
router.openapi({
    method: "get",
    path: "/languages",
    tags: ["Configuration"],
    summary: "Get available languages",
    description: "Returns list of available languages for Bible verses",
    responses: {
        200: {
            description: "Languages successfully retrieved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            languages: {
                                type: "array",
                                items: {
                                    type: "string",
                                    enum: ["en", "id"],
                                },
                            },
                            default: { type: "string" },
                        },
                        example: {
                            languages: ["en", "id"],
                            default: "en",
                        },
                    },
                },
            },
        },
    },
}, (c) => {
    return c.json({
        languages: bibleMetadata.availableLanguages,
        default: "en",
    });
});
export default router;
