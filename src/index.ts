import { serve } from "@hono/node-server";
import { Hono } from "hono";
import app from "./app.js";

const port = process.env.PORT || 3000;

const server = serve({
  fetch: app.fetch,
  port: Number(port),
});

console.warn(`Server is running on http://localhost:${port}`);

// Graceful shutdown
process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
