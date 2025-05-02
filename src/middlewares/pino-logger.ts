import { logger } from "hono-pino";

export function pinoLogger() {
  return logger();
}
