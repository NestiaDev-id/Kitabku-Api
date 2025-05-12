import type { MiddlewareHandler } from "hono";
import { Reader, ReaderModel } from "@maxmind/geoip2-node";
import { readFileSync } from "fs";
import { join } from "path";

interface GeoIPReaders {
  ipv4Reader: ReaderModel | null;
  ipv6Reader: ReaderModel | null;
}

let geoipReaders: GeoIPReaders = {
  ipv4Reader: null,
  ipv6Reader: null,
};

try {
  // Load both IPv4 and IPv6 databases
  const ipv4Path = join(
    process.cwd(),
    "src",
    "data",
    "geolite2-country-ipv4.mmdb"
  );
  const ipv6Path = join(
    process.cwd(),
    "src",
    "data",
    "geolite2-country-ipv6.mmdb"
  );

  geoipReaders = {
    ipv4Reader: Reader.openBuffer(readFileSync(ipv4Path)),
    ipv6Reader: Reader.openBuffer(readFileSync(ipv6Path)),
  };

  console.log("GeoIP databases loaded successfully");
} catch (error) {
  console.error("Error loading GeoIP databases:", error);
}

// Helper function to check if IP is IPv6
function isIPv6(ip: string): boolean {
  return ip.includes(":");
}

// Helper function to check if IP is private
function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^::1$/,
    /^f[cd][0-9a-f]{2}:/i,
    /^fe80:/i,
  ];
  return privateRanges.some((range) => range.test(ip));
}

// Helper function untuk mendapatkan country dari IP
function getCountryFromIP(ip: string): { country?: string; isProxy?: boolean } {
  try {
    if (isPrivateIP(ip)) {
      return {}; // Skip private IPs
    }

    const reader = isIPv6(ip)
      ? geoipReaders.ipv6Reader
      : geoipReaders.ipv4Reader;
    if (!reader) {
      throw new Error(
        `No reader available for ${isIPv6(ip) ? "IPv6" : "IPv4"}`
      );
    }

    const result = reader.country(ip);
    return {
      country: result.country?.isoCode,
      isProxy: result.traits?.isAnonymousProxy || false,
    };
  } catch (error) {
    console.error(`Error getting country for IP ${ip}:`, error);
    return {};
  }
}

export const geoipMiddleware: MiddlewareHandler = async (c, next) => {
  // Skip untuk development
  if (process.env.NODE_ENV === "development") {
    await next();
    return;
  }

  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.env?.ip ||
    "127.0.0.1"; // Default to localhost instead of unknown

  try {
    // Skip untuk localhost
    if (ip === "127.0.0.1" || ip === "::1") {
      await next();
      return;
    }

    // Validasi IP
    if (!ip || ip === "unknown") {
      throw new Error("Invalid IP address");
    }

    // Get country information
    const { country, isProxy } = getCountryFromIP(ip);

    // Jika tidak bisa mendapatkan informasi negara
    if (!country) {
      throw new Error("Could not determine country");
    }

    // Log dan tolak jika menggunakan proxy
    if (isProxy) {
      console.warn(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            type: "PROXY_DETECTED",
            ip,
            userAgent: c.req.header("user-agent") || "unknown",
            path: c.req.path,
          },
          null,
          2
        )
      );

      return c.json(
        {
          error: "Akses Ditolak",
          message: "Penggunaan proxy atau VPN tidak diizinkan",
        },
        403
      );
    }

    // Cek apakah IP berasal dari Indonesia
    if (country !== "ID") {
      console.warn(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            type: "NON_ID_ACCESS",
            ip,
            country,
            userAgent: c.req.header("user-agent") || "unknown",
            path: c.req.path,
          },
          null,
          2
        )
      );

      return c.json(
        {
          error: "Akses Ditolak",
          message: "API hanya dapat diakses dari Indonesia",
        },
        403
      );
    }

    // Tambahkan informasi geolokasi ke context
    c.set("geoip", { country, isProxy });

    await next();
  } catch (error) {
    console.error("GeoIP Error:", error);

    // Dalam production, tolak akses jika tidak bisa memverifikasi
    if (process.env.NODE_ENV === "production") {
      return c.json(
        {
          error: "Akses Ditolak",
          message: "Tidak dapat memverifikasi lokasi",
        },
        403
      );
    }

    await next();
  }
};
