import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import bibleRoutes from "./routes/bible.js";
import { cors } from "hono/cors";
import { securityMiddleware } from "./middlewares/security.js";

const app = new OpenAPIHono();

// Add CORS middleware
app.use(
  "*",
  cors({
    origin: [
      "https://kitabku.vercel.app",
      "https://kitabku-api.vercel.app",
      "http://localhost:3000",
    ],
    allowMethods: ["GET"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    exposeHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
    ],
    maxAge: 600,
    credentials: true,
  })
);

// Apply security middleware
app.use("*", ...securityMiddleware);

// API Documentation
app.doc("/reference", {
  openapi: "3.0.0",
  info: {
    title: "Bible API",
    version: "1.0.0",
    description: `API for accessing Bible verses and books.
# Introduction
Welcome to the Kitabku API - your gateway to accessing Bible verses and books programmatically. This API provides easy access to biblical content with powerful search and filtering capabilities.

## Features
- Get a list of all Bible books
- Retrieve detailed information about specific books
- Search verses by book and chapter
- Filter verses with various parameters

## Getting Started
To get started with the Kitabku API, you can:
1. Browse the available endpoints below
2. Try out the API using the interactive documentation
3. View example responses for each endpoint

## Base URL
Production: https://kitabku.vercel.app

## Rate Limiting
To ensure fair usage, the API is rate-limited to 100 requests per 15 minutes per IP.

## Security Features
To enhance the security of the API, the following measures have been implemented:
- **GeoIP Restriction**: Access is restricted to users from Indonesia. Requests from other regions are denied.
- **VPN/Proxy Detection**: Requests originating from VPNs or proxies are blocked using ASN (Autonomous System Numbers) and IP validation.
- **CORS Policy**: Only specific domains are allowed to access the API, ensuring controlled cross-origin requests.
- **Request Validation**: Strict validation of request headers, body size, and query parameters to prevent malicious inputs.
- **Bot Protection**: Automated access from bots, crawlers, or suspicious user-agents is denied.
- **Enhanced Security Headers**: HTTP headers are configured to prevent common vulnerabilities such as clickjacking, MIME sniffing, and XSS attacks.
- **Rate Limiting**: Limits the number of requests per IP to prevent abuse and DDoS attacks.
- **IP Filtering**: Blacklisted IPs are blocked from accessing the API.

## Authentication
The API is currently open and does not require authentication.

`,
  },
  servers: [
    {
      url: "https://kitabku.vercel.app",
      description: "Production server",
    },
    {
      url: "https://kitabku-api.vercel.app",
      description: "Production server",
    },
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
});

// Mount Bible routes
app.route("/api", bibleRoutes);

// Serve Documentation UI with loading spinner
app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kitabku API - Bible API Documentation</title>
        <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        <style>
            body { 
                margin: 0;
                padding: 0;
                font-family: 'Inter', system-ui, -apple-system, sans-serif;
            }
            .loading-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: rgba(17, 24, 39, 0.9);
                z-index: 9999;
                transition: opacity 0.3s ease-out;
            }
            .spinner {
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
                font-weight: 500;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .hidden {
                opacity: 0;
                pointer-events: none;
            }
            rapi-doc {
                width: 100%;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <!-- Loading Overlay -->
        <div id="loading" class="loading-container" role="alert" aria-live="polite">
            <div class="spinner" aria-hidden="true"></div>
            <div class="loading-text">Loading documentation...</div>
        </div>

        <rapi-doc 
            spec-url="/reference"
            theme="dark"
            bg-color="#111827"
            text-color="#F3F4F6"
            primary-color="#4F46E5"
            render-style="read"
            regular-font="Inter"
            mono-font="JetBrains Mono"
            show-header="false"
            show-info="true"
            allow-authentication="false"
            allow-server-selection="false"
            schema-style="table"
            schema-description-expanded="true"
            default-schema-tab="example"
            nav-bg-color="#1F2937"
            nav-text-color="#F3F4F6"
            nav-hover-bg-color="#374151"
            nav-accent-color="#4F46E5"
            nav-item-spacing="relaxed"
            layout="row"
            use-path-in-nav-bar="true"
            show-components="true"
            show-method-in-nav-bar="true"
        > 
            <div slot="nav-logo" style="display: flex; align-items: center; padding: 16px;">
                <span style="color: #F3F4F6; font-size: 24px; font-weight: 600;">Kitabku API</span>
            </div>
        </rapi-doc>

        <script>
            document.addEventListener('DOMContentLoaded', () => {
                const loadingOverlay = document.getElementById('loading');
                
                // Hide loading when RapiDoc is ready
                document.querySelector('rapi-doc').addEventListener('spec-loaded', () => {
                    setTimeout(() => {
                        loadingOverlay.classList.add('hidden');
                    }, 500);
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

// Swagger UI route (alternative documentation)
app.get(
  "/swagger",
  swaggerUI({
    url: "/reference",
  })
);

export default app;
