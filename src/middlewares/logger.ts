import { logger } from "hono/logger";

export function customLogger() {
  return logger();
}
