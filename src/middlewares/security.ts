import type { Context, MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import rateLimit from "hono-rate-limit";
import { prettyJSON } from "hono/pretty-json";
import { geoipMiddleware } from "./geoip.js";
import { serve } from "@hono/node-server";

// Daftar ASN (Autonomous System Numbers) VPN yang umum
const vpnASNs = [
  "AS9009", // M247
  "AS49981", // WorldStream
  "AS14061", // DigitalOcean
  "AS16276", // OVH
  "AS174", // Cogent
  "AS24940", // Hetzner
  "AS3356", // Level3
  "AS4766", // Korea Telecom
  "AS7552", // Viettel
  "AS4812", // China Telecom
];

// Daftar range IP Indonesia (contoh, perlu diupdate dengan data lengkap)
const indonesianIPRanges = [
  "103.28.0.0/16",
  "103.29.0.0/16",
  "111.94.0.0/15",
  "111.95.0.0/16",
  "114.4.0.0/14",
  "114.6.0.0/15",
  // ... tambahkan range IP Indonesia lainnya
];

// Helper function untuk mengecek apakah IP dalam range
function isIPInRange(ip: string, range: string): boolean {
  const [rangeIP, bits] = range.split("/");
  const ipLong =
    ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  const rangeLong =
    rangeIP
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  const mask = ~((1 << (32 - parseInt(bits))) - 1) >>> 0;
  return (ipLong & mask) === (rangeLong & mask);
}

// Region dan VPN Check Middleware
const regionAndVPNCheck: MiddlewareHandler = async (c, next) => {
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-real-ip") ||
    c.env?.ip || // optional jika Anda set IP di env
    "unknown";
  const asn = c.req.header("x-asn") || ""; // Membutuhkan konfigurasi di reverse proxy/load balancer

  // Skip untuk development
  if (process.env.NODE_ENV === "development") {
    await next();
    return;
  }

  // Cek apakah IP valid
  if (ip === "unknown") {
    return c.json(
      {
        error: "Akses Ditolak",
        message: "Tidak dapat memverifikasi alamat IP",
      },
      403
    );
  }

  // Cek VPN berdasarkan ASN
  if (vpnASNs.some((vpnAsn) => asn.includes(vpnAsn))) {
    return c.json(
      {
        error: "Akses Ditolak",
        message: "Penggunaan VPN tidak diizinkan",
      },
      403
    );
  }

  // Cek region Indonesia
  let isIndonesianIP = false;
  for (const range of indonesianIPRanges) {
    if (isIPInRange(ip, range)) {
      isIndonesianIP = true;
      break;
    }
  }

  if (!isIndonesianIP) {
    return c.json(
      {
        error: "Akses Ditolak",
        message: "API hanya dapat diakses dari Indonesia",
      },
      403
    );
  }

  // Log akses yang mencurigakan
  const ua = c.req.header("user-agent") || "unknown";
  const referer = c.req.header("referer") || "none";

  if (asn || !isIndonesianIP) {
    console.warn(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          type: "SUSPICIOUS_ACCESS",
          ip,
          asn,
          userAgent: ua,
          referer,
          reason: asn ? "Potential VPN/Proxy" : "Non-Indonesian IP",
        },
        null,
        2
      )
    );
  }

  await next();
};

// Rate Limiting dengan hono-rate-limit
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  limit: 100, // limit setiap IP ke 100 request per windowMs
  message: JSON.stringify({
    error: "Terlalu banyak request dari IP ini, silakan coba lagi nanti",
    retryAfter: "15 menit",
  }),
  statusCode: 429, // Too Many Requests
});

// IP Filtering - Block suspicious IPs
const ipFilter: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || c.env?.ip || "unknown";

  // Blacklist IPs (contoh)
  const blacklistedIPs = ["0.0.0.0", "1.1.1.1"]; // Tambahkan IP yang mencurigakan
  if (blacklistedIPs.includes(ip)) {
    return c.json(
      {
        error: "Akses ditolak",
        message: "IP Anda telah diblokir karena aktivitas mencurigakan",
      },
      403
    );
  }

  await next();
};

const corsMiddleware = cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173", // Vite default
    "https://kitabku.vercel.app",
    "https://kitabku-api.vercel.app",
    // Tambahkan domain produksi lainnya
  ],
  allowMethods: ["GET"],
  allowHeaders: [
    "Content-Type",
    "x-api-key",
    "Authorization",
    "Origin",
    "Accept",
  ],
  maxAge: 86400,
  credentials: true,
  exposeHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
  ],
});

