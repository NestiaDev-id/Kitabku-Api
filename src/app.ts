import { OpenAPIHono } from "@hono/zod-openapi";

import bibleRoutes from "./routes/bible.js";

const app = new OpenAPIHono();

// API Documentation
app.doc("/reference", {
  openapi: "3.0.0",
  info: {
    title: "Bible API",
    version: "1.0.0",
    description: "API for accessing Bible verses and books",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
});

// Mount Bible routes
app.route("/api", bibleRoutes);

// Serve RapiDoc UI
app.get("/", (c) => {
  return c.html(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, minimum-scale=1, initial-scale=1, user-scalable=yes">
        <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
        <title>Bible API Documentation</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
          }
          rapi-doc {
            width: 100%;
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <rapi-doc 
          spec-url="/api/reference"
          theme="dark"
          bg-color="#111827"
          text-color="#F3F4F6"
          primary-color="#4F46E5"
          render-style="focused"
          regular-font="Inter"
          mono-font="Fira Code"
          show-header="false"
          show-info="true"
          allow-authentication="false"
          allow-server-selection="false"
          schema-style="table"
          schema-description-expanded="true"
          default-schema-tab="example"
        > </rapi-doc>
      </body>
    </html>
  `);
});

export default app;
