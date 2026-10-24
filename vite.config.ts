import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ordersApi } from "./server/orders-api.mjs";

export default defineConfig({
  plugins: [react(), ordersApi()],
  server: {
    host: true,
    port: 5173,
  },
});
