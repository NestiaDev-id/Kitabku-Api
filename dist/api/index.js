import { Hono } from "hono";
import { handle } from "@hono/node-server/vercel";
import app from "../src/views/app.js";
// Re-export the app with Vercel handler
export default handle(app);
// For Vercel, we need to export config
export const config = {
    api: {
        bodyParser: false,
    },
};
