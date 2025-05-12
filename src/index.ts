import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Hono } from "hono";

import app from "./app.js";

const serverConfig = {
  fetch: app.fetch,
  port: 3001,
};

function logCallback(info: { port: number }): void {
  console.warn(`Server is running on http://localhost:${info.port}`);
}

serve(serverConfig, logCallback);