// Request Sanitization & Validation
const requestValidator: MiddlewareHandler = async (c, next) => {
  // Content-Type validation
  const contentType = c.req.header("content-type");
  if (contentType && !contentType.includes("application/json")) {
    return c.json(
      {
        error: "Content-Type tidak valid",
        message: "Hanya menerima application/json",
      },
      415
    );
  }

  // Request size validation
  const contentLength = parseInt(c.req.header("content-length") || "0");
  const maxSize = 1024 * 1024; // 1MB
  if (contentLength > maxSize) {
    return c.json(
      {
        error: "Request terlalu besar",
        message: "Ukuran maksimum request adalah 1MB",
      },
      413
    );
  }

  // Query parameter validation
  const url = new URL(c.req.url);
  const params = url.searchParams;

  // Validasi panjang parameter
  for (const [key, value] of params) {
    if (value.length > 100) {
      return c.json(
        {
          error: "Parameter terlalu panjang",
          message: `Parameter ${key} melebihi 100 karakter`,
        },
        400
      );
    }

    // XSS prevention
    if (/<[^>]*>/.test(value)) {
      return c.json(
        {
          error: "Parameter tidak valid",
          message: "HTML/Script tags tidak diizinkan dalam parameter",
        },
        400
      );
    }
  }

  await next();
};

// Enhanced Security Headers
const securityHeaders: MiddlewareHandler = async (c, next) => {
  // Process the request first
  await next();

  // Security Headers
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:;"
  );
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Permitted-Cross-Domain-Policies", "none");
  c.header("Cross-Origin-Embedder-Policy", "require-corp");
  c.header("Cross-Origin-Opener-Policy", "same-origin");
  c.header("Cross-Origin-Resource-Policy", "same-origin");
};

// Advanced Bot Protection
const botProtection: MiddlewareHandler = async (c, next) => {
  const ua = c.req.header("user-agent")?.toLowerCase() || "";
  const referer = c.req.header("referer") || "";

  // Suspicious patterns
  const suspiciousUA = [
    "curl",
    "wget",
    "postman",
    "insomnia",
    "python",
    "ruby",
    "java",
    "apache",
    "bot",
    "crawler",
    "spider",
    "scraper",
    "selenium",
    "phantomjs",
    "headless",
    "automation",
    "burp",
    "zap",
  ];

  // Bot detection
  if (suspiciousUA.some((pattern) => ua.includes(pattern))) {
    return c.json(
      {
        error: "Akses ditolak",
        message: "Automated access tidak diizinkan",
      },
      403
    );
  }

  // Empty or suspicious User-Agent
  if (!ua || ua.length < 10 || ua.length > 300) {
    return c.json(
      {
        error: "User-Agent tidak valid",
        message: "Request membutuhkan User-Agent yang valid",
      },
      400
    );
  }

  await next();
};

// Enhanced Logging dengan Pretty JSON
const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const { method, url } = c.req;
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("cf-connecting-ip") || // Cloudflare
    c.req.header("x-real-ip") || // Nginx
    c.req.header("fastly-client-ip") || // Fastly
    c.req.header("true-client-ip") || // Akamai
    c.req.header("x-client-ip") ||
    "unknown";

  const ua = c.req.header("user-agent") || "unknown";

  try {
    await next();
  } catch (error: unknown) {
    // Log error dengan type checking
    if (error instanceof Error) {
      console.error(`[ERROR] ${method} ${url} - ${error.message}`);
    } else {
      console.error(`[ERROR] ${method} ${url} - Unknown error occurred`);
    }
    throw error;
  }

  const duration = Date.now() - start;
  const status = c.res.status;

  // Log format yang lebih informatif
  console.log(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        method,
        url,
        status,
        duration: `${duration}ms`,
        ip,
        userAgent: ua,
        referer: c.req.header("referer") || "none",
      },
      null,
      2
    )
  );
};

// Combine all middleware with proper ordering
export const securityMiddleware = [
  requestLogger, // Logging harus pertama
  corsMiddleware, // CORS sebelum rate limit
  geoipMiddleware, // GeoIP check (includes region restriction)
  regionAndVPNCheck, // Region dan VPN check
  rateLimiter, // Rate limiting
  ipFilter, // IP filtering
  requestValidator, // Request validation
  botProtection, // Bot protection
  securityHeaders, // Security headers
  prettyJSON(), // Pretty JSON response
];
