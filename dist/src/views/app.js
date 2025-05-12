import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import bibleRoutes from "../routes/bible.js";
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
        {
            url: "https://kitabku.vercel.app",
            description: "Production server",
        },
        {
            url: "https://kitabku-api.vercel.app",
            description: "Production server",
        },
    ],
});
// Mount Bible routes
app.route("/api", bibleRoutes);
// Serve RapiDoc UI with loading spinner
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
          .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(17, 24, 39, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            transition: opacity 0.3s ease-out;
          }
          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid rgba(79, 70, 229, 0.2);
            border-left-color: #4F46E5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .loading-text {
            position: absolute;
            margin-top: 80px;
            color: #F3F4F6;
            font-size: 16px;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
          .hidden {
            opacity: 0;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <!-- Loading Overlay -->
        <div id="loading" class="loading-overlay" role="alert" aria-live="polite">
          <div class="loading-spinner" aria-hidden="true"></div>
          <div class="loading-text">Loading documentation...</div>
        </div>

        <rapi-doc 
          spec-url="/reference"
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

        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const loadingOverlay = document.getElementById('loading');
            
            // Hide loading when RapiDoc is ready
            document.querySelector('rapi-doc').addEventListener('spec-loaded', () => {
              loadingOverlay.classList.add('hidden');
            });

            // Show loading when navigating
            window.addEventListener('beforeunload', () => {
              loadingOverlay.classList.remove('hidden');
            });
          });
        </script>
      </body>
    </html>
  `);
});
export default app;
