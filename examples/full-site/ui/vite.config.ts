import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

declare const process: { env: Record<string, string | undefined> };

// The app-node port the example boots on (start.js passes VITE_API_PORT).
const apiPort = process.env.VITE_API_PORT || "3007";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.MDK_UI_PORT) || 3040,
    proxy: {
      // Forward the site plugin endpoints to the app-node during dev.
      "/site": `http://localhost:${apiPort}`,
    },
  },
});
