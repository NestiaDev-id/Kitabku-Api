import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { books, verses } from "../data/bible.js";
import { BookSchema, VerseSchema } from "../types/bible.js";
const router = new OpenAPIHono();
// Get all books
router.get("/books", (c) => {
    return c.json(books);
});
// Get book by name
router.get("/books/:name", (c) => {
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
router.get("/verses", (c) => {
    const book = c.req.query("book");
    const chapter = c.req.query("chapter");
    let filteredVerses = verses;
    if (book) {
        filteredVerses = filteredVerses.filter((verse) => {
            return verse.book.toLowerCase() === book.toLowerCase();
        });
    }
    if (chapter) {
        const chapterNum = Number.parseInt(chapter);
        if (!Number.isNaN(chapterNum)) {
            filteredVerses = filteredVerses.filter((verse) => {
                return verse.chapter === chapterNum;
            });
        }
    }
    return c.json(filteredVerses);
});
// Add OpenAPI documentation
router.doc("/reference", {
    openapi: "3.0.0",
    info: {
        title: "Bible API",
        version: "1.0.0",
        description: "API for accessing Bible verses and books",
    },
    paths: {
        "/books": {
            get: {
                summary: "Get all books",
                description: "Returns a list of all books in the Bible",
                tags: ["Books"],
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
                                },
                            },
                        },
                    },
                },
            },
        },
        "/books/{name}": {
            get: {
                summary: "Get book by name",
                description: "Returns details of a specific book",
                tags: ["Books"],
                parameters: [
                    {
                        name: "name",
                        in: "path",
                        required: true,
                        schema: { type: "string" },
                        description: "Name of the book (e.g., Genesis, John)",
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
                                },
                            },
                        },
                    },
                },
            },
        },
        "/verses": {
            get: {
                summary: "Get Bible verses",
                description: "Returns verses from the Bible with optional filtering",
                tags: ["Verses"],
                parameters: [
                    {
                        name: "book",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Filter verses by book name",
                    },
                    {
                        name: "chapter",
                        in: "query",
                        required: false,
                        schema: { type: "string" },
                        description: "Filter verses by chapter number",
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
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
});
export default router;
