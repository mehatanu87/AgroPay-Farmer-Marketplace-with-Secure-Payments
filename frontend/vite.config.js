import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    minify: false,
  },
  optimizeDeps: {
    exclude: ["@stellar/stellar-sdk", "@stellar/js-xdr", "@stellar/freighter-api"],
  },
});
